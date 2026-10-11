import { Game } from './core/game.js';
import { render } from './ui/render.js';
import { bindKeys } from './ui/input.js';

// El-Tetris weights (Islam El-Ashi, 2011) for Dellacherie's six features. See README "Heuristic".
const WEIGHTS = {
  landing: -4.500158825082766, lines: 3.4181268101392694, rowTransitions: -3.2178882868487753,
  columnTransitions: -9.348695305445199, holes: -7.899265427351652, wells: -3.3855972247263626,
};

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
