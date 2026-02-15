function normalizeCode(code) {
  return String(code || '').trim();
}

export function decideRoomSwitch(options = {}) {
  const roomLabel = String(options.roomLabel || '频道');
  const targetCode = normalizeCode(options.targetCode);
  const currentCode = normalizeCode(options.currentCode);
  const inRoom = Boolean(options.currentRoom);
  const isOwner = Boolean(options.isOwner);

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

  if (isOwner) {
    return {
      action: 'close_then_join',
      requiresConfirm: true,
      prompt: `你当前在自己的${roomLabel}中。要先关闭当前${roomLabel}，再加入 ${targetCode} 吗？`,
    };
  }

  return {
    action: 'leave_then_join',
    requiresConfirm: true,
    prompt: `你当前在一个${roomLabel}中。要先退出当前${roomLabel}，再加入 ${targetCode} 吗？`,
  };
}
