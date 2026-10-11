import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES } from '../src/core/pieces.js';
import { collides, merge, dropY, completeLines } from '../src/core/board.js';
import { bestMove, scoreBoard } from '../src/core/ai.js';
import { boardFrom, snapshot, seededRng, randomBoard } from './helpers.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };
const spawn = (m) => ({ x: Math.floor(10 / 2) - Math.floor(m[0].length / 2), y: 0 });

test('scoreBoard = -height*AH + lines*L - holes*H - bumpiness*B', () => {
  const b = boardFrom('#.........', '..#.......', '###.......'); // AH 6, L 0, H 1, B 5
  const expected = -WEIGHTS.height * 6 + WEIGHTS.lines * 0 - WEIGHTS.holes * 1 - WEIGHTS.bumpiness * 5;
  assert.equal(scoreBoard(b, WEIGHTS), expected);
});

test('bestMove drops an I into a one-column well for a 4-line clear', () => {
  const row = '#########.';
  const b = boardFrom(row, row, row, row);
  const move = bestMove(b, PIECES.I, spawn(PIECES.I), WEIGHTS);
  const landed = merge(b, move.matrix, { x: move.x, y: dropY(b, move.matrix, { x: move.x, y: 0 }) });
  assert.equal(completeLines(landed), 4);
});

test('bestMove never mutates its inputs and always returns a legal placement', () => {
  const rng = seededRng(1);
  const pieces = snapshot(PIECES);
  for (let i = 0; i < 50; i++) {
    const b = randomBoard(rng);
    const before = snapshot(b);
    for (const piece of Object.values(PIECES)) {
      const move = bestMove(b, piece, spawn(piece), WEIGHTS);
      assert.ok(move, `case ${i}`);
      assert.equal(collides(b, move.matrix, { x: move.x, y: 0 }), false, `case ${i}`);
    }
    assert.equal(snapshot(b), before);
  }
  assert.equal(snapshot(PIECES), pieces);
});

test('bestMove returns null when the piece does not fit where it spawns', () => {
  const full = boardFrom(...Array(22).fill('##########'));
  assert.equal(bestMove(full, PIECES.T, spawn(PIECES.T), WEIGHTS), null);
});
