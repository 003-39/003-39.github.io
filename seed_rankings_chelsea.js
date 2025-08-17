const axios = require('axios');
const mysql = require('mysql2/promise');

const DB = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'chelsea',
};
function deriveNames(row) {
    const profileUrl = row?.playerAvatar?.profileLink?.url || null;   // 예: "/en/teams/profile/enzo-fernandez"
    const displayName =
      row?.playerAvatar?.profileLink?.title ||
      row?.playerAvatar?.lastName ||
      null;
    return { displayName, profileUrl };
  }
  
  async function upsertTeamRanking(conn, seasonYear, competitionId, rec) {
    // rec = { category, slug, rank_value, rank_percent_overall, player_additional_stat, display_name?, profile_url? }
    const [pidRows] = await conn.query('SELECT id FROM playerID WHERE slug=? LIMIT 1', [rec.slug]);
    const playerId = pidRows[0]?.id ?? null;
    if (playerId == null) console.log('[MISS] slug->player_id not found:', rec.slug);
  
    await conn.query(
      `INSERT INTO playerTeamRanking
         (season_year, competition_id, category, slug, player_id,
          display_name, profile_url,
          rank_value, rank_percent_overall, player_additional_stat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         rank_value = VALUES(rank_value),
         rank_percent_overall = VALUES(rank_percent_overall),
         player_additional_stat = VALUES(player_additional_stat),
         display_name = COALESCE(VALUES(display_name), display_name),
         profile_url  = COALESCE(VALUES(profile_url),  profile_url),
         player_id = COALESCE(playerTeamRanking.player_id, VALUES(player_id))`,
      [
        seasonYear, competitionId, rec.category, rec.slug, playerId,
        rec.display_name ?? null, rec.profile_url ?? null,
        rec.rank_value, rec.rank_percent_overall, rec.player_additional_stat
      ]
    );
  }

const sleep = ms => new Promise(r => setTimeout(r, ms));

const toSlug = (s) =>
  String(s || '')
    .trim().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const urlSlugToDbSlug = (s) => s.replace(/-/g, '_'); // DB의 slug 형식과 맞춤

