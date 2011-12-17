/**
 * Cells.js : Javascript source
 *
 * This file contains all JavaScript function and class
 * definitions needed to perform the graphics rendering,
 * keyboard input handling, and game logic.
 *
 * Copyright (C) 2011 Chun Min Shen <kuato@erratical.com>
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

function log(msg) {
	var debug = document.getElementById('debug');
	var li = document.createElement('li');
	li.appendChild(document.createTextNode(msg));
	debug.appendChild(li);
}

function showDialog(title, text, callback) {
	var id = 'dialog' + Math.ceil(Math.random() * 100);
	var dialog = document.createElement('div');
	var header = document.createElement('h1');
	var message = document.createElement('p');
	var button = document.createElement('button');
	header.appendChild(document.createTextNode(title));
	message.appendChild(document.createTextNode(text));
	button.innerHTML = 'OK';
	button.onclick = function() {
		document.body.removeChild(document.getElementById(id));
		callback();
	}
	dialog.id = id;
	dialog.className = 'dialog';
	dialog.appendChild(header);
	dialog.appendChild(message);
	dialog.appendChild(button);
	document.body.appendChild(dialog);
}

var ColorManager = new function() {
	function sanitizeColor(rgbObj) {
		for (var color in rgbObj) {
			if (rgbObj[color] < 0) {
				rgbObj[color] = 0;
			} else if (rgbObj[color] > 255) {
				rgbObj[color] = 255;
			}
		}
		return rgbObj;
	}

	this.compare = function(c1, c2) {
		return c1.r == c2.r && c1.g == c2.g && c1.b == c2.b;
	}

	this.convertToHex = function(rgbObj) {
		var hexStr = '#';
		for (var i in rgbObj) {
			var val = Math.ceil(rgbObj[i]);
			if (val < 15)
				hexStr += '0' + val.toString(16);
			else
				hexStr += val.toString(16);
		}
		return hexStr;
	}

	this.createColor = function(red, grn, blu) {
		var rgbObj = {
			r: red,
			g: grn,
			b: blu
		};
		return sanitizeColor(rgbObj);
	}

	this.parseColor = function(colorStr) {
		var rgbObj = {r: 0, g: 0, b: 0};
		var colorStr = colorStr.toLowerCase();
		if (colorStr.match(/#[a-f0-9]+/)) {
			var hex = (colorStr.match(/#([a-f0-9]+)/))[1];
			if (hex.length == 3) {
				rgbObj.r = parseInt('0x' + hex.charAt(0) + hex.charAt(0));
				rgbObj.g = parseInt('0x' + hex.charAt(1) + hex.charAt(1));
				rgbObj.b = parseInt('0x' + hex.charAt(2) + hex.charAt(2));
			} else if (hex.length == 6) {
				rgbObj.r = parseInt('0x' + hex.slice(0, 2));
				rgbObj.g = parseInt('0x' + hex.slice(2, 4));
				rgbObj.b = parseInt('0x' + hex.slice(4, 6));
			}
		} else if (colorStr.match(/rgb\([ 0-9]+,[ 0-9]+,[ 0-9]+\)/)) {
			var rgb = colorStr.split(/rgb\(([ 0-9]+),([ 0-9]+),([ 0-9]+)\)/);
			if (rgb.length == 5) {
				rgbObj.r = parseInt(rgb[1]);
				rgbObj.g = parseInt(rgb[2]);
				rgbObj.b = parseInt(rgb[3]);
			}
		} else {
			log('Error with color value: ' + colorStr);
		}
		return rgbObj;
	}
}

var Palette = new function() {
	this.BACKGROUND = ColorManager.createColor(0, 0, 0);
	this.FOREGROUND = ColorManager.createColor(32, 32, 32);
	this.LOCKED = ColorManager.createColor(128, 128, 128);
	this.RED = ColorManager.createColor(183, 46, 0);
	this.BLUE = ColorManager.createColor(0, 88, 243);
	this.CYAN = ColorManager.createColor(0, 110, 125);
	this.GREEN = ColorManager.createColor(0, 115, 33);
	this.ORANGE = ColorManager.createColor(125, 93, 0);
	this.YELLOW = ColorManager.createColor(101, 101, 0);
	this.PURPLE = ColorManager.createColor(110, 56, 255);
}

var Cells = new function() {

// -----------------------------------------------------------------------------
// INTERNAL
// -----------------------------------------------------------------------------

var __self = this;
var __id = 'blocks-game';
var __width = 10;
var __height = 20;
var __version = '1.0.2';

var Blocks = [
    new Block("100\n111", Palette.BLUE, 'blue'),
    new Block("1111", Palette.CYAN, 'cyan'),
    new Block("001\n111", Palette.ORANGE, 'orange'),
    new Block("11\n11", Palette.YELLOW, 'yellow'),
    new Block("011\n110", Palette.GREEN, 'green'),
    new Block("010\n111", Palette.PURPLE, 'purple'),
    new Block("110\n011", Palette.RED, 'red')
];

var GameState = {
    CurrentShape: false,
    Delay: 500,
    NextShape: false,
    PosX: 0,
    PosY: 0,
    Score: 0,
    Started: false,
    Timer: false
};

// -----------------------------------------------------------------------------
// BLOCK OBJECT
// -----------------------------------------------------------------------------

function Block(shape, color, className) {

    var __color = color;
    var __shape = [];
    var __className = className;

    function parse(str) {
        var data = str.split("\n");
        for (var i = 0; i < data.length; i++) {
            var row = [];
            for (var x = 0; x < data[i].length; x++) {
                row.push(parseInt(data[i].charAt(x)) == 1);
            }
            __shape.push(row);
        }
    }

    function render(col, row, f_color, b_color, className) {
        var grid = document.getElementById(__id);
        var yi = row;
        while (yi < __height && (yi - row) < __shape.length) {
            var xi = col;
            while (xi < __width && (xi - col) < __shape[yi - row].length) {
                if (__shape[yi - row][xi - col]) {
                    grid.childNodes[yi].childNodes[xi].style.borderColor = ColorManager.convertToHex(f_color);
                    grid.childNodes[yi].childNodes[xi].style.backgroundColor = ColorManager.convertToHex(b_color);
                    grid.childNodes[yi].childNodes[xi].className = className;
                }
                xi++;
            }
            yi++;
        }
    }

    this.getWidth = function() {
        return __shape[0].length;
    }

    this.getHeight = function() {
        return __shape.length;
    }

    this.getShape = function() {
        return __shape;
    }

    this.render = function(col, row) {
        render(col, row, __color, __color, __className);
    }

    this.unrender = function(col, row) {
        render(col, row, Palette.FOREGROUND, Palette.BACKGROUND, '');
    }

    this.renderPreview = function() {
        var preview = document.getElementById('preview');
        while (preview.firstChild) {
            preview.removeChild(preview.firstChild);
        }

        for (var yi = 0; yi < __shape.length; yi++) {
            var ul = document.createElement('ul');
            for (var xi = 0; xi < __shape[yi].length; xi++) {
                var li = document.createElement('li');
                if (__shape[yi][xi]) {
                    li.style.backgroundColor = ColorManager.convertToHex(__color);
                    li.style.borderColor = ColorManager.convertToHex(__color);
                    li.className = __className;
                } else {
                    li.style.backgroundColor = ColorManager.convertToHex(Palette.BACKGROUND);
                    li.style.borderColor = ColorManager.convertToHex(Palette.FOREGROUND);
                    li.className = '';
                }
                ul.appendChild(li);
            }
            preview.appendChild(ul);
        }
    }

    /**
     * Checks if block would collide with other block according to movement direction
     */
    this.checkCollision = function(x, y, dx, dy) {
        var grid = document.getElementById(__id);
        var ry = y;
        for (var yi = 0; yi < __shape.length; yi++) {
            var rx = x;
            for (var xi = 0; xi < __shape[yi].length; xi++) {
                var dc = xi + dx;
                var dr = yi + dy;
                if (__shape[yi][xi] == true) {
                    var outsideShape = (dr < 0 || dr >= __shape.length || dc < 0 || dc >= __shape[yi].length);
                    var insideShape = (dr >= 0 && dr < __shape.length && dc >=0 && dc < __shape[yi].length && !__shape[dr][dc]);
                    if (outsideShape || insideShape) {
                        // check block collision
                        var rdx = rx + dx;
                        var rdy = ry + dy;
                        if (rdx >= 0 && rdx < __width && rdy >=0 && rdy < __height) {
                            var node = grid.childNodes[rdy].childNodes[rdx];
                            var nodeColor = ColorManager.parseColor(node.style.backgroundColor);
                            if (!ColorManager.compare(nodeColor, Palette.BACKGROUND)) {
                                return true;
                            }
                        } else {
                            return true;
                        }
                    }
                }
                rx++;
            }
            ry++;
        }
        return false;
    }

    /**
     * Checks if block would overlap if placed
     */
    this.checkOverlap = function(x, y) {
        var grid = document.getElementById(__id);

        var ry = y;
        for (var yi = 0; yi < __shape.length; yi++) {
            var rx = x;
            for (var xi = 0; xi < __shape[yi].length; xi++) {
                var node = grid.childNodes[ry].childNodes[rx];
                var nodeColor = ColorManager.parseColor(node.style.backgroundColor);
                if (__shape[yi][xi] && !ColorManager.compare(nodeColor, Palette.BACKGROUND)) {
                    return true;
                }
                rx++;
            }
            ry++;
        }
        return false;
    }

    /**
     * Clockwise rotation of shape
     */
    this.rotate = function() {
        var new_shape = [];
        var new_width = __shape.length;
        var new_height = __shape[0].length;
        for (var c = 0; c < new_height; c++) {
            var row = [];
            for (var r = 0; r < new_width; r++) {
                var old_col = new_width - r - 1;
                var old_row = c;
                row.push(__shape[old_col][old_row]);
            }
            new_shape.push(row);
        }
        __shape = new_shape;
    }

    /**
     * Counterclockwise rotation of shape
     */
    this.unrotate = function() {
        var new_shape = [];
        var new_width = __shape.length;
        var new_height = __shape[0].length;
        for (var c = 0; c < new_height; c++) {
            var row = [];
            for (var r = 0; r < new_width; r++) {
                var old_col = r;
                var old_row = new_height - c - 1;
                row.push(__shape[old_col][old_row]);
            }
            new_shape.push(row);
        }
        __shape = new_shape;
    }

    parse(shape);

}  // end Block
        
