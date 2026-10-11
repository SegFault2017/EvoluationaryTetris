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
    ['shift', -1], ['shift', 1], ['rotate'], ['softDrop'], ['hardDrop'], ['hold'],
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

test('keys pressed with Cmd, Ctrl or Alt are left to the browser', () => {
  const g = fakeGame();
  let handler;
  bindKeys(g, { addEventListener: (type, fn) => { handler = fn; } });
  for (const mod of ['metaKey', 'ctrlKey', 'altKey']) {
    for (const key of ['a', 'ArrowLeft', 'p', 'r']) {
      const e = { key, [mod]: true, prevented: false, preventDefault() { this.prevented = true; } };
      handler(e);
      assert.equal(e.prevented, false, `${mod}+${key}`);
    }
  }
  assert.deepEqual(g.calls, []);
});
