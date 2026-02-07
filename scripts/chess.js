import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@1.0.0/dist/esm/chess.js";

const WS_URL = (() => {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "ws://localhost:8080";
  }
  return "wss://ws.wuhao.tech";
})();

const i18n = {
  zh: {
    title: "国际象棋",
    sitePasswordPlaceholder: "请输入站点密码",
    startButton: "开局",
    joinButton: "加入",
    copyButton: "复制",
    copied: "链接已复制",
    authRequired: "请输入站点密码",
    authFailed: "站点密码错误",
    roomCreated: "房间已创建",
    creating: "正在开局…",
    joining: "正在加入房间…",
    joinFailed: "加入失败",
    roleWhite: "你：白方",
    roleBlack: "你：黑方",
    peerWaiting: "对手：未加入",
    peerConnected: "对手：已加入",
    gameWaiting: "等待对手加入",
    gameInProgress: "对局进行中",
    checkmate: "将死",
    whiteWins: "白棋胜",
    blackWins: "黑棋胜",
    draw: "和棋",
    check: "将军",
    notYourTurn: "还没轮到你",
    illegalMove: "非法走子",
    lastMove: "上一步",
    lastMoveNone: "上一步：-",
    lastMoveBlack: "黑棋",
    lastMoveWhite: "白棋",
    turnMy: "轮到你",
    turnWait: "等待对手",
    selectPromotion: "选择升变棋子",
    restartGame: "重新开始",
    restarting: "已重新开始",
  },
  en: {
    title: "Chess",
    sitePasswordPlaceholder: "Enter site password",
    startButton: "Start",
    joinButton: "Join",
    copyButton: "Copy",
    copied: "Link copied",
    authRequired: "Site password required",
    authFailed: "Site password incorrect",
    roomCreated: "Room created",
    creating: "Starting…",
    joining: "Joining room…",
    joinFailed: "Join failed",
    roleWhite: "You: White",
    roleBlack: "You: Black",
    peerWaiting: "Opponent: Waiting",
    peerConnected: "Opponent: Joined",
    gameWaiting: "Waiting for opponent",
    gameInProgress: "Game in progress",
    checkmate: "Checkmate",
    whiteWins: "White wins",
    blackWins: "Black wins",
    draw: "Draw",
    check: "Check",
    notYourTurn: "Not your turn",
    illegalMove: "Illegal move",
    lastMove: "Last move",
    lastMoveNone: "Last move: -",
    lastMoveBlack: "Black",
    lastMoveWhite: "White",
    turnMy: "Your turn",
    turnWait: "Waiting",
    selectPromotion: "Choose promotion",
    restartGame: "Restart",
    restarting: "Restarted",
  },
};

const chess = new Chess();

