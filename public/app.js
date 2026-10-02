// MONO — фронтенд: роутер, плеер, очередь, подписки, визуализация
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const audio = $('#audio');

// ---------------------------------------------------------------- i18n
const I18N = {
  ru: {
    nav_search: 'Поиск', nav_genres: 'Жанры', nav_feed: 'Новинки', nav_subs: 'Подписки', nav_likes: 'Избранное', nav_history: 'История',
    size: 'размер', smaller: 'мельче', default_size: 'обычный размер', larger: 'крупнее',
    foot: 'без регистрации<br>без скачивания<br>только звук',
    q_ph: 'что играем?  например: deep house mix',
    search_hint: 'начни вводить — я найду миксы, сеты и лейблы<br><b>Enter</b> — искать, <b>Space</b> — пауза, <b>←→</b> — перемотка',
    searching: 'ищу «{q}»…', search_failed: 'поиск не удался: {e}', nothing_found: 'ничего не нашлось',
    plus_channel: '+ канал', ok_channel: '✓ канал',
    min_ago: '{n} мин назад', h_ago: '{n} ч назад', d_ago: '{n} дн назад', mo_ago: '{n} мес назад',
    genres_h: 'Жанры', genres_sub: 'пресеты под работу и кодинг', back_genres: '← жанры',
    gd_minimal: 'гипнотичный минимум для глубокого фокуса', gd_deep: 'мягкий грув, тёплые басы — кодится плавно',
    gd_dub: 'глубина, эхо, дым — фоновый космос', gd_melodic: 'мелодии поверх марш-ритма',
    gd_deeptech: 'мостик между дип-хаусом и техно', gd_focus: 'когда и техно слишком громко',
    gd_lofi: 'на случай ночных сессий',
    feed_h: 'Новинки', feed_sub: 'свежее с каналов и плейлистов в подписках', gathering: 'собираю ленту…',
    empty_feed: 'подписок пока нет<br>добавь каналы в разделе <b><a href="#/subs" style="color:var(--accent)">подписки</a></b> — здесь появится всё новое',
    subs_h: 'Подписки', subs_sub: 'каналы и плейлисты · без аккаунта, живёт локально',
    subs_ph: '@хендл, ссылка на канал / плейлист / видео', subscribe: 'Подписаться', adding: 'добавляю…', open: 'открыть',
    empty_subs: 'пока пусто.<br>вставь <b>@хендл</b> канала или ссылку на плейлист — например <b>@Cercle</b>',
    list_h: 'Список', list_sub: 'видео канала / плейлиста', loading: 'загружаю…',
    likes_h: 'Избранное', likes_sub: 'треки с ♥', empty_likes: 'пусто — жми <b>♡</b> на треке',
    history_h: 'История', history_sub: 'что играло недавно', empty_history: 'история пуста', clear_history: 'очистить историю',
    sub_add_toast: '+ подписка: {n}', sub_remove_toast: '− подписка: {n}', sub_exists: 'уже в подписках: {n}',
    like_add: '+ в избранное', like_remove: '− из избранного',
    stream_fallback: 'Стрим недоступен — включаю YouTube-плеер для этого трека',
    track_skip: 'Этот трек сейчас не играется — листаю дальше',
    embed_denied: 'Код {c}: YouTube не разрешает встраивание в этой среде — листаю дальше',
    yt_error: 'YouTube-плеер: код ошибки {c} — листаю дальше',
    browser_muted: 'Браузер держит звук выключенным — кликни в любом месте',
    yt_stalled: 'YT плеер не стартовал (состояние {s}) — кликни в любом месте, чтобы включить звук',
    no_ytdlp: 'yt-dlp не установлен — плеер не сможет искать и стримить. brew install yt-dlp',
    play_pause: 'Play / Pause', shuffle: 'Перемешать', yt_diag: 'видимый YouTube-плеер — диагностика встраивания',
  },
  en: {
    nav_search: 'Search', nav_genres: 'Genres', nav_feed: 'New', nav_subs: 'Subscriptions', nav_likes: 'Liked', nav_history: 'History',
    size: 'size', smaller: 'smaller', default_size: 'default size', larger: 'larger',
    foot: 'no account<br>no downloads<br>audio only',
    q_ph: 'what shall we play?  e.g. deep house mix',
    search_hint: 'start typing — mixes, sets and labels found for you<br><b>Enter</b> — search, <b>Space</b> — pause, <b>←→</b> — seek',
    searching: 'searching “{q}”…', search_failed: 'search failed: {e}', nothing_found: 'nothing found',
    plus_channel: '+ channel', ok_channel: '✓ channel',
    min_ago: '{n} min ago', h_ago: '{n} h ago', d_ago: '{n} d ago', mo_ago: '{n} mo ago',
    genres_h: 'Genres', genres_sub: 'work & coding presets', back_genres: '← genres',
    gd_minimal: 'hypnotic minimal for deep focus', gd_deep: 'soft groove, warm bass — smooth coding',
    gd_dub: 'depth, echo, smoke — background space', gd_melodic: 'melodies over a marching beat',
    gd_deeptech: 'a bridge between deep house and techno', gd_focus: 'for when techno is too loud',
    gd_lofi: 'for late-night sessions',
    feed_h: 'New', feed_sub: 'fresh videos from your subscriptions', gathering: 'gathering the feed…',
    empty_feed: 'no subscriptions yet<br>add channels in <b><a href="#/subs" style="color:var(--accent)">subscriptions</a></b> — new stuff lands here',
    subs_h: 'Subscriptions', subs_sub: 'channels & playlists · no account, lives locally',
    subs_ph: '@handle, channel / playlist / video link', subscribe: 'Subscribe', adding: 'adding…', open: 'open',
    empty_subs: 'empty for now.<br>paste a channel <b>@handle</b> or a playlist link — e.g. <b>@Cercle</b>',
    list_h: 'List', list_sub: 'channel / playlist videos', loading: 'loading…',
    likes_h: 'Liked', likes_sub: 'tracks marked ♥', empty_likes: 'empty — hit <b>♡</b> on a track',
    history_h: 'History', history_sub: 'recently played', empty_history: 'history is empty', clear_history: 'clear history',
    sub_add_toast: '+ subscribed: {n}', sub_remove_toast: '− unsubscribed: {n}', sub_exists: 'already subscribed: {n}',
    like_add: '+ liked', like_remove: '− unliked',
    stream_fallback: 'Stream unavailable — switching this track to the YouTube player',
    track_skip: 'This track can’t play right now — skipping',
    embed_denied: 'Code {c}: YouTube disallows embedding in this environment — skipping',
    yt_error: 'YouTube player error {c} — skipping',
    browser_muted: 'The browser keeps sound muted — click anywhere',
    yt_stalled: 'YT player didn’t start (state {s}) — click anywhere to enable sound',
    no_ytdlp: 'yt-dlp not installed — search and streaming won’t work. brew install yt-dlp',
    play_pause: 'Play / Pause', shuffle: 'Shuffle', yt_diag: 'visible YouTube player — embed diagnostics',
  },
};
let lang = localStorage.getItem('mono.lang') || ((navigator.language || '').toLowerCase().startsWith('ru') ? 'ru' : 'en');
const t = (k, vars) => {
  let s = I18N[lang]?.[k] ?? I18N.ru[k] ?? k;
  if (vars) for (const [key, val] of Object.entries(vars)) s = s.split(`{${key}}`).join(String(val));
  return s;
};
function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
}
function setLang(l) {
  lang = l;
  localStorage.setItem('mono.lang', l);
  applyI18n();
  route();
}

