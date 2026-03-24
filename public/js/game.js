// ============================================
// EMMA'S CHESS — Main Game Logic
// ============================================

const socket = io();

// Game State
let myColor = null;        // 'white' | 'black' | 'spectator'
let currentRoom = null;
let gameState = null;
let selectedSquare = null;
let legalMoves = [];
let isFlipped = false;     // Board orientation
let isDragging = false;
let dragPiece = null;
let dragOffset = { x: 0, y: 0 };

// Options
let options = {
  animSpeed: 300,
  theme: 'classic',
  pieceStyle: 'classic',
  showLegalMoves: true,
  soundEnabled: true,
  showCoords: true,
  highlightLastMove: true
};

// Last move tracking
let lastMove = null;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initLobby();
  initOptions();
  initChat();
  buildBoard();
  buildCoords();

  // Initialize sound on first click
  document.addEventListener('click', () => sound.init(), { once: true });
});

// ============================================
// LOBBY
// ============================================
function initLobby() {
  const createBtn = document.getElementById('createRoomBtn');
  const cancelBtn = document.getElementById('cancelWaitBtn');

  createBtn.addEventListener('click', () => {
    const name = document.getElementById('playerName').value.trim() || 'Player';
    const room = document.getElementById('roomName').value.trim() || `${name}'s Game`;
    socket.emit('createRoom', { roomName: room, playerName: name });
  });

  cancelBtn.addEventListener('click', () => {
    location.reload();
  });

  // Enter key on inputs
  document.getElementById('playerName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('roomName').focus();
  });
  document.getElementById('roomName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createBtn.click();
  });
}

