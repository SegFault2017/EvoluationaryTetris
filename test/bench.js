// Strength benchmark: lines the AI clears per seeded game. Not a test; run with `npm run bench`.
import { Game } from '../src/core/game.js';
import { seededRng } from './helpers.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };
const [games = 5, maxPieces = 2000] = process.argv.slice(2).map(Number);

const lines = [];
const t0 = performance.now();
for (let seed = 1; seed <= games; seed++) {
  const game = new Game({ weights: WEIGHTS, rng: seededRng(seed) });
  game.setMode('ai');
  let pieces = 0;
  while (!game.gameOver && pieces < maxPieces) {
    game.hardDrop();
    pieces++;
  }
  lines.push(game.lines);
  console.log(`seed ${seed}: ${game.lines} lines, ${pieces} pieces${game.gameOver ? '' : ' (hit the cap)'}`);
}
const sorted = [...lines].sort((a, b) => a - b);
console.log(`mean ${Math.round(lines.reduce((a, b) => a + b, 0) / games)}, median ${sorted[Math.floor(games / 2)]}, ${((performance.now() - t0) / 1000).toFixed(1)}s`);