function buildGrid(id, width, height) {
    var grid = document.createElement('div');
    grid.id = id;
    for (var i = 0; i < height; i++) {
        var row = document.createElement('ul');
        for (var h = 0; h < width; h++) {
            var cell = document.createElement('li');
            cell.style.borderColor = ColorManager.convertToHex(Palette.FOREGROUND);
            cell.style.backgroundColor = ColorManager.convertToHex(Palette.BACKGROUND);
            row.appendChild(cell);
        }
        grid.appendChild(row);
    }
    return grid;
}

function checkMatch() {
    var completeRows = [];
    var grid = document.getElementById(__id);

    for (var yi = grid.childNodes.length - 1; yi >= 0; yi--) {
        if (grid.childNodes[yi].className != 'locked') {
            var fullrow = true;
            for (var xi = 0; xi < grid.childNodes[yi].childNodes.length; xi++) {
                var node = grid.childNodes[yi].childNodes[xi];
                var nodeColor = ColorManager.parseColor(node.style.backgroundColor);
                if (ColorManager.compare(nodeColor, Palette.BACKGROUND)) {
                    fullrow = false;
                    break;
                }
            }
            if (fullrow) {
                if (GameState.EliminationMode) {
                    grid.childNodes[yi].style.borderColor = ColorManager.convertToHex(Palette.LOCKED);
                    grid.childNodes[yi].style.backgroundColor = ColorManager.convertToHex(Palette.LOCKED);
                    grid.childNodes[yi].className = 'locked';
                }
                completeRows.push(grid.childNodes[yi]);
            }
        }
    }

    // clear completed rows and deal out score
    var bonus = 0;
    if (completeRows.length > 1) {
        bonus = (completeRows.length - 1) * 10;
    }
    for (var i = 0; i < completeRows.length; i++) {
        if (!GameState.EliminationMode) {
            grid.removeChild(completeRows[i]);
            pushBlankRow();
        }
        updateScore(100);
    }
    updateScore(bonus);
}

