/**
 * FiveHow — WebSocket Event Constants
 */

// Chat events
export const CHAT_EVENTS = {
  AUTH: 'auth',
  AUTHED: 'authed',
  CREATE: 'my_room',
  JOIN: 'join',
  LEAVE: 'leave',
  LEFT: 'left',
  TEXT: 'text',
  FILE_READY: 'file_ready',
  CLEAR_CONTENT: 'clear_content',
  CONTENT_CLEARED: 'content_cleared',
  KICK_MEMBER: 'kick_member',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_KICKED: 'member_kicked',
  ROOM_STATE: 'room_state',
  CREATED: 'created',
  JOINED: 'joined',
  ERROR: 'error',
  CLEANUP_NOTICE: 'daily_cleanup_notice',
  CLEANUP_COUNTDOWN: 'daily_cleanup_countdown',
  ROOM_CLOSED: 'room_closed',
};

// Chess events
export const CHESS_EVENTS = {
  AUTH: 'auth',
  AUTHED: 'authed',
  CREATE: 'my_room',
  JOIN: 'join',
  LEAVE: 'leave',
  LEFT: 'left',
  MOVE: 'move',
  RESTART: 'restart_game',
  GAME_RESTARTED: 'game_restarted',
  GAME_STARTED: 'game_started',
  KICK_MEMBER: 'kick_member',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  MEMBER_KICKED: 'member_kicked',
  ROOM_STATE: 'room_state',
  CREATED: 'created',
  JOINED: 'joined',
  ERROR: 'error',
  CLEANUP_NOTICE: 'daily_cleanup_notice',
  CLEANUP_COUNTDOWN: 'daily_cleanup_countdown',
  ROOM_CLOSED: 'room_closed',
};
