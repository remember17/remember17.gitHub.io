/**
 * FiveHow 统一认证模块
 */

const API_BASE = (() => {
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return 'http://localhost:8080/api/auth';
  }
  const customBase = String(window.__FIVEHOW_API_BASE__ || '').trim();
  if (customBase) {
    return `${customBase.replace(/\/+$/, '')}/api/auth`;
  }
  return `${location.origin}/api/auth`;
})();

const USER_KEY = 'fh_user';
const CSRF_COOKIE_NAME = 'fh_csrf';

let _accessToken = null;
let _user = null;
let _refreshTimer = null;
let _csrfToken = '';

function readCookie(name) {
  const pattern = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(pattern)) continue;
    try {
      return decodeURIComponent(trimmed.slice(pattern.length));
    } catch {
      return trimmed.slice(pattern.length);
    }
  }
  return '';
}

function getCsrfToken() {
  return _csrfToken || readCookie(CSRF_COOKIE_NAME);
}

function updateCsrfToken(payload) {
  const token = String((payload && payload.csrfToken) || '').trim();
  if (token) _csrfToken = token;
}

async function request(path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`;
  const csrfToken = getCsrfToken();
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

  const resp = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    credentials: 'include',
  });

  const data = await resp.json().catch(() => ({}));
  updateCsrfToken(data);
  if (!resp.ok) {
    const err = new Error(data.error || data.message || `请求失败 (${resp.status})`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function requestGet(path) {
  const headers = {};
  if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`;

  const resp = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: 'include',
  });
  const data = await resp.json().catch(() => ({}));
  updateCsrfToken(data);
  if (!resp.ok) {
    const err = new Error(data.error || data.message || `请求失败 (${resp.status})`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

function saveTokens(accessToken, _refreshToken, user) {
  _accessToken = accessToken;
  if (user) {
    _user = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  scheduleRefresh();
}

export function setAccessToken(accessToken) {
  if (!accessToken) return;
  _accessToken = String(accessToken);
  scheduleRefresh();
}

function updateUser(user) {
  if (!user) return;
  _user = user;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearTokens() {
  _accessToken = null;
  _user = null;
  _csrfToken = '';
  localStorage.removeItem('fh_refresh_token');
  localStorage.removeItem(USER_KEY);
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

function parseJwtExp(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function scheduleRefresh() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  if (!_accessToken) return;

  const expMs = parseJwtExp(_accessToken);
  if (!expMs) return;

  const delay = Math.max(expMs - Date.now() - 60_000, 5_000);
  _refreshTimer = setTimeout(async () => {
    try {
      await refreshToken();
    } catch {
      clearTokens();
    }
  }, delay);
}

export async function sendCode(email, purpose = 'login') {
  return request('/send-code', { email, purpose });
}

export async function registerEmail(email, code, username, password) {
  const body = { email, code };
  if (username) body.username = username;
  if (password) body.password = password;
  const data = await request('/register-email', body);
  saveTokens(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function registerPassword(username, password, email) {
  const data = await request('/register', { username, password, email });
  saveTokens(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function loginEmail(email, code) {
  const data = await request('/login-email', { email, code });
  saveTokens(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function loginPassword(identifier, password, loginType = 'username') {
  const data = await request('/login', {
    username: identifier,
    password,
    loginType,
  });
  saveTokens(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function resetPassword(email, code, newPassword) {
  return request('/reset-password', { email, code, newPassword });
}

export async function bindEmail(email, code) {
  const data = await request('/bind-email', { email, code });
  if (data && data.user) updateUser(data.user);
  return data;
}

export async function updateUsername(username) {
  const data = await request('/profile/username', { username });
  if (data && data.accessToken) setAccessToken(data.accessToken);
  if (data && data.user) updateUser(data.user);
  return data;
}

export async function listSessions() {
  return requestGet('/sessions');
}

export async function revokeSession(sessionId, all = false) {
  if (all) {
    return request('/sessions/revoke', { all: true });
  }
  return request('/sessions/revoke', { sessionId });
}

export async function createDeletionRequest(reason) {
  return request('/deletion-requests', { reason });
}

export async function listMyDeletionRequests() {
  return requestGet('/deletion-requests/me');
}

export async function refreshToken() {
  const data = await request('/refresh', {});
  saveTokens(data.accessToken, data.refreshToken, data.user);
  return data;
}

export async function logout() {
  try {
    await request('/logout', {});
  } catch {
    // ignore
  }
  clearTokens();
}

export async function fetchMe() {
  return requestGet('/me');
}

export function getAccessToken() {
  return _accessToken;
}

export function getUser() {
  if (_user) return _user;
  try {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      _user = JSON.parse(stored);
      return _user;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function checkAuth() {
  if (_accessToken) {
    const exp = parseJwtExp(_accessToken);
    if (exp > Date.now() + 10_000) {
      return getUser();
    }
  }

  try {
    const data = await refreshToken();
    return data.user || getUser();
  } catch {
    clearTokens();
    return null;
  }
}

export async function requireLogin(redirectUrl) {
  const user = await checkAuth();
  if (!user) {
    const target = redirectUrl || window.location.pathname;
    window.location.href = `/applications?redirect=${encodeURIComponent(target)}`;
    throw new Error('redirect to login');
  }
  return user;
}

export function isLoggedIn() {
  return !!_accessToken || !!getUser();
}
