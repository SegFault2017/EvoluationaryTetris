# Modular Core Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two global-state scripts (`src/ai.js`, `src/script.js`) with a tested, DOM-free `core/` and a thin `ui/` layer. Gameplay stays the same except for the spec's deviations D1–D8.

**Architecture:** `src/core/` holds pure functions (`pieces.js`, `board.js`, `ai.js`) plus one stateful `Game` class (`game.js`), and none of it touches the DOM. `src/ui/` draws to the canvas (`render.js`) and maps keys (`input.js`). `src/main.js` wires the pieces together and runs the `requestAnimationFrame` loop. A temporary `node:vm` harness proves the new AI picks the same moves as the old one, and is deleted once the old code goes.

**Tech Stack:** Vanilla JS with native ES modules, Canvas 2D and `node --test`. No dependencies and no build step.

**Spec:** `docs/superpowers/specs/2026-10-11-modular-core-refactor-design.md`

## Global Constraints

- No build step. Native ES modules. The GitHub Pages deploy from the root of `main` must keep working unchanged.
- No runtime or dev dependencies. Tests run with `node --test` (Node 18+; this machine has v26).
- No new features. No GA trainer.
- `style.css`, `demo/demo.gif`, `equation.png` and `geneticAlgo.png` keep their current paths.
- `graphify-out/` stays untracked and out of every commit. Never `git add -A` or `git add .`; add files by name. Do not edit `.gitignore`.
- One commit per task. Commit messages must **not** include a `Co-Authored-By` line.
- Any command that touches the network (the reset CSS fetch, starting a local server, `git push`, `gh pr create`) needs the user's explicit OK **before** it runs.
- `WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 }`, exactly.
- The board is 10 wide × 22 tall. The canvas is scaled ×20. The arena is drawn at offset `{ x: 10, y: 2 }`.
- The AI scores boards **before** clearing full lines. This is intentional; do not "fix" it.

## Review Focus

These are the inputs most likely to hurt a player that the spec's test list doesn't pin. Each one has a test in the task that owns the code.

1. **Rotating or holding when the piece is wedged:** an I piece lying flat on a stack, or holding an I next to the right wall. Expected: nothing happens and nothing throws. The old code overflowed the stack here (D8). Tests are in Task 2 (`rotateWithKick`) and Task 4 (`Game.rotate`, `Game.hold`).
2. **Unpausing after a long pause:** expected, the piece does not jump a row (D6). Test in Task 4.
3. **Keys pressed during game over or pause:** expected, only R and P do anything, and arrows, space and A are ignored. Test in Task 5 (`input.test.js`).
4. **Very high levels:** expected, the drop interval bottoms out at 60 ms and never reaches 0 or goes negative. Test in Task 4.
5. **Browser shortcuts while playing** (Tab, Cmd+R, F5): expected, they keep working. Only the game's own keys get `preventDefault` (D5). Test in Task 5.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `package.json` | create | `"type": "module"` and the `test` script |
| `src/core/pieces.js` | create | piece shapes, `randomPiece`, `rotate` |
| `src/core/board.js` | create | board creation, collision, merge, drop, wall kick, line clear, metrics |
| `src/core/ai.js` | create | `scoreBoard`, `bestMove` |
| `src/core/game.js` | create | `Game` class: all game state and actions |
| `src/ui/render.js` | create | `render(ctx, game, weights)` |
| `src/ui/input.js` | create | `bindKeys(game, target)` |
| `src/main.js` | create | canvas setup, `WEIGHTS`, game loop |
| `src/style.css` | modify | meyer-reset copied in at the top |
| `index.html` | modify | one module script; CDN link removed |
| `test/helpers.js` | create | `boardFrom`, `snapshot`, `seededRng`, `randomBoard` |
| `test/pieces.test.js`, `board.test.js`, `ai.test.js`, `game.test.js`, `render.test.js`, `input.test.js` | create | permanent tests |
| `test/parity.test.js` | create, then delete in Task 6 | old vs new AI comparison |
| `src/ai.js`, `src/script.js` | delete in Task 6 | the original code |
| `README.markdown` | rewrite in Task 7 | honest docs |

`board.js` also exports `dropY`, `kick` and `rotateWithKick`. The spec implies them: `Game` and `ai.js` both need landing and wall-kick logic, and `ai.js` must not import `game.js`.

`package.json` runs `node --test test/*.test.js` instead of bare `node --test`. Bare `node --test` would also pick up `test/helpers.js` as a test file.

---

### Task 1: package.json and a parity harness that loads the original code

**Files:**
- Create: `package.json`
- Create: `test/parity.test.js`

**Interfaces:**
- Consumes: the original `src/ai.js` and `src/script.js` (unchanged).
- Produces: `loadOld()` and `oldBest(old, board, matrix)` inside `test/parity.test.js`. Task 3 adds a comparison test to this same file.

