# Handoff: Tetris AI two-ply lookahead

Date: 2026-10-11. Repo: EvoluationaryTetris, branch `main`.

## State

The AI now uses a two-ply lookahead (current piece plus the shown next piece), scored with the existing tuned weights, with no line clearing between plies. It is implemented and all 39 tests pass. **Nothing is committed.** The user has not asked for a commit yet.

Uncommitted changes (see `git diff` for the details):
- `src/core/ai.js`: `bestMove(board, matrix, pos, weights, next = null)` recurses one level, returns `{ matrix, x, score }`, scores a landing that blocks the next spawn as -Infinity.
- `src/core/board.js`: new `spawnPos(board, matrix)`.
- `src/core/game.js`: passes `this.next` to `bestMove`.
- `test/ai.test.js`, `test/game.test.js`: two new lookahead tests, one updated expectation.
- `test/bench.js` (new) and `package.json` `bench` script: seeded lines-per-game benchmark.
- `README.markdown`: heuristic text, results table, bench instructions.

`graphify-out/` is untracked and must stay out of commits. Do not `git add -A`.

## Decisions made

- "Performance" meant AI playing strength, not speed.
- The user confirmed the **no clearing between plies** variant.
- Clearing full rows between plies scored worse (4 of 5 games survived 5,000 pieces, one died at 435 lines). Cause: clearing lowers aggregate height by about 10 per row, so a line is suddenly worth about 6 points against the 0.76 the weights were tuned for. Retuning the weights under clearing would be needed to make it work.
- Boards are still scored before full rows are cleared, as the refactor spec requires. Scoring after clearing in one-ply also lost (483 vs 670 mean lines).
- A single-pass feature scorer matched the old metrics exactly but only cut search time about 18 percent, so it was not adopted.

## Measured results

Seeded headless runs with the tuned weights:

| Search | Mean lines | Notes |
|---|---|---|
| Greedy | 670 (median 361) | 10 seeds, 20,000-piece cap, none survived |
| Two-ply, no clearing | 11,778 | 3 seeds, 50,000-piece cap; games ended at 9,054 and 6,282 lines, one reached the cap |

Two-ply costs about 3 ms per piece against about 0.1 ms greedy.

## Known gaps

- The README table comes from throwaway scripts that are gone. `npm run bench` defaults to 5 games and 2,000 pieces, so it will not reproduce the table. Run `node test/bench.js 10 20000` for greedy-style conditions and `node test/bench.js 3 50000` for the long run (slow, several minutes). Sample sizes are small.
- The README says "35× more work"; it was derived from board counts, not timed in the final code.
- No browser check was done. UI files are untouched.
- The held piece is not considered by the search.
- `docs/superpowers/specs/2026-10-11-modular-core-refactor-design.md` says `bestMove` returns `{ matrix, x }`; it now also returns `score`.
- A sibling session ("Tetris AI performance") shares this checkout. Use a worktree before editing further.

## Next steps

1. Confirm with the user, then commit (conventional message; the user's global rule is no Claude co-author line).
2. Optionally run the bench at the README's conditions and correct the table if the numbers differ.
3. Optional: browser check (`python3 -m http.server 8000`, press A).
4. Optional: retune weights with a GA using `npm run bench` as fitness, possibly with clearing between plies.

## Suggested skills

- `superpowers:verification-before-completion` before claiming the README numbers or committing.
- `purposegit-ray:commit-message` or a plain conventional commit when the user asks to commit.
- `superpowers:brainstorming` before any weight retuning or hold-piece search, since those are new design work.
- `superpowers:using-git-worktrees` before editing, because of the shared checkout.
