// Chess piece Unicode characters
// Using standard chess piece Unicode symbols for a classic look
const PIECES = {
  // White pieces
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  // Black pieces
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

// Map from FEN notation to our piece keys
function fenToPieceKey(piece) {
  const map = {
    'K': 'wK', 'Q': 'wQ', 'R': 'wR', 'B': 'wB', 'N': 'wN', 'P': 'wP',
    'k': 'bK', 'q': 'bQ', 'r': 'bR', 'b': 'bB', 'n': 'bN', 'p': 'bP'
  };
  return map[piece] || null;
}

function getPieceChar(pieceKey) {
  return PIECES[pieceKey] || '';
}

function getPieceColor(piece) {
  if (!piece) return null;
  return piece === piece.toUpperCase() ? 'white' : 'black';
}

// Piece names for display
const PIECE_NAMES = {
  'K': 'King', 'Q': 'Queen', 'R': 'Rook', 'B': 'Bishop', 'N': 'Knight', 'P': 'Pawn',
  'k': 'King', 'q': 'Queen', 'r': 'Rook', 'b': 'Bishop', 'n': 'Knight', 'p': 'Pawn'
};

// Piece values for captured piece scoring
const PIECE_VALUES = {
  'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
  'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0
};
