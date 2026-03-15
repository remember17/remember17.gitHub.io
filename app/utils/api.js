/**
 * FiveHow web-home API helpers.
 *
 * Backend:
 * - Auth REST: /api/auth/*
 * - Chat files: /chat/files/*
 * - WebSocket: /chat, /chess
 */

const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const PUBLIC_API_BASE = String(window.__FIVEHOW_API_BASE__ || '').trim();
const PUBLIC_WS_BASE = String(window.__FIVEHOW_WS_BASE__ || '').trim();

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function resolveApiHost() {
  if (IS_LOCAL) return `${location.protocol}//localhost:8080`;
  if (PUBLIC_API_BASE) return trimTrailingSlash(PUBLIC_API_BASE);
  return 'https://api.fivehow.com';
}

function resolveWsHost() {
  if (IS_LOCAL) {
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//localhost:8080`;
  }
  if (PUBLIC_WS_BASE) return trimTrailingSlash(PUBLIC_WS_BASE);
  return 'wss://api.fivehow.com';
}

export const API_HOST = resolveApiHost();
export const WS_HOST = resolveWsHost();
const CSRF_COOKIE_NAME = 'fh_csrf';
let csrfTokenMemory = '';

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
  return csrfTokenMemory || readCookie(CSRF_COOKIE_NAME);
}

function updateCsrfToken(payload) {
  const token = String((payload && payload.csrfToken) || '').trim();
  if (token) csrfTokenMemory = token;
}

function isMutatingMethod(method) {
  const m = String(method || 'GET').toUpperCase();
  return m === 'POST' || m === 'PATCH' || m === 'DELETE' || m === 'PUT';
}

function normalizeUser(user) {
  if (!user || typeof user !== 'object') return user;
  const normalized = { ...user };
  if (!normalized.userNumber && normalized.user_number) {
    normalized.userNumber = normalized.user_number;
  }
  if (!normalized.publicUserId && normalized.public_user_id) {
    normalized.publicUserId = normalized.public_user_id;
  }
  if (!normalized.displayUserId && normalized.display_user_id) {
    normalized.displayUserId = normalized.display_user_id;
  }
  return normalized;
}

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const out = { ...payload };

  if (!out.accessToken && out.access_token) out.accessToken = out.access_token;
  if (!out.access_token && out.accessToken) out.access_token = out.accessToken;

  if (!out.refreshToken && out.refresh_token) out.refreshToken = out.refresh_token;
  if (!out.refresh_token && out.refreshToken) out.refresh_token = out.refreshToken;

  if (out.user) out.user = normalizeUser(out.user);
  return out;
}

function makeHttpError(res, payload) {
  const err = new Error(payload.error || payload.message || `Request failed (${res.status})`);
  err.status = res.status;
  err.data = payload;
  return err;
}

async function request(path, options = {}) {
  const { method = 'GET', token, headers = {}, body } = options;
  const reqHeaders = { ...headers };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  if (isMutatingMethod(method) && !reqHeaders['X-CSRF-Token'] && !reqHeaders['x-csrf-token']) {
    const csrfToken = getCsrfToken();
    if (csrfToken) reqHeaders['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(`${API_HOST}${path}`, {
    method,
    headers: reqHeaders,
    body,
    credentials: 'include',
  });

  const rawText = await response.text();
  let payload = {};
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = {};
    }
  }
  payload = normalizePayload(payload);
  updateCsrfToken(payload);

  if (!response.ok) {
    throw makeHttpError(response, payload);
  }
  return payload;
}

export function apiPost(path, body, token) {
  return request(path, {
    method: 'POST',
    token,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
}

export function apiGet(path, token) {
  return request(path, { method: 'GET', token });
}

export function login(identifier, password, useNumber = false) {
  return apiPost('/api/auth/login', {
    username: String(identifier || '').trim(),
    password: String(password || ''),
    loginType: useNumber ? 'user_number' : 'username',
  });
}

export function register(username, password, email, code) {
  return apiPost('/api/auth/register-email', {
    username: String(username || '').trim(),
    password: String(password || ''),
    email: String(email || '').trim(),
    code: String(code || '').trim(),
  });
}

export function sendVerificationCode(email, purpose = 'register') {
  return apiPost('/api/auth/send-code', {
    email: String(email || '').trim(),
    purpose,
  });
}

export function refreshToken(refreshTk) {
  const token = String(refreshTk || '').trim();
  if (token) {
    return apiPost('/api/auth/refresh', {
      refreshToken: token,
    });
  }
  return apiPost('/api/auth/refresh', {});
}

export function getMe(token) {
  return apiGet('/api/auth/me', token);
}

export function logout(refreshTk) {
  const token = String(refreshTk || '').trim();
  if (token) {
    return apiPost('/api/auth/logout', {
      refreshToken: token,
    });
  }
  return apiPost('/api/auth/logout', {});
}

export function resetPassword(email, code, newPassword) {
  return apiPost('/api/auth/reset-password', {
    email: String(email || '').trim(),
    code: String(code || '').trim(),
    newPassword: String(newPassword || ''),
  });
}

export async function uploadFile(roomId, file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_HOST}/chat/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Room-Id': String(roomId || ''),
    },
    body: formData,
    credentials: 'include',
  });

  const rawText = await response.text();
  let payload = {};
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = {};
    }
  }

  if (!response.ok) {
    throw makeHttpError(response, payload);
  }
  return payload;
}

export function fileDownloadUrl(fileId, options = {}) {
  const { roomId = '' } = options;
  const url = new URL(`${API_HOST}/chat/files/download/${encodeURIComponent(String(fileId || ''))}`);
  if (roomId) url.searchParams.set('roomId', String(roomId));
  return url.toString();
}

export class WsConnection {
  constructor(path) {
    this.path = path;
    this.url = `${WS_HOST}${path}`;
    this.ws = null;
    this.handlers = {};
    this.reconnectTimer = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.intentionalClose = false;
    this.pingInterval = null;
  }

  on(type, fn) {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type].push(fn);
    return this;
  }

  off(type, fn) {
    if (!this.handlers[type]) return;
    this.handlers[type] = this.handlers[type].filter((h) => h !== fn);
  }

  emit(type, data) {
    const list = this.handlers[type] || [];
    for (const fn of list) {
      try {
        fn(data);
      } catch (error) {
        console.error('ws handler error', error);
      }
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.intentionalClose = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit('_open', null);
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!msg || !msg.type) return;
      this.emit(msg.type, msg);
      this.emit('_message', msg);
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.emit('_close', null);
      if (!this.intentionalClose) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.emit('_error', null);
    };
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    this.stopPing();
    if (this.ws) this.ws.close();
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }

  startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  get connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}
