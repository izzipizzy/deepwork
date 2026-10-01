// lib/db.js — локальное хранилище на встроенном node:sqlite (файл data/mono.db)
// Хранит только служебные данные: подписки, лайки, историю. Музыка нигде не сохраняется.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA, { recursive: true });

export const db = new DatabaseSync(path.join(DATA, 'mono.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS subs (
    id        TEXT PRIMARY KEY,           -- UC… (канал) или PL… (плейлист)
    type      TEXT NOT NULL,              -- channel | playlist
    title     TEXT NOT NULL,
    url       TEXT NOT NULL,
    added_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS likes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    channel    TEXT DEFAULT '',
    channel_id TEXT DEFAULT '',
    duration   INTEGER,
    thumb      TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS history (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    channel    TEXT DEFAULT '',
    channel_id TEXT DEFAULT '',
    duration   INTEGER,
    thumb      TEXT DEFAULT '',
    played_at  INTEGER NOT NULL
  );
`);

const trackCols = 'id, title, channel, channel_id AS channelId, duration, thumb';

// ------------------------------------------------------------- подписки
export function listSubs() {
  return db.prepare('SELECT id, type, title, url, added_at AS addedAt FROM subs ORDER BY added_at DESC').all();
}
export function addSub({ id, type, title, url }) {
  db.prepare(`
    INSERT INTO subs (id, type, title, url, added_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, url = excluded.url
  `).run(id, type, title, url, Date.now());
}
export function hasSub(id) {
  return !!db.prepare('SELECT 1 FROM subs WHERE id = ?').get(id);
}
export function removeSub(id) {
  db.prepare('DELETE FROM subs WHERE id = ?').run(id);
}

// ------------------------------------------------------------- лайки
export function listLikes() {
  return db.prepare(`SELECT ${trackCols}, created_at AS createdAt FROM likes ORDER BY created_at DESC`).all();
}
export function addLike(t) {
  db.prepare(`
    INSERT INTO likes (id, title, channel, channel_id, duration, thumb, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET created_at = excluded.created_at
  `).run(t.id, t.title, t.channel || '', t.channelId || '', t.duration ?? null, t.thumb || '', Date.now());
}
export function removeLike(id) {
  db.prepare('DELETE FROM likes WHERE id = ?').run(id);
}
export function isLiked(id) {
  return !!db.prepare('SELECT 1 FROM likes WHERE id = ?').get(id);
}

// ------------------------------------------------------------- история
export function listHistory(limit = 200) {
  return db.prepare(`SELECT ${trackCols}, played_at AS playedAt FROM history ORDER BY played_at DESC LIMIT ?`).all(limit);
}
export function pushHistory(t) {
  db.prepare(`
    INSERT INTO history (id, title, channel, channel_id, duration, thumb, played_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET played_at = excluded.played_at
  `).run(t.id, t.title, t.channel || '', t.channelId || '', t.duration ?? null, t.thumb || '', Date.now());
  // держим не больше 200 записей
  db.prepare(`DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY played_at DESC LIMIT 200)`).run();
}
export function clearHistory() {
  db.prepare('DELETE FROM history').run();
}
