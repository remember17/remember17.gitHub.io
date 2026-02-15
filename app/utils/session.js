import * as storage from './storage.js';

let apiModulePromise = null;

async function getApiModule() {
  if (!apiModulePromise) {
    apiModulePromise = import('./api.js');
  }
  return apiModulePromise;
}

async function defaultGetMe(token) {
  const mod = await getApiModule();
  return mod.getMe(token);
}

async function defaultRefreshToken(refreshToken) {
  const mod = await getApiModule();
  return mod.refreshToken(refreshToken);
}

function isAuthError(error) {
  const status = Number(error && error.status);
  return status === 400 || status === 401 || status === 403;
}

function normalizeToken(token) {
  return String(token || '').trim();
}

function extractUser(payload) {
  return payload && payload.user ? payload.user : null;
}

function resolveDeps(overrides = {}) {
  return {
    getAuthToken: overrides.getAuthToken || storage.getAuthToken,
    getRefreshToken: overrides.getRefreshToken || storage.getRefreshToken,
    getMe: overrides.getMe || defaultGetMe,
    refreshToken: overrides.refreshToken || defaultRefreshToken,
    setAuthToken: overrides.setAuthToken || storage.setAuthToken,
    setRefreshToken: overrides.setRefreshToken || storage.setRefreshToken,
    setUser: overrides.setUser || storage.setUser,
    clearAuth: overrides.clearAuth || storage.clearAuth,
  };
}

async function verifyAccessToken(token, deps) {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  const payload = await deps.getMe(normalized);
  const user = extractUser(payload);
  if (!user) return null;

  deps.setAuthToken(normalized);
  deps.setUser(user);
  return {
    token: normalized,
    user,
  };
}

async function refreshWithStoredToken(deps) {
  const refreshToken = normalizeToken(deps.getRefreshToken());
  if (!refreshToken) return null;

  const refreshed = await deps.refreshToken(refreshToken);
  const accessToken = normalizeToken(refreshed && refreshed.accessToken);
  if (!accessToken) return null;

  deps.setAuthToken(accessToken);
  if (refreshed && refreshed.refreshToken) {
    deps.setRefreshToken(refreshed.refreshToken);
  }

  const verified = await verifyAccessToken(accessToken, deps);
  return verified;
}

export async function refreshSession(overrides = {}) {
  const deps = resolveDeps(overrides);
  try {
    const restored = await refreshWithStoredToken(deps);
    if (restored) return restored;
  } catch (error) {
    if (isAuthError(error)) {
      deps.clearAuth();
    }
    return null;
  }
  return null;
}

export async function restoreSession(overrides = {}) {
  const deps = resolveDeps(overrides);

  const accessToken = normalizeToken(deps.getAuthToken());
  let accessTokenAuthFailed = false;

  if (accessToken) {
    try {
      const verified = await verifyAccessToken(accessToken, deps);
      if (verified) return verified;
      accessTokenAuthFailed = true;
    } catch (error) {
      accessTokenAuthFailed = isAuthError(error);
      if (!accessTokenAuthFailed) {
        // For transient network failures, keep current auth state untouched.
        return null;
      }
    }
  }

  try {
    const restored = await refreshWithStoredToken(deps);
    if (restored) return restored;
  } catch (error) {
    if (isAuthError(error) || accessTokenAuthFailed) {
      deps.clearAuth();
    }
    return null;
  }

  if (accessTokenAuthFailed) {
    deps.clearAuth();
  }
  return null;
}
