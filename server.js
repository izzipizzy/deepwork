// deepwork — локальный аудио-плеер для YouTube. Ноль npm-зависимостей.
// Запуск: node server.js  →  http://localhost:8787
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import * as yt from './lib/yt.js';
import * as db from './lib/db.js';
import { cookieStatus } from './lib/cookies.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 8787;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ---------------------------------------------------------------- утилиты
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
const fail = (res, code, error) => json(res, code, { error });

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = '', size = 0, done = false;
    const finish = (fn, arg) => { if (!done) { done = true; fn(arg); } };
    req.on('data', (c) => {
      size += c.length;
      if (size > 1e6) { finish(rejectBody, new Error('payload too large')); req.destroy(); return; }
      raw += c;
    });
    req.on('end', () => finish(() => {
      try { resolveBody(raw ? JSON.parse(raw) : {}); }
      catch { rejectBody(new Error('bad json')); }
    }));
    req.on('error', (e) => finish(rejectBody, e));
    req.on('close', () => { if (!done && !req.complete) finish(rejectBody, new Error('connection closed')); });
  });
}

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

function decodeEntities(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&#x27;/g, "'").replace(/&nbsp;/g, ' ');
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/; // YouTube video id — защита от мусора/инъекций из тела запроса

const normTrack = (t) => t && ID_RE.test(String(t.id || '')) && {
  id: String(t.id), title: String(t.title || 'Untitled'),
  channel: String(t.channel || ''), channelId: String(t.channelId || t.channel_id || '').slice(0, 64),
  duration: Number.isFinite(t.duration) ? t.duration : null,
  thumb: String(t.thumb || `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`).slice(0, 300),
  ...(t.published ? { published: String(t.published).slice(0, 40) } : {}),
};

// ---------------------------------------------------------------- подписки
function detectSubInput(input) {
  const s = String(input || '').trim();
  const list = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (list) return { type: 'playlist', id: list[1] };
  if (/^(PL|UU|OL|FL|RD)[A-Za-z0-9_-]{10,}$/.test(s)) return { type: 'playlist', id: s };
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(s)) return { type: 'channel', id: s };
  return { type: 'channel', ref: s };
}

async function makeSub(input) {
  const det = detectSubInput(input);

  if (det.type === 'playlist') {
    const id = det.id;
    if (!/^(PL|UU|OL|FL|RD)[A-Za-z0-9_-]{10,}$/.test(id)) {
      throw new Error(lang === 'ru' ? `«${id}» не похоже на ID плейлиста YouTube` : `“${id}” doesn’t look like a YouTube playlist ID`);
    }
    const url = `https://www.youtube.com/playlist?list=${id}`;
    let title = lang === 'ru' ? `Плейлист ${id.slice(0, 12)}…` : `Playlist ${id.slice(0, 12)}…`;
    try { title = (await yt.meta(url, 1)).title || title; } catch {}
    return { type: 'playlist', id, title, url, addedAt: Date.now() };
  }

  // ссылка на конкретное видео → подписка на его канал
  const vid = det.ref?.match(/(?:watch\?v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (vid) {
    const { track } = await yt.resolve(vid[1]);
    if (!track.channelId) throw new Error(lang === 'ru' ? 'Не нашёл канал у этого видео' : 'No channel found for this video');
    return {
      type: 'channel', id: track.channelId, title: track.channel || (lang === 'ru' ? 'Канал' : 'Channel'),
      url: `https://www.youtube.com/channel/${track.channelId}/videos`, addedAt: Date.now(),
    };
  }

  // UC…, @хендл, имя или ссылка на канал
  let browseUrl;
  if (det.id) {
    browseUrl = `https://www.youtube.com/channel/${det.id}/videos`;
  } else if (/^https?:\/\//.test(det.ref)) {
    const u = new URL(det.ref);
    if (!/(^|\.)youtube\.com$/.test(u.hostname) && u.hostname !== 'youtu.be') {
      throw new Error(lang === 'ru' ? 'Поддерживаются только ссылки YouTube' : 'YouTube links only');
    }
    browseUrl = u.origin + u.pathname.replace(/\/$/, '') + '/videos';
  } else {
    const handle = det.ref.startsWith('@') ? det.ref : `@${det.ref}`;
    browseUrl = `https://www.youtube.com/${handle}/videos`;
  }

  const meta = await yt.meta(browseUrl, 1);
  const id = det.id || meta.channelId;
  if (!id || !id.startsWith('UC')) throw new Error(lang === 'ru' ? 'Не нашёл канал — попробуй @хендл или ссылку на канал' : 'Channel not found — try an @handle or a channel link');
  const title = meta.channel || meta.title || `Канал ${id.slice(0, 12)}…`;
  return { type: 'channel', id, title, url: browseUrl, addedAt: Date.now() };
}

// ---------------------------------------------------------------- RSS-лента
const FEED_TTL = 10 * 60 * 1000;
let feedCache = { t: 0, items: [] };

function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    if (!id) continue;
    const title = decodeEntities(e.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? 'Untitled');
    const published = e.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;
    const author = decodeEntities(e.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/)?.[1] ?? '');
    const channelId = e.match(/<uri>https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]+)<\/uri>/)?.[1] ?? '';
    out.push(normTrack({ id, title, channel: author, channelId, duration: null, published }));
  }
  return out;
}

