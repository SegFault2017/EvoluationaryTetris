import { rotate } from './pieces.js';

export function createBoard(width, height) {
  return Array.from({ length: height }, () => new Array(width).fill(0));
}

// Anything outside the board counts as filled, so walls, the floor and the area above the top all collide.
export function collides(board, matrix, pos) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0 && (board[y + pos.y]?.[x + pos.x] ?? 1) !== 0) return true;
    }
  }
  return false;
}

export function merge(board, matrix, pos) {
  const out = board.map(row => [...row]);
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value !== 0) out[y + pos.y][x + pos.x] = value;
  }));
  return out;
}

// Lowest y the piece can fall to from pos.
export function dropY(board, matrix, pos) {
  let y = pos.y;
  while (!collides(board, matrix, { x: pos.x, y: y + 1 })) y++;
  return y;
}

// The original wall-kick search: x, x+1, x-1, x+2, x-2, …, giving up once the offset
// exceeds the piece width. Returns the x that fits, or null.
export function kick(board, matrix, pos) {
  let x = pos.x;
  let offset = 1;
  while (collides(board, matrix, { x, y: pos.y })) {
    x += offset;
    offset = -(offset + Math.sign(offset));
    if (offset > matrix[0].length) return null;
  }
  return x;
}

// Rotation with wall kick. If nothing fits, the rotation doesn't happen (spec D8).
export function rotateWithKick(board, matrix, pos, dir) {
  const rotated = rotate(matrix, dir);
  const x = kick(board, rotated, pos);
  return x === null ? { matrix, x: pos.x } : { matrix: rotated, x };
}

// Same bottom-up scan as the original lineCheck.
export function clearLines(board) {
  const rows = board.map(row => [...row]);
  let cleared = 0;
  for (let y = rows.length - 1; y > 0; y--) {
    if (rows[y].every(v => v > 0)) {
      rows.splice(y, 1);
      rows.unshift(new Array(rows[0].length).fill(0));
      cleared++;
      y++; // re-check the row that slid into this index
    }
  }
  return { board: rows, cleared };
}

function columnHeight(board, c) {
  let r = 0;
  while (r < board.length && board[r][c] === 0) r++;
  return board.length - r;
}

export function aggregateHeight(board) {
  let total = 0;
  for (let c = 0; c < board[0].length; c++) total += columnHeight(board, c);
  return total;
}

// Empty cells with a filled cell somewhere above them in the same column.
export function holes(board) {
  let count = 0;
  for (let c = 0; c < board[0].length; c++) {
    let covered = false;
    for (const row of board) {
      if (row[c] !== 0) covered = true;
      else if (covered) count++;
    }
  }
  return count;
}

export function completeLines(board) {
  return board.filter(row => row.every(v => v !== 0)).length;
}

export function bumpiness(board) {
  let total = 0;
  for (let c = 0; c < board[0].length - 1; c++) {
    total += Math.abs(columnHeight(board, c) - columnHeight(board, c + 1));
  }
  return total;
}