// ---------------------------------------------------------------- состояние
const state = {
  queue: [],
  index: -1,
  current: null,       // текущий трек
  shuffle: false,
  ytDebug: localStorage.getItem('mono.ytdebug') === '1',
  likes: new Map(),    // id -> track
  subs: new Map(),     // channel/playlist id -> sub
  viewItems: [],       // треки текущего списка (для кликов)
  searchCache: new Map(),
};

// ---------------------------------------------------------------- утилиты
async function api(path, opts) {
  const r = await fetch(path, opts);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
  return d;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmt(s) {
  if (s == null || !isFinite(s)) return '––:––';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

function rel(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return t('min_ago', { n: Math.max(1, Math.floor(d / 60)) });
  if (d < 86400) return t('h_ago', { n: Math.floor(d / 3600) });
  if (d < 86400 * 30) return t('d_ago', { n: Math.floor(d / 86400) });
  return t('mo_ago', { n: Math.floor(d / (86400 * 30)) });
}

function toast(msg, isErr = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3800);
}

// ---------------------------------------------------------------- жанры
const GENRES = [
  { id: 'minimal-techno', name: 'Minimal Techno', d: 'gd_minimal', queries: ['minimal techno mix', 'minimal deep techno set', 'microhouse minimal mix', 'hypnotic techno loop mix'] },
  { id: 'deep-house', name: 'Deep House', d: 'gd_deep', queries: ['deep house mix', 'organic deep house mix', 'soulful deep house set', 'deep house vinyl mix'] },
  { id: 'dub-techno', name: 'Dub Techno', d: 'gd_dub', queries: ['dub techno mix', 'deep dub techno set', 'ambient dub techno mix'] },
  { id: 'melodic-techno', name: 'Melodic Techno', d: 'gd_melodic', queries: ['melodic techno mix', 'melodic house & techno set', 'progressive house mix'] },
  { id: 'deep-tech', name: 'Deep Tech', d: 'gd_deeptech', queries: ['deep tech house mix', 'deep tech minimal set'] },
  { id: 'focus-ambient', name: 'Ambient / Focus', d: 'gd_focus', queries: ['deep focus ambient mix', 'ambient techno mix', 'music for coding mix'] },
  { id: 'lofi', name: 'Lo-Fi', d: 'gd_lofi', queries: ['lofi coding beats mix', 'lofi hip hop night mix'] },
];

// ---------------------------------------------------------------- строки треков
function rowsHTML(items, { channelFromTitle = '' } = {}) {
  if (!items.length) return `<div class="empty">${t('nothing_found')}</div>`;
  return `<div class="rows">${items.map((tr, i) => {
    const liked = state.likes.has(tr.id);
    const subbed = tr.channelId && state.subs.has(tr.channelId);
    const chan = tr.channel || channelFromTitle;
    const sub = rel(tr.published);
    return `<div class="row" data-id="${esc(tr.id)}" data-idx="${i}">
      <span class="lead"><span class="idx">${i + 1}</span><span class="eq"><i></i><i></i><i></i></span></span>
      <img class="thumb" loading="lazy" src="${esc(tr.thumb)}" alt="">
      <div class="meta">
        <div class="t">${esc(tr.title)}</div>
        <div class="c">${esc(chan)}${sub ? ` · ${esc(sub)}` : ''}</div>
      </div>
      <span class="dur">${fmt(tr.duration)}</span>
      <span class="acts">
        ${tr.channelId ? `<button class="sub-btn ${subbed ? 'on' : ''}" data-sub="${esc(tr.channelId)}" data-name="${esc(chan)}">${subbed ? t('ok_channel') : t('plus_channel')}</button>` : ''}
        <button class="icon-btn like-btn ${liked ? 'on' : ''}" data-like="${esc(tr.id)}">${liked ? '♥' : '♡'}</button>
      </span>
    </div>`;
  }).join('')}</div>`;
}

function markPlaying() {
  view.querySelectorAll('.row').forEach((r) => r.classList.toggle('playing', state.current && r.dataset.id === state.current.id));
}

// клики по строкам: play / like / subscribe
view.addEventListener('click', async (e) => {
  const likeBtn = e.target.closest('[data-like]');
  if (likeBtn) { e.stopPropagation(); toggleLike(likeBtn.dataset.like); return; }
  const subBtn = e.target.closest('[data-sub]');
  if (subBtn) { e.stopPropagation(); toggleSub(subBtn.dataset.sub, subBtn.dataset.name || ''); return; }
  const row = e.target.closest('.row');
  if (row && viewItems()[+row.dataset.idx]) playList(state.viewItems, +row.dataset.idx);
});

const viewItems = () => state.viewItems;

// ---------------------------------------------------------------- лайки
const likePending = new Set();
async function toggleLike(id) {
  if (likePending.has(id)) return;
  likePending.add(id);
  try {
    if (!state.likes.has(id)) {
      const t0 = findTrack(id);
      if (!t0) return;
      await api(`/api/likes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track: t0 }) });
      state.likes.set(id, t0);
      toast(t('like_add'));
    } else {
      await api(`/api/likes/${id}`, { method: 'DELETE' });
      state.likes.delete(id);
      toast(t('like_remove'));
    }
    document.querySelectorAll(`[data-like="${CSS.escape(id)}"]`).forEach((b) => {
      const on = state.likes.has(id);
      b.classList.toggle('on', on);
      b.textContent = on ? '♥' : '♡';
    });
    if (state.current?.id === id) pLikeRefresh();
    if (location.hash.startsWith('#/likes')) route();
  } catch (e) { toast(e.message, true); }
  finally { likePending.delete(id); }
}

function findTrack(id) {
  return state.viewItems.find((t) => t.id === id) || state.queue.find((t) => t.id === id) || state.current;
}

// ---------------------------------------------------------------- подписки
async function toggleSub(channelId, name) {
  try {
    if (state.subs.has(channelId)) {
      await api(`/api/subs/${channelId}`, { method: 'DELETE' });
      state.subs.delete(channelId);
      toast(t('sub_remove_toast', { n: name || channelId }));
    } else {
      const r = await api('/api/subs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `https://www.youtube.com/channel/${channelId}` }),
      });
      state.subs.set(channelId, r.sub);
      toast(t('sub_add_toast', { n: r.sub.title }));
    }
    document.querySelectorAll(`[data-sub="${channelId}"]`).forEach((b) => {
      const on = state.subs.has(channelId);
      b.classList.toggle('on', on);
      b.textContent = on ? '✓ канал' : '+ канал';
    });
  } catch (err) { toast(err.message, true); }
}

