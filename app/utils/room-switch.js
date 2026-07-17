function normalizeCode(code) {
  return String(code || '').trim();
}

export function decideRoomSwitch(options = {}) {
  const roomLabel = String(options.roomLabel || '频道');
  const targetCode = normalizeCode(options.targetCode);
  const currentCode = normalizeCode(options.currentCode);
  const inRoom = Boolean(options.currentRoom);

  if (!targetCode) {
    return {
      action: 'invalid_target',
      requiresConfirm: false,
      prompt: '',
    };
  }

  if (!inRoom) {
    return {
      action: 'join_direct',
      requiresConfirm: false,
      prompt: '',
    };
  }

  if (currentCode && currentCode === targetCode) {
    return {
      action: 'already_in_target',
      requiresConfirm: false,
      prompt: '',
    };
  }

  return {
    action: 'leave_then_join',
    requiresConfirm: false,
    prompt: `你当前在一个${roomLabel}中。将先退出当前${roomLabel}，再加入 ${targetCode}。`,
  };
}
