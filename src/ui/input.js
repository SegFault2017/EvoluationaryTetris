// Keys that only work while playing. Each one suppresses the browser default.
const PLAY_KEYS = {
  ArrowLeft: (game) => game.shift(-1),
  ArrowRight: (game) => game.shift(1),
  ArrowUp: (game) => game.rotate(1),
  ArrowDown: (game) => game.softDrop(),
  ' ': (game) => game.hardDrop(),
  Shift: (game) => game.hold(),
  a: (game) => game.setMode(game.mode === 'ai' ? 'human' : 'ai'),
};

export function bindKeys(game, target = document) {
  target.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === 'p') return game.togglePause();
    if (key === 'r') return game.reset();
    const action = PLAY_KEYS[key];
    if (!action || game.paused || game.gameOver) return;
    e.preventDefault();
    action(game);
  });
}
