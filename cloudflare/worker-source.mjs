// Paste this entire file into skolarkaden-api's Cloudflare editor and deploy.
// Required D1 binding: DB. Existing databases need add-score-settings.sql first;
// new databases use schema.sql. No browser API key is used.
const ALLOWED_ORIGIN = 'https://jakobrogstadius.github.io';
const GAMES = new Set(['city', 'food', 'garden', 'hive', 'paint', 'dinosaur', 'marshmallows', 'eggs', 'home']);
const { legacyMathIds, canonicalExercise } = globalThis.SkolarkadenHighscorePolicy;
const LESSONS = new Set(['letters', 'swedish', 'swedishLong', 'english', 'englishLong',
  'bopomofo', 'chinese', 'chineseTrad2', 'chineseTrad3', 'chineseTrad4',
  'chineseSimpl1', 'chineseSimpl2', 'chineseSimpl3', 'chineseSimpl4',
  ...Object.keys(legacyMathIds), ...Object.values(legacyMathIds), 'math-diagrams', 'math-simple-equations']);
const PACES = new Set(['gentle', 'steady', 'brave']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAPABILITIES = { combined_boards: true, game_boards: true, submission_lookup: true, score_settings: 1, named_math_ids: 1 };
const LANGUAGES = new Set(['sv-SE', 'en-US', 'zh-TW', 'zh-CN']);

function validBoard(value) {
  if (typeof value !== 'string' || value.length > 160) return false;
  const [version, game, lesson, pace, extra] = value.split(':');
  return GAMES.has(game) && version === globalThis.SkolarkadenHighscorePolicy.versions[game] &&
    LESSONS.has(lesson) && PACES.has(pace) && extra === undefined;
}

function canonicalBoard(board) {
  if (typeof board !== 'string') return board;
  const parts = board.split(':'); parts[2] = canonicalExercise(parts[2]); return parts.join(':');
}

function canonicalSettings(json) {
  try { const settings = JSON.parse(json); settings.exercise = canonicalExercise(settings.exercise); return JSON.stringify(settings); }
  catch { return json; }
}

function settingsFor(body, board) {
  const raw = body.settings ?? {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid_settings');
  const [game_version, game, exercise, difficulty] = board.split(':');
  const settings = { game_version, game, exercise, difficulty };
  for (const [key, value] of Object.entries(settings)) if (raw[key] !== undefined &&
      (key === 'exercise' ? canonicalExercise(raw[key]) : raw[key]) !== value) throw new Error('invalid_settings');
  for (const key of ['input_mode', 'spoken_language', 'exercise_language']) {
    const value = raw[key] ?? null;
    if (value !== null && !(key === 'input_mode' ? ['keyboard', 'voice'].includes(value) : LANGUAGES.has(value))) throw new Error('invalid_settings');
    settings[key] = value;
  }
  for (const key of ['uppercase', 'sound_enabled', 'reduced_motion']) {
    const value = raw[key] ?? null;
    if (value !== null && typeof value !== 'boolean') throw new Error('invalid_settings');
    settings[key] = value;
  }
  const keys = raw.letter_keys ?? null;
  if (keys !== null && (exercise !== 'letters' || !Array.isArray(keys) || keys.length < 1 || keys.length > 37 ||
      keys.some(key => typeof key !== 'string' || !/^[\p{L}]$/u.test(key)))) throw new Error('invalid_settings');
  settings.letter_keys = keys;
  return JSON.stringify(settings);
}

async function readBody(request) {
  // Enforce the actual streamed size, including requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_json');
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error('body_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch (_) { throw new Error('invalid_json'); }
}

async function allowSubmission(request, db) {
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) throw new Error('Missing Cloudflare client address');
  const now = Math.floor(Date.now() / 1000), window = Math.floor(now / 60) * 60;
  // Rate counters use daily IP hashes, independently of IPs retained in score
  // rows. Clean expired counters on submissions; these are not player identities.
  const bytes = new TextEncoder().encode('skolarkaden:' + Math.floor(now / 86400) + ':' + ip);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const key = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('DELETE FROM score_rate_limits WHERE expires_at < ?').bind(now).run();
  const row = await db.prepare(`
    INSERT INTO score_rate_limits (client_key, window_start, attempts, expires_at)
    VALUES (?, ?, 1, ?)
    ON CONFLICT(client_key) DO UPDATE SET
      attempts = CASE WHEN window_start = excluded.window_start THEN attempts + 1 ELSE 1 END,
      window_start = excluded.window_start, expires_at = excluded.expires_at
    RETURNING attempts
  `).bind(key, window, now + 3600).first();
  // Shared school connections can have many simultaneous players.
  return row.attempts <= 120;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const headers = { 'Cache-Control': 'no-store', 'Vary': 'Origin' };
    if (origin === ALLOWED_ORIGIN) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
    }
    const reply = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { ...headers, ...extra } });
    if (origin && origin !== ALLOWED_ORIGIN) return reply({ error: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS' && url.pathname === '/scores') {
      return new Response(null, { status: 204, headers });
    }
    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        await env.DB.prepare('SELECT submission_id, ip, settings_json FROM highscores LIMIT 1').all();
        await env.DB.prepare('SELECT client_key FROM score_rate_limits LIMIT 1').all();
        return reply({ ok: true, database: 'connected', api: 'highscores-v1', capabilities: CAPABILITIES });
      }
      if (url.pathname !== '/scores') return reply({ error: 'not_found' }, 404);
      if (request.method === 'GET') {
        const board = url.searchParams.get('leaderboard');
        // Read every exercise and difficulty for this game version; stored keys stay intact.
        const group = typeof board === 'string' ? board.split(':').slice(0, 2).join(':') : '';
        if (!(board === group ? validBoard(group + ':letters:gentle') :
            board?.split(':').length === 3 ? validBoard(board + ':gentle') : validBoard(board))) return reply({ error: 'invalid_leaderboard' }, 400);
        const boards = [...LESSONS].flatMap(lesson => [...PACES].map(pace => group + ':' + lesson + ':' + pace));
        const slots = boards.map(() => '?').join(',');
        const submission = url.searchParams.get('submission') || '';
        const rawScore = url.searchParams.get('score');
        if ((submission && !UUID.test(submission)) || (rawScore !== null &&
            (!/^\d+$/.test(rawScore) || Number(rawScore) > 1000000))) return reply({ error: 'invalid_score' }, 400);
        const { results } = await env.DB.prepare(`
          SELECT player_name, score, created_at, leaderboard_key, submission_id = ? AS is_player FROM highscores
          WHERE leaderboard_key IN (${slots}) ORDER BY score DESC, created_at ASC, submission_id ASC LIMIT 10
        `).bind(submission, ...boards).all();
        const own = submission ? await env.DB.prepare(`SELECT score, created_at, submission_id FROM highscores
          WHERE leaderboard_key IN (${slots}) AND submission_id = ?`).bind(...boards, submission).first() : null;
        let rank = null;
        if (own) {
          const row = await env.DB.prepare(`SELECT count(*) AS n FROM highscores WHERE leaderboard_key IN (${slots}) AND
            (score > ? OR (score = ? AND (created_at < ? OR (created_at = ? AND submission_id <= ?))))`)
            .bind(...boards, own.score, own.score, own.created_at, own.created_at, own.submission_id).first();
          rank = row.n;
        } else if (rawScore !== null) {
          const row = await env.DB.prepare(`SELECT count(*) AS n FROM highscores WHERE leaderboard_key IN (${slots}) AND score >= ?`)
            .bind(...boards, Number(rawScore)).first();
          rank = row.n + 1;
        }
        return reply({ leaderboard: group, capabilities: CAPABILITIES, scores: results.map(({ leaderboard_key, ...row }) =>
          ({ ...row, exercise: canonicalExercise(leaderboard_key.split(':')[2]), difficulty: leaderboard_key.split(':')[3] })), rank, saved: Boolean(own) });
      }
      if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, OPTIONS' });
      if (origin !== ALLOWED_ORIGIN) return reply({ error: 'origin_required' }, 403);
      if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return reply({ error: 'json_required' }, 415);
      }
      const body = await readBody(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'invalid_score' }, 400);
      const { submission_id: id, score } = body, board = canonicalBoard(body.leaderboard_key);
      const name = typeof body.player_name === 'string' ? body.player_name.normalize('NFC').trim().toUpperCase() || 'ANONYM' : 'ANONYM';
      // Mirror the browser's silent drop; direct API calls cannot bypass it.
      if (globalThis.SkolarkadenHighscorePolicy.isBannedName(name)) return reply({ ok: true });
      if (typeof id !== 'string' || !UUID.test(id) || !validBoard(board) ||
          !/^[\p{L}\p{M} ]{1,10}$/u.test(name) ||
          !Number.isSafeInteger(score) || score < 0 || score > 1000000) {
        return reply({ error: 'invalid_score' }, 400);
      }
      const settings = settingsFor(body, board);
      if (!await allowSubmission(request, env.DB)) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
      const result = await env.DB.prepare(`
        INSERT INTO highscores (submission_id, leaderboard_key, player_name, score, ip, settings_json)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING
      `).bind(id, board, name, score, request.headers.get('CF-Connecting-IP'), settings).run();
      if (!result.meta.changes) {
        const existing = await env.DB.prepare(`
          SELECT leaderboard_key, player_name, score, settings_json FROM highscores WHERE submission_id = ?
        `).bind(id).first();
        if (canonicalBoard(existing.leaderboard_key) !== board || existing.player_name !== name || existing.score !== score ||
            body.settings && existing.settings_json && canonicalSettings(existing.settings_json) !== settings) {
          return reply({ error: 'submission_conflict' }, 409);
        }
        // A retry crossing the deployment can fill metadata on the original row.
        if (body.settings && !existing.settings_json) await env.DB.prepare('UPDATE highscores SET settings_json = ? WHERE submission_id = ? AND settings_json IS NULL').bind(settings, id).run();
      }
      return reply({ ok: true, settings_saved: true }, result.meta.changes ? 201 : 200);
    } catch (error) {
      if (error.message === 'body_too_large') return reply({ error: error.message }, 413);
      if (error.message === 'invalid_json') return reply({ error: error.message }, 400);
      if (error.message === 'invalid_settings') return reply({ error: error.message }, 400);
      console.error(error);
      return reply({ ok: false, error: 'service_unavailable' }, 503);
    }
  }
};
