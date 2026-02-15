/**
 * FiveHow — Local Storage Utilities
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: 'fh:auth:token',
  REFRESH_TOKEN: 'fh:auth:refreshToken',
  USER: 'fh:auth:user',
  CHAT_CHANNEL: 'fh:chat:selectedChannel',
  CHAT_SCROLL: 'fh:chat:scroll:',
  CHAT_DRAFT: 'fh:chat:draft:',
  CHESS_GAME: 'fh:chess:selectedGame',
};

function getItem(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function setItem(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function removeItem(key) {
  try { localStorage.removeItem(key); } catch {}
}

function getJson(key) {
  const raw = getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function setJson(key, value) {
  setItem(key, JSON.stringify(value));
}

// Auth
function getAuthToken() { return getItem(STORAGE_KEYS.AUTH_TOKEN); }
function setAuthToken(token) { setItem(STORAGE_KEYS.AUTH_TOKEN, token); }
function getRefreshToken() { return getItem(STORAGE_KEYS.REFRESH_TOKEN); }
function setRefreshToken(token) { setItem(STORAGE_KEYS.REFRESH_TOKEN, token); }
function getUser() { return getJson(STORAGE_KEYS.USER); }
function setUser(user) { setJson(STORAGE_KEYS.USER, user); }
function clearAuth() {
  removeItem(STORAGE_KEYS.AUTH_TOKEN);
  removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  removeItem(STORAGE_KEYS.USER);
}

// Chat
function getSelectedChannel() { return getItem(STORAGE_KEYS.CHAT_CHANNEL); }
function setSelectedChannel(code) { setItem(STORAGE_KEYS.CHAT_CHANNEL, code); }
function getDraft(channelId) { return getItem(STORAGE_KEYS.CHAT_DRAFT + channelId) || ''; }
function setDraft(channelId, text) { setItem(STORAGE_KEYS.CHAT_DRAFT + channelId, text); }
function clearDraft(channelId) { removeItem(STORAGE_KEYS.CHAT_DRAFT + channelId); }
function getScrollPosition(channelId) { return Number(getItem(STORAGE_KEYS.CHAT_SCROLL + channelId)) || 0; }
function setScrollPosition(channelId, pos) { setItem(STORAGE_KEYS.CHAT_SCROLL + channelId, String(pos)); }

// Chess
function getSelectedGame() { return getItem(STORAGE_KEYS.CHESS_GAME); }
function setSelectedGame(code) { setItem(STORAGE_KEYS.CHESS_GAME, code); }

export {
  STORAGE_KEYS,
  getItem, setItem, removeItem, getJson, setJson,
  getAuthToken, setAuthToken, getRefreshToken, setRefreshToken,
  getUser, setUser, clearAuth,
  getSelectedChannel, setSelectedChannel,
  getDraft, setDraft, clearDraft,
  getScrollPosition, setScrollPosition,
  getSelectedGame, setSelectedGame,
};
