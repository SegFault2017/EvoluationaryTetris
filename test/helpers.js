// Builds a 10x22 board. `rows` are the bottom rows, top to bottom: '#' = filled (1), '.' = empty.
export function boardFrom(...rows) {
  const empty = Array.from({ length: 22 - rows.length }, () => new Array(10).fill(0));
  return [...empty, ...rows.map(row => [...row].map(c => (c === '#' ? 1 : 0)))];
}

export const snapshot = (value) => JSON.stringify(value);

// Deterministic PRNG (mulberry32) so random-board tests are reproducible.
export function seededRng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random 10x22 board with ragged columns and holes. Columns are at most 17 tall,
// so the top 5 rows stay empty and every piece fits at its spawn position.
export function randomBoard(rng) {
  const board = Array.from({ length: 22 }, () => new Array(10).fill(0));
  for (let c = 0; c < 10; c++) {
    const height = Math.floor(rng() * 18);
    for (let r = 22 - height; r < 22; r++) {
      if (r === 22 - height || rng() < 0.8) board[r][c] = 1 + Math.floor(rng() * 7);
    }
  }
  return board;
}