const state = {
  socket: null,
  connected: false,
  authed: false,
  roomId: null,
  role: null,
  peerConnected: false,
  pendingAction: null,
  language: "zh",
  lastMove: null,
  pendingPromotion: null,
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const pieceSymbols = {
  w: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
  b: { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" },
};

let orientation = "white";
let selectedSquare = null;
let legalTargets = new Set();
let legalMovesByTo = new Map();
let squareButtons = new Map();
const ROOM_ID_FROM_URL = new URLSearchParams(window.location.search).get("roomId");
const ENTRY_MODE = ROOM_ID_FROM_URL ? "join" : "create";

const screenSite = document.querySelector('[data-screen="site"]');
const screenBoard = document.querySelector('[data-screen="board"]');

const sitePasswordInput = document.getElementById("sitePassword");
const siteBtn = document.getElementById("siteBtn");
const copyBtn = document.getElementById("copyBtn");
const restartBtn = document.querySelector("[data-restart-btn]");

const boardEl = document.getElementById("board");
const promotionMenuEl = document.querySelector("[data-promotion-menu]");
const roomLinkInput = document.getElementById("roomLink");
const shareRowEl = document.querySelector("[data-share-row]");
const roleEl = document.querySelector("[data-role]");
const peerEl = document.querySelector("[data-peer]");
const lastMoveEl = document.querySelector("[data-last-move]");
const turnDotEl = document.querySelector("[data-turn-dot]");
const gameStatusEl = document.querySelector("[data-game-status]");
const messageEls = document.querySelectorAll("[data-message]");

const getText = (key) => i18n[state.language][key] || "";

const focusSiteInput = () => {
  if (!sitePasswordInput) return;
  const focusAndSelect = () => {
    sitePasswordInput.focus({ preventScroll: true });
    sitePasswordInput.select();
  };
  requestAnimationFrame(() => {
    focusAndSelect();
    setTimeout(focusAndSelect, 120);
  });
};

const setMessage = (message = "") => {
  messageEls.forEach((el) => {
    el.textContent = message;
  });
};

const applyI18n = () => {
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = getText(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    el.placeholder = getText(key);
  });
  if (siteBtn) {
    siteBtn.textContent = ENTRY_MODE === "join" ? getText("joinButton") : getText("startButton");
  }
  if (promotionMenuEl && !promotionMenuEl.hidden) {
    promotionMenuEl.setAttribute("aria-label", getText("selectPromotion"));
  }
  updateStatus();
  updateGameStatus();
};

const showScreen = (screen) => {
  const map = {
    site: screenSite,
    board: screenBoard,
  };
  Object.values(map).forEach((el) => {
    if (!el) return;
    el.hidden = el !== map[screen];
  });
  if (screen === "site") {
    focusSiteInput();
  }
};

const updateStatus = () => {
  if (roleEl) {
    if (state.role === "white") roleEl.textContent = getText("roleWhite");
    else if (state.role === "black") roleEl.textContent = getText("roleBlack");
    else roleEl.textContent = "-";
  }
  if (peerEl) {
    if (!state.roomId) {
      peerEl.textContent = "-";
    } else {
      peerEl.textContent = state.peerConnected ? getText("peerConnected") : getText("peerWaiting");
    }
  }
  if (lastMoveEl) {
    if (!state.lastMove) {
      lastMoveEl.textContent = getText("lastMoveNone");
    } else {
      const side = state.lastMove.color === "b" ? getText("lastMoveBlack") : getText("lastMoveWhite");
      const text = state.lastMove.san || `${state.lastMove.from}→${state.lastMove.to}`;
      lastMoveEl.textContent = `${getText("lastMove")}：${side} ${text}`;
    }
  }
  if (turnDotEl) {
    const myColor = state.role === "white" ? "w" : state.role === "black" ? "b" : null;
    const myTurn = Boolean(myColor && state.peerConnected && chess.turn() === myColor);
    turnDotEl.classList.toggle("my-turn", myTurn);
    turnDotEl.classList.toggle("wait-turn", !myTurn);
    const label = myTurn ? getText("turnMy") : getText("turnWait");
    turnDotEl.setAttribute("aria-label", label);
    turnDotEl.title = label;
  }
  if (restartBtn) {
    restartBtn.hidden = !state.roomId;
  }
  if (boardEl) {
    boardEl.dataset.active = state.roomId && state.connected ? "true" : "false";
  }
  if (roomLinkInput) {
    if (state.roomId) {
      const url = new URL(window.location.href);
      url.searchParams.set("roomId", state.roomId);
      roomLinkInput.value = url.toString();
    } else {
      roomLinkInput.value = "";
    }
  }
  if (shareRowEl) {
    shareRowEl.hidden = !state.roomId || state.role === "black";
  }
};

const setLastMove = (move) => {
  if (move && move.from && move.to) {
    state.lastMove = {
      from: move.from,
      to: move.to,
      san: move.san || null,
      color: move.color || null,
    };
  } else {
    state.lastMove = null;
  }
};

const closePromotionMenu = () => {
  if (!promotionMenuEl) return;
  promotionMenuEl.hidden = true;
  promotionMenuEl.innerHTML = "";
  state.pendingPromotion = null;
};

const isPromotionMove = (from, to, color) => {
  const movingPiece = chess.get(from);
  if (!movingPiece || movingPiece.type !== "p") return false;
  const targetRank = Number(to[1]);
  return (color === "w" && targetRank === 8) || (color === "b" && targetRank === 1);
};

const commitMove = ({ from, to, promotion = null }) => {
  const payload = { from, to };
  if (promotion) payload.promotion = promotion;
  const move = chess.move(payload);
  if (!move) {
    setMessage(getText("illegalMove"));
    clearSelection();
    return;
  }
  clearSelection();
  setLastMove(move);
  renderBoard();
  updateStatus();
  send({ type: "move", roomId: state.roomId, move, state: { fen: chess.fen() } });
};

const restartGame = () => {
  if (!state.roomId || !state.role) return;
  closePromotionMenu();
  selectedSquare = null;
  legalTargets = new Set();
  legalMovesByTo = new Map();
  state.lastMove = null;
  chess.reset();
  renderBoard();
  updateStatus();
  setMessage(getText("restarting"));
  const resetColor = state.role === "black" ? "b" : "w";
  send({
    type: "move",
    roomId: state.roomId,
    move: { kind: "restart", color: resetColor },
    state: { fen: chess.fen(), reset: true },
  });
};

const openPromotionMenu = ({ from, to, color }) => {
  if (!promotionMenuEl || !boardEl) return;
  state.pendingPromotion = { from, to, color };
  const candidates = legalMovesByTo.get(to) || [];
  const promotionSet = new Set(candidates.map((move) => move.promotion).filter(Boolean));
  const choices = promotionSet.size > 0 ? [...promotionSet] : ["q", "r", "b", "n"];
  promotionMenuEl.innerHTML = "";
  choices.forEach((type) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "promotion-option";
    btn.textContent = pieceSymbols[color]?.[type] || "";
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      if (event.currentTarget && typeof event.currentTarget.blur === "function") {
        event.currentTarget.blur();
      }
      const pending = state.pendingPromotion;
      closePromotionMenu();
      if (!pending) return;
      commitMove({ from: pending.from, to: pending.to, promotion: type });
    });
    promotionMenuEl.appendChild(btn);
  });
  const targetSquare = squareButtons.get(to);
  if (targetSquare) {
    const boardRect = boardEl.getBoundingClientRect();
    const rect = targetSquare.getBoundingClientRect();
    const centerX = rect.left - boardRect.left + rect.width / 2;
    let top = rect.top - boardRect.top - 52;
    if (top < 4) {
      top = rect.bottom - boardRect.top + 6;
    }
    promotionMenuEl.style.left = `${centerX}px`;
    promotionMenuEl.style.top = `${top}px`;
  }
  promotionMenuEl.hidden = false;
  promotionMenuEl.setAttribute("aria-label", getText("selectPromotion"));
};

