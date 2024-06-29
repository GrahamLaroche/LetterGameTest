/*
File: index.js
GUI Assignment: Scrabble
Graham Laroche, graham_laroche@student.uml.edu
6/26/2024
Script that controls the behavior of a Scrabble game web page.
*/

const TILE_SIZE = 70;
const TILE_BOARD_START = {'top' : 138, 'left': 31 }
const TILE_RACK_START = {'top': 300, 'left': 70 }
const TILE_MARGIN = 6;
const TILE_BOARD_MARGIN = 5;

let gameStart = false;

let tilesLeft = 100;
let score = 0;
let draggableCount = 0;

let draggableState = {
    //An array of the JQuery draggable objects 
    'draggables': [],
    //An array of the indicies indicating the original position of a draggable
    'previousSlot': [],
    //An array of indicies indicating which letter the draggable has
    'letterIndicies': []   
}

let gameState = {
    //An array of indicies that determine which draggable is on which tile rack slot
    'onTileRack': [], 
    //An array of indicies that determine which draggable is on which game board slot 
    'onGameBoard': []
}

//Data structure to hold information about scrabble tiles
let tileData  = {
    'letters' : [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
                  'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
                  'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '_' ],

    'points' : [ 1, 3, 3, 2, 1, 4, 2, 4, 1,
                 8, 5, 1, 3, 1, 1, 3, 10, 1,
                 1, 1, 1, 4, 4, 8, 4, 10, 0 ],

    'originalCount' : [ 9, 2, 2, 4, 12, 2, 3, 2, 9,
                        1, 1, 4, 2, 6, 8, 2, 1, 6,
                        4, 6, 4, 2, 2, 1, 2, 1, 2 ],

    'remaining' : [ 9, 2, 2, 4, 12, 2, 3, 2, 9,
                    1, 1, 4, 2, 6, 8, 2, 1, 6,
                    4, 6, 4, 2, 2, 1, 2, 1, 2 ],
}

$(document).ready(createDroppableSlots);

//Reset the scrabble game
function newGame() {
    if(gameStart == true) {
        clearAllTiles();
        for(let i = 0; i < 15; i+=1){
            gameState.onGameBoard[i] = null;
            $($('#boardSlots').children()[i]).droppable('enable');
        }
        tilesLeft = 100;
        score = 0;
        $('#score').text('Score: 0');
        for(let i = 0; i < 27; i+=1){
            tileData.remaining[i] = tileData.originalCount[i];
        }
    }
    else {
        gameStart = true;
    }
    
    createDraggableTiles();
    draggableCount = 7;
}

//Reset tiles on board, get new tiles (if avaliable), update score
function nextWord() {
    if(gameStart == false) {
        return;
    }

    let tilesNeeded = 0;
    for(let i = 0; i < 7; i+=1){
        if(gameState.onTileRack[i] == null) {
            tilesNeeded += 1;
        }
    }
    if (tilesNeeded == 0) {
        return;
    }

    updateScore();

    if(tilesLeft == 0) {
        for(let i = 0; i < 15; i+=1) {
            $($('#boardSlots').children()[i]).droppable('enable');
            let draggableIndex = gameState.onGameBoard[i];
            gameState.onGameBoard[i] = null;
            if(draggableIndex != null) {
                draggableState.draggables[draggableIndex].remove();
                draggableState.draggables[draggableIndex] = null;
                draggableCount -= 1;
            }
        }
    }   
    else if(tilesLeft < tilesNeeded){
        let replaceCount = tilesLeft;
        for(let i = 0; i < 15; i+=1) {
            let draggableIndex = gameState.onGameBoard[i];
            gameState.onGameBoard[i] = null;
            $($('#boardSlots').children()[i]).droppable('enable');
            if(draggableIndex != null) {
                if(replaceCount != 0) {
                    replaceCount -= 1;
                    let previousSlot = draggableState.previousSlot[draggableIndex];
                    let newTop = $($('#holderSlots').children()[previousSlot]).position().top + TILE_RACK_START.top;
                    let newLeft = $($('#holderSlots').children()[previousSlot]).position().left + TILE_RACK_START.left;
                    draggableState.draggables[draggableIndex].css('top', newTop);
                    draggableState.draggables[draggableIndex].css('left', newLeft);
                    draggableState.draggables[draggableIndex].draggable('enable');
                    
                    replaceDraggableTile(draggableIndex);

                    let slotIndex = draggableState.previousSlot[draggableIndex];
                    gameState.onTileRack[slotIndex] = draggableIndex;
                }
                else {
                    draggableState.draggables[draggableIndex].remove();
                    draggableState.draggables[draggableIndex] = null;
                    draggableCount -= 1;
                }
            }
        }
    }
    else {
        for(let i = 0; i < 15; i+=1){
            let draggableIndex = gameState.onGameBoard[i];
            gameState.onGameBoard[i] = null;
            $($('#boardSlots').children()[i]).droppable('enable');
            if(draggableIndex != null){
                let previousSlot = draggableState.previousSlot[draggableIndex];
                let newTop = $($('#holderSlots').children()[previousSlot]).position().top + TILE_RACK_START.top;
                let newLeft = $($('#holderSlots').children()[previousSlot]).position().left + TILE_RACK_START.left;;
                draggableState.draggables[draggableIndex].css('top', newTop);
                draggableState.draggables[draggableIndex].css('left', newLeft);
                draggableState.draggables[draggableIndex].draggable('enable');
                replaceDraggableTile(draggableIndex);

                let slotIndex = draggableState.previousSlot[draggableIndex];
                gameState.onTileRack[slotIndex] = draggableIndex;
            }
        }
    }
}

//Sums scores of tiles on board, applies relevant modifiers, updates score global and score text
function updateScore() {
    let wordMult = 1;
    let currentScore = 0;
    for(let i = 0; i < 15; i+=1){
        if(gameState.onGameBoard[i] != null) {
            let letterMult = 1;
            if( i == 6 || i == 8){
                letterMult += 1;
            }
            else if (i == 2 || i == 12) {
                wordMult *= 2;
            }
            currentScore += tileData.points[draggableState.letterIndicies[gameState.onGameBoard[i]]] * letterMult;
        }
    }
    currentScore *= wordMult;

    score += currentScore;

    console.log(score);

    $('#score').text('Score: ' + score);
}

//Deletes all draggable tiles
function clearAllTiles() {
    for(let i = 0; i < 7; i+=1){
        if (draggableState.draggables[i] != null) {
            draggableState.draggables[i].remove();
        }
    }
}

//Returns random index of letter
function drawRandomTile() {
    let randomNumber = Math.floor(Math.random() * tilesLeft);
    let previousRemaining = 0;
    let nextRemaining = tileData.remaining[0];
    let letterIndex;
    for( letterIndex = 0; letterIndex < 27; letterIndex +=1) {
        if ( (randomNumber >= previousRemaining) && (randomNumber < nextRemaining) ) {
            break;
        }
        previousRemaining = nextRemaining;

        nextRemaining += tileData.remaining[letterIndex+1];
    }

    tilesLeft -= 1;
    tileData.remaining[letterIndex] -= 1;

    return letterIndex;
}

//Creates 7 draggable tile objects
function createDraggableTiles() {
    for(let i = 0; i < 7; i+=1) {
        let newTile = document.createElement('div');
        $(newTile).draggable({
            snap: '.ui-droppable:not(.ui-droppable-disabled)',
            snapMode: 'inner',
            snapTolerance: (TILE_SIZE/2)+1,
            revert: 'invalid'
        });
        $(newTile).css('position','absolute');

        let newTop =  $($('#holderSlots').children()[i]).position().top + $('#holderSlots').position().top;
        let newLeft = $($('#holderSlots').children()[i]).position().left + $('#holderSlots').position().left;
        
        $(newTile).css('top', newTop);
        $(newTile).css('left', newLeft);

        $(newTile).css('width', TILE_SIZE);
        $(newTile).css('height', TILE_SIZE);

        let tileImage = document.createElement('img');
        let tileImageSrc;
        let letterIndex = drawRandomTile();
        let letter = tileData.letters[letterIndex];

        draggableState.letterIndicies[i] = letterIndex;
        gameState.onTileRack[i] = i;

        if (letter == '_') {
            tileImageSrc = 'images/Scrabble_Tile_Blank.jpg';
        }
        else {
            tileImageSrc =  'images/Scrabble_Tile_' + letter + '.jpg';
        }

        $(tileImage).attr('src', tileImageSrc);
        $(tileImage).attr('width', '70px');
        $(tileImage).attr('height', '70px');

        $(newTile).append(tileImage);
        draggableState.draggables[i] = $(newTile);
        $('body').append(newTile);

        draggableState.previousSlot[i] = i;
    }
}

//Changes the image and letter of a draggable tile
function replaceDraggableTile(draggableIndex){
    let randomTileIndex = drawRandomTile()
    draggableState.letterIndicies[draggableIndex] = randomTileIndex;
    let letter = tileData.letters[randomTileIndex];
    let imgSrc;
    if (letter == '_'){
        imgSrc = 'images/Scrabble_Tile_Blank.jpg';
    }
    else{
        imgSrc = 'images/Scrabble_Tile_' + letter + '.jpg';
    }
    draggableState.draggables[draggableIndex][0].firstChild.src = imgSrc;
}

//Every tile on the rack will have its image and letter replaced
function swapRackTiles() {
    for(let i = 0; i < 7; i+=1) {
        if(tilesLeft == 0){
            break;
        }
        let draggableIndex = gameState.onTileRack[i];
        if(draggableIndex != null) {
            replaceDraggableTile(draggableIndex);
        }
    }
}

//Only allows tiles to be placed next to other tiles
function validateBoard() {
    for(let i = 0; i < 15; i+=1) {
        if( i != 0 && gameState.onGameBoard[i] == null && gameState.onGameBoard[i-1] != null){
            $($('#boardSlots').children()[i]).droppable('enable');
        }
        else if (i != 15 && gameState.onGameBoard[i] == null && gameState.onGameBoard[i+1] != null){
            $($('#boardSlots').children()[i]).droppable('enable');
        }
        else {
            $($('#boardSlots').children()[i]).droppable('disable');
        }
    }
}

//Returns the index of a draggable object that matches the ui argument
function getDraggableIndex(ui) {
    for(let i = 0; i < 7; i+=1) {
        if (draggableState.draggables[i] != null) {
            if (ui.draggable[0] == draggableState.draggables[i][0]) {
                return i;
            }
        }
    }
    throw 'ERROR: Could not find draggable tile!';
}

//Returns the index of a droppable that matches the slot argument
function getDroppableIndex(slot) {
    for (let i = 0; i < 15; i+=1) {
        if (slot == $('#boardSlots').children()[i]) {
            return i;
        }
    }
    throw 'ERROR: Could not find droppable board slot!';
}

//Called on dropping a tile, updates data structures, disables draggable object
function dropTileOnBoard(_event, ui) {
    let draggableIndex = getDraggableIndex(ui);
    let boardDroppableIndex = getDroppableIndex(this);
    ui.draggable.draggable('disable');
    gameState.onTileRack[draggableState.previousSlot[draggableIndex]] = null;
    gameState.onGameBoard[boardDroppableIndex] = draggableIndex;
    validateBoard();
}

//Called on page startup, creates the slots that the draggable tiles will go to
function createDroppableSlots() {
    let offset = 0;
    let i;

    for(i = 0; i < 7; i+=1) {
        let newSlot = document.createElement('div');
        $(newSlot).css('position', 'absolute');
        $(newSlot).css('top', 0);
        $(newSlot).css('left', offset);
        $(newSlot).css('width', TILE_SIZE);
        $(newSlot).css('height', TILE_SIZE);
        $(newSlot).css('background-color', 'blue');

        $('#holderSlots').append(newSlot);

        offset += (TILE_SIZE + TILE_MARGIN)
    }

    offset = 0;

    for(i = 0; i < 15; i+=1) {
        let newSlot = document.createElement('div');
        $(newSlot).droppable({
            drop: dropTileOnBoard
        });
        $(newSlot).css('position', 'absolute');
        $(newSlot).css('top', 0);
        $(newSlot).css('left', offset);
        $(newSlot).css('width', TILE_SIZE);
        $(newSlot).css('height', TILE_SIZE);

        $('#boardSlots').append(newSlot);

        offset += (TILE_SIZE + TILE_BOARD_MARGIN)

        gameState.onGameBoard[i] = null;
    }

}


