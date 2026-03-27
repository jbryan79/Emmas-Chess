# ♛ Emma's Chess

A special two-player chess game made with love — for Emma and Daddy to play together.

**Live:** [https://emmas-chess.netlify.app](https://emmas-chess.netlify.app)

---

## Play Online (Recommended)

Just open [https://emmas-chess.netlify.app](https://emmas-chess.netlify.app) on any device.

1. **Player 1:** Enter your name, click "Create Game" — you'll get a 4-letter code
2. **Player 2:** Enter your name, enter the code, click "Join Game"
3. That's it — no installs, no servers, no firewall headaches

Works on desktop, tablet, and phone. Uses Supabase Realtime for the connection.

---

## Self-Host (Optional)

If you'd rather run the original Node.js server version on your home network:

### Docker

```bash
cd emmas-chess
docker-compose up -d --build
```

### Without Docker

```bash
cd emmas-chess
npm install
npm start
```

Then open `http://localhost:3000` on your PC and `http://YOUR_PC_IP:3000` on Emma's device. Both must be on the same Wi-Fi.

---

## Features

- Realistic wooden chessboard with engraved dedication: *"Love you, Emma — From Daddy"*
- 6 built-in themes: Daddy's Board, Classic, Ocean Breeze, Rose Garden, Midnight, Forest
- Adaptive board sizing: Auto, Small, Medium, Large, X-Large
- Dynamic fullscreen behavior with board auto-stretch in fullscreen
- Keyboard shortcut: `F11` toggles in-app fullscreen
- Font size settings: Small, Medium, Large
- Animation speed control
- Board corner radius and UI shadow strength controls
- Drag mode toggle (drag pieces on/off)
- Auto-queen promotion toggle
- Confirm-move toggle
- Legal move indicators toggle
- Coordinates and captured-piece visibility toggles
- Move timer presets (Off, 15s, 30s, 1m, 2m, 5m)
- Player profiles: save, load, and delete named option presets
- Persistent scorekeeping by player name (e.g., `Emma 4 | James 3`) plus draw tracking
- Move history panel
- In-game chat with quick emoji reactions (including "You got this! 💪")
- Sound effects toggle
- Touch support for tablets/phones
- Session rejoin support (resume active game)
- Full chess rules: castling, en passant, promotion, checkmate, stalemate, and draw detection

## Controls

- `F11`: Toggle fullscreen
- `Options` button: Open the full customization panel

## Architecture

- **Online version** (`public/index-netlify.html`): Single HTML file, Supabase Realtime Broadcast, deployed to Netlify
- **Local version** (`server/` + `public/`): Node.js + Express + Socket.IO

---

*Made with love. Every chess master was once a beginner.* ♟