// ---------------------------------------------------------------- плеер
function playList(items, i) {
  state.queue = items.slice();
  state.index = i;
  load(state.queue[i]);
}

// ---------------------------------------------------------------- движки: yt-dlp-стрим → фолбэк iframe
let engine = 'stream';        // stream = наш прокси (без рекламы) | iframe = настоящий YT-плеер
let iframeTried = new Set();  // треки, где фолбэк уже включали — чтобы не зациклиться
let loadSeq = 0;              // защита от гонок при быстром переключении треков
let watchdog = 0;
let historyPending = false;   // пишем историю только когда трек реально зазвучал

let ytPlayer = null, ytReady = false, ytQueue = null;
window.onYouTubeIframeAPIReady = () => { ytReady = true; if (ytQueue) { const f = ytQueue; ytQueue = null; f(); } };
function withYT(fn) { if (ytReady) fn(); else ytQueue = fn; }
function ensureYtDiv() {
  if (!$('#yt-player')) {
    const d = document.createElement('div');
    d.id = 'yt-player';
    $('#yt-holder').appendChild(d);
  }
}

function playViaIframe(t, seq) {
  engine = 'iframe';
  iframeTried.add(t.id);
  historyPending = false;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  const dbg = state.ytDebug;
  withYT(() => {
    if (seq !== loadSeq) return; // пока грузился API-скрипт, трек уже сменился
    try { ytPlayer?.stopVideo?.(); } catch {}
    if (!ytPlayer) ensureYtDiv(); // destroy() удаляет контейнер — вернём его
    const playerVars = {
      autoplay: dbg ? 0 : 1,
      controls: dbg ? 1 : 0,
      disablekb: 1,
      rel: 0,
      playsinline: 1,
      origin: location.origin, // Google идентифицирует embed-клиента по origin/Referer
    };
    if (!dbg) playerVars.mute = 1; // mute-автоплей разрешён всегда; звук включаем после старта
    if (!ytPlayer) {
      ytPlayer = new YT.Player('yt-player', {
        height: dbg ? '270' : '1',
        width: dbg ? '480' : '1',
        videoId: t.id,
        playerVars,
        events: {
          onReady: () => {
            ytPlayer.setVolume(vol.value);
            if (dbg) ytPlayer.cueVideoById(t.id);
            else { ytPlayer.mute(); ytPlayer.playVideo(); }
          },
          onStateChange: onYTState,
          onError: (e) => onYTError(e),
        },
      });
    } else {
      if (dbg) ytPlayer.cueVideoById(t.id);
      else ytPlayer.loadVideoById(t.id);
      ytPlayer.playVideo();
    }
    // диагностика: если за 5 секунд так и не зазвучало — покажем состояние плеера
    ytDiagState = -99;
    setTimeout(() => {
      if (engine === 'iframe' && !state.ytDebug && ytPlayer?.getPlayerState) {
        const st = ytPlayer.getPlayerState();
        if (st !== 1 && st !== 3) toast(t('yt_stalled', { s: st }));
      }
    }, 5000);
  });
}

