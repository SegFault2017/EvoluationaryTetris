function AI(weights) {
    this.heightWeight = weights.heightWeight;
    this.linesWeight = weights.linesWeight;
    this.holesWeight = weights.holesWeight;
    this.bumpinessWeight = weights.bumpinessWeight;
};


AI.prototype._best = function (player) {
    let elite = null;
    let bestScore = null;
    const originalPlayer = clone(player);

    for (let rotation = 0; rotation < 4; rotation++) {
        player.rotate(1)
        while (player.canMoveLeft()) {
            player.shift(-1);
        }
        // console.log("hello");

        while (player.canMoveRight()) {
            player.hardDropNotLand();
            player.merge();
            const aH = arena.aggregateHeight();
            const holes = arena.holes();
            const lines = arena.lines();
            const bumpiness = arena.bumpiness();
            player.unMerge();
            const score = -this.heightWeight * aH + this.linesWeight * lines
                - this.holesWeight * holes - this.bumpinessWeight * bumpiness;

            if (!bestScore || score > bestScore) {
                bestScore = score;
                elite = clone(player);
            }
            player.pos.y = originalPlayer.pos.y;
            player.pos.x++;
        }
        // debugger;
        elite.pos.y = originalPlayer.pos.y
    }
    return elite;

}

