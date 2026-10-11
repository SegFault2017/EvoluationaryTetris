# Graph Report - .  (2026-10-11)

## Corpus Check
- 6 files · ~111,158 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 71 nodes · 126 edges · 9 communities (8 shown, 1 thin omitted)
- Extraction: 79% EXTRACTED · 19% INFERRED · 2% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.81)
- Token cost: 131,291 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Rendering & Game UI|Rendering & Game UI]]
- [[_COMMUNITY_AI Scoring Heuristic|AI Scoring Heuristic]]
- [[_COMMUNITY_Genetic Algorithm Theory|Genetic Algorithm Theory]]
- [[_COMMUNITY_Game State & Mode Control|Game State & Mode Control]]
- [[_COMMUNITY_AI Placement Search|AI Placement Search]]
- [[_COMMUNITY_Player Input & Movement|Player Input & Movement]]
- [[_COMMUNITY_Line Clearing|Line Clearing]]
- [[_COMMUNITY_Arena Matrix Ops|Arena Matrix Ops]]
- [[_COMMUNITY_Player Object|Player Object]]

## God Nodes (most connected - your core abstractions)
1. `AI._best()` - 15 edges
2. `player.collisionCheck()` - 12 edges
3. `AI()` - 9 edges
4. `drawUI()` - 8 edges
5. `reset()` - 7 edges
6. `player.drop()` - 7 edges
7. `keydown input handler` - 7 edges
8. `Evolutionary Tetris Demo GIF` - 7 edges
9. `Placement Score P (weighted linear heuristic)` - 7 edges
10. `Generation loop (pop(i) -> pop(i+1))` - 7 edges

## Surprising Connections (you probably didn't know these)
- `AI Gameplay Performance (Level 24, 245 lines, score 14600)` --conceptually_related_to--> `AI()`  [INFERRED]
  demo/demo.gif → src/ai.js
- `AI Toggle (A key)` --references--> `AI()`  [INFERRED]
  demo/demo.gif → src/ai.js
- `AI()` --shares_data_with--> `Heuristic Weights (W_holes, W_lines, W_AH, W_bumpiness)`  [INFERRED]
  src/ai.js → equation.png
- `AI()` --implements--> `Genetic Algorithm (Algorithm 4, labelled 'Generic Algorithm')`  [INFERRED]
  src/ai.js → geneticAlgo.png
- `reset()` --conceptually_related_to--> `Generation loop (pop(i) -> pop(i+1))`  [INFERRED]
  src/script.js → geneticAlgo.png

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI Board Evaluation Heuristic** — src_ai_best, src_script_arena_aggregateheight, src_script_arena_holes, src_script_arena_lines, src_script_arena_bumpiness, src_script_heuristic_weights [EXTRACTED 1.00]
- **Simulated Placement (drop/merge/score/unmerge)** — src_ai_best, src_script_player_harddropnotland, src_script_player_merge, src_script_player_unmerge, src_script_clone [EXTRACTED 1.00]
- **Render/Game Loop** — src_script_init, src_script_framefunction, src_script_coverframe, src_script_draw, src_script_player_drop [EXTRACTED 1.00]
- **Game UI layout rendered by draw/drawUI** — demo_demo_playfield, demo_demo_score_panel, demo_demo_held_piece, demo_demo_next_piece, demo_demo_controls_legend [INFERRED 0.75]
- **Board features weighted in P** — equation_holes, equation_lines_cleared, equation_aggregate_height, equation_bumpiness [EXTRACTED 1.00]
- **GA evolution step: selection + crossover + mutation** — geneticalgo_roulette_selection, geneticalgo_crossover, geneticalgo_mutation [EXTRACTED 1.00]

## Communities (9 total, 1 thin omitted)

### Community 0 - "Rendering & Game UI"
Cohesion: 0.20
Nodes (15): AI Gameplay Performance (Level 24, 245 lines, score 14600), AI Toggle (A key), Keyboard Controls Legend (Move, Rotate, Drop, Switch, Pause, Reset, A=AI), Evolutionary Tetris Demo GIF, Held Piece Preview, Next Piece Preview, Tetris Playfield Grid, Score Panel (Highscore, Player Score, Level, Lines Cleared) (+7 more)