const syncRoomIdToUrl = () => {
  if (!state.roomId) return;
  const url = new URL(window.location.href);
  url.searchParams.set("roomId", state.roomId);
  window.history.replaceState({}, "", url.toString());
};

const getSquareOrder = () => {
  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const fileOrder = orientation === "white" ? files : [...files].reverse();
  const order = [];
  for (const rank of ranks) {
    for (const file of fileOrder) {
      order.push(`${file}${rank}`);
    }
  }
  return order;
};

const isDarkSquare = (square) => {
  const file = files.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return (file + rank) % 2 === 0;
};

const buildBoard = () => {
  if (!boardEl) return;
  boardEl.innerHTML = "";
  squareButtons = new Map();
  const order = getSquareOrder();
  order.forEach((square) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `square ${isDarkSquare(square) ? "dark" : "light"}`;
    button.dataset.square = square;
    button.addEventListener("click", () => handleSquareClick(square));
    boardEl.appendChild(button);
    squareButtons.set(square, button);
  });
};

const renderBoard = () => {
  squareButtons.forEach((button, square) => {
    const piece = chess.get(square);
    if (piece) {
      const symbol = pieceSymbols[piece.color]?.[piece.type] ?? "";
      button.textContent = symbol;
      button.classList.remove("empty-square");
      button.setAttribute("aria-label", `${piece.color === "w" ? "White" : "Black"} ${piece.type} on ${square}`);
      button.dataset.pieceColor = piece.color;
      button.classList.toggle("piece-white", piece.color === "w");
      button.classList.toggle("piece-black", piece.color === "b");
    } else {
      button.textContent = "";
      button.classList.add("empty-square");
      button.setAttribute("aria-label", `Empty ${square}`);
      delete button.dataset.pieceColor;
      button.classList.remove("piece-white", "piece-black");
    }
    button.classList.toggle("selected", square === selectedSquare);
    button.classList.toggle("target", legalTargets.has(square));
    button.classList.toggle("last-move-from", state.lastMove?.from === square);
    button.classList.toggle("last-move-to", state.lastMove?.to === square);
    button.classList.toggle("last-move-piece", Boolean(piece) && state.lastMove?.to === square);
  });
  updateGameStatus();
};