function clearPreview() {
    var preview = document.getElementById('preview');
    while (preview.firstChild) {
        preview.removeChild(preview.firstChild);
    }
}

function gameOver() {
    if (!GameState.Started) return;
    document.onkeydown = null;
    GameState.Started = false;
    clearTimeout(GameState.Timer);
    showDialog('Game Over!', 'Your final score was: ' + GameState.Score, __self.ResetGame);
}

function pickShape() {
    var index = Math.floor(Math.random() * Blocks.length);
    return Blocks[index];
}

function pickShapes() {
    if (!GameState.Started) return;
    GameState.CurrentShape = GameState.NextShape ? GameState.NextShape : pickShape();
    GameState.NextShape = pickShape();
    GameState.PosX = Math.floor(__width / 2) - 1;
    GameState.PosY = 0;
    GameState.NextShape.renderPreview();
}

function pushBlankRow() {
    if (!GameState.Started) return;
    var grid = document.getElementById(__id);
    var ul = document.createElement('ul');
    for (var i = 0; i < __width; i++) {
        var li = document.createElement('li');
        li.style.backgroundColor = ColorManager.convertToHex(Palette.BACKGROUND);
        li.style.borderColor = ColorManager.convertToHex(Palette.FOREGROUND);
        ul.appendChild(li);
    }
    grid.insertBefore(ul, grid.firstChild);
}

