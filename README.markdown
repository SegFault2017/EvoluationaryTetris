## Table of contents

- [Evlolutionary Tetris](#evolutionary-tetris)
- [Acknowledgement](#acknowledgement)
- [Demo](#demo)
- [Heuristic](#heuristic)
- [Genetic](#genetic-algo)
- [Results](#results)
- [Used Tech](#used-tech)
- [More](#more)

## Evlolutionary Tetris
This AI uses evolutionary technique to improve over time. Through selection, crossover, and mutation, the AI will learn to paly [Tetris](https://en.wikipedia.org/wiki/Tetris) in as few moves as possible.

## Acknowledgement

- [CS486: Intro to AI](https://cs.uwaterloo.ca/~a23gao/cs486_f18/slides/lec08_csp_local_search_nosol.pdf)
- [Building A Tetris Bot Part 2: Genetic Algorithms](https://medium.com/@omgimanerd/building-a-tetris-bot-part-2-genetic-algorithms-889fc66006b1)

## Demo
[Live Demo](https://segfault2017.github.io/EvoluationaryTetris/)


![Part 1](demo/demo.gif)

## Genetic Algo
![Genetic](geneticAlgo.png)

Genetic algorithms work by creating a population of "genomes" that have multiple "genes", representing parameters for the algorithm. Each of these individuals in the population is evaluated and a "fitness" score for each genome is produced. The fittest individuals would reproduce and pass favourable genes down to the next generation. Mutation also occurs where genes are randomly modified in hopes of creating more beneficial features.

The goal of this genetric algo is to clear as many lines as possible, and hence, to make as many moves as possible and select the bes move with the hights score.

To achieve this, the AI will select the best move for a given piece by trying out all the possible rotations and translations. It computes a score for each possible move , and selects the one with the best score as its next move. The score for each move is computed by assessing the grid the move would result in. This assessment is based on 4 heuristics: aggregate height, complete lines, holes, and bumpiness, each of which the AI will try to either minimize or maximize.


![ScoreFunc](equation.png)

where P is the score function of the current piece and 

- H: is the number of holes after the piece has landed
- L: is the number of completed lines after the piece has landed
- AH: is the aggregate height, the sum of all column's height after the piece has landed
- B: the bumpiness/roughess, the sum of difference of every 2 adjacent colum's height after the piece has landed.





## Results
After tuning, the optimal parameters has value:
- Aggregated Hiehgts: 0.51
- \# of holes: 0.35
- \# of line cleared: 0.76
- bumpiness: 0.18


By using the tuned parameters from the Genetic algorithm after 50 generations, the AI can clear up to at least 14000 lines. 

## Used Tech

Project used:
- Javascript
- HTML, CSS
- Architecture: Basic MVC


## More
- A [Unity version](https://github.com/SegFault2017/Tetris-With-AI) is avalible here.
- [Is it possible to Play Tetris forever](https://tetris.fandom.com/wiki/Playing_forever)

