import {
  requireLogin,
  fetchMe,
  getUser,
  sendCode,
  bindEmail,
  updateUsername,
  resetPassword,
  listSessions,
  revokeSession,
  createDeletionRequest,
  listMyDeletionRequests,
} from './auth.js';

const $ = (id) => document.getElementById(id);

const dom = {
  cleanupBanner: $('cleanupBanner'),
  cleanupCountdown: $('cleanupCountdown'),
  profileHint: $('profileHint'),
  infoId: $('infoId'),
  infoPublicId: $('infoPublicId'),
  infoDisplayId: $('infoDisplayId'),
  infoUserNumber: $('infoUserNumber'),
  infoUsername: $('infoUsername'),
  infoEmail: $('infoEmail'),
  infoCreatedAt: $('infoCreatedAt'),
  infoUsernameAllowedAt: $('infoUsernameAllowedAt'),

  usernameInput: $('usernameInput'),
  updateUsernameBtn: $('updateUsernameBtn'),
  usernameStatus: $('usernameStatus'),

  bindEmailInput: $('bindEmailInput'),
  sendBindCodeBtn: $('sendBindCodeBtn'),
  bindCodeInput: $('bindCodeInput'),
  bindEmailBtn: $('bindEmailBtn'),
  bindStatus: $('bindStatus'),

  resetCodeInput: $('resetCodeInput'),
  sendResetCodeBtn: $('sendResetCodeBtn'),
  newPasswordInput: $('newPasswordInput'),
  resetPasswordBtn: $('resetPasswordBtn'),
  resetStatus: $('resetStatus'),

  refreshSessionsBtn: $('refreshSessionsBtn'),
  revokeAllSessionsBtn: $('revokeAllSessionsBtn'),
  sessionsBody: $('sessionsBody'),
  sessionsStatus: $('sessionsStatus'),

  deletionReasonInput: $('deletionReasonInput'),
  createDeletionBtn: $('createDeletionBtn'),
  deletionStatus: $('deletionStatus'),
  deletionBody: $('deletionBody'),
};

function fmtTs(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString('zh-CN', { hour12: false });
}

function setStatus(el, text, type = '') {
  if (!el) return;
  el.textContent = text;
  el.className = `fh-status${type ? ` ${type}` : ''}`;
}

function renderUser(user) {
  dom.infoId.textContent = user?.id ?? '-';
  dom.infoPublicId.textContent = user?.public_user_id || '-';
  dom.infoDisplayId.textContent = user?.display_user_id || user?.public_user_id || String(user?.id || '-');
  dom.infoUserNumber.textContent = user?.user_number || '-';
  dom.infoUsername.textContent = user?.username || '-';
  dom.infoEmail.textContent = user?.email || '-';
  dom.infoCreatedAt.textContent = fmtTs(user?.created_at);
  dom.infoUsernameAllowedAt.textContent = user?.username_change_allowed_at ? fmtTs(user.username_change_allowed_at) : '现在可改';
  dom.profileHint.textContent = `欢迎你，${user?.username || '用户'}。`;
}

function getNextCleanupAt(now = Date.now()) {
  const offset = 8 * 60 * 60 * 1000;
  const cnNow = now + offset;
  const d = new Date(cnNow);
  let target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 3, 0, 0, 0);
  if (target <= cnNow) target += 24 * 60 * 60 * 1000;
  return target - offset;
}

