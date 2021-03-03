// --- Setup -----------------------------------------------
// - Canvas Context -
var cnv = document.getElementById('cnv'),
    ctx = cnv.getContext('2d');
ctx.scale(20, 20);



// Color palette for the blocks
var palettes = {
    standard: ['#ffeb3b', '#9c27b0', '#ff9800', '#3f51b5', '#03a9f4', '#4caf50', '#f44336'],
    experiment: ['#607d8b', '#8bc34a', '#009688', '#e91e63', '#ffc107', '#00bcd4', '#673ab7'],
}
var palette = palettes.standard;

// Game information
var level = 0;
var linesCleared = 0;
var paused = false;
var pieceArray = ['T', 'O', 'I', 'L', 'J', 'S', 'Z'];
var humanMode = true;
var ai = new AI({
    heightWeight: 0.510066,
    linesWeight: 0.760666,
    holesWeight: 0.35663,
    bumpinessWeight: 0.184483
});




// Arena
var arena = {
    // Props
    pos: { x: 10, y: 2 },
    width: 10,
    height: 22,
    matrix: createMatrix(10, 22),
    pieceIdx: 0,

    // Methods
    draw: function () {
        drawMatrix(this.matrix, this.pos);
        this.drawOutline();
    },
    drawOutline: function () {
        ctx.lineWidth = 0.1;
        ctx.strokeStyle = "#FFF";
        ctx.strokeRect(this.pos.x, this.pos.y, this.matrix[0].length, this.matrix.length);
    },
    columnHeight: function (c) {
        let r = 0;
        for (; r < this.height && this.matrix[r][c] == 0; r++);
        return this.height - r;
    },
    isLine: function (row) {
        for (let c = 0; c < this.width; c++) {
            if (this.matrix[row][c] == 0) {
                return false;
            }
        }
        return true;
    }
    ,
    aggregateHeight: function () {
        let total = 0;
        for (var c = 0; c < this.width; c++) {
            total += this.columnHeight(c);
        }
        return total;
    },
    lines: function () {
        var count = 0;
        for (var r = 0; r < this.height; r++) {
            if (this.isLine(r)) {
                count++;
            }
        }
        return count;
    },
    holes: function () {
        let count = 0;
        for (var c = 0; c < this.width; c++) {
            var block = false;
            for (var r = 0; r < this.height; r++) {
                if (this.matrix[r][c] != 0) {
                    block = true;
                } else if (this.matrix[r][c] == 0 && block) {
                    count++;
                }
            }
        }
        return count;
    },
    bumpiness: function () {
        let total = 0;
        for (let c = 0; c < this.width - 1; c++) {
            total += Math.abs(this.columnHeight(c) - this.columnHeight(c + 1));
        }
        return total;
    }
};

