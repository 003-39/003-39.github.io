const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
// server.js 상단에 추가
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Railway 프록시 사용 시 보통 SSL 불필요. 필요하면 아래 주석 해제 후 맞는 옵션 사용
  // ssl: { rejectUnauthorized: true }
});

app.use(cors({
  origin: ['https://003-39.github.io', 'http://localhost:3000', 'http://127.0.0.1:5500', 'https://zero03-39-github-io-1.onrender.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// ── 최상단: 프로세스 전역 에러 로깅 추가 ─────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason?.stack || reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err?.stack || err);
});

// ── 헬스체크 엔드포인트 (Render가 여기로 살아있음 확인할 수 있게) ──
app.get('/healthz', (_req, res) => {
  res.status(200).send('ok');
});

// ── Pulselive 프록시 라우터(헤더/상태 그대로 전달) ──────────────────
// 404/403일 때 axios가 예외 던지지 않도록 validateStatus: ()=>true
app.get("/api/player/:id", async (req, res) => {
  const playerId = req.params.id;
  const season = String(req.query.season || "2025");
  const url = `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8/seasons/${season}/players/${playerId}/stats`;
  try {
    const r = await axios.get(url, {
      headers: {
        Origin: "https://www.premierleague.com",
        Referer: "https://www.premierleague.com/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
      },
      timeout: 12000,
      validateStatus: () => true,
    });
    // 상태/바디 그대로 전달 (디버깅 쉬움)
    res.status(r.status).json(r.data);
  } catch (e) {
    console.error("PL proxy fatal:", { url, msg: e.message });
    res.status(500).json({ error: "proxy_failed", detail: e.message });
  }
});

// ── DB 연결 확인용 ────────────────────────────────────────────────────
app.get('/db/ping', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: rows[0]?.ok === 1 });
  } catch (e) {
    console.error('DB /db/ping error:', e);
    res.status(500).json({ error: 'db_ping_failed' });
  }
});

// ── 시즌·대회·플레이어ID로 스탯 조회 ───────────────────────────────
// 예: GET /db/stats?player_id=225796&season=2022&competition_id=8
app.get('/db/stats', async (req, res) => {
  try {
    const { player_id, season, competition_id } = req.query;
    if (!player_id || !season || !competition_id) {
      return res.status(400).json({ error: 'player_id, season, competition_id are required' });
    }
    const pid = Number(player_id);
    const sy = Number(season);
    const cid = Number(competition_id);
    if (!Number.isInteger(pid) || !Number.isInteger(sy) || !Number.isInteger(cid)) {
      return res.status(400).json({ error: 'player_id, season, competition_id must be integers' });
    }

    const [rows] = await pool.query(
      `SELECT metric, value
         FROM playerSeasonStats
        WHERE player_id = ? AND season_year = ? AND competition_id = ?`,
      [pid, sy, cid]
    );
    res.json({ player_id: pid, season: sy, competition_id: cid, stats: rows });
  } catch (e) {
    console.error('DB /db/stats error:', e);
    res.status(500).json({ error: 'db_query_failed' });
  }
});

// ── 슬러그로 스탯 조회 (조인) ───────────────────────────────────────
// 예: GET /db/stats-by-slug?slug=reece_james&season=2022&competition_id=5
app.get('/db/stats-by-slug', async (req, res) => {
  try {
    const { slug, season, competition_id } = req.query;
    if (!slug || !season || !competition_id) {
      return res.status(400).json({ error: 'slug, season, competition_id are required' });
    }
    const sy = Number(season);
    const cid = Number(competition_id);
    if (!Number.isInteger(sy) || !Number.isInteger(cid)) {
      return res.status(400).json({ error: 'season, competition_id must be integers' });
    }

    const [rows] = await pool.query(
      `SELECT pss.player_id, p.slug, pss.metric, pss.value
         FROM playerSeasonStats pss
         JOIN playerID p ON p.id = pss.player_id
        WHERE p.slug = ? AND pss.season_year = ? AND pss.competition_id = ?`,
      [slug, sy, cid]
    );
    res.json({ slug, season: sy, competition_id: cid, stats: rows });
  } catch (e) {
    console.error('DB /db/stats-by-slug error:', e);
    res.status(500).json({ error: 'db_query_failed' });
  }
});

// ── 팀 랭킹 조회 ────────────────────────────────────────────────────
// 예: GET /db/rankings?season=2024&competition_id=1&category=goals
app.get('/db/rankings', async (req, res) => {
  try {
    const { season, competition_id, category } = req.query;
    if (!season || !competition_id || !category) {
      return res.status(400).json({ error: 'season, competition_id, category are required' });
    }
    const sy = Number(season);
    const cid = Number(competition_id);
    if (!Number.isInteger(sy) || !Number.isInteger(cid)) {
      return res.status(400).json({ error: 'season, competition_id must be integers' });
    }

    const [rows] = await pool.query(
      `SELECT slug, player_id, category, rank_value, rank_percent_overall, player_additional_stat
         FROM playerTeamRanking
        WHERE season_year = ? AND competition_id = ? AND category = ?
        ORDER BY rank_value ASC, slug ASC`,
      [sy, cid, category]
    );
    res.json({ season: sy, competition_id: cid, category, rankings: rows });
  } catch (e) {
    console.error('DB /db/rankings error:', e);
    res.status(500).json({ error: 'db_query_failed' });
  }
});

// ── 마지막: 확실히 포트 바인딩 + 바인드 로그 ─────────────────────────
const HOST = '0.0.0.0';                   // 명시적으로 바인드
const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});