function fallbackToIframe(t0, seq) {
  if (!t0) return;
  if (iframeTried.has(t0.id)) {
    toast(t('track_skip'));
    setTimeout(() => { if (seq === loadSeq) next(true); }, 800);
    return;
  }
  toast(t('stream_fallback'));
  playViaIframe(t0, seq);
}

function onYTError(e) {
  if (engine !== 'iframe') return; // ошибка от старого плеера после переключения
  console.warn('YT player error:', e?.data);
  const code = e?.data;
  const seq = loadSeq; // актуальное поколение на момент ошибки
  if (code === 101 || code === 150 || code === 153) {
    toast(t('embed_denied', { c: code }));
  } else {
    toast(t('yt_error', { c: code ?? '?' }));
  }
  setTimeout(() => { if (seq === loadSeq) next(true); }, 1200);
}

let ytDiagState = -99;
function onYTState(e) {
  if (!ytPlayer || !window.YT) return;
  ytDiagState = e.data;
  const S = YT.PlayerState;
  if (e.data === S.PLAYING) {
    $('#p-play').textContent = '❚❚';
    startViz();
    // снимаем mute; если браузер требует свежий жест — любой клик разблокирует
    if (!state.ytDebug) {
      ytPlayer.unMute();
      setTimeout(() => {
        if (engine === 'iframe' && ytPlayer?.isMuted?.()) {
          toast(t('browser_muted'));
          window.addEventListener('pointerdown', () => { try { ytPlayer.unMute(); ytPlayer.setVolume(vol.value); } catch {} }, { once: true, capture: true });
        }
      }, 1000);
    }
    if (!historyPending && state.current) {
      historyPending = true;
      api('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track: state.current }) }).catch(() => {});
    }
  } else if (e.data === S.ENDED) {
    next(true);
  } else if (e.data === S.PAUSED) {
    $('#p-play').textContent = '▶';
    stopViz();
  }
}

// UI-таймлайн для iframe-движка
setInterval(() => {
  if (engine !== 'iframe' || !ytPlayer || !ytPlayer.getCurrentTime) return;
  const cur = ytPlayer.getCurrentTime() || 0;
  const dur = ytPlayer.getDuration() || 0;
  seek.value = dur ? Math.round((cur / dur) * 1000) : 0;
  seek.style.setProperty('--p', (seek.value / 10).toFixed(1));
  $('#p-cur').textContent = fmt(cur);
  $('#p-dur').textContent = fmt(dur);
  if ('mediaSession' in navigator && dur) {
    try { navigator.mediaSession.setPositionState({ duration: dur, playbackRate: 1, position: Math.min(cur, dur) }); } catch {}
  }
}, 300);

async function load(t) {
  if (!t) return;
  const seq = ++loadSeq;
  state.current = t;
  if (engine === 'iframe') { // глушим прежний iframe — иначе два источника звука
    try { ytPlayer?.stopVideo?.(); } catch {}
  }
  engine = 'stream'; // каждый новый трек сначала пробуем стрим (без рекламы)
  historyPending = false;
  updateBarMeta();
  markPlaying();
  audio.src = `/api/stream/${t.id}`;
  ensureCtx();
  try { await audio.play(); }
  catch (e) { if (seq === loadSeq) fallbackToIframe(t, seq); }
  clearTimeout(watchdog);
  watchdog = setTimeout(() => {
    if (seq === loadSeq && engine === 'stream' && !audio.paused && audio.readyState < 3) fallbackToIframe(t, seq);
  }, 8000);
  setMediaSession(t);
  pLikeRefresh();
}

function updateBarMeta() {
  const t = state.current;
  $('#p-title').textContent = t ? t.title : '—';
  $('#p-channel').textContent = t ? t.channel : '';
  const cover = $('#p-cover');
  if (t) { cover.src = t.thumb; cover.hidden = false; } else cover.hidden = true;
}

function togglePlay() {
  if (!state.current) return;
  if (engine === 'iframe') {
    const st = ytPlayer?.getPlayerState?.();
    if (st === window.YT?.PlayerState?.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer?.playVideo?.();
    return;
  }
  if (audio.paused) { ensureCtx(); audio.play().catch(() => {}); }
  else audio.pause();
}

function next(auto = false) {
  if (!state.queue.length) return;
  let i;
  if (state.shuffle && state.queue.length > 1) {
    do { i = Math.floor(Math.random() * state.queue.length); } while (i === state.index);
  } else {
    i = state.index + 1;
    if (i >= state.queue.length) i = auto ? 0 : state.index; // по кругу — для рабочих сессий
  }
  if (i === state.index && !auto) return;
  state.index = i;
  load(state.queue[i]);
}

function prev() {
  const pos = engine === 'iframe' ? (ytPlayer?.getCurrentTime?.() || 0) : audio.currentTime;
  if (pos > 3) {
    if (engine === 'iframe') ytPlayer.seekTo(0, true);
    else audio.currentTime = 0;
    return;
  }
  if (!state.queue.length) return;
  let i = state.index - 1;
  if (i < 0) i = state.queue.length - 1;
  state.index = i;
  load(state.queue[i]);
}

$('#p-play').onclick = togglePlay;
$('#p-next').onclick = () => next();
$('#p-prev').onclick = prev;
$('#p-shuffle').onclick = () => {
  state.shuffle = !state.shuffle;
  $('#p-shuffle').classList.toggle('on', state.shuffle);
  localStorage.setItem('mono.shuffle', state.shuffle ? '1' : '');
};
$('#p-yt').onclick = () => {
  state.ytDebug = !state.ytDebug;
  localStorage.setItem('mono.ytdebug', state.ytDebug ? '1' : '0');
  $('#p-yt').classList.toggle('on', state.ytDebug);
  $('#yt-holder').classList.toggle('debug', state.ytDebug);
  if (ytPlayer) { try { ytPlayer.destroy(); } catch {} ytPlayer = null; }
  if (state.current) load(state.current);
};
$('#p-yt').classList.toggle('on', state.ytDebug);
$('#yt-holder').classList.toggle('debug', state.ytDebug);
$('#p-like').onclick = () => { if (state.current) toggleLike(state.current.id); };
function pLikeRefresh() {
  const on = state.current && state.likes.has(state.current.id);
  $('#p-like').classList.toggle('on', !!on);
  $('#p-like').textContent = on ? '♥' : '♡';
}

// прогресс
const seek = $('#p-seek');
seek.addEventListener('input', () => {
  if (engine === 'iframe' && ytPlayer?.getDuration) {
    const d = ytPlayer.getDuration();
    if (d) ytPlayer.seekTo((seek.value / 1000) * d, true);
    return;
  }
  if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
});
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
  seek.style.setProperty('--p', (seek.value / 10).toFixed(1));
  $('#p-cur').textContent = fmt(audio.currentTime);
  setPositionState();
});
audio.addEventListener('loadedmetadata', () => { $('#p-dur').textContent = fmt(audio.duration); });
audio.addEventListener('play', () => {
  $('#p-play').textContent = '❚❚';
  startViz();
  if (state.current && !historyPending) {
    historyPending = true;
    api('/api/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track: state.current }) }).catch(() => {});
  }
});
audio.addEventListener('pause', () => { $('#p-play').textContent = '▶'; stopViz(); });
audio.addEventListener('playing', () => clearTimeout(watchdog));
audio.addEventListener('ended', () => next(true));
audio.addEventListener('error', () => {
  if (engine === 'stream' && state.current && audio.getAttribute('src')) fallbackToIframe(state.current, loadSeq);
});

// громкость
const vol = $('#p-vol');
const savedVol = parseFloat(localStorage.getItem('mono.vol'));
vol.value = Math.round((Number.isFinite(savedVol) ? savedVol : 0.9) * 100);
audio.volume = vol.value / 100;
vol.style.setProperty('--p', vol.value);
vol.addEventListener('input', () => {
  audio.volume = vol.value / 100;
  vol.style.setProperty('--p', vol.value);
  localStorage.setItem('mono.vol', String(audio.volume));
  if (engine === 'iframe' && ytPlayer?.setVolume) ytPlayer.setVolume(vol.value);
});

// ---------------------------------------------------------------- media keys
function setMediaSession(t) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.channel,
    album: 'MONO',
    artwork: [{ src: t.thumb, sizes: '320x180', type: 'image/jpeg' }],
  });
}
function setPositionState() {
  if (!('mediaSession' in navigator) || !audio.duration) return;
  try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: audio.currentTime }); } catch {}
}
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => {
    if (engine === 'iframe') ytPlayer?.playVideo?.();
    else { ensureCtx(); audio.play().catch(() => {}); }
  });
  navigator.mediaSession.setActionHandler('pause', () => {
    if (engine === 'iframe') ytPlayer?.pauseVideo?.();
    else audio.pause();
  });
  navigator.mediaSession.setActionHandler('previoustrack', prev);
  navigator.mediaSession.setActionHandler('nexttrack', () => next());
  try { navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime != null) audio.currentTime = d.seekTime; }); } catch {}
}

