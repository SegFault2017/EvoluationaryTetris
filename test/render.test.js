import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { render } from '../src/ui/render.js';

const WEIGHTS = {
  landing: -4.500158825082766, lines: 3.4181268101392694, rowTransitions: -3.2178882868487753,
  columnTransitions: -9.348695305445199, holes: -7.899265427351652, wells: -3.3855972247263626,
};

// Records what render draws: text, and how many cells were filled.
function recordingCtx() {
  const ctx = { canvas: { width: 600, height: 600 }, texts: [], fills: 0 };
  ctx.fillText = (s) => ctx.texts.push(String(s));
  ctx.fillRect = () => { ctx.fills++; };
  ctx.strokeRect = () => {};
  return ctx;
}

test('AI panel prints the weights from the one WEIGHTS object (D4)', () => {
  const g = new Game({ weights: WEIGHTS, rng: () => 0 });
  g.setMode('ai');
  const ctx = recordingCtx();
  render(ctx, g, WEIGHTS);
  for (const s of ['Land: -4.50', 'Line: 3.42', 'RowT: -3.22', 'ColT: -9.35', 'Hole: -7.90', 'Well: -3.39', '← / → = Move   A = AI']) {
    assert.ok(ctx.texts.includes(s), `missing "${s}"`);
  }
});

test('game over shows the overlay and hides the active piece and its ghost (D1)', () => {
  const g = new Game({ weights: WEIGHTS, rng: () => 0 });
  const playing = recordingCtx();
  render(playing, g, WEIGHTS);
  g.gameOver = true;
  const over = recordingCtx();
  render(over, g, WEIGHTS);
  assert.ok(over.texts.includes('Game Over') && over.texts.includes('Press R'));
  assert.equal(playing.fills - over.fills, 8); // the 4-cell T and its 4-cell ghost
});
