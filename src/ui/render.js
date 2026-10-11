import { dropY } from '../core/board.js';

const PALETTE = ['#ffeb3b', '#9c27b0', '#ff9800', '#3f51b5', '#03a9f4', '#4caf50', '#f44336'];
const BACKGROUND = 'rgba(0,10,30,1)';
const GHOST = 'rgba(255,255,255,0.15)';
const ARENA = { x: 10, y: 2 };
const WEIGHT_LABELS = { landing: 'Land', lines: 'Line', rowTransitions: 'RowT', columnTransitions: 'ColT', holes: 'Hole', wells: 'Well' };

export function render(ctx, game, weights) {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!game.gameOver) drawPiece(ctx, game);
  drawMatrix(ctx, game.board, ARENA, game.paused);
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(ARENA.x, ARENA.y, game.board[0].length, game.board.length);
  drawPanels(ctx, game, weights);
}

function drawPiece(ctx, { piece: { matrix, pos }, board, paused }) {
  drawMatrix(ctx, matrix, { x: pos.x + ARENA.x, y: pos.y + ARENA.y }, paused);
  const ghostY = dropY(board, matrix, pos);
  drawMatrix(ctx, matrix, { x: pos.x + ARENA.x, y: ghostY + ARENA.y }, paused, GHOST);
}

function drawMatrix(ctx, matrix, offset, paused, color) {
  matrix.forEach((row, y) => row.forEach((value, x) => {
    if (value === 0) return;
    if (color) ctx.fillStyle = paused ? 'rgba(0,0,0,0)' : color;
    else ctx.fillStyle = paused ? 'rgba(255,255,255,0.2)' : (PALETTE[value - 1] || 'white');
    ctx.strokeStyle = BACKGROUND;
    ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
    ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
  }));
}

function drawBox(ctx, x, y) {
  ctx.lineWidth = 0.1;
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(x, y, 6, 6);
}

function drawPanels(ctx, game, weights) {
  ctx.fillStyle = '#FFF';
  ctx.font = '1px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Evolutionary', 1.5, 3);
  ctx.fillText('Tetris', 3, 4);
  if (game.mode === 'ai') {
    Object.entries(weights).forEach(([name, w], i) => ctx.fillText(`${WEIGHT_LABELS[name]}: ${w.toFixed(2)}`, 1, 8 + i));
  }

  ctx.fillText(`← / → = Move   A = ${game.mode === 'ai' ? 'AI' : 'Human'}`, 6, 25);
  ctx.fillText('↑ = Rotate    SHIFT = Switch', 6, 26);
  ctx.fillText('↓ = Soft Drop SPACE = Hard Drop', 6, 27);
  ctx.fillText('P = Pause     R = Reset', 6, 28);

  ctx.fillText('Highscore', 21, 3);
  ctx.fillText(game.highscore, 21, 4);
  ctx.fillText('Player Score', 21, 6);
  ctx.fillText(game.score, 21, 7);
  ctx.fillText('Level', 21, 9);
  ctx.fillText(game.level, 21, 10);
  ctx.fillText('Lines Cleared', 21, 12);
  ctx.fillText(game.lines, 21, 13);

  ctx.fillText('Held Piece', 3, 15);
  drawBox(ctx, 3, 16);
  drawMatrix(ctx, game.held, { x: 4, y: 17 }, game.paused);
  ctx.fillStyle = '#FFF';
  ctx.fillText('Next Piece', 21, 15);
  drawBox(ctx, 21, 16);
  drawMatrix(ctx, game.next, { x: 22, y: 17 }, game.paused);

  if (game.gameOver || game.paused) {
    const x = 5 + ARENA.x;
    const y = 8 + ARENA.y;
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    if (game.gameOver) {
      ctx.fillText('Game Over', x, y);
      ctx.fillText('Press R', x, y + 1);
    } else {
      ctx.fillText('Game Paused', x, y);
    }
  }
}