// ---------------------------------------------------------------- визуализация
let actx = null, analyser = null, freq = null, raf = 0;
const viz = $('#viz');
const vctx = viz.getContext('2d');

function ensureCtx() {
  if (!actx) {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    const src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    src.connect(analyser);
    analyser.connect(actx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  }
  if (actx.state === 'suspended') actx.resume();
}

function sizeViz() {
  const dpr = window.devicePixelRatio || 1;
  viz.width = viz.clientWidth * dpr;
  viz.height = viz.clientHeight * dpr;
}
window.addEventListener('resize', sizeViz);

function startViz() {
  cancelAnimationFrame(raf);
  const draw = () => {
    const W = viz.width, H = viz.height;
    vctx.clearRect(0, 0, W, H);
    const BARS = 72;
    if (engine === 'iframe' || !analyser) {
      // доступ к аудиографу iframe невозможен — рисуем мягкую синтетику
      const t = performance.now() / 220;
      for (let i = 0; i < BARS; i++) {
        const v = 0.35 + 0.3 * Math.sin(i * 0.55 + t) * Math.sin(i * 0.21 - t * 0.7);
        const h = Math.max(2, v * H);
        vctx.fillStyle = v > 0.55 ? '#d4ff3f' : 'rgba(212,255,63,0.45)';
        vctx.fillRect(i * (W / BARS) + 1, H - h, W / BARS - 2, h);
      }
      raf = requestAnimationFrame(draw);
      return;
    }
    analyser.getByteFrequencyData(freq);
    const step = Math.floor(freq.length * 0.72 / BARS);
    const bw = W / BARS;
    for (let i = 0; i < BARS; i++) {
      let v = 0;
      for (let j = 0; j < step; j++) v = Math.max(v, freq[i * step + j]);
      const h = Math.max(2, (v / 255) * H);
      vctx.fillStyle = v > 150 ? '#d4ff3f' : 'rgba(212,255,63,0.45)';
      vctx.fillRect(i * bw + 1, H - h, bw - 2, h);
    }
    raf = requestAnimationFrame(draw);
  };
  draw();
}
function stopViz() {
  cancelAnimationFrame(raf);
  vctx.clearRect(0, 0, viz.width, viz.height);
}
sizeViz();

// ---------------------------------------------------------------- размер интерфейса
const ZOOMS = [0.85, 1, 1.15, 1.3, 1.5];
let zoomIdx = ZOOMS.indexOf(parseFloat(localStorage.getItem('mono.zoom')));
if (zoomIdx < 0) zoomIdx = 1;

function applyZoom() {
  document.documentElement.style.zoom = String(ZOOMS[zoomIdx]);
  localStorage.setItem('mono.zoom', String(ZOOMS[zoomIdx]));
  $('#fs-minus').style.opacity = zoomIdx === 0 ? '0.35' : '';
  $('#fs-plus').style.opacity = zoomIdx === ZOOMS.length - 1 ? '0.35' : '';
  $('#fs-reset').classList.toggle('on', zoomIdx !== 1);
  requestAnimationFrame(sizeViz);
}
$('#fs-minus').onclick = () => { zoomIdx = Math.max(0, zoomIdx - 1); applyZoom(); };
$('#fs-plus').onclick = () => { zoomIdx = Math.min(ZOOMS.length - 1, zoomIdx + 1); applyZoom(); };
$('#fs-reset').onclick = () => { zoomIdx = 1; applyZoom(); };
applyZoom();

// ---------------------------------------------------------------- клавиатура
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea') || e.metaKey || e.ctrlKey) return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight' && audio.duration) audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
  else if (e.code === 'ArrowLeft' && audio.duration) audio.currentTime = Math.max(audio.currentTime - 10, 0);
  else if (e.code === 'KeyN') next();
  else if (e.code === 'KeyP') prev();
});

