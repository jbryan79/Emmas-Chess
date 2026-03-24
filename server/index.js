const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// Game rooms
const rooms = {};

function createRoom(roomId) {
  return {
    id: roomId,
    chess: new Chess(),
    players: { white: null, black: null },
    spectators: [],
    moveHistory: [],
    timers: { white: null, black: null },
    timerEnabled: false,
    timeControl: 600, // 10 min default
    drawOffer: null,
    undoRequest: null,
    gameOver: false
  };
}

function getRoomState(room) {
  const chess = room.chess;
  return {
    fen: chess.fen(),
    turn: chess.turn(),
    inCheck: chess.inCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    isStalemate: chess.isStalemate(),
    isThreefoldRepetition: chess.isThreefoldRepetition(),
    isInsufficientMaterial: chess.isInsufficientMaterial(),
    isGameOver: chess.isGameOver(),
    moveHistory: room.moveHistory,
    players: {
      white: room.players.white ? { id: room.players.white.id, name: room.players.white.name } : null,
      black: room.players.black ? { id: room.players.black.id, name: room.players.black.name } : null
    },
    gameOver: room.gameOver
  };
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  let currentRoom = null;
  let currentColor = null;

  // Send available rooms
  socket.emit('roomList', Object.keys(rooms).map(id => ({
    id,
    white: rooms[id].players.white?.name || null,
    black: rooms[id].players.black?.name || null,
    inProgress: rooms[id].moveHistory.length > 0
  })));

  socket.on('createRoom', ({ roomName, playerName }) => {
    const roomId = roomName || `room_${Date.now()}`;
    if (rooms[roomId]) {
      socket.emit('error', { message: 'Room already exists!' });
      return;
    }
    rooms[roomId] = createRoom(roomId);
    rooms[roomId].players.white = { id: socket.id, name: playerName || 'Player 1' };
    currentRoom = roomId;
    currentColor = 'white';
    socket.join(roomId);
    socket.emit('joined', { room: roomId, color: 'white', state: getRoomState(rooms[roomId]) });
    io.emit('roomList', Object.keys(rooms).map(id => ({
      id,
      white: rooms[id].players.white?.name || null,
      black: rooms[id].players.black?.name || null,
      inProgress: rooms[id].moveHistory.length > 0
    })));
    console.log(`Room ${roomId} created by ${playerName}`);
  });

  socket.on('joinRoom', ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit('error', { message: 'Room not found!' });
      return;
    }

    if (!room.players.white) {
      room.players.white = { id: socket.id, name: playerName || 'Player 1' };
      currentColor = 'white';
    } else if (!room.players.black) {
      room.players.black = { id: socket.id, name: playerName || 'Player 2' };
      currentColor = 'black';
    } else {
      room.spectators.push({ id: socket.id, name: playerName });
      currentColor = 'spectator';
    }

    currentRoom = roomId;
    socket.join(roomId);
    socket.emit('joined', { room: roomId, color: currentColor, state: getRoomState(room) });
    io.to(roomId).emit('gameState', getRoomState(room));

    if (room.players.white && room.players.black) {
      io.to(roomId).emit('gameReady', {
        white: room.players.white.name,
        black: room.players.black.name
      });
    }

    io.emit('roomList', Object.keys(rooms).map(id => ({
      id,
      white: rooms[id].players.white?.name || null,
      black: rooms[id].players.black?.name || null,
      inProgress: rooms[id].moveHistory.length > 0
    })));
  });

  socket.on('move', ({ from, to, promotion }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const chess = room.chess;

    // Verify it's this player's turn
    const turnColor = chess.turn() === 'w' ? 'white' : 'black';
    if (currentColor !== turnColor) {
      socket.emit('invalidMove', { message: "It's not your turn!" });
      return;
    }

    try {
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (move) {
        room.moveHistory.push({
          ...move,
          fen: chess.fen(),
          timestamp: Date.now()
        });

        io.to(currentRoom).emit('moveMade', {
          move,
          state: getRoomState(room)
        });

        if (chess.isGameOver()) {
          let result = '';
          if (chess.isCheckmate()) {
            result = `Checkmate! ${turnColor === 'white' ? room.players.white.name : room.players.black.name} wins!`;
          } else if (chess.isStalemate()) {
            result = "Stalemate! It's a draw.";
          } else if (chess.isDraw()) {
            result = "It's a draw!";
          }
          room.gameOver = true;
          io.to(currentRoom).emit('gameOver', { result, state: getRoomState(room) });
        }
      }
    } catch (e) {
      socket.emit('invalidMove', { message: 'Invalid move!' });
    }
  });

  socket.on('getLegalMoves', ({ square }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const chess = rooms[currentRoom].chess;
    const moves = chess.moves({ square, verbose: true });
    socket.emit('legalMoves', { square, moves });
  });

  socket.on('offerDraw', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const opponentColor = currentColor === 'white' ? 'black' : 'white';
    if (room.players[opponentColor]) {
      io.to(room.players[opponentColor].id).emit('drawOffered', {
        from: currentColor
      });
    }
  });

  socket.on('respondDraw', ({ accepted }) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    if (accepted) {
      room.gameOver = true;
      io.to(currentRoom).emit('gameOver', {
        result: 'Draw by agreement!',
        state: getRoomState(room)
      });
    } else {
      io.to(currentRoom).emit('drawDeclined');
    }
  });

  socket.on('resign', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const winner = currentColor === 'white' ? room.players.black?.name : room.players.white?.name;
    room.gameOver = true;
    io.to(currentRoom).emit('gameOver', {
      result: `${currentColor === 'white' ? room.players.white.name : room.players.black.name} resigned. ${winner} wins!`,
      state: getRoomState(room)
    });
  });

  socket.on('newGame', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    room.chess = new Chess();
    room.moveHistory = [];
    room.gameOver = false;
    room.drawOffer = null;

    // Swap colors
    const tempWhite = room.players.white;
    const tempBlack = room.players.black;
    room.players.white = tempBlack;
    room.players.black = tempWhite;

    // Update each player's color
    if (room.players.white) {
      io.to(room.players.white.id).emit('colorSwapped', { color: 'white' });
    }
    if (room.players.black) {
      io.to(room.players.black.id).emit('colorSwapped', { color: 'black' });
    }

    io.to(currentRoom).emit('newGameStarted', {
      state: getRoomState(room)
    });

    if (room.players.white && room.players.black) {
      io.to(currentRoom).emit('gameReady', {
        white: room.players.white.name,
        black: room.players.black.name
      });
    }
  });

  socket.on('chatMessage', ({ message }) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('chatMessage', {
      from: currentColor,
      name: rooms[currentRoom]?.players[currentColor]?.name || 'Spectator',
      message,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    if (currentRoom && rooms[currentRoom]) {
      const room = rooms[currentRoom];
      if (room.players.white?.id === socket.id) {
        room.players.white = null;
      } else if (room.players.black?.id === socket.id) {
        room.players.black = null;
      }

      io.to(currentRoom).emit('playerDisconnected', {
        color: currentColor,
        state: getRoomState(room)
      });

      // Clean up empty rooms
      if (!room.players.white && !room.players.black) {
        delete rooms[currentRoom];
      }

      io.emit('roomList', Object.keys(rooms).map(id => ({
        id,
        white: rooms[id].players.white?.name || null,
        black: rooms[id].players.black?.name || null,
        inProgress: rooms[id].moveHistory.length > 0
      })));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n♛ Emma's Chess Server running on port ${PORT}`);
  console.log(`  Open http://localhost:${PORT} in your browser\n`);
});