- [ ] **Step 1: Create `package.json`**

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.js"
  }
}
```

- [ ] **Step 2: Write the harness and a sanity test against the old code**

Create `test/parity.test.js`:

```js
// Temporary: proves the new AI matches the original. Deleted in Task 6 with the old code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Runs the original browser scripts in a sandbox with a fake DOM and canvas.
function loadOld() {
  const noop = () => {};
  const ctx2d = new Proxy({}, { get: () => noop, set: () => true });
  const canvas = { width: 600, height: 600, getContext: () => ctx2d };
  const sandbox = {
    document: { getElementById: () => canvas, addEventListener: noop },
    requestAnimationFrame: noop,
    alert: noop,
    console: { log: noop },
  };
  vm.createContext(sandbox);
  for (const file of ['../src/ai.js', '../src/script.js']) {
    const url = new URL(file, import.meta.url);
    vm.runInContext(readFileSync(url, 'utf8'), sandbox, { filename: url.pathname });
  }
  return sandbox;
}

// The original AI's choice for `matrix` spawned on `board`, as plain JSON ({ matrix, x } or null).
// JSON round-trips because arrays from the vm realm fail deepStrictEqual's prototype check.
function oldBest(old, board, matrix) {
  old.arena.matrix = JSON.parse(JSON.stringify(board));
  old.player.matrix = JSON.parse(JSON.stringify(matrix));
  old.player.pos = { x: Math.floor(10 / 2) - Math.floor(matrix[0].length / 2), y: 0 };
  const elite = old.ai._best(old.player);
  return elite && JSON.parse(JSON.stringify({ matrix: elite.matrix, x: elite.pos.x }));
}

test('original code loads and its AI puts an O in the left corner of an empty board', () => {
  const old = loadOld();
  const empty = Array.from({ length: 22 }, () => new Array(10).fill(0));
  const o = [[1, 1], [1, 1]];
  assert.deepEqual(oldBest(old, empty, o), { matrix: o, x: 0 });
  assert.equal(JSON.stringify(old.arena.matrix), JSON.stringify(empty)); // the old AI un-merges after itself
});
```

- [ ] **Step 3: Run it**

Run: `npm test`
Expected: PASS, 1 test. (On an empty board an O at `x=0` has bumpiness 2, the same as `x=8`. Ties keep the first one found, which is `x=0`.)

If it fails with a `ReferenceError` from inside `script.js`, a browser global is missing from `sandbox`. Add a `noop` stub for it. Do not edit the old files.

- [ ] **Step 4: Commit**

```bash
git add package.json test/parity.test.js
git commit -m "test: add vm harness that runs the original AI"
```

---

### Task 2: `core/pieces.js` and `core/board.js`

**Files:**
- Create: `src/core/pieces.js`, `src/core/board.js`
- Create: `test/helpers.js`, `test/pieces.test.js`, `test/board.test.js`

**Interfaces:**
- Produces, in `pieces.js`:
  - `PIECES: { T, O, I, L, J, S, Z }`, each a `number[][]`
  - `randomPiece(rng = Math.random): number[][]`, a fresh copy
  - `rotate(matrix, dir): number[][]`, a new matrix
- Produces, in `board.js`:
  - `createBoard(w, h)`
  - `collides(board, matrix, pos): boolean`
  - `merge(board, matrix, pos): board`
  - `dropY(board, matrix, pos): number`
  - `kick(board, matrix, pos): number | null`
  - `rotateWithKick(board, matrix, pos, dir): { matrix, x }`
  - `clearLines(board): { board, cleared }`
  - `aggregateHeight(board)`, `holes(board)`, `completeLines(board)`, `bumpiness(board)`: each returns a `number`
- Produces, in `test/helpers.js`:
  - `boardFrom(...rows)`
  - `snapshot(value)`
  - `seededRng(seed)`
  - `randomBoard(rng)`

`pos` is always `{ x, y }`. A board is `number[][]` with 22 rows of 10.

- [ ] **Step 1: Write the test helpers**

Create `test/helpers.js`:

```js
// Builds a 10x22 board. `rows` are the bottom rows, top to bottom: '#' = filled (1), '.' = empty.
export function boardFrom(...rows) {
  const empty = Array.from({ length: 22 - rows.length }, () => new Array(10).fill(0));
  return [...empty, ...rows.map(row => [...row].map(c => (c === '#' ? 1 : 0)))];
}

export const snapshot = (value) => JSON.stringify(value);

// Deterministic PRNG (mulberry32) so random-board tests are reproducible.
export function seededRng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random 10x22 board with ragged columns and holes. Columns are at most 17 tall,
// so the top 5 rows stay empty and every piece fits at its spawn position.
export function randomBoard(rng) {
  const board = Array.from({ length: 22 }, () => new Array(10).fill(0));
  for (let c = 0; c < 10; c++) {
    const height = Math.floor(rng() * 18);
    for (let r = 22 - height; r < 22; r++) {
      if (r === 22 - height || rng() < 0.8) board[r][c] = 1 + Math.floor(rng() * 7);
    }
  }
  return board;
}
```

- [ ] **Step 2: Write the failing pieces tests**

Create `test/pieces.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, randomPiece, rotate } from '../src/core/pieces.js';

