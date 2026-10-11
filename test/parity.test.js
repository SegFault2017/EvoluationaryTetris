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
