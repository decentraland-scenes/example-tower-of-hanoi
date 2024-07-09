
export type IconData = {    
    uvs:number[]
}
export type ButtonShapeData = {
    shape:string,
    base:string,
    isRect:boolean
}
export type uvData = {
    shape:string,    
}

function getUVs(row:number, startBlock:number, width:number):number[]{
     let blockSize = 1/16

    return [
        startBlock * blockSize, 1 - (blockSize  * (row +1)),
        startBlock * blockSize, 1 - (blockSize  * (row)),
        (startBlock + width) * blockSize, 1 - (blockSize  * (row)),
        (startBlock + width) * blockSize,1 - (blockSize  * (row +1)),                
        
        startBlock * blockSize, 1 - (blockSize  * (row +1)),
        startBlock * blockSize, 1 - (blockSize  * (row)),
        (startBlock + width) * blockSize, 1 - (blockSize  * (row)),
        (startBlock + width) * blockSize,1 - (blockSize  * (row +1)),      
    ]

}

let squareBase = "models/ui/button_base_square.glb"
let rectBase = "models/ui/button_base_rectangle.glb"

let SQUARE_GREEN:ButtonShapeData  = { shape : "models/ui/button_square_green.glb" , base: squareBase, isRect: false}
let SQUARE_RED:ButtonShapeData    = { shape :"models/ui/button_square_red.glb"  ,   base: squareBase, isRect: false}
let SQUARE_YELLOW:ButtonShapeData = { shape :"models/ui/button_square_yellow.glb"  , base: squareBase, isRect: false}
let SQUARE_PURPLE:ButtonShapeData = { shape :"models/ui/button_square_purple.glb"  , base: squareBase, isRect: false}
let SQUARE_WHITE:ButtonShapeData  = { shape : "models/ui/button_square_white.glb"  , base: squareBase, isRect: false}
let SQUARE_BLACK:ButtonShapeData  = { shape :"models/ui/button_square_black.glb"  , base: squareBase, isRect: false}

let RECT_GREEN:ButtonShapeData  = { shape :"models/ui/button_rectangle_green.glb"  , base: rectBase, isRect: true}
let RECT_RED:ButtonShapeData    = { shape :"models/ui/button_rectangle_red.glb"   ,  base: rectBase, isRect: true}
let RECT_YELLOW:ButtonShapeData = { shape :"models/ui/button_rectangle_yellow.glb"   , base: rectBase, isRect: true}
let RECT_PURPLE:ButtonShapeData = { shape :"models/ui/button_rectangle_purple.glb"   , base: rectBase, isRect: true}
let RECT_WHITE:ButtonShapeData  = { shape :"models/ui/button_rectangle_white.glb"   , base: rectBase, isRect: true}
let RECT_BLACK:ButtonShapeData  = { shape :"models/ui/button_rectangle_black.glb"   , base: rectBase, isRect: true}

//UI atlas
export let uiAtlas = 'images/AtlasGames.png'




//square icons
let checkmark:IconData ={ uvs:getUVs(0, 0, 1)}   
let close:IconData ={ uvs:getUVs(0, 1, 1)} 
let restart:IconData ={ uvs:getUVs(0, 2, 1)} 
let play:IconData ={ uvs:getUVs(0, 3, 1)} 
let timer:IconData ={ uvs:getUVs(0, 4, 1)} 
let clock:IconData ={ uvs:getUVs(0, 5, 1)} 
let results:IconData ={ uvs:getUVs(0, 6, 1)} 
let sound:IconData ={ uvs:getUVs(0, 7, 1)} 
let music:IconData ={ uvs:getUVs(0, 8, 1)} 
let flag:IconData ={ uvs:getUVs(0, 9, 1)} 
let leftArrow:IconData ={uvs:getUVs(0, 10, 1)} 
let rightArrow:IconData ={ uvs:getUVs(0, 11, 1)} 
let upArrow:IconData ={ uvs:getUVs(0, 12, 1)} 
let downArrow:IconData ={ uvs:getUVs(0, 13, 1)} 
let hint:IconData ={ uvs:getUVs(0, 14, 1)} 
let menu:IconData ={ uvs:getUVs(0, 15, 1)}
let undo:IconData ={ uvs:getUVs(1, 2, 1)}

// numbers
let numbers:IconData[] = []
for(let i=0; i<10; i++){
    numbers.push({ uvs:getUVs(2, i, 1) })
}

let hashtag:IconData ={ uvs:getUVs(2, 10, 1)} 
let atSign:IconData ={ uvs:getUVs(2, 11, 1)} 
let dot:IconData ={ uvs:getUVs(2, 12, 1)} 
let parenthesesLeft :IconData ={ uvs:getUVs(2, 13, 1)} 
let parenthesesRight:IconData ={ uvs:getUVs(2, 14, 1)}
let exclamation:IconData ={ uvs:getUVs(2, 15, 1)}



  
export let iconData = {
       icons:{            
            checkmark,
            close,
            restart,
            play,
            timer,
            clock,
            results,
            sound,
            music,
            flag,
            leftArrow,
            rightArrow,
            upArrow,
            downArrow,
            hint,
            menu,
            hashtag,
            atSign,
            dot,
            parenthesesLeft,
            parenthesesRight,
            exclamation,
            undo
        },        
        shapes:{
            SQUARE_GREEN,
            SQUARE_RED,
            SQUARE_YELLOW,
            SQUARE_PURPLE,
            SQUARE_WHITE,
            SQUARE_BLACK,
            RECT_GREEN,
            RECT_RED,
            RECT_YELLOW,
            RECT_PURPLE,
            RECT_WHITE,
            RECT_BLACK
        }    ,
        numbers
    }