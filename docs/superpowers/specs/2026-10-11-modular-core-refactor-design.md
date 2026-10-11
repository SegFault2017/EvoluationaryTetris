# Modular Core Refactor — Design

Date: 2026-10-11
Branch: `refactor/modular-core`

## Goal

Turn the repo into a clean portfolio piece: readable, modular, tested code.
Gameplay stays the same, except for the deviations listed below.

## Constraints

- No build step. Native ES modules. GitHub Pages deploy from `main` root keeps working unchanged.
- No runtime or dev dependencies. Tests run with `node --test` (Node 18+; dev machine has v26).
- No new features. No real GA trainer.
- Keep `style.css`, `demo/demo.gif`, `equation.png`, `geneticAlgo.png` at their current paths (README links depend on them).
- `graphify-out/` stays untracked and out of every commit. `.gitignore` is not edited.

## Layout

```
index.html            <script type="module" src="./src/main.js">
package.json          { "type": "module", "scripts": { "test": "node --test" } }
src/
  core/               no DOM, no canvas, runs in Node
    pieces.js         7 piece shapes, randomPiece(rng), rotate(matrix, dir)
    board.js          createBoard(w, h), collides, merge, clearLines,
                      aggregateHeight, holes, completeLines, bumpiness
    game.js           Game class: state + actions
    ai.js             scoreBoard(board, weights), bestMove(board, piece, weights)
  ui/
    render.js         render(ctx, game): board, ghost, panels, overlays
    input.js          bindKeys(game) using e.key
  main.js             canvas setup, rAF loop, WEIGHTS constant
  style.css           meyer-reset 2.0 copied in at the top (public domain), otherwise unchanged
test/
  pieces.test.js  board.test.js  game.test.js  ai.test.js
```

### Dependency rules

- `ui/` and `main.js` import from `core/`. `core/` never imports from `ui/` or touches the DOM.
- `core/game.js` imports `board.js`, `pieces.js`, `ai.js`.
- `core/ai.js` imports `board.js`, `pieces.js` only — never `game.js`.
- `board.js`, `pieces.js`, `ai.js` are pure: they return new arrays and never mutate inputs.
- `Game` is the only stateful module. Randomness is injected: `new Game({ weights, rng = Math.random })`.

## Module contracts

A board is `number[][]` (22 rows × 10 cols, `0` = empty, `1..7` = piece colour index).
A piece matrix is a square `number[][]`. A position is `{ x, y }` in board coordinates.

### `core/pieces.js`

- `PIECES`: `{ T, O, I, L, J, S, Z }` → matrices, identical to today's `createPiece`.
- `randomPiece(rng = Math.random)`: returns a fresh copy of a random piece. Same selection as today (`Math.floor(rng() * 7)` over `['T','O','I','L','J','S','Z']`).
- `rotate(matrix, dir)`: returns a new matrix. Same transform as today: transpose, then reverse each row if `dir > 0`. `dir < 0` applies the transpose only, matching current code.

### `core/board.js`

- `createBoard(w, h)`.
- `collides(board, matrix, pos)`: true if any filled cell is out of bounds (left, right, bottom) or overlaps a filled board cell. Same rule as today's `collisionCheck`, including that rows above the top are out of bounds.
- `merge(board, matrix, pos)`: new board with the piece written in.
- `clearLines(board)`: `{ board, cleared }`. Removes full rows and adds empty rows on top. Same scan as today's `lineCheck`.
- `aggregateHeight`, `holes`, `completeLines`, `bumpiness`: same definitions as today's `arena` methods.

### `core/ai.js`

- `scoreBoard(board, weights)`: `−height·AH + lines·L − holes·H − bumpiness·B`.
- `bestMove(board, matrix, pos, weights)`: returns `{ matrix, x }` or `null`. The search is the same as today's `AI._best`:
  1. For each rotation 0–3 of the original matrix (rotated with wall kicks, as `player.rotate` does).
  2. Push the piece left until the next step would collide.
  3. While the piece is inside the board width and does not collide: find where it would land, merge into a copy of the board, score it, and keep the best. Then step right.
  4. Best uses a strict `>`, starting from `null` (deviation D2).
- **The board is scored before full lines are cleared.** This is intentional: the published weights were tuned against this scoring. A comment in `ai.js` says so.
- Returns `null` when no placement is legal.

### `core/game.js` — `Game`