test('PIECES match the original shapes', () => {
  assert.deepEqual(PIECES, {
    O: [[1, 1], [1, 1]],
    T: [[0, 2, 0], [2, 2, 2], [0, 0, 0]],
    L: [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    J: [[4, 0, 0], [4, 4, 4], [0, 0, 0]],
    I: [[0, 0, 0, 0], [5, 5, 5, 5], [0, 0, 0, 0], [0, 0, 0, 0]],
    S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
    Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
  });
});

test('rotate(+1) turns clockwise, and four turns give back the original', () => {
  assert.deepEqual(rotate(PIECES.T, 1), [[0, 2, 0], [0, 2, 2], [0, 2, 0]]);
  for (const m of Object.values(PIECES)) {
    assert.deepEqual(rotate(rotate(rotate(rotate(m, 1), 1), 1), 1), m);
  }
});

test('rotate(-1) only transposes, like the original', () => {
  assert.deepEqual(rotate(PIECES.L, -1), [[0, 3, 0], [0, 3, 0], [3, 3, 0]]);
});

test('rotate does not mutate its input', () => {
  const t = PIECES.T.map(row => [...row]);
  rotate(t, 1);
  assert.deepEqual(t, PIECES.T);
});

test('randomPiece uses the injected rng and returns a copy', () => {
  assert.deepEqual(randomPiece(() => 0), PIECES.T);
  assert.deepEqual(randomPiece(() => 0.99), PIECES.Z);
  const piece = randomPiece(() => 0);
  piece[0][0] = 9;
  assert.equal(PIECES.T[0][0], 0);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../src/core/pieces.js'`.

- [ ] **Step 4: Implement `src/core/pieces.js`**

```js
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

// Transpose, then mirror for a clockwise turn. dir < 0 only transposes, as the original did.
export function rotate(matrix, dir) {
  const transposed = matrix.map((row, y) => row.map((_, x) => matrix[x][y]));
  return dir > 0 ? transposed.map(row => row.reverse()) : transposed;
}
```

- [ ] **Step 5: Run the tests to verify the pieces tests pass**

Run: `npm test`
Expected: all `pieces.test.js` tests PASS, and the parity test still PASSES.

- [ ] **Step 6: Write the failing board tests**

Create `test/board.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, rotate } from '../src/core/pieces.js';
import {
  createBoard, collides, merge, dropY, kick, rotateWithKick, clearLines,
  aggregateHeight, holes, completeLines, bumpiness,
} from '../src/core/board.js';
import { boardFrom, snapshot } from './helpers.js';

const { O, I } = PIECES;
const FULL = '##########';

test('createBoard makes independent empty rows', () => {
  const b = createBoard(10, 22);
  assert.equal(b.length, 22);
  assert.ok(b.every(row => row.length === 10 && row.every(v => v === 0)));
  b[0][0] = 1;
  assert.equal(b[1][0], 0);
});

test('collides with walls, floor, the area above the top, and filled cells', () => {
  const empty = createBoard(10, 22);
  assert.equal(collides(empty, O, { x: 0, y: 0 }), false);
  assert.equal(collides(empty, O, { x: -1, y: 0 }), true);  // left wall
  assert.equal(collides(empty, O, { x: 9, y: 0 }), true);   // right wall
  assert.equal(collides(empty, O, { x: 0, y: 20 }), false);
  assert.equal(collides(empty, O, { x: 0, y: 21 }), true);  // floor
  assert.equal(collides(empty, O, { x: 0, y: -1 }), true);  // above the top
  assert.equal(collides(empty, I, { x: 0, y: -1 }), false); // only I's empty top row is above the board
  assert.equal(collides(boardFrom('#.........'), O, { x: 0, y: 20 }), true);
});

test('merge writes the piece into a new board', () => {
  const empty = createBoard(10, 22);
  const out = merge(empty, O, { x: 3, y: 20 });
  assert.equal(out[20][3], 1);
  assert.equal(out[21][4], 1);
  assert.equal(out[19][3], 0);
  assert.equal(snapshot(empty), snapshot(createBoard(10, 22)));
});

test('dropY finds the lowest row the piece fits in', () => {
  const empty = createBoard(10, 22);
  assert.equal(dropY(empty, O, { x: 0, y: 0 }), 20);
  assert.equal(dropY(empty, I, { x: 0, y: 0 }), 20);
  assert.equal(dropY(boardFrom('#.........'), O, { x: 0, y: 0 }), 19);
});

test('kick searches x+1, x-1, x+2, … and returns null once the offset passes the width', () => {
  const empty = createBoard(10, 22);
  const vertical = rotate(I, 1); // filled column at index 2
  assert.equal(kick(empty, O, { x: 4, y: 0 }), 4);
  assert.equal(kick(empty, vertical, { x: 8, y: 0 }), 7);
  assert.equal(kick(empty, O, { x: 9, y: 0 }), null); // tries 9 and 10, then offset 3 > width 2
});

test('rotateWithKick rotates, kicks off walls, and does nothing when wedged', () => {
  const empty = createBoard(10, 22);
  const vertical = rotate(I, 1);
  assert.deepEqual(rotateWithKick(empty, I, { x: 3, y: 0 }, 1), { matrix: vertical, x: 3 });
  assert.deepEqual(rotateWithKick(empty, vertical, { x: -2, y: 0 }, 1), { matrix: rotate(vertical, 1), x: 0 });
  // Review Focus 1: a flat I resting on a full stack cannot stand up. The old code overflowed the stack here.
  const stack = boardFrom(...Array(10).fill(FULL)); // rows 12-21 full
  assert.deepEqual(rotateWithKick(stack, I, { x: 3, y: 10 }, 1), { matrix: I, x: 3 });
});

test('clearLines removes full rows, including non-adjacent ones, without mutating', () => {
  const b = boardFrom('#.........', FULL, '.#........', FULL);
  const before = snapshot(b);
  const { board, cleared } = clearLines(b);
  assert.equal(cleared, 2);
  assert.equal(board.length, 22);
  assert.deepEqual(board.slice(18), boardFrom('#.........', '.#........').slice(18));
  assert.equal(snapshot(b), before);
  assert.equal(clearLines(boardFrom(FULL)).cleared, 1);
  assert.equal(clearLines(boardFrom(FULL, FULL, FULL, FULL)).cleared, 4);
  assert.equal(clearLines(boardFrom('#########.')).cleared, 0);
});

test('metrics match a hand-checked board', () => {
  // column heights 3,1,2,0…; one hole at column 0
  const b = boardFrom('#.........', '..#.......', '###.......');
  assert.equal(aggregateHeight(b), 6);
  assert.equal(holes(b), 1);
  assert.equal(bumpiness(b), 5);
  assert.equal(completeLines(b), 0);
  assert.equal(completeLines(boardFrom(FULL, '#.........')), 1);
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../src/core/board.js'`.

- [ ] **Step 8: Implement `src/core/board.js`**

```js
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
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test`
Expected: all tests PASS (pieces, board, parity).

- [ ] **Step 10: Commit**

```bash
git add src/core/pieces.js src/core/board.js test/helpers.js test/pieces.test.js test/board.test.js
git commit -m "feat: add pure pieces and board modules"
```

---

### Task 3: `core/ai.js` with a parity check against the original

**Files:**
- Create: `src/core/ai.js`, `test/ai.test.js`
- Modify: `test/parity.test.js` (add imports and one test)

**Interfaces:**
- Consumes, from `board.js`: `collides`, `merge`, `dropY`, `rotateWithKick`, `aggregateHeight`, `holes`, `completeLines`, `bumpiness`.
- Produces:
  - `scoreBoard(board, weights): number`
  - `bestMove(board, matrix, pos, weights): { matrix, x } | null`
- `weights` has the shape `{ height, lines, holes, bumpiness }`.

- [ ] **Step 1: Write the failing AI tests**

Create `test/ai.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES } from '../src/core/pieces.js';
import { collides, merge, dropY, completeLines } from '../src/core/board.js';
import { bestMove, scoreBoard } from '../src/core/ai.js';
import { boardFrom, snapshot, seededRng, randomBoard } from './helpers.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };
const spawn = (m) => ({ x: Math.floor(10 / 2) - Math.floor(m[0].length / 2), y: 0 });

test('scoreBoard = -height*AH + lines*L - holes*H - bumpiness*B', () => {
  const b = boardFrom('#.........', '..#.......', '###.......'); // AH 6, L 0, H 1, B 5
  const expected = -WEIGHTS.height * 6 + WEIGHTS.lines * 0 - WEIGHTS.holes * 1 - WEIGHTS.bumpiness * 5;
  assert.equal(scoreBoard(b, WEIGHTS), expected);
});

test('bestMove drops an I into a one-column well for a 4-line clear', () => {
  const row = '#########.';
  const b = boardFrom(row, row, row, row);
  const move = bestMove(b, PIECES.I, spawn(PIECES.I), WEIGHTS);
  const landed = merge(b, move.matrix, { x: move.x, y: dropY(b, move.matrix, { x: move.x, y: 0 }) });
  assert.equal(completeLines(landed), 4);
});

test('bestMove never mutates its inputs and always returns a legal placement', () => {
  const rng = seededRng(1);
  const pieces = snapshot(PIECES);
  for (let i = 0; i < 50; i++) {
    const b = randomBoard(rng);
    const before = snapshot(b);
    for (const piece of Object.values(PIECES)) {
      const move = bestMove(b, piece, spawn(piece), WEIGHTS);
      assert.ok(move, `case ${i}`);
      assert.equal(collides(b, move.matrix, { x: move.x, y: 0 }), false, `case ${i}`);
    }
    assert.equal(snapshot(b), before);
  }
  assert.equal(snapshot(PIECES), pieces);
});

test('bestMove returns null when the piece does not fit where it spawns', () => {
  const full = boardFrom(...Array(22).fill('##########'));
  assert.equal(bestMove(full, PIECES.T, spawn(PIECES.T), WEIGHTS), null);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../src/core/ai.js'`.

- [ ] **Step 3: Implement `src/core/ai.js`**

```js
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
// Returns { matrix, x }, or null if the piece doesn't fit where it is.
export function bestMove(board, matrix, pos, weights) {
  if (collides(board, matrix, pos)) return null;
  let best = null;
  let bestScore = null;
  for (let rotation = 0; rotation < 4; rotation++) {
    let m = matrix;
    let x = pos.x;
    for (let r = 0; r < rotation; r++) {
      ({ matrix: m, x } = rotateWithKick(board, m, { x, y: pos.y }, 1));
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all `ai.test.js` tests PASS.

- [ ] **Step 5: Add the parity comparison**

In `test/parity.test.js`, add these imports below the existing ones:

```js
import { bestMove } from '../src/core/ai.js';
import { PIECES } from '../src/core/pieces.js';
import { seededRng, randomBoard } from './helpers.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };
```

Then append this test at the end of the file:

```js
// 300 random boards x 7 pieces. Every candidate's aggregate height is > 0, so no score is
// exactly 0 and the !bestScore → === null change (D2) cannot cause a difference here.
test('new bestMove picks the same rotation and column as the original AI', () => {
  const old = loadOld();
  const rng = seededRng(2026);
  for (let i = 0; i < 300; i++) {
    const board = randomBoard(rng);
    for (const [name, piece] of Object.entries(PIECES)) {
      const pos = { x: Math.floor(10 / 2) - Math.floor(piece[0].length / 2), y: 0 };
      const expected = oldBest(old, board, piece);
      const actual = bestMove(board, piece, pos, WEIGHTS);
      assert.equal(JSON.stringify(actual), JSON.stringify(expected), `board ${i}, piece ${name}`);
    }
  }
});
```

- [ ] **Step 6: Run the parity test**

Run: `node --test test/parity.test.js`
Expected: PASS, 2 tests.

If it fails, the message names the board index and the piece. Do **not** change the test to make it pass. Find where `bestMove` differs from `AI._best` in `src/ai.js` (rotation order, the push-left loop, the `x < width` bound, or the score expression order) and fix `bestMove`.

- [ ] **Step 7: Run the full suite and commit**

Run: `npm test`
Expected: all PASS.

```bash
git add src/core/ai.js test/ai.test.js test/parity.test.js
git commit -m "feat: add pure AI move search, verified against the original"
```

---

### Task 4: `core/game.js`

**Files:**
- Create: `src/core/game.js`, `test/game.test.js`

**Interfaces:**
- Consumes:
  - from `board.js`: `createBoard`, `collides`, `merge`, `dropY`, `kick`, `rotateWithKick`, `clearLines`
  - from `pieces.js`: `randomPiece`
  - from `ai.js`: `bestMove`
- Produces: `class Game`, constructed with `new Game({ weights, rng = Math.random })`.
  - **State:**
    - `board`
    - `piece: { matrix, pos: { x, y } }`
    - `next`, `held`
    - `score`, `highscore`, `lines`, `level`
    - `paused`, `gameOver`
    - `mode: 'human' | 'ai'`
    - `dropInterval`, `dropCount`
  - **Methods:** `shift(dir)`, `rotate(dir)`, `hold()`, `softDrop()`, `hardDrop()`, `tick(dtMs)`, `spawn()`, `reset()`, `setMode(mode)`, `togglePause()`.

- [ ] **Step 1: Write the failing game tests**

Create `test/game.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../src/core/game.js'`.

- [ ] **Step 3: Implement `src/core/game.js`**

```js
import { createBoard, collides, merge, dropY, kick, rotateWithKick, clearLines } from './board.js';
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
    this.piece = { matrix, pos: { x: Math.floor(WIDTH / 2) - Math.floor(matrix[0].length / 2), y: 0 } };
    if (collides(this.board, matrix, this.piece.pos)) {
      this.gameOver = true;
      return;
    }
    if (this.mode === 'ai') {
      const move = bestMove(this.board, matrix, this.piece.pos, this.weights);
      if (move) this.piece = { matrix: move.matrix, pos: { x: move.x, y: 0 } };
    }
  }

  shift(dir) {
    this.piece.pos.x += dir;
    if (collides(this.board, this.piece.matrix, this.piece.pos)) this.piece.pos.x -= dir;
  }

  rotate(dir) {
    const { matrix, x } = rotateWithKick(this.board, this.piece.matrix, this.piece.pos, dir);
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/game.js test/game.test.js
git commit -m "feat: add Game class with all game rules"
```

---

### Task 5: the UI layer, `main.js`, the copied reset CSS and the `index.html` switch

**Files:**
- Create: `src/ui/render.js`, `src/ui/input.js`, `src/main.js`, `test/render.test.js`, `test/input.test.js`
- Modify: `index.html` (whole file), `src/style.css` (prepend the reset)

**Interfaces:**
- Consumes: `Game` (Task 4), `dropY` (Task 2).
- Produces:
  - `render(ctx, game, weights): void`
  - `bindKeys(game, target = document): void`

- [ ] **Step 1: Write the failing render and input tests**

Create `test/render.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { render } from '../src/ui/render.js';

const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };

// Records what render draws: text, and how many cells were filled.
function recordingCtx() {
  const ctx = { canvas: { width: 600, height: 600 }, texts: [], fills: 0 };
  ctx.fillText = (s) => ctx.texts.push(String(s));
  ctx.fillRect = () => { ctx.fills++; };
  ctx.strokeRect = () => {};
  return ctx;
}

test('AI panel prints the weights from the one WEIGHTS object (D4)', () => {
  const g = new Game({ weights: WEIGHTS, rng: () => 0 });
  g.setMode('ai');
  const ctx = recordingCtx();
  render(ctx, g, WEIGHTS);
  for (const s of ['Gen: 50', 'Height-W: 0.51', 'Line-W: 0.76', 'Hole-W: 0.36', 'Bump-W: 0.18', '← / → = Move   A = AI']) {
    assert.ok(ctx.texts.includes(s), `missing "${s}"`);
  }
});

test('game over shows the overlay and hides the active piece and its ghost (D1)', () => {
  const g = new Game({ weights: WEIGHTS, rng: () => 0 });
  const playing = recordingCtx();
  render(playing, g, WEIGHTS);
  g.gameOver = true;
  const over = recordingCtx();
  render(over, g, WEIGHTS);
  assert.ok(over.texts.includes('Game Over') && over.texts.includes('Press R'));
  assert.equal(playing.fills - over.fills, 8); // the 4-cell T and its 4-cell ghost
});
```

Create `test/input.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bindKeys } from '../src/ui/input.js';

// A fake Game that records which actions were called.
function fakeGame(state = {}) {
  const g = { paused: false, gameOver: false, mode: 'human', calls: [], ...state };
  for (const name of ['shift', 'rotate', 'softDrop', 'hardDrop', 'hold', 'reset', 'togglePause', 'setMode']) {
    g[name] = (...args) => g.calls.push([name, ...args]);
  }
  return g;
}

function bind(game) {
  let handler;
  bindKeys(game, { addEventListener: (type, fn) => { assert.equal(type, 'keydown'); handler = fn; } });
  return (key) => {
    const e = { key, prevented: false, preventDefault() { this.prevented = true; } };
    handler(e);
    return e;
  };
}

test('game keys map to actions and suppress the browser default', () => {
  const g = fakeGame();
  const press = bind(g);
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Shift', 'A']) {
    assert.equal(press(key).prevented, true, key);
  }
  press('p');
  press('R');
  assert.deepEqual(g.calls, [
    ['shift', -1], ['shift', 1], ['rotate', 1], ['softDrop'], ['hardDrop'], ['hold'],
    ['setMode', 'ai'], ['togglePause'], ['reset'],
  ]);
});

test("'a' switches back to human from AI mode", () => {
  const g = fakeGame({ mode: 'ai' });
  bind(g)('a');
  assert.deepEqual(g.calls, [['setMode', 'human']]);
});

test('while paused or after game over only P and R act', () => {
  for (const state of [{ paused: true }, { gameOver: true }]) {
    const g = fakeGame(state);
    const press = bind(g); // Review Focus 3
    assert.equal(press('ArrowLeft').prevented, false);
    press(' ');
    press('a');
    press('p');
    press('r');
    assert.deepEqual(g.calls, [['togglePause'], ['reset']], JSON.stringify(state));
  }
});

test('other keys are left alone so browser shortcuts keep working', () => {
  const g = fakeGame();
  const press = bind(g); // Review Focus 5
  for (const key of ['Tab', 'F5', 'Meta', 'x']) assert.equal(press(key).prevented, false, key);
  assert.deepEqual(g.calls, []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL, `Cannot find module '.../src/ui/render.js'` and `'.../src/ui/input.js'`.

- [ ] **Step 3: Implement `src/ui/input.js`**

```js
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
```

- [ ] **Step 4: Implement `src/ui/render.js`**

This is a straight port of `coverFrame`, `player.draw`, `arena.draw`, `drawMatrix` and `drawUI` from `src/script.js`. It keeps the same coordinates, colours and draw order. The only changes are D1 (the game-over overlay, with the piece and ghost hidden) and D4 (weights printed with `toFixed(2)`).

```js
import { dropY } from '../core/board.js';

const PALETTE = ['#ffeb3b', '#9c27b0', '#ff9800', '#3f51b5', '#03a9f4', '#4caf50', '#f44336'];
const BACKGROUND = 'rgba(0,10,30,1)';
const GHOST = 'rgba(255,255,255,0.15)';
const ARENA = { x: 10, y: 2 };

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
    ctx.fillText('Gen: 50', 1, 8);
    ctx.fillText(`Height-W: ${weights.height.toFixed(2)}`, 1, 9);
    ctx.fillText(`Line-W: ${weights.lines.toFixed(2)}`, 1, 10);
    ctx.fillText(`Hole-W: ${weights.holes.toFixed(2)}`, 1, 11);
    ctx.fillText(`Bump-W: ${weights.bumpiness.toFixed(2)}`, 1, 12);
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: all PASS, including `render.test.js` and `input.test.js`.

- [ ] **Step 6: Create `src/main.js`**

```js
import { Game } from './core/game.js';
import { render } from './ui/render.js';
import { bindKeys } from './ui/input.js';

// Tuned offline by a genetic algorithm (50 generations). The training code is not in this repo.
const WEIGHTS = { height: 0.510066, lines: 0.760666, holes: 0.35663, bumpiness: 0.184483 };

const canvas = document.getElementById('cnv');
const ctx = canvas?.getContext('2d');
if (!ctx) throw new Error('Evolutionary Tetris needs a <canvas id="cnv"> with 2D support');
ctx.scale(20, 20);

const game = new Game({ weights: WEIGHTS });
bindKeys(game);

let last = performance.now();
function frame(time) {
  game.tick(time - last);
  last = time;
  render(ctx, game, WEIGHTS);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [ ] **Step 7: Copy the reset CSS into `src/style.css` (needs network: ask the user first)**

**Stop and ask the user** for permission to run this one fetch. It reads a public CSS file from cdnjs and sends nothing:

```bash
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/meyer-reset/2.0/reset.min.css -o /tmp/reset.min.css
```

Once it has run, look at `/tmp/reset.min.css`. It must be plain CSS that starts with the meyerweb licence comment or `html,body,div,span`. If it isn't, stop and tell the user. Then prepend it to the stylesheet:

```bash
{ cat /tmp/reset.min.css; echo; cat src/style.css; } > /tmp/style.css && mv /tmp/style.css src/style.css && rm /tmp/reset.min.css
```

Expected: `head -c 200 src/style.css` shows the reset, and `tail -5 src/style.css` still shows the original `@media screen and (max-width: 900px)` block.

If the user declines the fetch, leave `src/style.css` unchanged, keep the `<link>` in `index.html` and record that D7 was not done in the Task 5 commit message.

- [ ] **Step 8: Replace `index.html`**

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Tetris</title>
    <link rel="stylesheet" href="./src/style.css">
</head>

<body>
    <div class="canvas-container">
        <canvas id="cnv" height="600px" width="600px"></canvas>
    </div>
    <script type="module" src="./src/main.js"></script>
</body>

</html>
```

- [ ] **Step 9: Browser check (needs a local server: ask the user first)**

**Ask the user** before starting a local static server. It binds to localhost only:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/` (a `file://` URL won't work, because ES modules need HTTP). Check each item and report what you see:
- [ ] The DevTools console has no errors, and the page looks like `demo/demo.gif`: same layout, colours and text.
- [ ] Human mode: the arrows move and rotate the piece, ↓ soft-drops, Space hard-drops and the ghost piece shows.
- [ ] Shift swaps with the held piece. P pauses (pieces dim and "Game Paused" shows) and P again resumes without the piece jumping a row.
- [ ] Clearing a line updates the score, lines and level.
- [ ] A switches to AI mode: the game resets, "Gen: 50" and the weights show with **Hole-W: 0.36**, and the AI plays at about 60 ms per row.
- [ ] Topping out shows "Game Over / Press R" over the final stack with no active piece. R restarts in both modes.
- [ ] Tab and Cmd+R (or F5) still do their usual browser thing.

Stop the server afterwards.

- [ ] **Step 10: Commit**

```bash
git add src/ui/render.js src/ui/input.js src/main.js src/style.css index.html test/render.test.js test/input.test.js
git commit -m "feat: add canvas renderer, key bindings and module entry point"
```

---

### Task 6: delete the original code and the parity harness

**Files:**
- Delete: `src/ai.js`, `src/script.js`, `test/parity.test.js`

- [ ] **Step 1: Confirm nothing references the old files**

Run: `grep -rn "src/ai.js\|src/script.js\|ai\.js\"\|script\.js\"" index.html src test`
Expected: the only matches are inside `test/parity.test.js` (`'../src/ai.js'`, `'../src/script.js'`). `src/core/*.js` imports `./ai.js` with single quotes, which this pattern doesn't match.

- [ ] **Step 2: Delete them**

```bash
git rm src/ai.js src/script.js test/parity.test.js
```

- [ ] **Step 3: Run the tests**

Run: `npm test`
Expected: all PASS (pieces, board, ai, game, render, input). There is no parity test any more.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: remove the original global-state scripts and parity harness"
```

---

### Task 7: README

**Files:**
- Modify: `README.markdown` (whole file)

- [ ] **Step 1: Replace `README.markdown` with this text**

````markdown
## Table of contents

- [Evolutionary Tetris](#evolutionary-tetris)
- [Formal Document](#formal-document)
- [Acknowledgement](#acknowledgement)
- [Demo](#demo)
- [Genetic Algorithm](#genetic-algorithm)
- [Heuristic](#heuristic)
- [Results](#results)
- [Run locally](#run-locally)
- [Code layout](#code-layout)
- [Fun Stuff](#fun-stuff)

## Evolutionary Tetris
This AI uses an evolutionary technique to improve over time. Through selection, crossover, and mutation, the AI learns to play [Tetris](https://en.wikipedia.org/wiki/Tetris) and clear as many lines as possible.

## Formal Document
Here's a document that explains the details of the algorithm and the derivation of my heuristic functions.
https://catnip-chiller-6ba.notion.site/CS208-Final-Project-00b752eb61fa45e4ab4e5bd92751cd1b

## Acknowledgement

- [CS486: Intro to AI](https://cs.uwaterloo.ca/~a23gao/cs486_f18/slides/lec08_csp_local_search_nosol.pdf)
- [Building A Tetris Bot Part 2: Genetic Algorithms](https://medium.com/@omgimanerd/building-a-tetris-bot-part-2-genetic-algorithms-889fc66006b1)

## Demo
[Live Demo](https://segfault2017.github.io/EvoluationaryTetris/)

![Part 1](demo/demo.gif)

Press **A** in the game to hand control to the AI.

## Genetic Algorithm
![Genetic](geneticAlgo.png)

Genetic algorithms work by creating a population of "genomes" that have multiple "genes", representing parameters for the algorithm. Each individual in the population is evaluated and gets a "fitness" score. The fittest individuals reproduce and pass favourable genes down to the next generation. Mutation also occurs, where genes are randomly modified in the hope of creating more beneficial features.

The weights were tuned offline with this process. **The training code is not part of this repo.** The game ships the resulting weights, hardcoded in [`src/main.js`](src/main.js).

## Heuristic
For each new piece, the AI tries every rotation and every column. It scores the board each move would produce and plays the best one. The score is based on four features, each of which the AI tries to minimise or maximise:

![ScoreFunc](equation.png)

where P is the score of a placement and

- H: the number of holes after the piece has landed
- L: the number of completed lines after the piece has landed
- AH: the aggregate height, the sum of all column heights after the piece has landed
- B: the bumpiness, the sum of the height differences between every two adjacent columns

The image above repeats the bumpiness term by mistake. The code uses exactly four terms: `P = -W_AH·AH + W_lines·L - W_holes·H - W_bumpiness·B`.

## Results
After 50 generations, the tuned weights are:
- Aggregate height: 0.51
- Holes: 0.36
- Lines cleared: 0.76
- Bumpiness: 0.18

With these weights, the AI can clear at least 14000 lines.

## Run locally
ES modules don't load from `file://`, so serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Run the tests (Node 18+, no dependencies):

```bash
npm test
```

## Code layout

```
src/core/pieces.js   piece shapes and rotation
src/core/board.js    collision, line clearing, board metrics
src/core/ai.js       move search and scoring
src/core/game.js     game state and rules (no DOM)
src/ui/render.js     canvas drawing
src/ui/input.js      keyboard controls
src/main.js          wiring, game loop, tuned weights
test/                node --test suites
```

Plain JavaScript, HTML and CSS: no build step and no dependencies.

## Fun Stuff
- A [Unity version](https://github.com/SegFault2017/Tetris-With-AI) is available here.
- [Is it possible to play Tetris forever?](https://tetris.fandom.com/wiki/Playing_forever)
````

- [ ] **Step 2: Check the README's links**

Run: `ls demo/demo.gif geneticAlgo.png equation.png src/main.js`
Expected: all four files exist.

- [ ] **Step 3: Commit**

```bash
git add README.markdown
git commit -m "docs: make README match the code; add run, test and layout sections"
```

---

### Task 8: push and open a PR (ask the user first)

- [ ] **Step 1: Final verification**

Run: `npm test && git status --short`
Expected: all tests PASS. The status shows only `?? graphify-out/`.

- [ ] **Step 2: Ask the user** whether to push `refactor/modular-core` to `origin` and open a PR against `main`. Explain that merging the PR publishes the live GitHub Pages demo. Continue only after an explicit yes.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin refactor/modular-core
gh pr create --base main --head refactor/modular-core \
  --title "Refactor into a tested, DOM-free core with a thin canvas UI" \
  --body-file /tmp/pr-body.md
```

Write `/tmp/pr-body.md` first. It should give:
- a summary of the new layout;
- the deviations D1–D8 from the spec, as a list;
- the parity check: 300 boards × 7 pieces matched the original AI before the old code was removed;
- how to test: `npm test`, plus the browser checklist from Task 5.

End the body with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
