import {
  collides, merge, dropY, rotateWithKick, aggregateHeight, holes, completeLines, bumpiness,
} from './board.js';

// Scored BEFORE full lines are cleared, on purpose: the published weights were tuned
// against exactly this scoring, so "fixing" it would change how the AI plays.
export function scoreBoard(board, w) {
  return -w.height * aggregateHeight(board) + w.lines * completeLines(board)
    - w.holes * holes(board) - w.bumpiness * bumpiness(board);
}

// Same search as the original AI: for each of 4 rotations, push the piece fully left, then
// step right, dropping and scoring each column. Ties keep the first move found.
// Returns { matrix, x }, or null if no column fits.
export function bestMove(board, matrix, pos, weights) {
  let best = null;
  let bestScore = null;
  for (let rotation = 0; rotation < 4; rotation++) {
    let m = matrix;
    let x = pos.x;
    for (let r = 0; r < rotation; r++) {
      ({ matrix: m, x } = rotateWithKick(board, m, { x, y: pos.y }));
    }
    while (!collides(board, m, { x: x - 1, y: pos.y })) x--;
    for (; x < board[0].length && !collides(board, m, { x, y: pos.y }); x++) {
      const y = dropY(board, m, { x, y: pos.y });
      const score = scoreBoard(merge(board, m, { x, y }), weights);
      if (bestScore === null || score > bestScore) {
        bestScore = score;
        best = { matrix: m, x };
      }
    }
  }
  return best;
}