// Player 
var player = {
    // Props
    matrix: [],
    nextPiece: [],
    // heldPiece: randomPiece(),
    pos: { x: 0, y: 0 },
    score: 0,
    highscore: 0,
    // Methods
    collisionCheck: function (pos) {
        var m = this.matrix, o = pos || this.pos;
        for (var y = 0; y < m.length; ++y) {
            for (var x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 && (arena.matrix[y + o.y] && arena.matrix[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    },
    draw: function () {
        drawMatrix(this.matrix, { x: this.pos.x + arena.pos.x, y: this.pos.y + arena.pos.y });
        // Ghost piece
        for (var y = 0; y < arena.height; y++) {
            if (this.collisionCheck({ x: this.pos.x, y: y }) && y >= this.pos.y) {
                drawMatrix(this.matrix, { x: this.pos.x + arena.pos.x, y: y + arena.pos.y - 1 }, 'rgba(255,255,255,0.15)');
                return false;
            }
        }
    },
    drop: function () {
        this.pos.y++;
        if (this.collisionCheck()) {
            this.pos.y--;
            this.merge();
            lineCheck();
            this.reset();
        }
        dropCount = 0;
    },
    hardDropNotLand: function () {
        let count = 0;
        while ((!this.collisionCheck()) && count < arena.height) {
            this.pos.y++;
            count++;
        }
        this.pos.y--;
    },
    hardDrop: function () {
        var count = 0;
        while ((!this.collisionCheck()) && count < arena.height) {
            this.pos.y++;
            count++;
        }
        this.pos.y--;
        this.drop();
    },
    merge: function () {
        this.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena.matrix[y + this.pos.y][x + this.pos.x] = value;
                }
            });
        });
    },
    unMerge: function () {
        this.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    arena.matrix[y + this.pos.y][x + this.pos.x] = 0;
                }
            });
        });
    },

    reset: function () {

        this.matrix = this.nextPiece;
        this.nextPiece = randomPiece();
        this.pos.y = 0;
        this.pos.x = Math.floor(arena.matrix[0].length / 2) - Math.floor(this.matrix[0].length / 2);
        // debugger;

        if (this.collisionCheck()) {
            alert("Game Over")
            reset();
        }
        if (!humanMode) {
            elite = ai._best(player);
            if (elite) {
                this.matrix = elite.matrix;
                this.pos = elite.pos;
            }

        }


    },
    rotate: function (dir) {
        for (var y = 0; y < this.matrix.length; ++y) {
            for (var x = 0; x < y; ++x) {
                [
                    this.matrix[x][y],
                    this.matrix[y][x],
                ] = [
                        this.matrix[y][x],
                        this.matrix[x][y],
                    ];
            }
        }

        if (dir > 0) { this.matrix.forEach(row => row.reverse()); }
        // else { matrix.reverse(); }

        // collision check in case we rotate into the wall/another piece
        var pos = this.pos.x;
        var offset = 1;
        while (this.collisionCheck()) {
            this.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.matrix[0].length) {
                this.rotate(-dir);
                this.pos.x = pos;
                return;
            }
        }
    },
    shift: function (dir) {
        debugger;
        this.pos.x += dir;
        if (this.collisionCheck()) { this.pos.x -= dir; }
    },
    canMoveLeft: function () {
        return this.pos.x > 0 && !this.collisionCheck();
    },
    canMoveRight: function () {
        // for (var r = 0; r < this.matrix.length; r++) {
        //     for (var c = 0; c < this.matrix[r].length; c++) {
        //         var _r = this.pos.y + r;
        //         var _c = this.pos.x + c - 1;
        //         if (this.matrix[r][c] != 0) {
        //             if (!(_c >= 0 && arena.matrix[_r][_c] == 0)) {
        //                 return false;
        //             }
        //         }
        //     }
        // }
        // return true;
        return this.pos.x < arena.width && !this.collisionCheck();
    },
    moveLeft() {
        if (!this.canMoveLeft()) {
            return false;
        }
        this.pos.x--;
        return true;
    },
    switchPiece: function () {
        // [this.heldPiece, this.matrix] = [this.matrix, this.heldPiece];

        // // collision check in case we rotate into the wall/another piece
        // var pos = this.pos.x;
        // var offset = 1;
        // while (this.collisionCheck()) {
        //     this.pos.x += offset;
        //     offset = -(offset + (offset > 0 ? 1 : -1));
        //     if (offset > this.matrix[0].length) {
        //         player.switchPiece();
        //         this.pos.x = pos;
        //         return;
        //     }
        // }
    }
};

function switchMode() {
    humanMode = !humanMode;
    if (humanMode) {
        dropInterval = humanDropInterval;
    } else {
        reset();
        dropInterval = aiDropInterval;
    }
}


// Player Piece drop timer
var lastTime = 0;
var dropCount = 0;
var humanDropInterval = 1000;
var dropInterval = humanDropInterval;
var aiDropInterval = humanDropInterval / 100;

// ---------------------------------------------------------

// --- Input Handling --------------------------------------
document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
        case 80: paused = !paused; break; // P - Pause
        case 82: reset(); break;          // R - Reset
    }
    if (!paused) {
        e.preventDefault();
        switch (e.keyCode) {
            case 37: player.shift(-1); break;     // Left
            case 38: player.rotate(1); break;     // Up
            case 39:
                player.shift(1);
                console.log("hit");
                if (!player.collisionCheck()) {

                }
                break;      // Right
            case 40: player.drop(); break;        // Down
            case 32: player.hardDrop(); break;    // Space
            case 16: player.switchPiece(); break; // Shift
            case 65: switchMode(); break;
        }
    }
});


// ---------------------------------------------------------

// --- Functions -------------------------------------------
function init() {
    reset();
    frameFunction();
}

function reset() {
    // pieceIdx = 0;
    arena.pieceIdx = 0;
    player.nextPiece = randomPiece();
    arena.matrix.forEach(row => row.fill(0));
    player.reset();
    player.score = 0;
    // player.heldPiece = randomPiece();
    dropCount = 0;
    linesCleared = 0;
    level = 0;
}

function frameFunction(time = 0) {
    // Cover previous frame
    coverFrame();

    // Timer for player piece drop
    if (!paused) {
        var deltaTime = time - lastTime;
        lastTime = time;
        dropCount += deltaTime;
        if (dropCount > Math.max((dropInterval - (level * 60)), 60)) {
            player.drop();
        }
    }

    // Draw stuff
    draw();

    // Next Frame
    requestAnimationFrame(frameFunction);
}

