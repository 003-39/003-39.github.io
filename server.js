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

// ── 마지막: 확실히 포트 바인딩 + 바인드 로그 ─────────────────────────
const HOST = '0.0.0.0';                   // 명시적으로 바인드
const PORT = process.env.PORT || 3000;
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
});