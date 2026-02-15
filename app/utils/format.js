/**
 * FiveHow — Formatting Utilities
 */

export function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(typeof ts === 'number' ? ts : Date.parse(ts));
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  const M = d.getMonth() + 1;
  const D = d.getDate();
  return `${M}/${D} ${hh}:${mm}`;
}

export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getInitial(name) {
  if (!name) return '?';
  const str = String(name).trim();
  if (!str) return '?';
  // For Chinese characters, use first char
  if (/[\u4e00-\u9fff]/.test(str[0])) return str[0];
  return str[0].toUpperCase();
}

export function truncate(str, maxLen = 30) {
  if (!str) return '';
  const s = String(str);
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

export function relativeTime(ts) {
  if (!ts) return '';
  const now = Date.now();
  const diff = now - (typeof ts === 'number' ? ts : new Date(ts).getTime());
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

// Generate a deterministic color from a string (for avatars)
const AVATAR_COLORS = [
  '#E7E5E4', '#D6D3D1', '#A8A29E', '#FED7AA', '#FDE68A',
  '#BBF7D0', '#BAE6FD', '#C4B5FD', '#FBCFE8', '#FCA5A5',
];

export function avatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