function extractSlugFromProfileLink(profileLink) {
  // 예: "/en/teams/profile/enzo-fernandez" → "enzo_fernandez"
  const url = profileLink?.url || '';
  const seg = url.split('/').filter(Boolean).pop() || '';
  return urlSlugToDbSlug(seg);
}
// 숫자/퍼센트/순위 문자열을 안전하게 숫자로 변환 (실패 시 null)
function toNumberOrNull(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      // "100%", "0.40", "2", "1st", "223 mins" → 숫자만 추출
      const cleaned = v.replace(/[^\d.+-]/g, '');
      if (!cleaned || cleaned === '.' || cleaned === '+' || cleaned === '-' || cleaned === '+.' || cleaned === '-.')
        return null;
      const n = Number(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

function extractRankings(body) {
    const out = [];
    const pushFromBlock = (category, block) => {
      const arr = block?.teamRankings;
      if (!Array.isArray(arr)) return;
      for (const row of arr) {
        const slug = extractSlugFromProfileLink(row?.playerAvatar?.profileLink)
                     || urlSlugToDbSlug(toSlug(row?.playerAvatar?.lastName || ''));
        if (!slug) continue;
  
        const { displayName, profileUrl } = deriveNames(row);
        const rank_value = toNumberOrNull(row?.rankValue);
        const player_additional_stat = toNumberOrNull(row?.playerAdditionalStat);
        const overallPercentRaw =
          row?.overallTeamRankingPercent ??
          row?.playerRankingPercent ??
          block?.overallTeamRankingPercent ??
          block?.playerRankingPercent;
        const rank_percent_overall = toNumberOrNull(overallPercentRaw);
  
        if (rank_value !== null) {
          out.push({
            category, slug,
            display_name: displayName,
            profile_url: profileUrl,
            rank_value, rank_percent_overall, player_additional_stat
          });
        }
      }
    };
  
    if (body?.goals)       pushFromBlock('goals', body.goals);
    if (body?.passSuccess) pushFromBlock('passSuccess', body.passSuccess);
    if (body?.touches)     pushFromBlock('touches', body.touches);
    if (body?.shots)       pushFromBlock('shots', body.shots);
    return out;
 }

async function slugToPlayerId(conn, slug) {
  const [rows] = await conn.query('SELECT id FROM playerID WHERE slug=? LIMIT 1', [slug]);
  return rows[0]?.id ?? null; // 없으면 null 유지
}

// 기존 함수 교체
async function upsertTeamRanking(conn, seasonYear, competitionId, rec) {
    // rec = { category, slug, rank_value, rank_percent_overall, player_additional_stat }
    // slug -> player_id 매핑 (없으면 null 그대로)
    const [pidRows] = await conn.query(
      'SELECT id FROM playerID WHERE slug = ? LIMIT 1',
      [rec.slug]
    );
    const playerId = pidRows[0]?.id ?? null;
    if (playerId == null) {
      console.log('[MISS] slug->player_id not found:', rec.slug);
    }
  
    // ⬇️ slug를 반드시 INSERT에 포함!
    await conn.query(
      `INSERT INTO playerTeamRanking
         (season_year, competition_id, category, slug, player_id,
          rank_value, rank_percent_overall, player_additional_stat)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         -- 값 업데이트
         rank_value = VALUES(rank_value),
         rank_percent_overall = VALUES(rank_percent_overall),
         player_additional_stat = VALUES(player_additional_stat),
         -- player_id는 기존 값이 NULL일 때만 채우기 (이미 있으면 보존)
         player_id = COALESCE(playerTeamRanking.player_id, VALUES(player_id))`,
      [
        seasonYear,
        competitionId,
        rec.category,
        rec.slug,                 // ✅ 여기!
        playerId,                 // null일 수 있음
        rec.rank_value,
        rec.rank_percent_overall,
        rec.player_additional_stat
      ]
    );
  }

function pickSelectedSeasonCompetition(body) {
  const selSeason = (body?.seasons || []).find(s => s.selectedValue) || (body?.seasons || [])[0];
  const selComp   = (body?.competitions || []).find(c => c.selectedValue) || (body?.competitions || [])[0];
  return {
    season: selSeason ? Number(selSeason.value) : null,
    comp:   selComp ? Number(selComp.value) : null,
  };
}

async function processOne(conn, entryId, season, comp) {
  const base = `https://www.chelseafc.com/en/api/profiles/${entryId}/stats?playerEntryId=${entryId}`;
  const qs = [];
  if (Number.isFinite(season)) qs.push(`seasonId=${season}`);
  if (Number.isFinite(comp))   qs.push(`competitionId=${comp}`);
  const url = qs.length ? `${base}&${qs.join('&')}` : base;

  const r = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 12000,
    validateStatus: () => true
  });
  if (r.status !== 200) {
    console.log('[MISS]', entryId, season ?? '-', comp ?? '-', r.status);
    return;
  }

  const body = r.data || {};
  const meta = pickSelectedSeasonCompetition(body);
  const seasonYear = Number.isFinite(season) ? season : meta.season;
  const compId     = Number.isFinite(comp)   ? comp   : meta.comp;

  const ranks = extractRankings(body);
  console.log(`[RANK] entry=${entryId} season=${seasonYear} comp=${compId} rows=${ranks.length}`);
  for (const rec of ranks) {
    await upsertTeamRanking(conn, seasonYear, compId, rec);
  }
}

async function processSeasonAllCompetitions(conn, entryId, season) {
  // comp 목록을 얻기 위해 시즌만 지정해 먼저 호출
  const url = `https://www.chelseafc.com/en/api/profiles/${entryId}/stats?playerEntryId=${entryId}&seasonId=${season}`;
  const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000, validateStatus: () => true });
  if (r.status !== 200) return;
  const comps = (r.data?.competitions || []).map(c => Number(c?.value)).filter(Number.isFinite);
  if (!comps.length) { await processOne(conn, entryId, season, undefined); return; }
  for (const c of comps) {
    await processOne(conn, entryId, season, c);
    await sleep(120);
  }
}

(async function main() {
  const pool = await mysql.createPool({
    ...DB,
    waitForConnections: true,
    connectionLimit: 1,
    connectTimeout: 10000,
  });
  console.log(`[DB] ${DB.host}/${DB.database}`);

  try {
    const entries = (process.env.ENTRY_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);
    const seasons = (process.env.SEASONS || '2024,2023,2022,2021,2020,2019').split(',').map(x=>+x).filter(Number.isFinite);

    if (!entries.length) {
      console.log('ENTRY_IDS="chelseaEntry1,chelseaEntry2" 를 지정하세요.');
      return;
    }

    for (const e of entries) {
      for (const y of seasons) {
        await processSeasonAllCompetitions(pool, e, y);
      }
    }
  } finally {
    await pool.end();
  }
})();