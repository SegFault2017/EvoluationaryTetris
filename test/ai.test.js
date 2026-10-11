import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, rotate } from '../src/core/pieces.js';
import { collides, merge, dropY, clearLines } from '../src/core/board.js';
import { bestMove, scorePlacement } from '../src/core/ai.js';
import { boardFrom, snapshot, seededRng, randomBoard } from './helpers.js';

const WEIGHTS = {
  landing: -4.500158825082766, lines: 3.4181268101392694, rowTransitions: -3.2178882868487753,
  columnTransitions: -9.348695305445199, holes: -7.899265427351652, wells: -3.3855972247263626,
};
const spawn = (m) => ({ x: Math.floor(10 / 2) - Math.floor(m[0].length / 2), y: 0 });
const drop = (b, { matrix, x }) => merge(b, matrix, { x, y: dropY(b, matrix, { x, y: 0 }) });
const VERTICAL_I = rotate(PIECES.I); // filled column at index 2

test('scorePlacement: piece terms are landing height and lines, board terms are scored after clearing', () => {
  const row = '#########.';
  const b = boardFrom(row, row, row, row);
  // Vertical I into the 4-deep well: its middle lands at height (4 + 1) / 2 and clears 4 lines.
  const p = scorePlacement(b, VERTICAL_I, { x: 7, y: 18 }, WEIGHTS);
  assert.equal(p.piece, WEIGHTS.landing * 2.5 + WEIGHTS.lines * 4);
  // The board is empty again: 2 row transitions per row, 1 column transition per column.
  assert.equal(p.board, WEIGHTS.rowTransitions * 44 + WEIGHTS.columnTransitions * 10);
  assert.deepEqual(p.after, boardFrom());
  // Flat I in the middle of an empty floor: height 1, no lines, two more row transitions.
  const flat = scorePlacement(boardFrom(), PIECES.I, { x: 3, y: 20 }, WEIGHTS);
  assert.equal(flat.piece, WEIGHTS.landing * 1);
  assert.equal(flat.board, WEIGHTS.rowTransitions * 46 + WEIGHTS.columnTransitions * 10);
});

test('bestMove drops an I into a one-column well for a 4-line clear', () => {
  const row = '#########.';
  const b = boardFrom(row, row, row, row);
  assert.equal(clearLines(drop(b, bestMove(b, PIECES.I, spawn(PIECES.I), WEIGHTS))).cleared, 4);
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

test('with the next piece known, bestMove sets up a line clear that greedy would miss', () => {
  const b = boardFrom('########..');
  const greedy = bestMove(b, PIECES.I, spawn(PIECES.I), WEIGHTS);
  const ahead = bestMove(b, PIECES.I, spawn(PIECES.I), WEIGHTS, PIECES.T);
  assert.deepEqual(greedy.matrix, PIECES.I); // lies flat on the floor
  assert.deepEqual([ahead.matrix, ahead.x], [VERTICAL_I, 7]); // stands in the last column, leaving a notch for the T's stem
  for (const [move, lines] of [[greedy, 0], [ahead, 1]]) {
    const after = drop(b, move);
    assert.equal(clearLines(drop(after, bestMove(after, PIECES.T, spawn(PIECES.T), WEIGHTS))).cleared, lines);
  }
});

test('when every placement blocks the next spawn, bestMove still returns a legal move scored -Infinity', () => {
  // The O can only land in the trench under the I's spawn row (the well in column 9 is too narrow).
  const b = boardFrom('###....###', ...Array(20).fill('#########.'));
  const move = bestMove(b, PIECES.O, spawn(PIECES.O), WEIGHTS, PIECES.I);
  assert.equal(move.score, -Infinity);
  assert.equal(collides(b, move.matrix, { x: move.x, y: 0 }), false);
  assert.equal(collides(drop(b, move), PIECES.I, spawn(PIECES.I)), true);
});
