// seed_stats.js
// npm i axios mysql2
const axios = require('axios');
const mysql = require('mysql2/promise');

console.log('[BOOT] seed_stats start');

const DB = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: 'chelsea',
};

// 스캔할 시즌 범위(최신부터 내려가며 시도)
const SEASONS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017]; // 필요하면 더 추가


// Pulselive API — server.js에서 쓰던 형식
const apiUrl = (playerId, season) =>
  `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/competitions/8/seasons/${season}/players/${playerId}/stats`;

async function main() {
  // 풀 생성 (동시성 처리 안정화)
  const pool = mysql.createPool({
    host: DB.host,
    port: DB.port,
    user: DB.user,
    password: DB.password,
    database: DB.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000,   // 8s connect timeout
    acquireTimeout: 10000,  // 10s acquire timeout
  });
  console.log('[STEP] pool created');

  // 환경변수로 플레이어/시즌 오버라이드
  const envPlayers = (process.env.PLAYERS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => Number(n))
    .filter(Number.isFinite);

  const envSeasons = (process.env.SEASONS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => Number(n))
    .filter(Number.isFinite);

  const seasons = envSeasons.length ? envSeasons : SEASONS;

  // 선수 목록 로드: env가 있으면 그걸 쓰고, 없으면 DB에서 전체 로드
  let players;
  if (envPlayers.length) {
    players = envPlayers.map(id => ({ id }));
    console.log('[STEP] using PLAYERS from env:', envPlayers.join(','));
  } else {
    console.log('[STEP] loading players from DB...');
    try {
      const [rows] = await pool.query(`SELECT id FROM playerID ORDER BY id`);
      players = rows;
    } catch (e) {
      console.error('[ERR] loading players failed:', e.message);
      throw e;
    }
  }
  console.log(`Players loaded: ${players.length}`);
  console.log(`Seasons: ${seasons.join(', ')}`);

  // 동시 실행 개수 (기본 4, 환경변수로 조정 가능)
  const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY || '4', 10));
  console.log('[STEP] CONCURRENCY =', CONCURRENCY);

  // 2) 선수 x 시즌 루프 → 실행 함수 배열 준비
  const jobs = [];
  for (const row of players) {
    const playerId = row.id;
    for (const season of seasons) {
      jobs.push(() => fetchAndUpsertOne(pool, playerId, season));
    }
  }
  console.log('[STEP] total jobs =', jobs.length);

  // 3) 배치 실행 (CONCURRENCY개씩 병렬 처리)
  let ok = 0, fail = 0;
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map(fn => fn()));
    for (const r of results) {
      if (r.status === 'fulfilled') ok++; else fail++;
    }
    console.log(`[BATCH] ${Math.min(i + CONCURRENCY, jobs.length)}/${jobs.length} done, ok=${ok}, fail=${fail}`);
  }

  console.log(`Done. success=${ok}, fail=${fail}`);

  await pool.end();
}

async function fetchAndUpsertOne(db, playerId, season) {
  // 캐시되어 있는지 간단 체크(이미 있으면 스킵해도 됨)
  const [exist] = await db.query(
    `SELECT 1 FROM playerSeasonStats WHERE player_id=? AND season_year=? LIMIT 1`,
    [playerId, season]
  );
  // 스킵하고 싶으면 아래 주석을 해제하세요
  // if (exist.length) return; 

  // 1) API 호출
  const r = await axios.get(apiUrl(playerId, season), {
    headers: {
      Origin: "https://www.premierleague.com",
      Referer: "https://www.premierleague.com/",
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json,text/plain,*/*",
    },
    timeout: 8000,
    validateStatus: () => true,
  });

  if (r.status !== 200) {
    console.log(`[MISS] ${playerId} ${season} -> ${r.status}`);
    console.log(`[MISS] progress continues`);
    return;
  }

  const data = r.data || {};
  const stats = data.stats || {};
  const rows = [];

  // 2) 화이트리스트에 포함된 지표만 수집(숫자만)
  for (const [k, v] of Object.entries(stats)) {
    const num = Number(v);
    if (Number.isFinite(num)) {
      rows.push([playerId, season, k, num]);
    }
  }

  if (!rows.length) {
    console.log(`[EMPTY] ${playerId} ${season}`);
    console.log(`[EMPTY] progress continues`);
    return;
  }

  // 3) 대량 UPSERT
  await db.query(
    `INSERT INTO playerSeasonStats (player_id, season_year, metric, value)
     VALUES ?
     ON DUPLICATE KEY UPDATE value=VALUES(value)`,
    [rows]
  );

  console.log(`[OK] player=${playerId} season=${season} metrics=${rows.length}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});