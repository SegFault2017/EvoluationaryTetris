import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { PIECES, rotate } from '../src/core/pieces.js';
import { createBoard } from '../src/core/board.js';
import { bestMove } from '../src/core/ai.js';
import { boardFrom } from './helpers.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };
const newGame = () => new Game({ weights: WEIGHTS, rng: () => 0 }); // every random piece is a T
const copy = (m) => m.map(row => [...row]);
const VERTICAL_I = rotate(PIECES.I, 1); // filled column at index 2

test('a new game spawns a centred piece in human mode', () => {
  const g = newGame();
  assert.deepEqual(g.piece, { matrix: PIECES.T, pos: { x: 4, y: 0 } });
  assert.deepEqual(g.next, PIECES.T);
  assert.deepEqual(g.held, PIECES.T);
  assert.equal(g.score, 0);
  assert.equal(g.gameOver, false);
  assert.equal(g.mode, 'human');
  assert.equal(g.dropInterval, 1000);
});

test('shift moves one column and stops at the walls', () => {
  const g = newGame();
  g.shift(1);
  assert.equal(g.piece.pos.x, 5);
  for (let i = 0; i < 20; i++) g.shift(-1);
  assert.equal(g.piece.pos.x, 0);
  for (let i = 0; i < 20; i++) g.shift(1);
  assert.equal(g.piece.pos.x, 7);
});

test('hardDrop locks the piece at the bottom and spawns the next one', () => {
  const g = newGame();
  g.hardDrop();
  assert.deepEqual(g.board[20].slice(4, 7), [0, 2, 0]);
  assert.deepEqual(g.board[21].slice(4, 7), [2, 2, 2]);
  assert.deepEqual(g.piece.pos, { x: 4, y: 0 });
});

test('clearing 1-4 lines scores 50/150/350/750 and updates the highscore', () => {
  for (const [k, points] of [[1, 50], [2, 150], [3, 350], [4, 750]]) {
    const g = newGame();
    g.board = boardFrom(...Array(k).fill('#########.'));
    g.piece = { matrix: copy(VERTICAL_I), pos: { x: 7, y: 0 } };
    g.hardDrop();
    assert.equal(g.lines, k);
    assert.equal(g.score, points);
    assert.equal(g.highscore, points);
  }
});

test('level goes up every 10 lines', () => {
  const g = newGame();
  g.lines = 8;
  g.board = boardFrom('#########.', '#########.');
  g.piece = { matrix: copy(VERTICAL_I), pos: { x: 7, y: 0 } };
  g.hardDrop();
  assert.equal(g.lines, 10);
  assert.equal(g.level, 1);
});

test('tick drops one row once the interval passes', () => {
  const g = newGame();
  g.tick(1000);
  assert.equal(g.piece.pos.y, 0);
  g.tick(1);
  assert.equal(g.piece.pos.y, 1);
});

test('drop interval never goes below 60 ms, however high the level', () => {
  const g = newGame(); // Review Focus 4
  g.level = 50;
  g.tick(60);
  assert.equal(g.piece.pos.y, 0);
  g.tick(1);
  assert.equal(g.piece.pos.y, 1);
});

test('unpausing after a long pause does not drop the piece instantly', () => {
  const g = newGame(); // Review Focus 2 / D6
  g.togglePause();
  g.tick(60_000);
  g.togglePause();
  g.tick(16);
  assert.equal(g.piece.pos.y, 0);
});

test('a blocked spawn ends the game; tick does nothing; reset clears it and keeps the highscore', () => {
  const g = newGame();
  g.board[1][5] = 1; // where the next T spawns
  g.spawn();
  assert.equal(g.gameOver, true);
  g.tick(10_000);
  assert.equal(g.piece.pos.y, 0);
  g.score = 100;
  g.highscore = 500;
  g.reset();
  assert.equal(g.gameOver, false);
  assert.equal(g.score, 0);
  assert.equal(g.highscore, 500);
  assert.ok(g.board.every(row => row.every(v => v === 0)));
});

test('rotate turns the piece and kicks it off the wall', () => {
  const g = newGame();
  g.piece = { matrix: copy(VERTICAL_I), pos: { x: -2, y: 0 } }; // standing in column 0
  g.rotate(1);
  assert.deepEqual(g.piece.matrix, rotate(VERTICAL_I, 1));
  assert.equal(g.piece.pos.x, 0);
});

test('rotating a wedged piece does nothing and does not throw', () => {
  const g = newGame(); // Review Focus 1 / D8
  g.board = boardFrom(...Array(10).fill('##########'));
  g.piece = { matrix: copy(PIECES.I), pos: { x: 3, y: 10 } };
  g.rotate(1);
  assert.deepEqual(g.piece, { matrix: PIECES.I, pos: { x: 3, y: 10 } });
});

test('hold swaps the current and held pieces, kicking off the wall', () => {
  const g = newGame();
  g.held = copy(PIECES.I);
  g.piece = { matrix: copy(PIECES.O), pos: { x: 7, y: 0 } };
  g.hold();
  assert.deepEqual(g.piece.matrix, PIECES.I);
  assert.equal(g.piece.pos.x, 6);
  assert.deepEqual(g.held, PIECES.O);
});

test('hold does nothing when the held piece cannot fit', () => {
  const g = newGame(); // Review Focus 1 / D8: the I can't kick far enough from x=8
  g.held = copy(PIECES.I);
  g.piece = { matrix: copy(PIECES.O), pos: { x: 8, y: 0 } };
  g.hold();
  assert.deepEqual(g.piece, { matrix: PIECES.O, pos: { x: 8, y: 0 } });
  assert.deepEqual(g.held, PIECES.I);
});

test("setMode('ai') resets and lets the AI place pieces; 'human' does not reset", () => {
  const g = newGame();
  g.score = 300;
  g.setMode('ai');
  assert.equal(g.mode, 'ai');
  assert.equal(g.dropInterval, 1);
  assert.equal(g.score, 0);
  const expected = bestMove(createBoard(10, 22), PIECES.T, { x: 4, y: 0 }, WEIGHTS);
  assert.deepEqual(g.piece, { matrix: expected.matrix, pos: { x: expected.x, y: 0 } });
  g.score = 50;
  g.setMode('human');
  assert.equal(g.dropInterval, 1000);
  assert.equal(g.score, 50);
});