function coverFrame() {
    ctx.fillStyle = 'rgba(0,10,30,1)';
    ctx.fillRect(0, 0, cnv.width, cnv.height);
}

function createMatrix(w, h) {
    var matrix = [];
    while (h--) { matrix.push(new Array(w).fill(0)); }
    return matrix;
}

function createPiece(type) {
    switch (type) {
        case 'O':
            return [
                [1, 1],
                [1, 1],
            ]; break;
        case 'T':
            return [
                [0, 2, 0],
                [2, 2, 2],
                [0, 0, 0],
            ]; break;
        case 'L':
            return [
                [0, 0, 3],
                [3, 3, 3],
                [0, 0, 0],
            ]; break;
        case 'J':
            return [
                [4, 0, 0],
                [4, 4, 4],
                [0, 0, 0],
            ]; break;
        case 'I':
            return [
                [0, 0, 0, 0],
                [5, 5, 5, 5],
                [0, 0, 0, 0],
                [0, 0, 0, 0],
            ]; break;
        case 'S':
            return [
                [0, 6, 6],
                [6, 6, 0],
                [0, 0, 0],
            ]; break;
        case 'Z':
            return [
                [7, 7, 0],
                [0, 7, 7],
                [0, 0, 0],
            ]; break;
    }
}

function drawMatrix(matrix, offset, color) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                if (color) {
                    ctx.fillStyle = paused ? 'rgba(0,0,0,0)' : color;
                } else {
                    ctx.fillStyle = paused ? 'rgba(255,255,255,0.2)' : (palette[value - 1] || 'white');
                };
                ctx.strokeStyle = 'rgba(0,10,30,1)';
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    player.draw();
    arena.draw();
    drawUI();
}

function drawUI() {
    ctx.fillStyle = '#FFF';
    ctx.font = '1px monospace';
    ctx.textAlign = 'left';
    // Title or something
    ctx.fillText('Evolutionary', 1.5, 3);
    ctx.fillText('Tetris', 3, 4);
    // Instructions
    if (humanMode) {
        ctx.fillText('← / → = Move   A = Human', 6, 25);
    } else {
        ctx.fillText('← / → = Move   A = AI', 6, 25);
    }
    ctx.fillText('↑ = Rotate    SHIFT = Switch', 6, 26);
    ctx.fillText('↓ = Soft Drop SPACE = Hard Drop', 6, 27);
    ctx.fillText('P = Pause     R = Reset', 6, 28);
    // Highscore
    ctx.fillText('Highscore', 21, 3);
    ctx.fillText(player.highscore, 21, 4);
    // Player Score
    ctx.fillText('Player Score', 21, 6);
    ctx.fillText(player.score, 21, 7);
    // Level 
    ctx.fillText('Level', 21, 9);
    ctx.fillText(level, 21, 10);
    // Lines
    ctx.fillText('Lines Cleared', 21, 12);
    ctx.fillText(linesCleared, 21, 13);
    // Held Piece
    ctx.fillText('Held Piece', 3, 15);
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "#FFF";
    ctx.strokeRect(3, 16, 6, 6);
    // drawMatrix(player.heldPiece, { x: 4, y: 17 })
    // Next Piece
    ctx.fillStyle = '#FFF';
    ctx.fillText('Next Piece', 21, 15);
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = "#FFF";
    ctx.strokeRect(21, 16, 6, 6);
    drawMatrix(player.nextPiece, { x: 22, y: 17 })
    // Pause Text
    if (paused) {
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.fillText('Game Paused', 5 + arena.pos.x, 8 + arena.pos.y);
    }
}

function lineCheck() {
    var rowMultiplier = 1;
    for (var y = arena.matrix.length - 1; y > 0; y--) {
        if (arena.matrix[y].every(function (x) { return x > 0; })) {
            linesCleared++;
            var row = arena.matrix.splice(y, 1)[0];
            arena.matrix.unshift(row.fill(0));
            player.score += rowMultiplier * 50;
            player.highscore = Math.max(player.highscore, player.score);
            rowMultiplier *= 2;
            y++; // Because of the splicing offset
            // Level
            level = Math.floor(linesCleared / 10);
        }
    }
}

function randomPiece() {
    // return (createPiece(pieceArray[Math.floor(Math.random() * pieceArray.length)]));
    const piece = (createPiece(pieceArray[arena.pieceIdx % (pieceArray.length - 1)]));
    arena.pieceIdx += 1;
    // debugger;
    console.log(arena.pieceIdx);
    return piece;

}

function clone(object) {
    return JSON.parse(JSON.stringify(object));
}
// ---------------------------------------------------------

init();