// ---------------------------------------------------------------- виды
function shell(title, sub, body) {
  view.innerHTML = `<h1>${esc(title)}</h1><div class="h-sub">${esc(sub)}</div>${body}`;
}

// --- поиск
function renderSearch() {
  view.innerHTML = `
    <div class="search-box"><input id="q" placeholder="${esc(t('q_ph'))}" autofocus autocomplete="off"></div>
    <div class="quick-chips">${['deep house mix', 'minimal techno mix', 'dub techno mix', 'melodic techno set'].map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div id="results"><div class="empty">${t('search_hint')}</div></div>`;
  const input = $('#q');
  let tmr = 0;
  const go = () => { const q = input.value.trim(); if (q) doSearch(q); };
  input.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(go, 500); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(tmr); go(); } });
  view.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => { input.value = b.dataset.q; doSearch(b.dataset.q); });
  input.focus();
}

let searchSeq = 0; // номер поиска на экране — защита от гонки двух запросов
async function doSearch(q) {
  const box = $('#results');
  if (!box) return;
  const seq = ++searchSeq;
  box.innerHTML = `<div class="loading">${t('searching', { q })}</div>`;
  try {
    let items = state.searchCache.get(q);
    if (!items) { items = await api(`/api/search?q=${encodeURIComponent(q)}&limit=30`); state.searchCache.set(q, items); }
    if (!box.isConnected || seq !== searchSeq) return; // экран сменился или пришёл более новый запрос
    state.viewItems = items;
    box.innerHTML = rowsHTML(items);
    markPlaying();
  } catch (e) { if (box.isConnected && seq === searchSeq) box.innerHTML = `<div class="error-box">${t('search_failed', { e: esc(e.message) })}</div>`; }
}

