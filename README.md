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
- Smooth piece animations (adjustable speed)
- 4 board themes: Classic Oak, Dark Walnut, Maple & Cherry, Rosewood
- 3 piece styles: Classic, Roblox, Neon Glow
- Adaptive board sizing with Auto, Small, Medium, Large, X-Large options
- Fullscreen mode
- Font size settings: Small, Medium, Large
- Drag & drop or click-to-move
- Legal move indicators
- Move history panel
- In-game chat with quick emoji reactions (including "You got this! 💪")
- Sound effects (wood piece sounds!)
- Touch support for tablets/phones
- Full chess rules: castling, en passant, promotion, draw detection

## Architecture

- **Online version** (`public/index-netlify.html`): Single HTML file, Supabase Realtime Broadcast, deployed to Netlify
- **Local version** (`server/` + `public/`): Node.js + Express + Socket.IO

---

*Made with love. Every chess master was once a beginner.* ♟