State: `board`, `piece` (`{ matrix, pos }`), `next`, `held`, `score`, `highscore`, `lines`, `level`, `paused`, `gameOver`, `mode` (`'human' | 'ai'`), `dropInterval`, `dropCount`.

Actions, all behaving as today unless a deviation says otherwise:
- `shift(dir)`: move by ±1. Undo on collision.
- `rotate(dir)`: rotate with today's wall-kick search (offsets +1, −2, +3, …). Give up once the offset exceeds the matrix width. On give-up, the matrix and `x` are restored and the rotation doesn't happen (deviation D8).
- `softDrop()`: `y++`. On collision: `y--`, then lock. Lock means merge, `clearLines`, scoring, then `spawn()`. Resets `dropCount`.
- `hardDrop()`: fall to the landing row, then `softDrop()`.
- `hold()`: swap `held` and the current matrix, with the same wall kick. If nothing fits, nothing changes (D8). No once-per-turn limit.
- `tick(dt)`: if `paused` or `gameOver`, do nothing. Otherwise `dropCount += dt`, and call `softDrop()` once `dropCount > max(dropInterval − level·60, 60)`.
- `spawn()`: `next` becomes current, then a new `next`. `pos = { x: floor(10/2) − floor(w/2), y: 0 }`. If it collides, set `gameOver = true` and return. In AI mode, apply `bestMove`. If that returns `null`, keep the spawned piece (deviation D3).
- `reset()`: empty board, new `next` and `held`, `score = lines = level = 0`, `dropCount = 0`, `gameOver = false`. `highscore` is kept.
- `setMode(mode)`: `'human'` gives `dropInterval = 1000`. `'ai'` gives `dropInterval = 1` and calls `reset()`. Toggling *to* human does not reset (as today).
- `togglePause()`.

Scoring on lock with `k` cleared lines: `score += 50 · (2^k − 1)`, i.e. 50/150/350/750. `highscore = max(highscore, score)`. `level = floor(lines / 10)`.

### `ui/input.js`

`bindKeys(game)` adds one `keydown` listener and reads `e.key`:
- Always: `p`/`P` toggles pause. `r`/`R` resets.
- Only when not paused (`preventDefault` here, as today): `ArrowLeft` shifts −1, `ArrowRight` shifts +1, `ArrowUp` rotates +1, `ArrowDown` soft-drops, `' '` hard-drops, `Shift` holds, `a`/`A` toggles mode.
- When `gameOver` is set, only `r`/`R` and `p`/`P` act.
- Unknown keys are ignored.

### `ui/render.js`

`render(ctx, game, weights)` gives the same visual result as today's `coverFrame` + `player.draw` (including the ghost piece) + `arena.draw` + `drawUI`, at the same coordinates (canvas scaled ×20, arena offset `{ x: 10, y: 2 }`), with the same palette and the same dimmed look while paused. Differences:
- AI panel weights are printed with `weights.<name>.toFixed(2)` from the same `WEIGHTS` object (deviation D4). "Gen: 50" stays a literal label.
- When `gameOver` is set, a centred "Game Over" / "Press R" overlay is drawn in the same style as "Game Paused" (deviation D1). The active piece and its ghost are **not** drawn. Only the final stack, the side panels and the overlay are shown.

### `main.js`

- Gets `#cnv` and its 2D context. Throws a clear `Error` if either is missing.
- `ctx.scale(20, 20)`.
- `WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 }`.
- Creates the `Game`, calls `bindKeys`, then runs the rAF loop: `game.tick(dt)`, then `render(ctx, game, WEIGHTS)`.

## Deviations from current behaviour

