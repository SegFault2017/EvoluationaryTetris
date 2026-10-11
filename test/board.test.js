import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, rotate } from '../src/core/pieces.js';
import {
  createBoard, collides, merge, dropY, kick, rotateWithKick, clearLines,
  aggregateHeight, holes, completeLines, bumpiness,
} from '../src/core/board.js';
import { boardFrom, snapshot } from './helpers.js';

const { O, I } = PIECES;
const FULL = '##########';

test('createBoard makes independent empty rows', () => {
  const b = createBoard(10, 22);
  assert.equal(b.length, 22);
  assert.ok(b.every(row => row.length === 10 && row.every(v => v === 0)));
  b[0][0] = 1;
  assert.equal(b[1][0], 0);
});

test('collides with walls, floor, the area above the top, and filled cells', () => {
  const empty = createBoard(10, 22);
  assert.equal(collides(empty, O, { x: 0, y: 0 }), false);
  assert.equal(collides(empty, O, { x: -1, y: 0 }), true);  // left wall
  assert.equal(collides(empty, O, { x: 9, y: 0 }), true);   // right wall
  assert.equal(collides(empty, O, { x: 0, y: 20 }), false);
  assert.equal(collides(empty, O, { x: 0, y: 21 }), true);  // floor
  assert.equal(collides(empty, O, { x: 0, y: -1 }), true);  // above the top
  assert.equal(collides(empty, I, { x: 0, y: -1 }), false); // only I's empty top row is above the board
  assert.equal(collides(boardFrom('#.........'), O, { x: 0, y: 20 }), true);
});

test('merge writes the piece into a new board', () => {
  const empty = createBoard(10, 22);
  const out = merge(empty, O, { x: 3, y: 20 });
  assert.equal(out[20][3], 1);
  assert.equal(out[21][4], 1);
  assert.equal(out[19][3], 0);
  assert.equal(snapshot(empty), snapshot(createBoard(10, 22)));
});

test('dropY finds the lowest row the piece fits in', () => {
  const empty = createBoard(10, 22);
  assert.equal(dropY(empty, O, { x: 0, y: 0 }), 20);
  assert.equal(dropY(empty, I, { x: 0, y: 0 }), 20);
  assert.equal(dropY(boardFrom('#.........'), O, { x: 0, y: 0 }), 19);
});

test('kick searches x+1, x-1, x+2, … and returns null once the offset passes the width', () => {
  const empty = createBoard(10, 22);
  const vertical = rotate(I, 1); // filled column at index 2
  assert.equal(kick(empty, O, { x: 4, y: 0 }), 4);
  assert.equal(kick(empty, vertical, { x: 8, y: 0 }), 7);
  assert.equal(kick(empty, O, { x: 9, y: 0 }), null); // tries 9 and 10, then offset 3 > width 2
});

test('rotateWithKick rotates, kicks off walls, and does nothing when wedged', () => {
  const empty = createBoard(10, 22);
  const vertical = rotate(I, 1);
  assert.deepEqual(rotateWithKick(empty, I, { x: 3, y: 0 }, 1), { matrix: vertical, x: 3 });
  assert.deepEqual(rotateWithKick(empty, vertical, { x: -2, y: 0 }, 1), { matrix: rotate(vertical, 1), x: 0 });
  // Review Focus 1: a flat I resting on a full stack cannot stand up. The old code overflowed the stack here.
  const stack = boardFrom(...Array(10).fill(FULL)); // rows 12-21 full
  assert.deepEqual(rotateWithKick(stack, I, { x: 3, y: 10 }, 1), { matrix: I, x: 3 });
});

test('clearLines removes full rows, including non-adjacent ones, without mutating', () => {
  const b = boardFrom('#.........', FULL, '.#........', FULL);
  const before = snapshot(b);
  const { board, cleared } = clearLines(b);
  assert.equal(cleared, 2);
  assert.equal(board.length, 22);
  assert.deepEqual(board.slice(18), boardFrom('#.........', '.#........').slice(18));
  assert.equal(snapshot(b), before);
  assert.equal(clearLines(boardFrom(FULL)).cleared, 1);
  assert.equal(clearLines(boardFrom(FULL, FULL, FULL, FULL)).cleared, 4);
  assert.equal(clearLines(boardFrom('#########.')).cleared, 0);
});

test('metrics match a hand-checked board', () => {
  // column heights 3,1,2,0…; one hole at column 0
  const b = boardFrom('#.........', '..#.......', '###.......');
  assert.equal(aggregateHeight(b), 6);
  assert.equal(holes(b), 1);
  assert.equal(bumpiness(b), 5);
  assert.equal(completeLines(b), 0);
  assert.equal(completeLines(boardFrom(FULL, '#.........')), 1);
});