const updateGameStatus = () => {
  if (!gameStatusEl) return;
  if (!state.roomId) {
    gameStatusEl.textContent = "";
    return;
  }
  if (chess.isCheckmate()) {
    const winnerKey = chess.turn() === "w" ? "blackWins" : "whiteWins";
    gameStatusEl.textContent = getText(winnerKey);
    return;
  }
  if (chess.isDraw()) {
    gameStatusEl.textContent = getText("draw");
    return;
  }
  if (chess.isCheck()) {
    gameStatusEl.textContent = getText("check");
    return;
  }
  gameStatusEl.textContent = state.peerConnected ? getText("gameInProgress") : getText("gameWaiting");
};

const clearSelection = () => {
  selectedSquare = null;
  legalTargets = new Set();
  legalMovesByTo = new Map();
  renderBoard();
};

const selectSquare = (square) => {
  selectedSquare = square;
  const moves = chess.moves({ square, verbose: true });
  const map = new Map();
  moves.forEach((move) => {
    const list = map.get(move.to) || [];
    list.push(move);
    map.set(move.to, list);
  });
  legalMovesByTo = map;
  legalTargets = new Set(moves.map((move) => move.to));
  renderBoard();
};

const handleSquareClick = (square) => {
  if (state.pendingPromotion) {
    closePromotionMenu();
    selectedSquare = null;
    legalTargets = new Set();
  }
  if (!state.roomId || !state.role) {
    setMessage(getText("joining"));
    return;
  }
  const myColor = state.role === "white" ? "w" : "b";
  const isMyTurn = chess.turn() === myColor;
  const piece = chess.get(square);

  if (!selectedSquare) {
    if (piece && piece.color === myColor && isMyTurn) {
      selectSquare(square);
    } else if (!isMyTurn) {
      setMessage(getText("notYourTurn"));
    }
    return;
  }

  if (selectedSquare === square) {
    clearSelection();
    return;
  }

  if (piece && piece.color === myColor && isMyTurn) {
    selectSquare(square);
    return;
  }

  if (!isMyTurn) {
    setMessage(getText("notYourTurn"));
    clearSelection();
    return;
  }

  if (!legalTargets.has(square)) {
    setMessage(getText("illegalMove"));
    clearSelection();
    return;
  }
  const candidates = legalMovesByTo.get(square) || [];
  const hasPromotion = candidates.some((move) => Boolean(move.promotion));
  if (hasPromotion || isPromotionMove(selectedSquare, square, myColor)) {
    openPromotionMenu({ from: selectedSquare, to: square, color: myColor });
    return;
  }
  commitMove({ from: selectedSquare, to: square });
};

const safeLoadFen = (fen) => {
  try {
    chess.load(fen);
  } catch {
    chess.reset();
  }
};

const resetSession = () => {
  state.roomId = null;
  state.role = null;
  state.peerConnected = false;
  selectedSquare = null;
  legalTargets = new Set();
  legalMovesByTo = new Map();
  orientation = "white";
  state.lastMove = null;
  closePromotionMenu();
  chess.reset();
  buildBoard();
  renderBoard();
  updateStatus();
};

const handleAuthed = () => {
  state.authed = true;
  setMessage("");
  showScreen("board");
  if (ENTRY_MODE === "join" && ROOM_ID_FROM_URL) {
    setMessage(getText("joining"));
    joinRoom(ROOM_ID_FROM_URL);
  } else {
    setMessage(getText("creating"));
    createRoom();
  }
};

const handleCreated = (msg) => {
  state.roomId = msg.roomId;
  state.role = msg.role || "white";
  state.peerConnected = false;
  state.lastMove = null;
  closePromotionMenu();
  orientation = state.role;
  chess.reset();
  buildBoard();
  renderBoard();
  syncRoomIdToUrl();
  updateStatus();
  showScreen("board");
  setMessage(getText("roomCreated"));
};