| ID | Change | Reason |
|---|---|---|
| D1 | Game over: `alert` followed by auto-reset is replaced by a "Game Over / Press R" canvas overlay that waits for R in **both** modes | No blocking dialog. Decided in review: the AI also waits for R. |
| D2 | AI best comparison changes from `!bestScore` to `bestScore === null` | A score of exactly 0 was treated as "no score yet" |
| D3 | When no placement is legal, the piece keeps its spawn rotation and position | Today it is left in whatever rotation the search tried last |
| D4 | The AI panel shows weights from `WEIGHTS` with `toFixed(2)`, so holes shows **0.36** instead of 0.35 | One source of truth |
| D5 | Removed: `debugger;`, per-move `console.log`s, `player.moveLeft`, `canMoveLeft`, `arena.pieceIdx`, commented-out code. `e.keyCode` → `e.key`. `preventDefault` only for keys the game handles (today it blocks every key, including browser shortcuts) | Clean-up |
| D6 | Unpausing no longer drops the piece one row instantly. `main.js` computes `dt` every frame, and `Game.tick` discards it while paused | Today `lastTime` freezes during pause, so the first `dt` after unpausing covers the whole pause |
| D7 | The cdnjs `meyer-reset` `<link>` (loaded with no SRI) is removed. The exact reset CSS is copied into the top of `src/style.css`, fetched once from cdnjs (the user is asked before the fetch) | No third-party request at runtime, so no CDN tampering or outage risk |
| D8 | When a rotation or hold can't fit anywhere in its wall-kick search, it is a no-op: matrix, held piece and `x` are unchanged | Today's give-up calls `rotate(-dir)` / `switchPiece()` again, which can recurse forever. This was confirmed: rotating a flat I resting on a full stack throws `RangeError: Maximum call stack size exceeded`. This also changes the AI near the top of the board. When a spawn-row rotation gives up, the old AI scored a mirrored piece (for example, an S treated as a Z-shape). Final review measured 27 of 16,210 choices differing on boards with columns up to 22 tall, and none on boards with the top 5 rows empty (the parity harness's range) |

Everything else is unchanged: hold has no limit per turn, ghost piece, drop timing, scoring, level curve and key mapping.

### Known quirks kept

These are left alone in this refactor because the user chose clean-up only, with no bug fixes, and AI parity depends on them:
- The AI scores boards before clearing full lines (the tuned weights depend on it).
- `equation.png` repeats the bumpiness term.

## Testing

Permanent tests (`node --test`, no dependencies):
- `pieces.test.js`:
  - The 7 shapes match the originals.
  - Rotating 4 times gives back the original.
  - `randomPiece` with a seeded rng is predictable and returns a copy.
- `board.test.js`:
  - `collides`: walls, floor, filled cells.
  - `merge` and `clearLines` do not mutate their inputs.
  - `clearLines` handles 1–4 lines, including rows that are not next to each other.
  - Each metric on a hand-built board with a known answer.
- `game.test.js`:
  - `shift` stops at the walls.
  - Hard drop locks the piece and spawns the next one.
  - Score goes up by 50/150/350/750 for 1–4 lines, and the level advances.
  - Blocked spawning sets `gameOver`, and `tick` does nothing while it is set.
  - `reset` clears `gameOver` and keeps `highscore`.
  - `hold` swaps the pieces.
  - `setMode('ai')` resets the game and sets the interval.
- `ai.test.js`:
  - An `I` piece fills an obvious one-column well.
  - The board passed in is never mutated.
  - The returned move is always a legal placement.
  - `null` is returned when nothing fits.

Temporary parity harness (deleted in step 6):
- Load the original `src/ai.js` and `src/script.js` in `node:vm`, with stubs for `document`, the canvas context, `requestAnimationFrame` and `alert`.
- For several hundred seeded random boards and pieces, check that `AI._best` and `bestMove` choose the same rotation matrix and `x`.
- Skip cases where the old best score was exactly 0 (D2).

Browser check after step 5:
- Serve with a static server.
- Play in human mode.
- Toggle AI mode and watch it play.
- Check pause, hold, reset and the game-over overlay.

## Error handling

- `core/` trusts its inputs: all callers are internal.
- `main.js` throws if the canvas or context is missing.
- No `try/catch`.

## README updates

- State that the weights were tuned offline and are hardcoded in `src/main.js`. The training code is not in this repo.
- Holes weight shown as 0.36.
- Add a "Run locally" section: any static server, since modules don't load over `file://`.
- Add a "Test" section: `npm test`.
- Add a short code-layout map.
- Fix typos: "Evlolutionary", "herustic", "Hiehgts", "genetric", "roughess", "colum's".
- Note that `equation.png` repeats the bumpiness term. The code uses four distinct terms. The image itself is not changed.

## Order of work

One commit per step, with no Claude co-author line.

1. Parity harness against the old code, confirmed running.
2. `core/pieces.js`, `core/board.js`, `package.json`, with tests.
3. `core/ai.js`, with tests. Parity harness passes.
4. `core/game.js`, with tests.
5. `ui/render.js`, `ui/input.js`, `main.js`, `index.html` switch. Browser check.
6. Delete old `src/ai.js`, `src/script.js` and the parity harness.
7. README.

Then push `refactor/modular-core` and open a PR, after asking the user.
