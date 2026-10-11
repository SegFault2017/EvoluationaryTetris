export const PIECES = {
  O: [[1, 1], [1, 1]],
  T: [[0, 2, 0], [2, 2, 2], [0, 0, 0]],
  L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
  J: [[4, 0, 0], [4, 4, 4], [0, 0, 0]],
  I: [[0, 0, 0, 0], [5, 5, 5, 5], [0, 0, 0, 0], [0, 0, 0, 0]],
  S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
  Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
};

const ORDER = ['T', 'O', 'I', 'L', 'J', 'S', 'Z'];

export function randomPiece(rng = Math.random) {
  return PIECES[ORDER[Math.floor(rng() * ORDER.length)]].map(row => [...row]);
}

// Clockwise turn: transpose, then mirror each row.
export function rotate(matrix) {
  const transposed = matrix.map((row, y) => row.map((_, x) => matrix[x][y]));
  return transposed.map(row => row.reverse());
}
