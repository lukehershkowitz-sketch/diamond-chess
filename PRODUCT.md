# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user, for now, is the owner: one player reviewing their own online games (mostly fast time controls on Chess.com) to understand mistakes and improve. Other players may use it later, but no wider audience is confirmed yet. Design for one person who just finished a game and wants to know what went wrong.

## Product Purpose

Diamond Chess turns a finished game into something you can learn from: every move graded by an engine, the moments the game turned, and what to take away. Success is the player understanding why they lost (or nearly won) and practicing the patterns they keep missing.

## Positioning

- **Free, no paywall.** Full game review with no subscription or daily limits, where Chess.com gates its review behind a paid tier.
- **Plain-English coaching.** Explains why a move was good or bad and what to learn from it, not only a grade and an engine line.
- **Practice from your own mistakes.** Errors from the player's own games become puzzles to drill. (Planned; not built yet.)

## Operating Context

- Games come from Chess.com or Lichess by username (public APIs), or a pasted PGN.
- Typical moment of use: right after a game ends, often a blitz game, with the result still fresh.
- Hosted on Vercel, deployed from the GitHub repo `lukehershkowitz-sketch/diamond-chess`.

## Capabilities and Constraints

- **Built:** Game Review (Milestone 1, in progress) at `/review`: import, Stockfish analysis at selectable depth, move classification (brilliant to blunder), accuracy, eval bar and graph, move list, key moments, opening names.
- **Planned:** Puzzles (including ones built from your own mistakes) and Coach (plain-English explanations, questions about any position). Shown as "Soon" in navigation.
- **No accounts or sign-in.** Must stay usable instantly with just a username or PGN. Hard constraint.
- Stockfish runs client-side as WASM, so analysis has no server cost and games are not uploaded. Keep the COOP/COEP headers in `next.config.ts`.
- Stockfish is GPL-3.0; the footer must keep linking to its source. Opening names come from lichess-org/chess-openings (CC0).
- Independent project: not affiliated with Chess.com or Lichess, and must not imitate their branding.
- Terminology: move classes are brilliant, great, best, excellent, good, book, inaccuracy, mistake, miss, blunder.
- Undecided: whether the site stays free forever or ever adds paid features; whether it opens to other users beyond the owner.

## Brand Commitments

- Name: **Diamond Chess**, with a ◆ diamond mark.

## Evidence on Hand

- No users, testimonials, press, ratings data or benchmarks exist. Do not invent any.
- Real material: the owner's own games, importable from Chess.com or Lichess.

## Product Principles

1. **Explain, don't just grade.** Every judgment the app shows should come with a reason a non-expert can follow.
2. **Turn mistakes into practice.** A review is the start of training, not the end of it.
3. **Zero friction.** No sign-in and no setup: username or PGN in, review out.
4. **Honest about the engine.** Show what Stockfish found and how sure it is; don't dress estimates up as certainty.