async function buildFeed() {
  const currentSubs = db.listSubs();
  const results = await Promise.allSettled(currentSubs.map(async (sub) => {
    const kind = sub.type === 'playlist' ? 'playlist_id' : 'channel_id';
    const xml = await fetchText(`https://www.youtube.com/feeds/videos.xml?${kind}=${encodeURIComponent(sub.id)}`);
    return parseFeed(xml);
  }));
  const items = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  items.sort((a, b) => String(b.published).localeCompare(String(a.published)));
  return items.slice(0, 150);
}

// ---------------------------------------------------------------- стрим
import { pipeline } from 'node:stream/promises';

async function streamHandler(req, res, id) {
  const abort = new AbortController();
  let clientGone = false;
  res.on('close', () => { if (!res.writableEnded) { clientGone = true; abort.abort(); } });

  let upstream;
  try {
    let info = await yt.resolve(id);
    if (clientGone) return;
    const headers = { 'User-Agent': UA, Referer: 'https://www.youtube.com/', ...(req.headers.range ? { Range: req.headers.range } : {}) };
    upstream = await fetch(info.stream.url, { headers, signal: abort.signal });
    if (upstream.status === 403) { // ссылка протухла — резолвим заново и пробуем ещё раз
      upstream.body?.cancel().catch(() => {});
      info = await yt.refresh(id);
      if (clientGone) return;
      upstream = await fetch(info.stream.url, { headers, signal: abort.signal });
    }
    if (!upstream.ok && upstream.status !== 206) {
      upstream.body?.cancel().catch(() => {});
      throw new Error(`источник вернул ${upstream.status}`);
    }
  } catch (e) {
    if (clientGone || abort.signal.aborted) return;
    return fail(res, 502, `Не удалось получить аудио: ${e.message}`);
  }

  const h = {};
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(name);
    if (v) h[name] = v;
  }
  h['cache-control'] = 'no-store';
  res.writeHead(upstream.status, h);

  try {
    await pipeline(
      Readable.fromWeb(upstream.body, { signal: abort.signal }),
      res,
    );
  } catch (e) {
    if (!clientGone) console.error('stream error:', e.message);
  }
}

// ---------------------------------------------------------------- статика
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
function staticFile(res, rel) {
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return fail(res, 403, 'forbidden');
  fs.readFile(file, (e, buf) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---------------------------------------------------------------- bgutil PO-provider
// Локальный генератор PO-токенов для yt-dlp (снимает часть ограничений YouTube).
const PROVIDER_SCRIPT = path.join(os.homedir(), 'bgutil-ytdlp-pot-provider', 'server', 'build', 'main.js');

async function providerUp() {
  try {
    const r = await fetch('http://127.0.0.1:4416/ping', { signal: AbortSignal.timeout(600) });
    return r.ok;
  } catch { return false; }
}

async function ensureProvider() {
  if (await providerUp()) return true;
  if (!fs.existsSync(PROVIDER_SCRIPT)) return false;
  spawn(process.execPath, [PROVIDER_SCRIPT], { stdio: 'ignore', detached: true }).unref();
  // даём подняться
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 400));
    if (await providerUp()) return true;
  }
  return false;
}

