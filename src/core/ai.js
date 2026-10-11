import {
  collides, merge, dropY, rotateWithKick, spawnPos, aggregateHeight, holes, completeLines, bumpiness,
} from './board.js';

// Scored BEFORE full lines are cleared, on purpose: the published weights were tuned
// against exactly this scoring, so "fixing" it would change how the AI plays.
export function scoreBoard(board, w) {
  return -w.height * aggregateHeight(board) + w.lines * completeLines(board)
    - w.holes * holes(board) - w.bumpiness * bumpiness(board);
}

// Same search as the original AI: for each of 4 rotations, push the piece fully left, then
// step right, dropping and scoring each column. Ties keep the first move found.
// With `next`, each landing is scored by the best follow-up placement of the next piece
// (two-ply lookahead). A landing that leaves `next` nowhere to spawn is a game over, so
// it scores -Infinity. Returns { matrix, x, score }, or null if the piece can't spawn.
// ponytail: ~1,200 full-board copies per move (~3 ms); score from column heights if that ever matters.
export function bestMove(board, matrix, pos, weights, next = null) {
  if (collides(board, matrix, pos)) return null;
  let best = null;
  for (let rotation = 0; rotation < 4; rotation++) {
    let m = matrix;
    let x = pos.x;
    for (let r = 0; r < rotation; r++) {
      ({ matrix: m, x } = rotateWithKick(board, m, { x, y: pos.y }));
    }
    while (!collides(board, m, { x: x - 1, y: pos.y })) x--;
    for (; x < board[0].length && !collides(board, m, { x, y: pos.y }); x++) {
      const landed = merge(board, m, { x, y: dropY(board, m, { x, y: pos.y }) });
      const score = next
        ? (bestMove(landed, next, spawnPos(landed, next), weights)?.score ?? -Infinity)
        : scoreBoard(landed, weights);
      if (best === null || score > best.score) best = { matrix: m, x, score };
    }
  }
  return best;
}