function formatRemain(sec) {
  const total = Math.max(0, Number(sec) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function startCleanupBanner() {
  if (!dom.cleanupBanner || !dom.cleanupCountdown) return;
  const tick = () => {
    const nextCleanupAt = getNextCleanupAt();
    const remain = Math.max(0, Math.floor((nextCleanupAt - Date.now()) / 1000));
    if (remain <= 15 * 60) {
      dom.cleanupBanner.dataset.level = 'warning';
      dom.cleanupCountdown.textContent = `倒计时 ${formatRemain(remain)}`;
    } else {
      dom.cleanupBanner.dataset.level = 'normal';
      dom.cleanupCountdown.textContent = `下次清理 ${fmtTs(nextCleanupAt)}`;
    }
  };
  tick();
  setInterval(tick, 1000);
}

async function refreshProfile() {
  const payload = await fetchMe();
  renderUser(payload.user || getUser() || {});
}

async function loadSessions() {
  try {
    const payload = await listSessions();
    const rows = payload.sessions || [];
    if (rows.length === 0) {
      dom.sessionsBody.innerHTML = '<tr><td colspan="7">暂无会话</td></tr>';
      setStatus(dom.sessionsStatus, '暂无会话记录');
      return;
    }

    dom.sessionsBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.id}</td>
        <td>${row.client_ip || '-'}</td>
        <td>${(row.user_agent || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        <td>${fmtTs(row.created_at)}</td>
        <td>${fmtTs(row.last_seen_at)}</td>
        <td>${fmtTs(row.expires_at)}</td>
        <td><button type="button" data-session-id="${row.id}">下线</button></td>
      </tr>
    `).join('');
    setStatus(dom.sessionsStatus, `已加载 ${rows.length} 条会话`, 'ok');
  } catch (err) {
    setStatus(dom.sessionsStatus, err.message, 'error');
  }
}

async function loadDeletionRequests() {
  try {
    const payload = await listMyDeletionRequests();
    const rows = payload.rows || [];
    if (rows.length === 0) {
      dom.deletionBody.innerHTML = '<tr><td colspan="5">暂无记录</td></tr>';
      return;
    }

    dom.deletionBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.id}</td>
        <td>${row.status || '-'}</td>
        <td>${(row.reason || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        <td>${fmtTs(row.requested_at)}</td>
        <td>${(row.review_note || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
      </tr>
    `).join('');
  } catch (err) {
    setStatus(dom.deletionStatus, err.message, 'error');
  }
}

async function onUpdateUsername() {
  const username = dom.usernameInput.value.trim();
  if (!username) {
    setStatus(dom.usernameStatus, '请输入用户名', 'error');
    return;
  }

  try {
    const payload = await updateUsername(username);
    setStatus(dom.usernameStatus, payload.message || '用户名已更新', 'ok');
    await refreshProfile();
  } catch (err) {
    setStatus(dom.usernameStatus, err.message, 'error');
  }
}

async function onSendBindCode() {
  const email = dom.bindEmailInput.value.trim();
  if (!email) {
    setStatus(dom.bindStatus, '请输入新邮箱', 'error');
    return;
  }

  try {
    await sendCode(email, 'bind');
    setStatus(dom.bindStatus, '验证码已发送到新邮箱', 'ok');
  } catch (err) {
    setStatus(dom.bindStatus, err.message, 'error');
  }
}

async function onBindEmail() {
  const email = dom.bindEmailInput.value.trim();
  const code = dom.bindCodeInput.value.trim();
  if (!email || !code) {
    setStatus(dom.bindStatus, '请填写邮箱和验证码', 'error');
    return;
  }

  try {
    await bindEmail(email, code);
    setStatus(dom.bindStatus, '邮箱更新成功', 'ok');
    dom.bindCodeInput.value = '';
    await refreshProfile();
  } catch (err) {
    setStatus(dom.bindStatus, err.message, 'error');
  }
}

async function onSendResetCode() {
  const user = getUser();
  const email = user?.email;
  if (!email) {
    setStatus(dom.resetStatus, '当前账号未绑定邮箱', 'error');
    return;
  }

  try {
    await sendCode(email, 'reset');
    setStatus(dom.resetStatus, `验证码已发送到 ${email}`, 'ok');
  } catch (err) {
    setStatus(dom.resetStatus, err.message, 'error');
  }
}

async function onResetPassword() {
  const user = getUser();
  const email = user?.email;
  const code = dom.resetCodeInput.value.trim();
  const newPassword = dom.newPasswordInput.value;

  if (!email) {
    setStatus(dom.resetStatus, '当前账号未绑定邮箱', 'error');
    return;
  }
  if (!code || code.length !== 6) {
    setStatus(dom.resetStatus, '请输入 6 位验证码', 'error');
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    setStatus(dom.resetStatus, '请输入至少 6 位密码', 'error');
    return;
  }

  try {
    await resetPassword(email, code, newPassword);
    dom.resetCodeInput.value = '';
    dom.newPasswordInput.value = '';
    setStatus(dom.resetStatus, '密码重置成功', 'ok');
  } catch (err) {
    setStatus(dom.resetStatus, err.message, 'error');
  }
}

async function onCreateDeletionRequest() {
  const reason = dom.deletionReasonInput.value.trim();
  if (reason.length < 4) {
    setStatus(dom.deletionStatus, '原因至少 4 个字符', 'error');
    return;
  }

  try {
    await createDeletionRequest(reason);
    dom.deletionReasonInput.value = '';
    setStatus(dom.deletionStatus, '注销申请已提交，等待管理员审核', 'ok');
    await loadDeletionRequests();
  } catch (err) {
    setStatus(dom.deletionStatus, err.message, 'error');
  }
}

function bindEvents() {
  dom.updateUsernameBtn.addEventListener('click', onUpdateUsername);

  dom.sendBindCodeBtn.addEventListener('click', onSendBindCode);
  dom.bindEmailBtn.addEventListener('click', onBindEmail);

  dom.sendResetCodeBtn.addEventListener('click', onSendResetCode);
  dom.resetPasswordBtn.addEventListener('click', onResetPassword);

  dom.refreshSessionsBtn.addEventListener('click', loadSessions);
  dom.revokeAllSessionsBtn.addEventListener('click', async () => {
    if (!window.confirm('确认让当前账号所有设备下线？')) return;
    try {
      await revokeSession(null, true);
      setStatus(dom.sessionsStatus, '所有会话已撤销', 'ok');
      await loadSessions();
    } catch (err) {
      setStatus(dom.sessionsStatus, err.message, 'error');
    }
  });

  dom.sessionsBody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-session-id]');
    if (!btn) return;
    const sessionId = Number(btn.dataset.sessionId);
    if (!Number.isInteger(sessionId) || sessionId <= 0) return;

    try {
      await revokeSession(sessionId, false);
      setStatus(dom.sessionsStatus, `会话 #${sessionId} 已下线`, 'ok');
      await loadSessions();
    } catch (err) {
      setStatus(dom.sessionsStatus, err.message, 'error');
    }
  });

  dom.createDeletionBtn.addEventListener('click', onCreateDeletionRequest);
}

async function init() {
  await requireLogin('/profile');
  startCleanupBanner();
  bindEvents();

  try {
    await Promise.all([
      refreshProfile(),
      loadSessions(),
      loadDeletionRequests(),
    ]);
  } catch (err) {
    dom.profileHint.textContent = err.message || '加载失败';
  }
}

init();
