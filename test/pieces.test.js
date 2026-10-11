import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, randomPiece, rotate } from '../src/core/pieces.js';

test('PIECES match the original shapes', () => {
  assert.deepEqual(PIECES, {
    O: [[1, 1], [1, 1]],
    T: [[0, 2, 0], [2, 2, 2], [0, 0, 0]],
    L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    J: [[4, 0, 0], [4, 4, 4], [0, 0, 0]],
    I: [[0, 0, 0, 0], [5, 5, 5, 5], [0, 0, 0, 0], [0, 0, 0, 0]],
    S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
    Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
  });
});

test('rotate(+1) turns clockwise, and four turns give back the original', () => {
  assert.deepEqual(rotate(PIECES.T, 1), [[0, 2, 0], [0, 2, 2], [0, 2, 0]]);
  for (const m of Object.values(PIECES)) {
    assert.deepEqual(rotate(rotate(rotate(rotate(m, 1), 1), 1), 1), m);
  }
});

test('rotate(-1) only transposes, like the original', () => {
  assert.deepEqual(rotate(PIECES.L, -1), [[0, 3, 0], [0, 3, 0], [3, 3, 0]]);
});

test('rotate does not mutate its input', () => {
  const t = PIECES.T.map(row => [...row]);
  rotate(t, 1);
  assert.deepEqual(t, PIECES.T);
});

test('randomPiece uses the injected rng and returns a copy', () => {
  assert.deepEqual(randomPiece(() => 0), PIECES.T);
  assert.deepEqual(randomPiece(() => 0.99), PIECES.Z);
  const piece = randomPiece(() => 0);
  piece[0][0] = 9;
  assert.equal(PIECES.T[0][0], 0);
});
