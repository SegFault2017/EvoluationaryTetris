import {
  collides, merge, dropY, rotateWithKick, spawnPos, clearLines,
  rowTransitions, columnTransitions, holes, wells,
} from './board.js';

// Dellacherie's placement score. Two terms belong to the piece itself: how high its middle
// landed, and the lines it cleared. The other four are measured on the board AFTER those
// lines are cleared. Returns { piece, board, after }: the two kinds of terms and the cleared board.
export function scorePlacement(board, matrix, pos, w) {
  const filledRows = matrix.map((row, r) => (row.some(v => v !== 0) ? r : -1)).filter(r => r >= 0);
  const top = pos.y + filledRows[0];
  const bottom = pos.y + filledRows[filledRows.length - 1];
  const landing = ((board.length - top) + (board.length - bottom)) / 2;
  const { board: after, cleared } = clearLines(merge(board, matrix, pos));
  return {
    piece: w.landing * landing + w.lines * cleared,
    board: w.rowTransitions * rowTransitions(after) + w.columnTransitions * columnTransitions(after)
      + w.holes * holes(after) + w.wells * wells(after),
    after,
  };
}

// For each of 4 rotations, push the piece fully left, then step right, dropping and scoring
// each column. Ties keep the first move found. With `next`, each landing is scored by its own
// piece terms plus the best follow-up placement of the next piece on the cleared board (two-ply
// lookahead). A landing that leaves `next` nowhere to spawn is a game over, so it scores
// -Infinity. Returns { matrix, x, score }, or null if the piece can't spawn.
// ponytail: ~35 full-board copies per move at one ply, ~1,200 at two; score from column heights if that ever matters.
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
      const p = scorePlacement(board, m, { x, y: dropY(board, m, { x, y: pos.y }) }, weights);
      const score = next
        ? p.piece + (bestMove(p.after, next, spawnPos(p.after, next), weights)?.score ?? -Infinity)
        : p.piece + p.board;
      if (best === null || score > best.score) best = { matrix: m, x, score };
    }
  }
  return best;
}
