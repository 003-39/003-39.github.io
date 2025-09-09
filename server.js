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

// ---- DB: seasons list for a player (optionally filtered by competition_id) ----
app.get('/db/seasons', async (req, res) => {
  try {
    const playerId = Number(req.query.player_id);
    const compId = req.query.competition_id ? Number(req.query.competition_id) : null;
    if (!Number.isFinite(playerId)) {
      return res.status(400).json({ error: 'player_id is required' });
    }

    let sql = `
      SELECT DISTINCT season_year 
      FROM playerSeasonStats 
      WHERE player_id = ?
    `;
    const params = [playerId];

    if (Number.isFinite(compId)) {
      sql += ` AND competition_id = ?`;
      params.push(compId);
    }
    sql += ` ORDER BY season_year DESC`;

    const [rows] = await pool.query(sql, params);
    const years = rows.map(r => Number(r.season_year)).filter(n => Number.isFinite(n));
    res.json(years);
  } catch (err) {
    console.error('DB /db/seasons error:', err);
    res.status(500).json({ error: 'internal_error' });
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

// ── 상수 정의 ─────────────────────────────────────────────────────────────
const METRIC_ALIAS = {
  // --- Appearances ---
  'appearances_stats_men_s_team_appearances': 'appearances', // Game Played
  'appearances_stats_starts': 'starts',
  'appearances_stats_minutes_played': 'timePlayed', // Minutes Played
  'appearances_subbed_on': 'substituteOn', // Subbed On
  'appearances_subbed_off': 'substituteOff', // Subbed Off

  // --- Discipline ---
  'fouls_yellowcards_yellow_cards': 'yellowCards',
  'fouls_redcards_red_cards': 'straightRedCards',

  // --- Fouls ---
  'fouls_foulscommitted_fouls_committed': 'totalFoulsConceded',
  'fouls_foulsdrawn_fouls_drawn': 'totalFoulsWon',

  // --- Touches ---
  'touches_stats_total_touches': 'touches',
  'touches_total_touches': 'touches',
  'touches_stats_clearances': 'totalClearances',
  'touches_stats_tackles_won_lost_a': 'tacklesWon',
  'touches_stats_interceptions': 'interceptions',
  'touches_stats_blocks': 'blocks',
  'touches_stats_duels_won_lost_a': 'duelsWon',

  // --- Passing ---
  'passes_forwards_forward': 'forwardPasses',
  'passes_left_left': 'leftsidePasses',
  'passes_right_right': 'rightsidePasses',
  'passes_backwards_back': 'backwardPasses',
  'passsuccess_stats_total_passes': 'totalPasses',
  'passsuccess_stats_key_passes': 'keyPassesAttemptAssists', // Big Chances Created
  'passsuccess_stats_successful_crosses': 'successfulCrossesOpenPlay',
  'passsuccess_stats_assists': 'goalAssists',
  'passcompletion_playershortpasses_short_balls': 'pass_complecation', // Pass %
  'passcompletion_playerlongpasses_long_balls': 'long_pass_sucsess', // Long Balls %

  // --- Goals / Shots ---
  'goals_stats_total_goals': 'goals',
  'goals_stats_goals_per_match': 'goal_per_match',
  'goals_goalsinsidebox': 'inbox-rate',
  'goals_goalsoutsidebox': 'obox-rate',
  'goals_stats_minutes_per_goal': 'minutes_per_goal',
  'shots_playershotsontarget': 'shotsOnTargetRate', // Penalties 자리?
  'shots_playerwoodworkhit': 'totalShots',
  'scoredwith_head_head': 'headedGoals',
  'scoredwith_rightfoot_right_foot': 'rightFootGoals',
  'scoredwith_leftfoot_left_foot': 'leftFootGoals',
  'scoredwith_penalties_penalties': 'penalties', // Penalties
  'scoredwith_freekicks_free_kicks': 'freeKicks', // Free Kicks
  
  'timePlayed': 'timePlayed',
  'touches': 'touches',
  'goalAssists': 'goalAssists',
  'goals': 'goals',
  'minutesPlayed': 'timePlayed',
  'gamesPlayed': 'appearances'
};

// ── Helpers: merge *_a/*_b pairs and map to canonical keys ────────────────
function mergeThousandPairs(rows) {
  // Combine metrics that were split as {metric_a, metric_b} meaning thousands + remainder
  const aMap = new Map();
  const bMap = new Map();
  const out = {};

  for (const { metric, value } of rows) {
    // MySQL may return strings; normalize to integer
    const num = Number(value);
    if (Number.isNaN(num)) continue;

    if (metric.endsWith('_a')) {
      const base = metric.slice(0, -2);
      aMap.set(base, num);
    } else if (metric.endsWith('_b')) {
      const base = metric.slice(0, -2);
      bMap.set(base, num);
    } else {
      out[metric] = num;
    }
  }

  // Merge pairs: base = a*1000 + b
  for (const base of new Set([...aMap.keys(), ...bMap.keys()])) {
    const a = aMap.get(base) || 0;
    const b = bMap.get(base) || 0;
    out[base] = a * 1000 + b;
  }
  return out;
}


function mapToCanonical(merged) {
  const out = {};
  for (const [k, v] of Object.entries(merged)) {
    const alias = METRIC_ALIAS[k] || k; // fallback to original if not mapped
    out[alias] = v;
  }
  return out;
}

// ── Normalized stats endpoint: merges a/b pairs + maps keys, integers only ──
// GET /db/stats-normalized?player_id=179268&amp;season=2024&amp;competition_id=8
app.get('/db/stats-normalized', async (req, res) => {
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

    const merged = mergeThousandPairs(rows);
    const canonical = mapToCanonical(merged);
    
    // 디버깅: obox-rate, inbox-rate 관련 데이터 확인
    console.log('🔍 원본 rows에서 goals 관련 데이터:', rows.filter(r => r.metric.includes('goals')));
    console.log('🔍 merged에서 goals 관련 데이터:', Object.keys(merged).filter(k => k.includes('goals')));
    console.log('🔍 canonical에서 goals 관련 데이터:', Object.keys(canonical).filter(k => k.includes('goals') || k.includes('rate')));

    res.json({
      player_id: pid,
      season: sy,
      competition_id: cid,
      data: canonical
    });
  } catch (e) {
    console.error('DB /db/stats-normalized error:', e);
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
