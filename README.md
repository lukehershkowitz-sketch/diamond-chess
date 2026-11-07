# Diamond Chess

Game review, coach and puzzles in the browser. Stockfish runs client-side (WASM), so analysis costs nothing on the server.

**Status:** Game Review (`/review`), Puzzles (`/puzzles`) and the AI Coach (`/coach`, plus explanations inside Review and Puzzles) all work.

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

## Puzzle data
`public/puzzles/` holds a curated sample of the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0): well-rated, frequently played puzzles, about 250 per 100-point rating band. To rebuild it:
```bash
curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
pip install zstandard
python3 scripts/build-puzzles.py lichess_db_puzzle.csv.zst
```
Puzzle ratings use Glicko-2 and are stored in the visitor's browser until accounts exist.

## AI Coach
The coach explains Stockfish's findings in plain English using the Claude API (`src/app/api/coach/route.ts`).

- **Setup:** set `ANTHROPIC_API_KEY` (server-side only; never exposed to the browser). Without it the coach endpoint returns 503 and the UI says the coach isn't switched on.
- **Grounding:** the browser sends the position plus Stockfish's lines; the prompt tells the model to explain those lines rather than invent its own. Requests are validated and size-capped in `src/lib/coach/request.ts`.
- **Model and cost:** `claude-opus-5-5` at medium effort with server-side refusal fallback (override with `COACH_MODEL`). A typical explanation is ~1-2K input tokens and a few hundred output tokens, roughly 1-3 cents. Explanations are cached per move in the page, and the system prompt and chat history are prompt-cached.
- **Abuse guard:** 20 requests per visitor per 10 minutes, in memory per server instance (`src/lib/coach/rateLimit.ts`). Also set a monthly spend limit in the Anthropic Console.
