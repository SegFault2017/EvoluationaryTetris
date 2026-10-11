import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { render } from '../src/ui/render.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };

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
  for (const s of ['Gen: 50', 'Height-W: 0.51', 'Line-W: 0.76', 'Hole-W: 0.36', 'Bump-W: 0.18', '← / → = Move   A = AI']) {
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