function rotateBlock() {
    if (!GameState.Started) return;
    GameState.CurrentShape.unrender(GameState.PosX, GameState.PosY);

    var oldShape = GameState.CurrentShape;
    GameState.CurrentShape.rotate();
    var edge = GameState.PosX + GameState.CurrentShape.getWidth();
    if (edge >= __width) {
        GameState.PosX = __width - GameState.CurrentShape.getWidth();
    } else if (
        GameState.CurrentShape.checkCollision(GameState.PosX, GameState.PosY, 1, 0) ||
        GameState.CurrentShape.checkCollision(GameState.PosX, GameState.PosY, 0, 1)) {
        GameState.CurrentShape.unrotate();
    }

    GameState.CurrentShape.render(GameState.PosX, GameState.PosY);
}

function shiftBlock(dx, dy) {
    if (!GameState.Started) return;
    var checkLose = false;

    var nx = GameState.PosX + dx;
    var ny = GameState.PosY + dy;
    var nxw = nx + GameState.CurrentShape.getWidth() - 1;
    var nyw = ny + GameState.CurrentShape.getHeight() - 1;

    if (nx >= 0 && nxw < __width && ny >= 0 && nyw < __height) {
        var collision = GameState.CurrentShape.checkCollision(GameState.PosX, GameState.PosY, dx, dy);
        if (!collision) {
            GameState.CurrentShape.unrender(GameState.PosX, GameState.PosY);
            GameState.PosX = nx;
            GameState.PosY = ny;
        } else if (collision && dx == 0) {
            checkMatch();
            pickShapes();
            checkLose = true;
        }
    } else {
        if (nyw >= __height) {
            checkMatch();
            pickShapes();
            checkLose = true;
        }
    }
    if (checkLose && GameState.CurrentShape.checkOverlap(GameState.PosX, GameState.PosY)) {
        GameState.CurrentShape.render(GameState.PosX, GameState.PosY);
        gameOver();
    } else {
        GameState.CurrentShape.render(GameState.PosX, GameState.PosY);
    }
}

function updateScore(addScore) {
    GameState.Score += addScore;
    var score = document.getElementById('score');
    score.innerHTML = GameState.Score;
}

// EVENT HANDLERS

function onTimerTick() {
    clearTimeout(GameState.Timer);
    shiftBlock(0, 1);
    GameState.Timer = setTimeout(onTimerTick, GameState.Delay);
}

function onUserKeyPress(e) {
    var e = e ? e : window.event;
    var code = e.keyCode ? e.keyCode : e.which;

    switch (code) {
        case 38:
            rotateBlock();
        break;
        case 37:
            shiftBlock(-1, 0);
        break;
        case 39:
            shiftBlock(1, 0);
        break;
        case 40:
            shiftBlock(0, 1);
        break;
        default:
            log('invalid=' + code);
        break;
    }
    return true;
}

// PUBLIC

this.Init = function() {
    var version = document.getElementById('version');
    var game_area = document.getElementById('game-area');
    var grid = buildGrid(__id, __width, __height);
    game_area.className = 'grid';
    game_area.appendChild(grid);
    version.innerHTML = __version;
}

this.StartGame = function() {
    __completeRows = [];
    GameState.EliminationMode = document.getElementById('elimination-mode').checked;
    GameState.Score = 0;
    GameState.Started = true;
    pickShapes();
    document.onkeydown = onUserKeyPress;
    GameState.Timer = setTimeout(onTimerTick, GameState.Delay);
}

this.PauseGame = function() {
    if (GameState.Started) {
        clearTimeout(GameState.Timer);
    }
}

this.ResetGame = function() {
    clearTimeout(GameState.Timer);
    GameState.Score = 0;
    GameState.Started = false;
    var grid = document.getElementById(__id);
    for (var yi = 0; yi < grid.childNodes.length; yi++) {
        grid.childNodes[yi].className = '';
        for (var xi = 0; xi < grid.childNodes[yi].childNodes.length; xi++) {
            var node = grid.childNodes[yi].childNodes[xi];
            node.style.backgroundColor = ColorManager.convertToHex(Palette.BACKGROUND);
            node.style.borderColor = ColorManager.convertToHex(Palette.FOREGROUND);
            node.className = '';
        }
    }
    updateScore(0);
    document.getElementById('play-game').innerHTML = 'play';
    clearPreview();
}

this.ResumeGame = function() {
    if (GameState.Started) {
        GameState.Timer = setTimeout(onTimerTick, GameState.Delay);
    }
}

this.TogglePlay = function() {
    var target = document.getElementById('play-game');
    switch (target.innerHTML) {
        case 'play':
            if (!GameState.Started) {
                this.StartGame();
            } else {
                this.ResumeGame();
            }
            target.innerHTML = 'pause';
        break;
        case 'pause':
            this.PauseGame();
            target.innerHTML = 'play';
        break;
    }
}

}  // end Cells