const handleJoined = (msg) => {
  state.roomId = msg.roomId;
  state.role = msg.role || "white";
  state.peerConnected = state.role === "black";
  orientation = state.role;
  if (msg.state && typeof msg.state.fen === "string") {
    safeLoadFen(msg.state.fen);
  } else {
    chess.reset();
  }
  state.lastMove = null;
  closePromotionMenu();
  buildBoard();
  renderBoard();
  syncRoomIdToUrl();
  updateStatus();
  showScreen("board");
  setMessage("");
};

const handlePeerJoined = (msg) => {
  state.peerConnected = true;
  updateStatus();
};

const handleMove = (msg) => {
  const isRestart = Boolean(msg?.state?.reset || msg?.move?.kind === "restart");
  if (isRestart) {
    closePromotionMenu();
    selectedSquare = null;
    legalTargets = new Set();
    legalMovesByTo = new Map();
    state.lastMove = null;
  }
  if (msg.move && msg.move.from && msg.move.to) {
    setLastMove(msg.move);
  }
  if (msg.state && typeof msg.state.fen === "string") {
    safeLoadFen(msg.state.fen);
    renderBoard();
    updateStatus();
    return;
  }
  if (msg.move) {
    chess.move(msg.move);
    renderBoard();
    updateStatus();
  }
};

const handleError = (msg) => {
  if (!msg || !msg.code) {
    setMessage(getText("joinFailed"));
    return;
  }
  switch (msg.code) {
    case "auth_failed":
      setMessage(getText("authFailed"));
      break;
    case "auth_required":
      setMessage(getText("authRequired"));
      break;
    case "not_found":
      setMessage(getText("joinFailed"));
      showScreen("site");
      break;
    default:
      setMessage(msg.message || getText("joinFailed"));
  }
};

const handleMessage = (msg) => {
  if (!msg || !msg.type) return;
  switch (msg.type) {
    case "authed":
      handleAuthed();
      break;
    case "created":
      handleCreated(msg);
      break;
    case "joined":
      handleJoined(msg);
      break;
    case "peer_joined":
      handlePeerJoined(msg);
      break;
    case "move":
      handleMove(msg);
      break;
    case "error":
      handleError(msg);
      break;
    default:
      break;
  }
};

const connect = () => {
  if (state.socket && (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  state.socket = new WebSocket(WS_URL);
  state.socket.addEventListener("open", () => {
    state.connected = true;
    if (state.pendingAction) {
      const action = state.pendingAction;
      state.pendingAction = null;
      action();
    }
  });
  state.socket.addEventListener("message", (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }
    handleMessage(payload);
  });
  state.socket.addEventListener("close", () => {
    state.connected = false;
    updateStatus();
  });
  state.socket.addEventListener("error", () => {
    state.connected = false;
    updateStatus();
  });
};

const ensureConnected = (action) => {
  if (state.socket && state.socket.readyState === WebSocket.OPEN) {
    action();
    return;
  }
  state.pendingAction = action;
  connect();
};

const send = (payload) => {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  state.socket.send(JSON.stringify(payload));
};

const authSite = () => {
  const password = sitePasswordInput.value.trim();
  if (!password) {
    setMessage(getText("authRequired"));
    return;
  }
  ensureConnected(() => {
    send({ type: "auth", password });
  });
};

const createRoom = () => {
  ensureConnected(() => {
    send({ type: "create" });
  });
};

const joinRoom = (roomId) => {
  if (!roomId) return;
  ensureConnected(() => {
    send({ type: "join", roomId });
  });
};

const copyLink = async () => {
  if (!roomLinkInput || !roomLinkInput.value) return;
  try {
    await navigator.clipboard.writeText(roomLinkInput.value);
    setMessage(getText("copied"));
  } catch {
    if (document.execCommand) {
      roomLinkInput.select();
      document.execCommand("copy");
      setMessage(getText("copied"));
    }
  }
};

if (siteBtn) {
  siteBtn.addEventListener("click", () => {
    authSite();
  });
}

if (sitePasswordInput) {
  sitePasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      authSite();
    }
  });
}

if (copyBtn) {
  copyBtn.addEventListener("click", () => {
    copyLink();
  });
}

if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    restartGame();
  });
}

window.addEventListener("beforeunload", () => {
  if (state.socket && state.socket.readyState === WebSocket.OPEN && state.roomId) {
    state.socket.send(JSON.stringify({ type: "leave" }));
  }
});

buildBoard();
renderBoard();
applyI18n();
showScreen("site");
