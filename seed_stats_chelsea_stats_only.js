const axios = require('axios');
const mysql = require('mysql2/promise');
const { URL } = require('url');

// ===== Retry helper & DB wrapper =====
async function withRetry(fn, { retries = 3, delayMs = 300 } = {}) {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      const code = err && (err.code || err.sqlState || err.errno);
      const transient =
        code === 'ER_NET_READ_INTERRUPTED' ||
        code === 'PROTOCOL_PACKETS_OUT_OF_ORDER' ||
        code === 'ECONNRESET' ||
        code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR';
      if (!transient || i === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
async function dbQuery(pool, sql, params) {
  return withRetry(() => pool.query(sql, params));
}

const DB =  {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'coqs122141!',
    database: process.env.MYSQL_DATABASE || 'chelsea'
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function toKey(s) {
  return String(s)
    .replace(/[%]/g, 'Pct')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

function parseNumberLike(s) {
    if (s == null) return null;
    const str = String(s).trim();
    const pct = str.match(/^(-?\d+(?:\.\d+)?)\s*%$/);
    if (pct) return Number(pct[1]);
    const cleaned = str.replace(/,/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

function splitPair(str) {
    if (!str) return null;
    const m = String(str).trim().match(/^(-?\d+(?:\.\d+)?)[^\d]+(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2])];
}

function parseChelseaUrl(u) {
  const url = new URL(u);
  const entryIdPath = url.pathname.split('/').filter(Boolean).pop(); // .../profiles/<entry>/stats
  const entryIdQuery = url.searchParams.get('playerEntryId');        // correct case
  const entryId = entryIdQuery || entryIdPath;

  const seasonId = url.searchParams.get('seasonId');
  const competitionId = url.searchParams.get('competitionId');

  return {
    entryId,
    seasonId: seasonId ? Number(seasonId) : null,
    competitionId: competitionId ? Number(competitionId) : null,
  };
}

function pickSeasonCompetition(body) {
    let seasonYear = null;
    if (Array.isArray(body.seasons)) {
        const sel = body.seasons.find(s => s.selectedValue);
        seasonYear = sel ? parseInt(sel.value, 10) : parseInt(body.seasons[0]?.value, 10);
    }
    let competitionId = null;
    if (Array.isArray(body.competitions)) {
        const sel = body.competitions.find(c => c.selectedValue);
        competitionId = sel ? Number(sel.value) : Number(body.competitions[0]?.value);
    }
    return {
        seasonYear: Number.isFinite(seasonYear) ? seasonYear : 0,
        competitionId: Number.isFinite(competitionId) ? competitionId : 0,
    };
}

function resolveSeasonCompetition(body, overrideSeasonId, overrideCompetitionId) {
  const base = pickSeasonCompetition(body);
  const seasonYear = Number.isFinite(overrideSeasonId) ? overrideSeasonId : base.seasonYear;
  const competitionId = Number.isFinite(overrideCompetitionId) ? overrideCompetitionId : base.competitionId;
  return {
    seasonYear: Number.isFinite(seasonYear) ? seasonYear : 0,
    competitionId: Number.isFinite(competitionId) ? competitionId : 0,
  };
}

function flattenStatsOnly(body) {
    const out = {};

    function walk(node, path = []) {
        if (node == null) return;

        if (Array.isArray(node)) {
            node.forEach(item => walk(item, path));
            return;
        }

        if (typeof node === 'object') {
            if ('title' in node && 'value' in node && node.value != null) {
                const pair = typeof node.value === 'string' ? splitPair(node.value) : null;
                if (pair) {
                    const base = toKey([...path, node.title].join('_'));
                    out[`${base}_a`] = pair[0];
                    out[`${base}_b`] = pair[1];
                    return;
                }
                const key = toKey([...path, node.title].join('_'));
                const val = parseNumberLike(node.value);
                if (val != null) out[key] = val;
                return;
            }

            for (const [k, v] of Object.entries(node)) {
                if (k === 'image' || k === 'playerAvatar' || k === 'teamRankings') continue;
                if (k === 'profileLink' || k === 'urlObject' || k === 'file' || k === 'coordinates') continue;
                
                if (typeof v === 'number') {
                  out[toKey([...path, k].join('_'))] = v;
                  continue;
                }

                if (typeof v == 'string') {
                    const pair = splitPair(v);
                    if (pair) {
                        const base = toKey([...path, k].join('_'));
                        out[`${base}_a`] = pair[0];
                        out[`${base}_b`] = pair[1];
                        continue;
                    }
                    const num = parseNumberLike(v);
                    if (num != null) {
                        out[toKey([...path, k].join('_'))] = num;
                        continue;
                    }
                }
                walk(v, [...path, k]);
            }
            return;
        }

        if (typeof node === 'number') {
            out[toKey(path.join('_'))] = node;
        }
    }

      // 최상위 블록 순회 (seasons/competitions는 메타라 제외)
  for (const [k, v] of Object.entries(body || {})) {
    if (k === 'seasons' || k === 'competitions') continue;
    walk(v, [k]);
  }

  // 특수 케이스: appearances.subbed on/off
  if (body.appearances?.stats) {
    const sub = body.appearances.stats.find(s => String(s.title).toLowerCase().includes('subbed'));
    if (sub && sub.value) {
      const p = splitPair(sub.value);
      if (p) {
        out['appearances_subbed_on'] = p[0];
        out['appearances_subbed_off'] = p[1];
      }
    }
  }

  // 특수 케이스: touches 안의 "X / Y"들
  if (body.touches?.stats) {
    for (const s of body.touches.stats) {
      if (typeof s?.title === 'string' && s?.value) {
        const pair = splitPair(s.value);
        if (pair) {
          const base = toKey(`touches_${s.title}`);
          out[`${base}_a`] = pair[0];
          out[`${base}_b`] = pair[1];
        }
      }
    }
  }

  return out;
}

async function mapEntryToPlayer(db, entryId) {
  const [rows] = await dbQuery(db, 'SELECT player_id FROM chelseaPlayerMap WHERE entry_id=?', [entryId]);
  if (!rows.length) throw new Error(`mapping not found for entry_id=${entryId}`);
  return rows[0].player_id;
}

async function upsertEAV(db, playerId, seasonYear, competitionId, kv) {
  const rows = [];
  for (const [metric, val] of Object.entries(kv)) {
    if (Number.isFinite(val)) {
      rows.push([playerId, seasonYear, competitionId, metric, val]);
    }
  }
  if (!rows.length) return 0;

  await dbQuery(
    db,
    `INSERT INTO playerSeasonStats (player_id, season_year, competition_id, metric, value)
     VALUES ?
     AS new
     ON DUPLICATE KEY UPDATE value = new.value`,
    [rows]
  );
  return rows.length;
}

async function processOne(pool, entryId, seasonIdOptional, competitionIdOptional) {
  const playerId = await mapEntryToPlayer(pool, entryId);

  const base = `https://www.chelseafc.com/en/api/profiles/${entryId}/stats?playerEntryId=${entryId}`;
  const params = [];
  if (Number.isFinite(seasonIdOptional)) params.push(`seasonId=${seasonIdOptional}`);
  if (Number.isFinite(competitionIdOptional)) params.push(`competitionId=${competitionIdOptional}`);
  const url = params.length ? `${base}&${params.join('&')}` : base;

  const r = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json,text/plain,*/*',
      Referer: 'https://www.chelseafc.com/',
      Origin: 'https://www.chelseafc.com',
    },
    timeout: 10000,
    validateStatus: () => true,
  });
  if (r.status !== 200) {
    console.log(`[MISS] ${entryId} season=${seasonIdOptional ?? '-'} comp=${competitionIdOptional ?? '-'} -> HTTP ${r.status}`);
    return { inserted: 0, seasonYear: 0, competitionId: 0 };
  }

  const body = r.data || {};
  const { seasonYear, competitionId } = resolveSeasonCompetition(body, seasonIdOptional, competitionIdOptional);

  // Skip saving when "Men's Team Appearances" is 0 for this season+competition
  const appearancesStat = Array.isArray(body?.appearances?.stats)
    ? body.appearances.stats.find(s => typeof s?.title === 'string' && s.title.trim().toLowerCase() === "men's team appearances")
    : null;
  const appearancesVal = appearancesStat ? parseNumberLike(appearancesStat.value) : null;
  if (appearancesVal === 0) {
    console.log(`[SKIP] entry=${entryId} -> player=${playerId} season=${seasonYear} comp=${competitionId} appearances=0`);
    return { inserted: 0, seasonYear, competitionId };
  }

  const flat = flattenStatsOnly(body);
  console.log(`[FLAT] metrics=${Object.keys(flat).length} entry=${entryId} season=${seasonYear} comp=${competitionId}`);
  if (Object.keys(flat).length === 0) {
    console.log(`[WARN] No numeric metrics to insert for entry=${entryId} season=${seasonYear} comp=${competitionId}`);
  }
  const inserted = await upsertEAV(pool, playerId, seasonYear, competitionId, flat);

  console.log(`[OK] entry=${entryId} -> player=${playerId} season=${seasonYear} comp=${competitionId} metrics=${inserted}`);
  return { inserted, seasonYear, competitionId };
}

async function processSeasonAllCompetitions(pool, entryId, seasonId) {
  // First fetch without competitionId to read the competitions list
  const base = `https://www.chelseafc.com/en/api/profiles/${entryId}/stats?playerEntryId=${entryId}&seasonId=${seasonId}`;
  const r = await axios.get(base, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json,text/plain,*/*',
      Referer: 'https://www.chelseafc.com/',
      Origin: 'https://www.chelseafc.com',
    },
    timeout: 10000,
    validateStatus: () => true,
  });
  if (r.status !== 200) {
    console.log(`[MISS] list competitions entry=${entryId} season=${seasonId} -> HTTP ${r.status}`);
    return;
  }
  const body = r.data || {};
  const comps = Array.isArray(body.competitions) ? body.competitions : [];
  const compIds = comps
    .map(c => Number(c?.value))
    .filter(n => Number.isFinite(n));

  console.log(`[LIST] entry=${entryId} season=${seasonId} comps=${compIds.join(',') || '(none)'}`);

  // If none found, still process the base (selected competition)
  if (!compIds.length) {
    await processOne(pool, entryId, seasonId, undefined);
    return;
  }

  for (const cid of compIds) {
    await processOne(pool, entryId, seasonId, cid);
    await sleep(150);
  }
}

async function main() {
    const pool = await mysql.createPool({
      ...DB,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    console.log(`[DB] host=${DB.host} db=${DB.database} user=${DB.user}`);

    const urls = (process.env.CHELSEA_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
    const entries = (process.env.ENTRY_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    const seasons = (process.env.SEASONS || '').split(',').map(s => s.trim()).filter(Boolean).map(n => Number(n)).filter(Number.isFinite);

  try {
    if (urls.length) {
      for (const u of urls) {
        const { entryId, seasonId, competitionId } = parseChelseaUrl(u);
        await processOne(pool, entryId, seasonId ?? undefined, competitionId ?? undefined);
        await sleep(150);
      }
    } else {
      const defaultSeasons = [2024, 2023, 2022, 2021, 2020, 2019];
      const seasonList = seasons.length ? seasons : defaultSeasons;

      if (entries.length) {
        for (const e of entries) {
          for (const y of seasonList) {
            await processSeasonAllCompetitions(pool, e, y);
            await sleep(150);
          }
        }
      } else {
        console.log('Set CHELSEA_URLS="url1,url2" or ENTRY_IDS="id1,id2" [optional SEASONS="2024,2023"]. Default seasons: 2024,2023,2021,2020,2019,2018');
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});