// ---------------------------------------------------------------- маршруты
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  // DNS-rebinding защита: API отвечает только локальным Host
  const host = (req.headers.host || '').toLowerCase();
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    return fail(res, 403, 'local only');
  }
  const lang = (req.headers['accept-language'] || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  yt.setLang(lang);
  try {
    // --- поиск
    if (p === '/api/search') {
      const q = (u.searchParams.get('q') || '').trim();
      if (!q) return json(res, 200, []);
      const limit = Math.min(Math.max(1, Math.floor(Number(u.searchParams.get('limit'))) || 30), 50);
      return json(res, 200, await yt.search(q, limit));
    }

    // --- плоский список (открыть канал/плейлист)
    if (p === '/api/browse') {
      const url = u.searchParams.get('url') || '';
      let host = 'www.youtube.com';
      try { host = new URL(url).hostname; } catch { return fail(res, 400, 'bad url'); }
      if (!/(^|\.)youtube\.com$/.test(host) && host !== 'youtu.be') return fail(res, 400, lang === 'ru' ? 'только YouTube' : 'YouTube links only');
      return json(res, 200, await yt.listFlat(url, Math.min(Math.max(1, Math.floor(Number(u.searchParams.get('limit'))) || 60), 100)));
    }

    // --- метаданные + выбор формата
    const mResolve = p.match(/^\/api\/resolve\/([A-Za-z0-9_-]{11})$/);
    if (mResolve) {
      const { track, stream } = await yt.resolve(mResolve[1]);
      return json(res, 200, { track, stream: { ext: stream.ext, abr: stream.abr, codec: stream.codec }, streamUrl: `/api/stream/${track.id}` });
    }

    // --- аудио-поток (прокси с поддержкой Range → работает перемотка)
    const mStream = p.match(/^\/api\/stream\/([A-Za-z0-9_-]{11})$/);
    if (mStream) return await streamHandler(req, res, mStream[1]);

    // --- подписки
    if (p === '/api/subs' && req.method === 'GET') return json(res, 200, db.listSubs());
    if (p === '/api/subs' && req.method === 'POST') {
      const { input } = await readBody(req);
      if (!input) return fail(res, 400, lang === 'ru' ? 'пустой ввод' : 'empty input');
      const sub = await makeSub(input);
      const existed = db.hasSub(sub.id);
      db.addSub(sub);
      feedCache = { t: 0, items: [] };
      return json(res, 200, { sub, existed });
    }
    const mSub = p.match(/^\/api\/subs\/([A-Za-z0-9_-]{8,80})$/);
    if (mSub && req.method === 'DELETE') {
      db.removeSub(mSub[1]);
      feedCache = { t: 0, items: [] };
      return json(res, 200, { ok: true });
    }

    // --- случайный микс из подписок (можно исключать прослушанное)
    if (p === '/api/mix') {
      const currentSubs = db.listSubs();
      if (!currentSubs.length) {
        return fail(res, 400, lang === 'ru' ? 'сначала добавь подписки — микс собирается из них' : 'add subscriptions first — the mix is built from them');
      }
      const count = Math.min(Math.max(5, Math.floor(Number(u.searchParams.get('count'))) || 30), 60);
      const played = new Set(u.searchParams.get('unplayed') === '1' ? db.listHistory(500).map((h) => h.id) : []);
      const parts = await Promise.allSettled(currentSubs.map((s) => yt.meta(s.url, 12)));
      const pool = parts.flatMap((r) => (r.status === 'fulfilled' ? r.value.entries : []))
        .filter((t) => !(u.searchParams.get('unplayed') === '1' && played.has(t.id)));
      for (let i = pool.length - 1; i > 0; i--) { // Фишер—Йетс
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return json(res, 200, pool.slice(0, count));
    }

    // --- лента новинок из подписок
    if (p === '/api/feed') {
      if (!db.listSubs().length) return json(res, 200, []);
      if (Date.now() - feedCache.t > FEED_TTL) {
        try { feedCache = { t: Date.now(), items: await buildFeed() }; }
        catch (e) { if (!feedCache.items.length) return fail(res, 502, `лента недоступна: ${e.message}`); }
      }
      return json(res, 200, feedCache.items);
    }

    // --- лайки
    if (p === '/api/likes' && req.method === 'GET') return json(res, 200, db.listLikes());
    const mLike = p.match(/^\/api\/likes\/([A-Za-z0-9_-]{11})$/);
    if (mLike && req.method === 'PUT') {
      const { track } = await readBody(req);
      const t = normTrack(track);
      if (!t || t.id !== mLike[1]) return fail(res, 400, 'bad track');
      db.addLike(t);
      return json(res, 200, { ok: true });
    }
    if (mLike && req.method === 'DELETE') {
      db.removeLike(mLike[1]);
      return json(res, 200, { ok: true });
    }

    // --- история
    if (p === '/api/history' && req.method === 'GET') return json(res, 200, db.listHistory());
    if (p === '/api/history' && req.method === 'POST') {
      const { track } = await readBody(req);
      const t = normTrack(track);
      if (t) db.pushHistory(t);
      return json(res, 200, { ok: true });
    }
    if (p === '/api/history' && req.method === 'DELETE') {
      db.clearHistory();
      return json(res, 200, { ok: true });
    }

    // --- статус
    if (p === '/api/status') {
      return json(res, 200, {
        ytdlp: await yt.version(),
        subs: db.listSubs().length,
        cookies: cookieStatus(),
        pot: await providerUp(),
      });
    }

    // --- статика / SPA
    if (req.method === 'GET') {
      if (p === '/') return staticFile(res, 'index.html');
      if (p.startsWith('/api/')) return fail(res, 404, 'not found');
      return staticFile(res, p.slice(1));
    }
    return fail(res, 404, 'not found');
  } catch (e) {
    return fail(res, 500, e.message || 'внутренняя ошибка');
  }
});

// только loopback: API управляет yt-dlp и локальной БД — наружу его нельзя
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  deepwork ── http://localhost:${PORT}\n`);
  yt.version().then((v) => {
    console.log(v ? `  yt-dlp: ${v}` : '  ⚠ yt-dlp не найден! Установи: brew install yt-dlp');
  });
  ensureProvider().then((up) => {
    console.log(up ? '  bgutil PO-provider: работает (127.0.0.1:4416)' : '  bgutil PO-provider: не найден (по желанию: см. README)');
  });
});
