// lib/yt.js — обёртка над yt-dlp: поиск, плоские списки (каналы/плейлисты), резолв потока
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cookieArgs } from './cookies.js';

const pExecFile = promisify(execFile);
const BIN = process.env.YTDLP || 'yt-dlp';

const SEARCH_TTL = 15 * 60 * 1000;   // 15 минут
const RESOLVE_TTL = 2.5 * 3600 * 1000; // 2.5 часа (ссылки YouTube живут ~6ч)

const resolveCache = new Map(); // videoId -> { t, info }
const inflight = new Map();     // videoId -> Promise (дедуп одновременных резолвов)
let botCooldownUntil = 0;       // после bot-ошибки не дёргаем YouTube 90 сек
let curLang = 'ru';             // язык пользовательских сообщений (ставит сервер из Accept-Language)
export const setLang = (l) => { curLang = l === 'en' ? 'en' : 'ru'; };
const lang = () => curLang;

async function run(args, timeoutMs = 45_000) {
  const full = [...(cookieArgs() || []), ...args];
  try {
    const { stdout } = await pExecFile(BIN, full, {
      maxBuffer: 64 * 1024 * 1024,
      timeout: timeoutMs,
    });
    return stdout;
  } catch (e) {
    const msg = String(e.stderr || e.message || e);
    if (/confirm you.{0,3}re not a bot|Sign in to confirm/i.test(msg)) {
      botCooldownUntil = Date.now() + 90_000;
      throw new Error(
        lang() === 'ru'
          ? 'YouTube флагнул этот IP (бот-проверка). Плеер переключит такие треки на встроенный YouTube-плеер; чтобы стрим работал везде — добавь куки браузера (README → «Куки»).'
          : 'YouTube flagged this IP (bot-check). The player will fall back to the embedded YouTube player; to make direct streaming work — add browser cookies (README → “Cookies”).'
      );
    }
    throw e;
  }
}

function decodeHtml(s = '') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function thumbFor(id) {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

function normEntry(e) {
  if (!e || !e.id) return null;
  if (e.is_live || e.live_status === 'is_live') return null; // идущий эфир не играем; записи эфиров (post_live) — играются
  return {
    id: e.id,
    title: decodeHtml(e.title ?? 'Untitled'),
    channel: decodeHtml(e.channel || e.uploader || ''),
    channelId: e.channel_id || '',
    duration: typeof e.duration === 'number' ? e.duration : null,
    thumb: thumbFor(e.id),
  };
}

// накопительное состояние выдачи: сканируем сырые страницы YouTube, пока не наберём
// достаточно «чистых» (не-эфирных) треков — иначе после фильтра эфиров остаётся 19-20 штук
const searchState = new Map(); // q -> { items: [], cursor: 1, t }

/** Поиск на YouTube (без API-ключа). start — с какой позиции (пагинация «ещё»). */
export async function search(query, limit = 30, start = 1) {
  start = Math.max(1, Math.floor(start) || 1);
  const key = query.trim().toLowerCase();
  let st = searchState.get(key);
  if (!st || (start === 1 && Date.now() - st.t > SEARCH_TTL)) {
    st = { items: [], cursor: 1, t: Date.now() };
    searchState.set(key, st);
    if (searchState.size > 20) searchState.delete(searchState.keys().next().value);
  }

  // докачиваем сырые страницы, пока не наберём start+limit-1 чистых треков (максимум 300 позиций)
  while (st.items.length < start + limit - 1 && st.cursor <= 300) {
    const end = st.cursor + 29;
    const out = await run([
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--playlist-items', `${st.cursor}-${end}`,
      `ytsearch${end}:${query}`,
    ]);
    const batch = out
      .split('\n')
      .filter(Boolean)
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .map(normEntry)
      .filter(Boolean);
    st.t = Date.now();
    if (!batch.length) break; // выдача кончилась
    st.items.push(...batch);
    st.cursor = end + 1;
  }

  return st.items.slice(start - 1, start - 1 + limit);
}

/** Метаданные плейлиста/канала + плоский список записей (один вызов yt-dlp). */
export async function meta(url, limit = 60, start = 1) {
  start = Math.max(1, Math.floor(start) || 1);
  const out = await run([
    '--flat-playlist',
    '--dump-single-json',
    '--no-warnings',
    '--playlist-items', `${start}-${start + limit - 1}`,
    url,
  ]);
  const info = JSON.parse(out);
  const entries = (info.entries || []).map(normEntry).filter(Boolean);
  return {
    id: info.channel_id || info.id || null,
    title: decodeHtml(info.title ?? ''),
    channelId: info.channel_id || entries[0]?.channelId || '',
    channel: decodeHtml(info.channel || info.uploader || entries[0]?.channel || ''),
    entries,
  };
}

/** Плоский список видео канала или плейлиста (без резолва каждого видео). */
export async function listFlat(url, limit = 60) {
  return (await meta(url, limit)).entries;
}

/** Полный резолв видео: метаданные + выбор лучшего аудио-формата. */
export async function resolve(id) {
  const hit = resolveCache.get(id);
  if (hit && Date.now() - hit.t < RESOLVE_TTL) return hit.info; // кэш важнее кулдауна — готовая ссылка должна играть

  if (Date.now() < botCooldownUntil) {
    throw new Error(
      lang() === 'ru'
        ? 'YouTube ещё на кулдауне после бот-проверки — попробуй через минуту или смени сеть'
        : 'YouTube is still cooling down after the bot-check — try again in a minute or switch networks'
    );
  }

  const running = inflight.get(id);
  if (running) return running;

  const job = (async () => {
    try {
      const out = await run([
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        // mweb + PO-token (bgutil provider) — рекомендованная связка yt-dlp
        '--extractor-args', 'youtube:player_client=mweb',
        '--',
        `https://www.youtube.com/watch?v=${id}`,
      ], 30_000);

      const info = JSON.parse(out);
      if (info.is_live) throw new Error(lang() === 'ru' ? 'Прямые эфиры не поддерживаются — только записи' : 'Live streams are not supported — recordings only');

      const track = {
        id: info.id,
        title: decodeHtml(info.title ?? 'Untitled'),
        channel: decodeHtml(info.channel || info.uploader || ''),
        channelId: info.channel_id || '',
        duration: info.duration ?? null,
        thumb: thumbFor(info.id),
      };

      const audios = (info.formats || [])
        .filter((f) => f.vcodec === 'none' && f.acodec && f.acodec !== 'none' && f.url);
      if (!audios.length) throw new Error(lang() === 'ru' ? 'Аудио-дорожка не найдена' : 'No audio track found');

      // предпочитаем m4a (совместим со всеми браузерами), среди них — лучший битрейт
      const byRate = (a, b) => (b.abr || b.tbr || 0) - (a.abr || a.tbr || 0);
      const m4a = audios.filter((f) => f.ext === 'm4a').sort(byRate);
      const pick = m4a[0] || [...audios].sort(byRate)[0];

      const stream = {
        url: pick.url,
        ext: pick.ext,
        codec: pick.acodec,
        abr: pick.abr || pick.tbr || null,
      };

      const payload = { track, stream };
      resolveCache.set(id, { t: Date.now(), info: payload });
      return payload;
    } finally {
      inflight.delete(id);
    }
  })();

  inflight.set(id, job);
  return job;
}

/** Резолв с принудительным обновлением кэша (если ссылка протухла). */
export async function refresh(id) {
  resolveCache.delete(id);
  return resolve(id);
}

export async function version() {
  try {
    const { stdout } = await pExecFile(BIN, ['--version']);
    return stdout.trim();
  } catch {
    return null;
  }
}
