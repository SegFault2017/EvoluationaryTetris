import { Game } from './core/game.js';
import { render } from './ui/render.js';
import { bindKeys } from './ui/input.js';

// Tuned offline by a genetic algorithm (50 generations). The training code is not in this repo.
const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };

const canvas = document.getElementById('cnv');
const ctx = canvas?.getContext('2d');
if (!ctx) throw new Error('Evolutionary Tetris needs a <canvas id="cnv"> with 2D support');
ctx.scale(20, 20);

const game = new Game({ weights: WEIGHTS });
bindKeys(game);

let last = performance.now();
function frame(time) {
  game.tick(time - last);
  last = time;
  render(ctx, game, WEIGHTS);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