// --- жанры
function renderGenres() {
  shell(t('genres_h'), t('genres_sub'), `<div class="genre-grid">${GENRES.map((g) => `
    <div class="genre-card" data-g="${g.id}">
      <div class="g-name">${esc(g.name)}</div>
      <div class="g-desc">${esc(t(g.d))}</div>
    </div>`).join('')}</div>`);
  view.querySelectorAll('[data-g]').forEach((c) => c.onclick = () => { location.hash = `#/genre/${c.dataset.g}`; });
}

function renderGenre(id) {
  const g = GENRES.find((x) => x.id === id);
  if (!g) { location.hash = '#/genres'; return; }
  view.innerHTML = `
    <a class="back-link" href="#/genres">${t('back_genres')}</a>
    <h1>${esc(g.name)}</h1><div class="h-sub">${esc(t(g.d))}</div>
    <div class="quick-chips">${g.queries.map((q, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div id="results"><div class="loading">ищу…</div></div>`;
  const run = async (q) => {
    view.querySelectorAll('[data-q]').forEach((c) => c.classList.toggle('on', c.dataset.q === q));
    await doSearch(q);
  };
  view.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => run(b.dataset.q));
  run(g.queries[0]);
}

// --- лента
async function renderFeed() {
  const gen = routeGen;
  shell(t('feed_h'), t('feed_sub'), `<div id="results"><div class="loading">${t('gathering')}</div></div>`);
  try {
    const items = await api('/api/feed');
    if (gen !== routeGen) return;
    state.viewItems = items;
    if (!items.length) {
      $('#results').innerHTML = `<div class="empty">${t('empty_feed')}</div>`;
      return;
    }
    $('#results').innerHTML = rowsHTML(items);
    markPlaying();
  } catch (e) { if (gen === routeGen) $('#results').innerHTML = `<div class="error-box">${esc(e.message)}</div>`; }
}

