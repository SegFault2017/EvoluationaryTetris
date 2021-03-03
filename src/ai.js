function AI(weights) {
    this.heightWeight = weights.heightWeight;
    this.linesWeight = weights.linesWeight;
    this.holesWeight = weights.holesWeight;
    this.bumpinessWeight = weights.bumpinessWeight;
};


AI.prototype._best = function (player) {
    debugger;

    let elite = null;
    let bestScore = null;
    const originalPlayer = clone(player);

    for (let rotation = 0; rotation < 4; rotation++) {
        player.matrix = clone(originalPlayer.matrix);
        player.pos = clone(originalPlayer.pos);
        for (let r = 0; r < rotation; r++) {
            player.rotate(1)

        }
        while (true) {
            player.pos.x -= 1;
            if (player.collisionCheck()) {
                player.pos.x += 1;
                break;
            }
        }


        let i = 0;
        while (player.canMoveRight()) {
            i++;
            player.hardDropNotLand();
            player.merge();
            const aH = arena.aggregateHeight();
            const holes = arena.holes();
            const lines = arena.lines();
            const bumpiness = arena.bumpiness();
            console.log(aH, holes, lines, bumpiness, "r:", rotation, "i:", i);
            // debugger;
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
        if (elite) {
            elite.pos.y = originalPlayer.pos.y

        }
    }
    console.log("----------------------Next Elite------------");
    return elite;

}