### Community 1 - "AI Scoring Heuristic"
Cohesion: 0.20
Nodes (10): Aggregate Height (AH), BestScore = argmax over rotations r (0-3) and translations t (0-22) of P(r,t), Bumpiness (B), Heuristic Weights (W_holes, W_lines, W_AH, W_bumpiness), Holes (H), Move Search Space (rotations r, right translations t), Placement Score P (weighted linear heuristic), Tetris AI Scoring Formula (equation.png) (+2 more)

### Community 2 - "Genetic Algorithm Theory"
Cohesion: 0.27
Nodes (10): Backtracking with Inferences and Heuristics (slide title), Crossover(a, b), Fitness function f(x) and termination test, Generation loop (pop(i) -> pop(i+1)), Genetic Algorithm (Algorithm 4, labelled 'Generic Algorithm'), Mutation with small probability, geneticAlgo.png (Genetic Algorithm pseudocode slide), Population pop(i) = {X1..Xn} (+2 more)

### Community 3 - "Game State & Mode Control"
Cohesion: 0.36
Nodes (8): createPiece(), Human / AI Mode Toggle, moveLeft(), player.canMoveLeft(), player.reset(), randomPiece(), reset(), switchMode()

### Community 4 - "AI Placement Search"
Cohesion: 0.29
Nodes (7): AI._best(), Brute-force Placement Search, arena.aggregateHeight(), arena.bumpiness(), arena.columnHeight(), clone(), player.canMoveRight()

### Community 5 - "Player Input & Movement"
Cohesion: 0.46
Nodes (8): keydown input handler, player.collisionCheck(), player.drop(), player.hardDrop(), player.hardDropNotLand(), player.rotate(), player.shift(), player.switchPiece()

### Community 6 - "Line Clearing"
Cohesion: 0.50
Nodes (3): Lines Cleared (L), arena.lines(), lineCheck()

### Community 7 - "Arena Matrix Ops"
Cohesion: 0.50
Nodes (4): arena, createMatrix(), player.merge(), player.unMerge()

## Ambiguous Edges - Review These
- `frameFunction()` → `Evolutionary Tetris Demo GIF`  [AMBIGUOUS]
  demo/demo.gif · relation: conceptually_related_to
- `Genetic Algorithm (Algorithm 4, labelled 'Generic Algorithm')` → `Backtracking with Inferences and Heuristics (slide title)`  [AMBIGUOUS]
  geneticAlgo.png · relation: conceptually_related_to

## Knowledge Gaps
- **7 isolated node(s):** `player`, `Move Search Space (rotations r, right translations t)`, `Holes (H)`, `Aggregate Height (AH)`, `Bumpiness (B)` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `frameFunction()` and `Evolutionary Tetris Demo GIF`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Genetic Algorithm (Algorithm 4, labelled 'Generic Algorithm')` and `Backtracking with Inferences and Heuristics (slide title)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `AI()` connect `AI Scoring Heuristic` to `Rendering & Game UI`, `Genetic Algorithm Theory`, `Game State & Mode Control`, `AI Placement Search`?**
  _High betweenness centrality (0.322) - this node is a cross-community bridge._
- **Why does `AI._best()` connect `AI Placement Search` to `AI Scoring Heuristic`, `Game State & Mode Control`, `Player Input & Movement`, `Line Clearing`, `Arena Matrix Ops`?**
  _High betweenness centrality (0.283) - this node is a cross-community bridge._
- **Why does `Generation loop (pop(i) -> pop(i+1))` connect `Genetic Algorithm Theory` to `Game State & Mode Control`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `AI()` (e.g. with `AI Gameplay Performance (Level 24, 245 lines, score 14600)` and `AI Toggle (A key)`) actually correct?**
  _`AI()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `drawUI()` (e.g. with `Keyboard Controls Legend (Move, Rotate, Drop, Switch, Pause, Reset, A=AI)` and `Held Piece Preview`) actually correct?**
  _`drawUI()` has 5 INFERRED edges - model-reasoned connections that need verification._