// --- подписки
async function renderSubs() {
  shell(t('subs_h'), t('subs_sub'), `
    <div class="add-form">
      <input id="sub-in" placeholder="${esc(t('subs_ph'))}" autocomplete="off">
      <button id="sub-add">${t('subscribe')}</button>
    </div>
    <div class="subs-list" id="subs-list"><div class="loading">${t('loading')}</div></div>`);
  const list = $('#subs-list');
  const draw = async () => {
    const subs = await api('/api/subs');
    state.subs.clear();
    subs.forEach((s) => state.subs.set(s.id, s));
    list.innerHTML = subs.length ? subs.map((s) => `
      <div class="sub-item">
        <span class="s-type">${s.type === 'playlist' ? (lang === 'ru' ? 'плейлист' : 'playlist') : (lang === 'ru' ? 'канал' : 'channel')}</span>
        <span class="s-title">${esc(s.title)}</span>
        <button class="s-open" data-open="${esc(s.url)}" data-title="${esc(s.title)}">${t('open')}</button>
        <button class="s-del" data-del="${esc(s.id)}" title="${lang === 'ru' ? 'отписаться' : 'unsubscribe'}">✕</button>
      </div>`).join('') : `<div class="empty">${t('empty_subs')}</div>`;
    list.querySelectorAll('[data-open]').forEach((b) => b.onclick = () => {
      location.hash = `#/browse?url=${encodeURIComponent(b.dataset.open)}&title=${encodeURIComponent(b.dataset.title)}`;
    });
    list.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
      await api(`/api/subs/${b.dataset.del}`, { method: 'DELETE' });
      state.subs.delete(b.dataset.del);
      draw();
    });
  };
  const input = $('#sub-in');
  const add = async () => {
    const v = input.value.trim();
    if (!v) return;
    const btn = $('#sub-add');
    btn.disabled = true; btn.textContent = t('adding');
    try {
      const r = await api('/api/subs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: v }) });
      toast(r.existed ? t('sub_exists', { n: r.sub.title }) : t('sub_add_toast', { n: r.sub.title }));
      input.value = '';
      await draw();
    } catch (e) { toast(e.message, true); }
    btn.disabled = false; btn.textContent = t('subscribe');
    input.focus();
  };
  $('#sub-add').onclick = add;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  await draw();
}

// --- просмотр канала/плейлиста
async function renderBrowse(url, title) {
  const gen = routeGen;
  shell(title || t('list_h'), t('list_sub'), `<div id="results"><div class="loading">${t('loading')}</div></div>`);
  try {
    const items = await api(`/api/browse?url=${encodeURIComponent(url)}&limit=60`);
    if (gen !== routeGen) return;
    state.viewItems = items;
    $('#results').innerHTML = rowsHTML(items, { channelFromTitle: title });
    markPlaying();
  } catch (e) { if (gen === routeGen) $('#results').innerHTML = `<div class="error-box">${esc(e.message)}</div>`; }
}

// --- избранное / история
async function renderLikes() {
  const gen = routeGen;
  shell(t('likes_h'), t('likes_sub'), `<div id="results"><div class="loading">${t('loading')}</div></div>`);
  const items = await api('/api/likes');
  if (gen !== routeGen) return;
  state.viewItems = items;
  $('#results').innerHTML = items.length ? rowsHTML(items) : `<div class="empty">${t('empty_likes')}</div>`;
  markPlaying();
}

async function renderHistory() {
  const gen = routeGen;
  shell(t('history_h'), t('history_sub'), `
    <div id="results"><div class="loading">${t('loading')}</div></div>
    <button class="danger-link" id="hist-clear">${t('clear_history')}</button>`);
  const items = await api('/api/history');
  if (gen !== routeGen) return;
  state.viewItems = items;
  $('#results').innerHTML = items.length ? rowsHTML(items) : `<div class="empty">${t('empty_history')}</div>`;
  markPlaying();
  $('#hist-clear').onclick = async () => { await api('/api/history', { method: 'DELETE' }); route(); };
}

// ---------------------------------------------------------------- роутер
function setActiveNav(name) {
  const map = { genre: 'genres', browse: 'subs' };
  const key = map[name] || name;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === key));
}

let routeGen = 0; // поколение роута — защита от перезаписи экрана запоздалыми ответами

async function route() {
  const gen = ++routeGen;
  const h = location.hash.replace(/^#\/?/, '') || 'search';
  const [pathPart, qs] = h.split('?');
  const params = new URLSearchParams(qs || '');
  const [name, arg] = pathPart.split('/');
  state.viewItems = [];
  setActiveNav(name);
  try {
    if (name === 'search') renderSearch();
    else if (name === 'genres') renderGenres();
    else if (name === 'genre') renderGenre(arg);
    else if (name === 'feed') await renderFeed();
    else if (name === 'subs') await renderSubs();
    else if (name === 'browse') await renderBrowse(params.get('url'), params.get('title'));
    else if (name === 'likes') await renderLikes();
    else if (name === 'history') await renderHistory();
    else renderSearch();
  } catch (e) { view.innerHTML = `<div class="error-box">${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', route);

// ---------------------------------------------------------------- старт
(async function init() {
  state.shuffle = !!localStorage.getItem('mono.shuffle');
  $('#p-shuffle').classList.toggle('on', state.shuffle);
  applyI18n();
  document.querySelectorAll('.lang-btn').forEach((b) => b.onclick = () => setLang(b.dataset.lang));
  try {
    const [likes, subs, status] = await Promise.all([api('/api/likes'), api('/api/subs'), api('/api/status')]);
    likes.forEach((t) => state.likes.set(t.id, t));
    subs.forEach((s) => state.subs.set(s.id, s));
    if (!status.ytdlp) toast(t('no_ytdlp'), true);
  } catch {}
  route();
})();
