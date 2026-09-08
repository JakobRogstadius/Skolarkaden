// Paste this entire file into skolarkaden-api's Cloudflare editor and deploy.
// Required D1 binding: DB. Run schema.sql first. No browser API key is used.
const ALLOWED_ORIGIN = 'https://jakobrogstadius.github.io';
const GAMES = new Set(['city', 'food', 'garden', 'hive', 'paint', 'dinosaur', 'marshmallows', 'eggs']);
const LESSONS = new Set(['letters', 'swedish', 'swedishLong', 'english', 'englishLong',
  'bopomofo', 'chinese', 'chineseTrad2', 'chineseTrad3', 'chineseTrad4',
  'chineseSimpl1', 'chineseSimpl2', 'chineseSimpl3', 'chineseSimpl4',
  'math', 'math2', 'math3', 'math4', 'math5', 'math6']);
const PACES = new Set(['gentle', 'steady', 'brave']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validBoard(value) {
  if (typeof value !== 'string' || value.length > 160) return false;
  const [version, game, lesson, pace, extra] = value.split(':');
  return GAMES.has(game) && version === globalThis.SkolarkadenHighscorePolicy.versions[game] &&
    LESSONS.has(lesson) && PACES.has(pace) && extra === undefined;
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
        await env.DB.prepare('SELECT submission_id, ip FROM highscores LIMIT 1').all();
        await env.DB.prepare('SELECT client_key FROM score_rate_limits LIMIT 1').all();
        return reply({ ok: true, database: 'connected', api: 'highscores-v1' });
      }
      if (url.pathname !== '/scores') return reply({ error: 'not_found' }, 404);
      if (request.method === 'GET') {
        const board = url.searchParams.get('leaderboard');
        if (!validBoard(board)) return reply({ error: 'invalid_leaderboard' }, 400);
        const { results } = await env.DB.prepare(`
          SELECT player_name, score, created_at FROM highscores
          WHERE leaderboard_key = ? ORDER BY score DESC, created_at ASC LIMIT 20
        `).bind(board).all();
        return reply({ leaderboard: board, scores: results });
      }
      if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, OPTIONS' });
      if (origin !== ALLOWED_ORIGIN) return reply({ error: 'origin_required' }, 403);
      if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return reply({ error: 'json_required' }, 415);
      }
      const body = await readBody(request);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'invalid_score' }, 400);
      const { submission_id: id, leaderboard_key: board, score } = body;
      const name = typeof body.player_name === 'string' ? body.player_name.normalize('NFC').trim() : '';
      // Mirror the browser's silent drop; direct API calls cannot bypass it.
      if (globalThis.SkolarkadenHighscorePolicy.isBannedName(name)) return reply({ ok: true });
      if (typeof id !== 'string' || !UUID.test(id) || !validBoard(board) ||
          !/^[\p{L}\p{M}\p{N} _.'’\-]{1,24}$/u.test(name) ||
          !Number.isSafeInteger(score) || score < 0 || score > 1000000) {
        return reply({ error: 'invalid_score' }, 400);
      }
      if (!await allowSubmission(request, env.DB)) return reply({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
      const result = await env.DB.prepare(`
        INSERT INTO highscores (submission_id, leaderboard_key, player_name, score, ip)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(submission_id) DO NOTHING
      `).bind(id, board, name, score, request.headers.get('CF-Connecting-IP')).run();
      if (!result.meta.changes) {
        const existing = await env.DB.prepare(`
          SELECT leaderboard_key, player_name, score FROM highscores WHERE submission_id = ?
        `).bind(id).first();
        if (existing.leaderboard_key !== board || existing.player_name !== name || existing.score !== score) {
          return reply({ error: 'submission_conflict' }, 409);
        }
      }
      return reply({ ok: true }, result.meta.changes ? 201 : 200);
    } catch (error) {
      if (error.message === 'body_too_large') return reply({ error: error.message }, 413);
      if (error.message === 'invalid_json') return reply({ error: error.message }, 400);
      console.error(error);
      return reply({ ok: false, error: 'service_unavailable' }, 503);
    }
  }
};
