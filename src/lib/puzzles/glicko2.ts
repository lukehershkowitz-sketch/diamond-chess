/** Glicko-2 rating update for a single game (Glickman, 2012). */
export interface Rating {
  rating: number;
  rd: number;
  vol: number;
}

const SCALE = 173.7178;
const TAU = 0.5;
export const NEW_PLAYER: Rating = { rating: 1500, rd: 350, vol: 0.06 };
/** Keep some uncertainty so ratings stay responsive, like puzzle sites do. */
const MIN_RD = 60;
const MAX_RD = 350;
/** Puzzle ratings are treated as well established. */
export const PUZZLE_RD = 75;

const g = (phi: number) => 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));

export function updateRating(player: Rating, opponentRating: number, score: 0 | 1, opponentRd = PUZZLE_RD): Rating {
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const muJ = (opponentRating - 1500) / SCALE;
  const gJ = g(opponentRd / SCALE);
  const E = 1 / (1 + Math.exp(-gJ * (mu - muJ)));
  const v = 1 / (gJ * gJ * E * (1 - E));
  const delta = v * gJ * (score - E);

  // New volatility via the Illinois algorithm.
  const a = Math.log(player.vol * player.vol);
  const f = (x: number) => {
    const ex = Math.exp(x);
    return (ex * (delta * delta - phi * phi - v - ex)) / (2 * (phi * phi + v + ex) ** 2) - (x - a) / (TAU * TAU);
  };
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A);
  let fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > 1e-6; i++) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }
  const vol = Math.exp(A / 2);

  const phiStar = Math.sqrt(phi * phi + vol * vol);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * gJ * (score - E);
  return {
    rating: muNew * SCALE + 1500,
    rd: Math.min(MAX_RD, Math.max(MIN_RD, phiNew * SCALE)),
    vol,
  };
}
