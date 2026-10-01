// lib/cookies.js — авто-поиск кук браузера для yt-dlp (снимает бот-проверку YouTube).
// Приоритет: MONO_COOKIES (env) → cookies.txt рядом с проектом → safari → chrome → firefox.
// Проверка ленивая с кэшем 60 сек: дал Full Disk Access — заработало без перезапуска.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();

const readable = (p) => { try { fs.accessSync(p, fs.constants.R_OK); return true; } catch { return false; } };

const sources = {
  safari: () => readable(path.join(HOME, 'Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies')),
  chrome: () => readable(path.join(HOME, 'Library/Application Support/Google/Chrome/Default/Cookies')),
  firefox: () => {
    const prof = path.join(HOME, 'Library/Application Support/Firefox/Profiles');
    try {
      return fs.readdirSync(prof).some((d) => readable(path.join(prof, d, 'cookies.sqlite')));
    } catch { return false; }
  },
  edge: () => readable(path.join(HOME, 'Library/Application Support/Microsoft Edge/Default/Cookies')),
  brave: () => readable(path.join(HOME, 'Library/Application Support/BraveSoftware/Brave-Browser/Default/Cookies')),
};

let cache = { t: 0, args: null, source: null };

function probe() {
  // 1. явное указание через переменную окружения
  const env = process.env.MONO_COOKIES;
  if (env) {
    if (sources[env]) return { args: ['--cookies-from-browser', env], source: env };
    const p = path.resolve(env);
    if (fs.existsSync(p)) return { args: ['--cookies', p], source: p };
  }
  // 2. cookies.txt рядом с проектом или в data/
  for (const p of [path.join(__dirname, '..', 'cookies.txt'), path.join(__dirname, '..', 'data', 'cookies.txt')]) {
    if (fs.existsSync(p)) return { args: ['--cookies', p], source: p };
  }
  // 3. профили браузеров (на mac)
  for (const [name, check] of Object.entries(sources)) {
    if (check()) return { args: ['--cookies-from-browser', name], source: name };
  }
  return { args: null, source: null };
}

/** Аргументы yt-dlp для кук либо null. Кэш 60 сек. */
export function cookieArgs() {
  if (Date.now() - cache.t > 60_000) {
    const r = probe();
    cache = { t: Date.now(), ...r };
  }
  return cache.args;
}

export function cookieStatus() {
  cookieArgs();
  return cache.source;
}
