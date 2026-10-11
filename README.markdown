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

The original four-feature weights (aggregate height, lines, holes, bumpiness) were tuned offline with this process. **The training code is not part of this repo.** The shipped AI now uses a stronger published feature set instead (see below); evolving weights for those features is the natural next step.

## Heuristic
For each new piece, the AI tries every rotation and every column, scores the placement, and plays the best one. Each placement is scored with [Pierre Dellacherie's](https://web.archive.org/web/20090529120530/http://www.colinfahey.com/tetris/tetris.html) six features. Two belong to the piece, the rest are measured on the board **after** full rows are cleared:

- landing height: how high the middle of the piece ends up
- lines cleared by the piece
- row transitions: filled/empty changes along each row, with the walls counted as filled
- column transitions: the same down each column, with the floor counted as filled
- holes: empty cells with a filled cell somewhere above them
- cumulative wells: for every well (an empty cell with filled cells or walls on both sides), 1 + 2 + … + its depth

The weights are the [El-Tetris](https://imake.ninja/el-tetris-an-improvement-on-pierre-dellacheries-algorithm/) ones (Islam El-Ashi, 2011), hardcoded in [`src/main.js`](src/main.js): landing −4.50, lines 3.42, row transitions −3.22, column transitions −9.35, holes −7.90, wells −3.39. Dellacherie's own integer weights (−1, +1, −1, −1, −4, −1, with lines × piece cells in them) play almost as well; see the results.

`bestMove` can also take the next piece and search two plies deep (every placement of the next piece after every placement of this one). The game doesn't use it: at this strength the benefit can't be measured, and it costs about 35× per move.

The original heuristic, `P = -W_AH·AH + W_lines·L - W_holes·H - W_bumpiness·B` with GA-tuned weights 0.51 / 0.76 / 0.36 / 0.18, is shown in `equation.png` (which repeats the bumpiness term by mistake) and kept in the results below for comparison.

![ScoreFunc](equation.png)

## Results
Measured with `npm run bench` (seeded games, so the numbers repeat):

| Scorer | Search | Lines per game | Games |
|---|---|---|---|
| Four features, GA weights | Greedy | mean 670, median 361 | 10 |
| Four features, GA weights | Two-ply | mean 11,778 | 3, one still alive at a 50,000-piece cap |
| Dellacherie features, Dellacherie weights | Greedy | mean 791,990; one game lost at 775,974 | 3, two still alive at a 2,000,000-piece cap |
| Dellacherie features, El-Tetris weights | Greedy | all alive at 799,997 | 3, cap 2,000,000 pieces |
| Dellacherie features, Dellacherie weights | Two-ply | all alive at 39,998 | 2, cap 100,000 pieces (4 ms per move) |

A greedy move costs about 0.12 ms, invisible at the game's drop speed. The 2,000,000-piece games take about 4 minutes each: `node test/bench.js 3 2000000`.

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

Measure how many lines the AI clears per game (defaults: 5 seeded games, 50,000 pieces each, about 40 s):

```bash
npm run bench            # or: node test/bench.js <games> <maxPieces>
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
test/                node --test suites, plus bench.js (lines per game)
```

Plain JavaScript, HTML and CSS: no build step and no dependencies.

## Fun Stuff
- A [Unity version](https://github.com/SegFault2017/Tetris-With-AI) is available here.
- [Is it possible to play Tetris forever?](https://tetris.fandom.com/wiki/Playing_forever)
