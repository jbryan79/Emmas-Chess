# ♛ Emma's Chess

A special two-player chess game made with love — for Emma and Daddy to play together on the home network.

---

## Quick Start (Docker — Recommended)

### 1. Copy this folder to your PC with Docker

### 2. Build and run:
```bash
cd emmas-chess
docker-compose up -d --build
```

### 3. Find your PC's local IP:
```bash
# On Windows:
ipconfig
# Look for "IPv4 Address" under your Wi-Fi or Ethernet adapter (e.g., 192.168.1.100)

# On Mac/Linux:
hostname -I
```

### 4. Play!
- **On your PC:** Open http://localhost:3000
- **On Emma's device:** Open http://YOUR_PC_IP:3000 (e.g., http://192.168.1.100:3000)

Both devices must be on the same Wi-Fi network.

---

## Quick Start (Without Docker)

Make sure Node.js is installed (v18+), then:

```bash
cd emmas-chess
npm install
npm start
```

Same network access instructions apply — use your PC's local IP.

---

## How to Play

1. **Player 1:** Enter your name, create a game room (e.g., "Emma & Daddy")
2. **Player 2:** Enter your name, click "Join" on the room that appears
3. **Click or drag** pieces to move them
4. Legal moves are shown as dots on the board
5. Use the chat and emoji buttons to talk during the game!
6. After a game ends, "Play Again" swaps colors automatically

## Features

- Realistic wooden chessboard with engraved dedication
- Smooth piece animations (adjustable speed)
- 4 board themes: Classic Oak, Dark Walnut, Maple & Cherry, Rosewood
- Drag & drop or click-to-move
- Legal move indicators
- Move history panel
- In-game chat with quick emoji reactions
- Sound effects (wood piece sounds!)
- Touch support for tablets/phones
- Full chess rules: castling, en passant, promotion, draw detection

## Stopping the Server

```bash
docker-compose down
```

---

*Made with love. Every chess master was once a beginner.* ♟
