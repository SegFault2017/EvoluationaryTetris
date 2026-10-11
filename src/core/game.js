import { createBoard, spawnPos, collides, merge, dropY, kick, rotateWithKick, clearLines } from './board.js';
import { randomPiece } from './pieces.js';
import { bestMove } from './ai.js';

const WIDTH = 10;
const HEIGHT = 22;
const HUMAN_DROP_MS = 1000;
const AI_DROP_MS = 1;
const MIN_DROP_MS = 60;
const LEVEL_SPEEDUP_MS = 60;

export class Game {
  constructor({ weights, rng = Math.random }) {
    this.weights = weights;
    this.rng = rng;
    this.mode = 'human';
    this.dropInterval = HUMAN_DROP_MS;
    this.highscore = 0;
    this.paused = false;
    this.reset();
  }

  reset() {
    this.board = createBoard(WIDTH, HEIGHT);
    this.score = 0;
    this.lines = 0;
    this.level = 0;
    this.dropCount = 0;
    this.gameOver = false;
    this.next = randomPiece(this.rng);
    this.spawn();
    this.held = randomPiece(this.rng);
  }

  spawn() {
    const matrix = this.next;
    this.next = randomPiece(this.rng);
    this.piece = { matrix, pos: spawnPos(this.board, matrix) };
    if (collides(this.board, matrix, this.piece.pos)) {
      this.gameOver = true;
      return;
    }
    if (this.mode === 'ai') {
      const move = bestMove(this.board, matrix, this.piece.pos, this.weights, this.next);
      if (move) this.piece = { matrix: move.matrix, pos: { x: move.x, y: 0 } };
    }
  }

  shift(dir) {
    this.piece.pos.x += dir;
    if (collides(this.board, this.piece.matrix, this.piece.pos)) this.piece.pos.x -= dir;
  }

  rotate() {
    const { matrix, x } = rotateWithKick(this.board, this.piece.matrix, this.piece.pos);
    this.piece.matrix = matrix;
    this.piece.pos.x = x;
  }

  // Swap with the held piece, with the same wall kick as rotation. No-op if it can't fit (D8).
  hold() {
    const x = kick(this.board, this.held, this.piece.pos);
    if (x === null) return;
    [this.held, this.piece.matrix] = [this.piece.matrix, this.held];
    this.piece.pos.x = x;
  }

  softDrop() {
    this.piece.pos.y++;
    if (collides(this.board, this.piece.matrix, this.piece.pos)) {
      this.piece.pos.y--;
      this.#lock();
    }
    this.dropCount = 0;
  }

  hardDrop() {
    this.piece.pos.y = dropY(this.board, this.piece.matrix, this.piece.pos);
    this.softDrop();
  }

  // Time is discarded while paused, so unpausing doesn't trigger a drop (D6).
  tick(dt) {
    if (this.paused || this.gameOver) return;
    this.dropCount += dt;
    if (this.dropCount > Math.max(this.dropInterval - this.level * LEVEL_SPEEDUP_MS, MIN_DROP_MS)) {
      this.softDrop();
    }
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'ai') {
      this.dropInterval = AI_DROP_MS;
      this.reset();
    } else {
      this.dropInterval = HUMAN_DROP_MS;
    }
  }

  togglePause() {
    this.paused = !this.paused;
  }

  // Each extra line in one drop doubles its value: 50, 100, 200, 400 → 50 * (2^k - 1) in total.
  #lock() {
    const { board, cleared } = clearLines(merge(this.board, this.piece.matrix, this.piece.pos));
    this.board = board;
    if (cleared > 0) {
      this.score += 50 * (2 ** cleared - 1);
      this.highscore = Math.max(this.highscore, this.score);
      this.lines += cleared;
      this.level = Math.floor(this.lines / 10);
    }
    this.spawn();
  }
}
