# Diamond Chess

Game review, coach and puzzles in the browser. Stockfish runs client-side (WASM), so analysis costs nothing on the server.

**Status:** Milestone 1 (Game Review) in progress. See `/review`.

## Develop
```bash
npm install        # also copies Stockfish builds into public/stockfish (postinstall)
npm run dev        # http://localhost:3000/review
npm test           # Vitest
npm run lint
npm run build && npm start
```

## Deploy (Vercel)
1. Push this repo to GitHub.
2. vercel.com -> Add New -> Project -> import the repo -> Deploy (defaults are correct).
3. Optional: Settings -> Domains to attach your own domain.

`next.config.ts` sets the COOP/COEP headers needed for multi-threaded WASM; keep them.

## Licensing notes
Stockfish is GPL-3.0; link to its source if you distribute this site. This is an independent project, not affiliated with Chess.com.