function updateRoomList(rooms) {
  const container = document.getElementById('roomListContainer');
  if (rooms.length === 0) {
    container.innerHTML = '<div class="no-rooms">No games available yet. Create one!</div>';
    return;
  }

  container.innerHTML = rooms.map(room => {
    const hasSlot = !room.white || !room.black;
    return `
      <div class="room-item" data-room="${room.id}">
        <div class="room-info">
          <div class="room-name">${room.id}</div>
          <div class="room-players">
            ${room.white || '(waiting)'} vs ${room.black || '(waiting)'}
            ${room.inProgress ? ' — In Progress' : ''}
          </div>
        </div>
        ${hasSlot ? `<button class="btn btn-small btn-primary join-room-btn" data-room="${room.id}">Join</button>` : '<span style="color:var(--text-muted);font-size:12px">Full</span>'}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.join-room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = document.getElementById('playerName').value.trim() || 'Player';
      const roomId = btn.dataset.room;
      socket.emit('joinRoom', { roomId, playerName: name });
    });
  });
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// ============================================
// SOCKET EVENTS
// ============================================
socket.on('roomList', (rooms) => {
  updateRoomList(rooms);
});

socket.on('joined', ({ room, color, state }) => {
  currentRoom = room;
  myColor = color;
  isFlipped = (color === 'black');
  gameState = state;

  if (state.players.white && state.players.black) {
    showScreen('game');
    setupGame(state);
  } else {
    showScreen('waiting');
    document.getElementById('waitingRoomName').textContent = `Room: ${room}`;
  }
});

socket.on('gameReady', ({ white, black }) => {
  showScreen('game');
  if (gameState) setupGame(gameState);
  sound.newGame();
  addChatSystem(`Game is on! ${white} (White) vs ${black} (Black)`);
});

socket.on('gameState', (state) => {
  gameState = state;
  updateBoard(state);
  updatePlayerInfo(state);
  updateStatus(state);
});

socket.on('moveMade', ({ move, state }) => {
  gameState = state;
  lastMove = move;
  animateMove(move, () => {
    updateBoard(state);
    updateStatus(state);
    updateMoveHistory(state.moveHistory);
    updateCapturedPieces(state);
  });

  // Play appropriate sound
  if (move.captured) {
    sound.capture();
  } else if (move.flags.includes('k') || move.flags.includes('q')) {
    sound.castle();
  } else {
    sound.move();
  }

  if (state.inCheck) {
    setTimeout(() => sound.check(), 200);
  }

  selectedSquare = null;
  legalMoves = [];
});

socket.on('invalidMove', ({ message }) => {
  sound.illegal();
  flashStatus(message, 'error');
});

socket.on('gameOver', ({ result, state }) => {
  gameState = state;
  updateBoard(state);
  sound.gameOver();
  showGameOver(result);
});

socket.on('drawOffered', () => {
  sound.notify();
  document.getElementById('drawOfferModal').classList.add('active');
});

socket.on('drawDeclined', () => {
  flashStatus('Draw offer declined', 'info');
});

socket.on('newGameStarted', ({ state }) => {
  gameState = state;
  lastMove = null;
  selectedSquare = null;
  legalMoves = [];
  updateBoard(state);
  updatePlayerInfo(state);
  updateStatus(state);
  updateMoveHistory([]);
  updateCapturedPieces(state);
  document.getElementById('gameOverModal').classList.remove('active');
  sound.newGame();
  addChatSystem('New game started! Colors have been swapped.');
});

socket.on('colorSwapped', ({ color }) => {
  myColor = color;
  isFlipped = (color === 'black');
  buildCoords();
  if (gameState) updateBoard(gameState);
});

socket.on('playerDisconnected', ({ color }) => {
  flashStatus(`${color} player disconnected`, 'error');
  addChatSystem(`${color} player has disconnected.`);
});

socket.on('legalMoves', ({ square, moves }) => {
  legalMoves = moves;
  showLegalMoves(moves);
});

socket.on('chatMessage', ({ name, message, from }) => {
  addChatMessage(name, message, from === myColor);
});

socket.on('error', ({ message }) => {
  alert(message);
});

// ============================================
// BOARD BUILDING
// ============================================
function buildBoard() {
  const board = document.getElementById('chessboard');
  board.innerHTML = '';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement('div');
      const isLight = (row + col) % 2 === 0;
      square.className = `square ${isLight ? 'light' : 'dark'}`;
      square.dataset.row = row;
      square.dataset.col = col;

      square.addEventListener('mousedown', onSquareMouseDown);
      square.addEventListener('click', onSquareClick);

      board.appendChild(square);
    }
  }

  // Global drag handlers
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Touch support
  board.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
}

function buildCoords() {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const orderedFiles = isFlipped ? [...files].reverse() : files;
  const orderedRanks = isFlipped ? [...ranks].reverse() : ranks;

  ['coordsTop', 'coordsBottom'].forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = orderedFiles.map(f => `<div class="coord">${f}</div>`).join('');
  });

  ['coordsLeft', 'coordsRight'].forEach(id => {
    const el = document.getElementById(id);
    el.innerHTML = orderedRanks.map(r => `<div class="coord">${r}</div>`).join('');
  });
}

// ============================================
// BOARD RENDERING
// ============================================
function setupGame(state) {
  updateBoard(state);
  updatePlayerInfo(state);
  updateStatus(state);
  updateMoveHistory(state.moveHistory);
  updateCapturedPieces(state);
  buildCoords();
}

function updateBoard(state) {
  const board = document.getElementById('chessboard');
  const fen = state.fen;
  const position = parseFEN(fen);

  // Remove all pieces
  board.querySelectorAll('.piece').forEach(p => p.remove());

  // Clear square highlights
  board.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('selected', 'legal-move', 'legal-capture', 'last-move-from', 'last-move-to', 'check');
  });

  // Place pieces
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = position[row][col];
      if (piece) {
        const displayRow = isFlipped ? 7 - row : row;
        const displayCol = isFlipped ? 7 - col : col;
        const square = board.children[displayRow * 8 + displayCol];

        const pieceKey = fenToPieceKey(piece);
        const pieceEl = document.createElement('div');
        const color = getPieceColor(piece);
        pieceEl.className = `piece ${color}-piece`;
        pieceEl.textContent = getPieceChar(pieceKey);
        pieceEl.dataset.piece = piece;
        pieceEl.dataset.row = row;
        pieceEl.dataset.col = col;

        square.appendChild(pieceEl);
      }
    }
  }

  // Highlight last move
  if (options.highlightLastMove && lastMove) {
    highlightLastMove(lastMove);
  }

  // Highlight check
  if (state.inCheck) {
    highlightCheck(state.turn, position);
  }

  // Re-apply selection if any
  if (selectedSquare) {
    const sq = getSquareElement(selectedSquare.row, selectedSquare.col);
    if (sq) sq.classList.add('selected');
  }

  // Apply piece style
  if (options.pieceStyle === 'carved') {
    board.classList.add('carved');
  } else {
    board.classList.remove('carved');
  }
}

function parseFEN(fen) {
  const position = [];
  const rows = fen.split(' ')[0].split('/');
  for (const row of rows) {
    const rank = [];
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch); i++) rank.push(null);
      } else {
        rank.push(ch);
      }
    }
    position.push(rank);
  }
  return position;
}

function getSquareElement(row, col) {
  const displayRow = isFlipped ? 7 - row : row;
  const displayCol = isFlipped ? 7 - col : col;
  const board = document.getElementById('chessboard');
  return board.children[displayRow * 8 + displayCol];
}

function getSquareFromDisplay(displayRow, displayCol) {
  return {
    row: isFlipped ? 7 - displayRow : displayRow,
    col: isFlipped ? 7 - displayCol : displayCol
  };
}

function rowColToAlgebraic(row, col) {
  const files = 'abcdefgh';
  return files[col] + (8 - row);
}

function algebraicToRowCol(sq) {
  const files = 'abcdefgh';
  return {
    row: 8 - parseInt(sq[1]),
    col: files.indexOf(sq[0])
  };
}

// ============================================
// INTERACTION - Click & Drag
// ============================================
function onSquareClick(e) {
  if (isDragging) return;

  const square = e.currentTarget;
  const displayRow = parseInt(square.dataset.row);
  const displayCol = parseInt(square.dataset.col);
  const { row, col } = getSquareFromDisplay(displayRow, displayCol);
  const algebraic = rowColToAlgebraic(row, col);

  handleSquareAction(row, col, algebraic);
}

function onSquareMouseDown(e) {
  if (e.button !== 0) return;
  const square = e.currentTarget;
  const pieceEl = square.querySelector('.piece');
  if (!pieceEl) return;

  const displayRow = parseInt(square.dataset.row);
  const displayCol = parseInt(square.dataset.col);
  const { row, col } = getSquareFromDisplay(displayRow, displayCol);
  const piece = pieceEl.dataset.piece;
  const color = getPieceColor(piece);

  // Only allow dragging own pieces
  if (color !== myColor) return;
  if (gameState && gameState.gameOver) return;

  const turnColor = gameState?.turn === 'w' ? 'white' : 'black';
  if (turnColor !== myColor) return;

  // Start drag
  isDragging = true;
  dragPiece = {
    element: pieceEl,
    row, col,
    piece,
    startSquare: square
  };

  const rect = pieceEl.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left - rect.width / 2;
  dragOffset.y = e.clientY - rect.top - rect.height / 2;

  pieceEl.classList.add('dragging');
  pieceEl.style.position = 'fixed';
  pieceEl.style.left = (e.clientX - rect.width / 2) + 'px';
  pieceEl.style.top = (e.clientY - rect.height / 2) + 'px';
  pieceEl.style.width = rect.width + 'px';
  pieceEl.style.height = rect.height + 'px';
  document.body.appendChild(pieceEl);

  // Select and show legal moves
  const algebraic = rowColToAlgebraic(row, col);
  selectedSquare = { row, col };
  socket.emit('getLegalMoves', { square: algebraic });

  // Highlight selected square
  document.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected'));
  square.classList.add('selected');

  e.preventDefault();
}

function onMouseMove(e) {
  if (!isDragging || !dragPiece) return;
  const el = dragPiece.element;
  const size = parseFloat(el.style.width);
  el.style.left = (e.clientX - size / 2) + 'px';
  el.style.top = (e.clientY - size / 2) + 'px';
}

function onMouseUp(e) {
  if (!isDragging || !dragPiece) return;

  const el = dragPiece.element;
  el.classList.remove('dragging');
  el.style.position = '';
  el.style.left = '';
  el.style.top = '';
  el.style.width = '';
  el.style.height = '';

  // Find drop target square
  const board = document.getElementById('chessboard');
  const boardRect = board.getBoundingClientRect();
  const squareSize = boardRect.width / 8;

  const dropDisplayCol = Math.floor((e.clientX - boardRect.left) / squareSize);
  const dropDisplayRow = Math.floor((e.clientY - boardRect.top) / squareSize);

  if (dropDisplayCol >= 0 && dropDisplayCol < 8 && dropDisplayRow >= 0 && dropDisplayRow < 8) {
    const { row: dropRow, col: dropCol } = getSquareFromDisplay(dropDisplayRow, dropDisplayCol);
    const fromAlgebraic = rowColToAlgebraic(dragPiece.row, dragPiece.col);
    const toAlgebraic = rowColToAlgebraic(dropRow, dropCol);

    if (fromAlgebraic !== toAlgebraic) {
      tryMove(fromAlgebraic, toAlgebraic);
    }
  }

  // Put piece back (it'll be updated by board refresh)
  if (dragPiece.startSquare) {
    dragPiece.startSquare.appendChild(el);
  }

  isDragging = false;
  dragPiece = null;

  // Re-render board to clean up
  if (gameState) updateBoard(gameState);
}

// Touch support
function onTouchStart(e) {
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  const square = target?.closest('.square');
  if (!square) return;

  const pieceEl = square.querySelector('.piece');
  if (!pieceEl) {
    // Tap on empty square with selection
    if (selectedSquare) {
      const displayRow = parseInt(square.dataset.row);
      const displayCol = parseInt(square.dataset.col);
      const { row, col } = getSquareFromDisplay(displayRow, displayCol);
      const algebraic = rowColToAlgebraic(row, col);
      handleSquareAction(row, col, algebraic);
    }
    return;
  }

  e.preventDefault();

  const displayRow = parseInt(square.dataset.row);
  const displayCol = parseInt(square.dataset.col);
  const { row, col } = getSquareFromDisplay(displayRow, displayCol);
  const piece = pieceEl.dataset.piece;
  const color = getPieceColor(piece);

  if (color !== myColor) return;

  const turnColor = gameState?.turn === 'w' ? 'white' : 'black';
  if (turnColor !== myColor) return;

  isDragging = true;
  dragPiece = { element: pieceEl, row, col, piece, startSquare: square };

  const rect = pieceEl.getBoundingClientRect();
  pieceEl.classList.add('dragging');
  pieceEl.style.position = 'fixed';
  pieceEl.style.left = (touch.clientX - rect.width / 2) + 'px';
  pieceEl.style.top = (touch.clientY - rect.height / 2) + 'px';
  pieceEl.style.width = rect.width + 'px';
  pieceEl.style.height = rect.height + 'px';
  document.body.appendChild(pieceEl);

  const algebraic = rowColToAlgebraic(row, col);
  selectedSquare = { row, col };
  socket.emit('getLegalMoves', { square: algebraic });
}

function onTouchMove(e) {
  if (!isDragging || !dragPiece) return;
  e.preventDefault();
  const touch = e.touches[0];
  const el = dragPiece.element;
  const size = parseFloat(el.style.width);
  el.style.left = (touch.clientX - size / 2) + 'px';
  el.style.top = (touch.clientY - size / 2) + 'px';
}

function onTouchEnd(e) {
  if (!isDragging || !dragPiece) return;
  const touch = e.changedTouches[0];

  const el = dragPiece.element;
  el.classList.remove('dragging');
  el.style.position = '';
  el.style.left = '';
  el.style.top = '';
  el.style.width = '';
  el.style.height = '';

  const board = document.getElementById('chessboard');
  const boardRect = board.getBoundingClientRect();
  const squareSize = boardRect.width / 8;

  const dropDisplayCol = Math.floor((touch.clientX - boardRect.left) / squareSize);
  const dropDisplayRow = Math.floor((touch.clientY - boardRect.top) / squareSize);

  if (dropDisplayCol >= 0 && dropDisplayCol < 8 && dropDisplayRow >= 0 && dropDisplayRow < 8) {
    const { row: dropRow, col: dropCol } = getSquareFromDisplay(dropDisplayRow, dropDisplayCol);
    const fromAlgebraic = rowColToAlgebraic(dragPiece.row, dragPiece.col);
    const toAlgebraic = rowColToAlgebraic(dropRow, dropCol);

    if (fromAlgebraic !== toAlgebraic) {
      tryMove(fromAlgebraic, toAlgebraic);
    }
  }

  if (dragPiece.startSquare) dragPiece.startSquare.appendChild(el);
  isDragging = false;
  dragPiece = null;
  if (gameState) updateBoard(gameState);
}

function handleSquareAction(row, col, algebraic) {
  if (gameState?.gameOver) return;

  const position = parseFEN(gameState.fen);
  const piece = position[row][col];
  const turnColor = gameState?.turn === 'w' ? 'white' : 'black';

  if (selectedSquare) {
    const fromAlgebraic = rowColToAlgebraic(selectedSquare.row, selectedSquare.col);

    if (fromAlgebraic === algebraic) {
      // Deselect
      selectedSquare = null;
      legalMoves = [];
      updateBoard(gameState);
      return;
    }

    // Check if clicking on own piece to switch selection
    if (piece && getPieceColor(piece) === myColor) {
      selectedSquare = { row, col };
      legalMoves = [];
      updateBoard(gameState);
      const sq = getSquareElement(row, col);
      if (sq) sq.classList.add('selected');
      socket.emit('getLegalMoves', { square: algebraic });
      return;
    }

    // Try to move
    tryMove(fromAlgebraic, algebraic);
    selectedSquare = null;
    legalMoves = [];
    return;
  }

  // Select a piece
  if (piece && getPieceColor(piece) === myColor && turnColor === myColor) {
    selectedSquare = { row, col };
    legalMoves = [];
    updateBoard(gameState);
    const sq = getSquareElement(row, col);
    if (sq) sq.classList.add('selected');
    socket.emit('getLegalMoves', { square: algebraic });
  }
}

function tryMove(from, to) {
  // Check for pawn promotion
  const position = parseFEN(gameState.fen);
  const fromRC = algebraicToRowCol(from);
  const piece = position[fromRC.row][fromRC.col];
  const toRC = algebraicToRowCol(to);

  if (piece && (piece === 'P' || piece === 'p')) {
    if ((piece === 'P' && toRC.row === 0) || (piece === 'p' && toRC.row === 7)) {
      showPromotionDialog(from, to, getPieceColor(piece));
      return;
    }
  }

  socket.emit('move', { from, to });
}

function showPromotionDialog(from, to, color) {
  const modal = document.getElementById('promotionModal');
  const container = document.getElementById('promotionPieces');
  const pieces = color === 'white'
    ? [['q', '♕'], ['r', '♖'], ['b', '♗'], ['n', '♘']]
    : [['q', '♛'], ['r', '♜'], ['b', '♝'], ['n', '♞']];

  container.innerHTML = pieces.map(([key, char]) =>
    `<div class="promotion-piece" data-piece="${key}">${char}</div>`
  ).join('');

  container.querySelectorAll('.promotion-piece').forEach(el => {
    el.addEventListener('click', () => {
      socket.emit('move', { from, to, promotion: el.dataset.piece });
      modal.classList.remove('active');
    });
  });

  modal.classList.add('active');
}

// ============================================
// MOVE ANIMATION
// ============================================
function animateMove(move, callback) {
  const board = document.getElementById('chessboard');
  const from = algebraicToRowCol(move.from);
  const to = algebraicToRowCol(move.to);

  const fromSquare = getSquareElement(from.row, from.col);
  const toSquare = getSquareElement(to.row, to.col);

  if (!fromSquare || !toSquare) {
    callback();
    return;
  }

  const pieceEl = fromSquare.querySelector('.piece');
  if (!pieceEl) {
    callback();
    return;
  }

  const fromRect = fromSquare.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;

  pieceEl.classList.add('animating');
  pieceEl.style.transition = `transform ${options.animSpeed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
  pieceEl.style.transform = `translate(${dx}px, ${dy}px)`;

  // Handle capture animation
  if (move.captured) {
    const capturedPiece = toSquare.querySelector('.piece');
    if (capturedPiece) {
      capturedPiece.style.transition = `opacity ${options.animSpeed * 0.6}ms ease-out, transform ${options.animSpeed * 0.6}ms ease-out`;
      capturedPiece.style.opacity = '0';
      capturedPiece.style.transform = 'scale(0.5)';
    }
  }

  // Castling - move the rook too
  if (move.flags.includes('k') || move.flags.includes('q')) {
    let rookFrom, rookTo;
    if (move.flags.includes('k')) {
      // Kingside
      rookFrom = { row: from.row, col: 7 };
      rookTo = { row: from.row, col: 5 };
    } else {
      // Queenside
      rookFrom = { row: from.row, col: 0 };
      rookTo = { row: from.row, col: 3 };
    }

    const rookSquare = getSquareElement(rookFrom.row, rookFrom.col);
    const rookTargetSquare = getSquareElement(rookTo.row, rookTo.col);
    const rookEl = rookSquare?.querySelector('.piece');

    if (rookEl && rookTargetSquare) {
      const rookFromRect = rookSquare.getBoundingClientRect();
      const rookToRect = rookTargetSquare.getBoundingClientRect();
      rookEl.classList.add('animating');
      rookEl.style.transition = `transform ${options.animSpeed}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      rookEl.style.transform = `translate(${rookToRect.left - rookFromRect.left}px, ${rookToRect.top - rookFromRect.top}px)`;
    }
  }

  setTimeout(() => {
    callback();
  }, options.animSpeed);
}

// ============================================
// VISUAL HELPERS
// ============================================
function showLegalMoves(moves) {
  if (!options.showLegalMoves) return;

  document.querySelectorAll('.square').forEach(sq => {
    sq.classList.remove('legal-move', 'legal-capture');
  });

  moves.forEach(move => {
    const to = algebraicToRowCol(move.to);
    const sq = getSquareElement(to.row, to.col);
    if (sq) {
      sq.classList.add(move.captured ? 'legal-capture' : 'legal-move');
    }
  });
}

function highlightLastMove(move) {
  if (!move) return;
  const from = algebraicToRowCol(move.from);
  const to = algebraicToRowCol(move.to);

  const fromSq = getSquareElement(from.row, from.col);
  const toSq = getSquareElement(to.row, to.col);

  if (fromSq) fromSq.classList.add('last-move-from');
  if (toSq) toSq.classList.add('last-move-to');
}

function highlightCheck(turn, position) {
  const kingChar = turn === 'w' ? 'K' : 'k';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (position[row][col] === kingChar) {
        const sq = getSquareElement(row, col);
        if (sq) sq.classList.add('check');
        return;
      }
    }
  }
}

function createSparkles(element) {
  const rect = element.getBoundingClientRect();
  for (let i = 0; i < 6; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.style.left = (rect.left + Math.random() * rect.width) + 'px';
    sparkle.style.top = (rect.top + Math.random() * rect.height) + 'px';
    sparkle.style.animationDelay = (Math.random() * 0.3) + 's';
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 800);
  }
}

// ============================================
// UI UPDATES
// ============================================
function updatePlayerInfo(state) {
  const whitePlayer = state.players.white?.name || 'Waiting...';
  const blackPlayer = state.players.black?.name || 'Waiting...';
  const isWhiteTurn = state.turn === 'w';

  // Top is opponent, bottom is us
  const opponentName = document.getElementById('opponentName');
  const playerName = document.getElementById('playerName2');
  const opponentBadge = document.querySelector('.player-badge.opponent');
  const playerBadge = document.querySelector('.player-badge.player');
  const opponentPiece = opponentBadge?.querySelector('.player-piece');
  const playerPiece = playerBadge?.querySelector('.player-piece');

  if (myColor === 'white') {
    opponentName.textContent = blackPlayer;
    playerName.textContent = whitePlayer;
    if (opponentPiece) opponentPiece.textContent = '♚';
    if (playerPiece) playerPiece.textContent = '♔';
    opponentBadge?.classList.toggle('active-turn', !isWhiteTurn);
    playerBadge?.classList.toggle('active-turn', isWhiteTurn);
  } else {
    opponentName.textContent = whitePlayer;
    playerName.textContent = blackPlayer;
    if (opponentPiece) opponentPiece.textContent = '♔';
    if (playerPiece) playerPiece.textContent = '♚';
    opponentBadge?.classList.toggle('active-turn', isWhiteTurn);
    playerBadge?.classList.toggle('active-turn', !isWhiteTurn);
  }
}

function updateStatus(state) {
  const statusText = document.getElementById('statusText');
  const statusBar = document.getElementById('statusBar');

  statusBar.classList.remove('check');

  if (state.isCheckmate) {
    const winner = state.turn === 'w' ? 'Black' : 'White';
    statusText.textContent = `♛ Checkmate! ${winner} wins!`;
    statusBar.classList.add('check');
  } else if (state.isStalemate) {
    statusText.textContent = "Stalemate — It's a draw!";
  } else if (state.isDraw) {
    statusText.textContent = "It's a draw!";
  } else if (state.inCheck) {
    const checked = state.turn === 'w' ? 'White' : 'Black';
    statusText.textContent = `⚠ ${checked} is in CHECK!`;
    statusBar.classList.add('check');
  } else {
    const turn = state.turn === 'w' ? 'White' : 'Black';
    const isMyTurn = (state.turn === 'w' && myColor === 'white') || (state.turn === 'b' && myColor === 'black');
    statusText.textContent = isMyTurn ? "♟ Your turn!" : `♟ ${turn}'s turn...`;
  }
}

function flashStatus(message, type) {
  const statusText = document.getElementById('statusText');
  const statusBar = document.getElementById('statusBar');
  const prev = statusText.textContent;

  statusText.textContent = message;
  if (type === 'error') statusBar.classList.add('check');

  setTimeout(() => {
    statusBar.classList.remove('check');
    if (gameState) updateStatus(gameState);
  }, 2000);
}

function updateMoveHistory(moves) {
  const container = document.getElementById('moveHistory');
  container.innerHTML = '';

  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];

    const row = document.createElement('div');
    row.className = 'move-row';
    row.innerHTML = `
      <span class="move-number">${moveNum}.</span>
      <span class="move-white">${whiteMove?.san || ''}</span>
      <span class="move-black">${blackMove?.san || ''}</span>
    `;
    container.appendChild(row);
  }

  container.scrollTop = container.scrollHeight;
}

function updateCapturedPieces(state) {
  const whiteCaptured = []; // Pieces white captured (black pieces)
  const blackCaptured = []; // Pieces black captured (white pieces)

  if (state.moveHistory) {
    state.moveHistory.forEach(move => {
      if (move.captured) {
        const capColor = move.color; // Color that made the capture
        const capturedType = move.captured;
        if (capColor === 'w') {
          whiteCaptured.push(fenToPieceKey('b' === 'w' ? capturedType.toUpperCase() : capturedType));
        } else {
          blackCaptured.push(fenToPieceKey(capturedType.toUpperCase()));
        }
      }
    });
  }

  const playerCaptured = document.getElementById('playerCaptured');
  const opponentCaptured = document.getElementById('opponentCaptured');

  if (myColor === 'white') {
    playerCaptured.textContent = whiteCaptured.map(k => getPieceChar(k)).join(' ');
    opponentCaptured.textContent = blackCaptured.map(k => getPieceChar(k)).join(' ');
  } else {
    playerCaptured.textContent = blackCaptured.map(k => getPieceChar(k)).join(' ');
    opponentCaptured.textContent = whiteCaptured.map(k => getPieceChar(k)).join(' ');
  }
}

// ============================================
// GAME OVER
// ============================================
function showGameOver(result) {
  const modal = document.getElementById('gameOverModal');
  document.getElementById('gameOverMessage').textContent = result;

  // Determine title
  if (result.includes('wins')) {
    const isWinner = (result.includes('White') && myColor === 'white') ||
                     (result.includes('Black') && myColor === 'black') ||
                     (result.includes(document.getElementById('playerName2').textContent));

    if (result.includes(document.getElementById('playerName2').textContent) ||
        (result.toLowerCase().includes('checkmate') && !result.toLowerCase().includes('resign'))) {
      document.getElementById('gameOverTitle').textContent = isWinner ? '🎉 Victory!' : 'Good Game!';
    } else {
      document.getElementById('gameOverTitle').textContent = 'Game Over';
    }
  } else {
    document.getElementById('gameOverTitle').textContent = 'Draw!';
  }

  modal.classList.add('active');
}

document.getElementById('playAgainBtn')?.addEventListener('click', () => {
  socket.emit('newGame');
});

document.getElementById('backToLobbyBtn')?.addEventListener('click', () => {
  location.reload();
});

// ============================================
// GAME CONTROLS
// ============================================
document.getElementById('newGameBtn')?.addEventListener('click', () => {
  if (confirm('Start a new game? Colors will be swapped!')) {
    socket.emit('newGame');
  }
});

document.getElementById('offerDrawBtn')?.addEventListener('click', () => {
  socket.emit('offerDraw');
  flashStatus('Draw offered...', 'info');
});

document.getElementById('resignBtn')?.addEventListener('click', () => {
  if (confirm('Are you sure you want to resign?')) {
    socket.emit('resign');
  }
});

document.getElementById('acceptDrawBtn')?.addEventListener('click', () => {
  socket.emit('respondDraw', { accepted: true });
  document.getElementById('drawOfferModal').classList.remove('active');
});

document.getElementById('declineDrawBtn')?.addEventListener('click', () => {
  socket.emit('respondDraw', { accepted: false });
  document.getElementById('drawOfferModal').classList.remove('active');
});

// ============================================
// OPTIONS
// ============================================
function initOptions() {
  const optionsBtn = document.getElementById('optionsBtn');
  const closeBtn = document.getElementById('closeOptionsBtn');
  const modal = document.getElementById('optionsModal');

  optionsBtn?.addEventListener('click', () => modal.classList.add('active'));
  closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Animation speed
  const animSlider = document.getElementById('animSpeed');
  const animLabel = document.getElementById('animSpeedLabel');
  animSlider?.addEventListener('input', () => {
    options.animSpeed = parseInt(animSlider.value);
    animLabel.textContent = animSlider.value + 'ms';
    document.documentElement.style.setProperty('--animation-speed', animSlider.value + 'ms');
  });

  // Board theme
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      options.theme = btn.dataset.theme;
      document.body.className = btn.dataset.theme === 'classic' ? '' : `theme-${btn.dataset.theme}`;
      if (gameState) updateBoard(gameState);
    });
  });

  // Piece style
  document.querySelectorAll('.piece-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.piece-style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      options.pieceStyle = btn.dataset.style;
      if (gameState) updateBoard(gameState);
    });
  });

  // Checkboxes
  document.getElementById('showLegalMoves')?.addEventListener('change', (e) => {
    options.showLegalMoves = e.target.checked;
  });

  document.getElementById('soundEnabled')?.addEventListener('change', (e) => {
    options.soundEnabled = e.target.checked;
    sound.setEnabled(e.target.checked);
  });

  document.getElementById('showCoords')?.addEventListener('change', (e) => {
    options.showCoords = e.target.checked;
    document.querySelectorAll('.coords').forEach(c => {
      c.classList.toggle('hidden', !e.target.checked);
    });
  });

  document.getElementById('highlightLastMove')?.addEventListener('change', (e) => {
    options.highlightLastMove = e.target.checked;
    if (gameState) updateBoard(gameState);
  });
}

// ============================================
// CHAT
// ============================================
function initChat() {
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendChatBtn');

  function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    socket.emit('chatMessage', { message: msg });
    input.value = '';
  }

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Quick emotes
  document.querySelectorAll('.emote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      socket.emit('chatMessage', { message: btn.dataset.msg });
    });
  });
}

function addChatMessage(name, message, isSelf) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `
    <div class="chat-sender">${name}${isSelf ? ' (you)' : ''}</div>
    <div class="chat-text">${escapeHtml(message)}</div>
  `;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function addChatSystem(message) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<div class="chat-text" style="color: var(--accent); font-style: italic;">${message}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
