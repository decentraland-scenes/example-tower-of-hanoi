import { engine, Entity, TextAlignMode, TextShape, Transform } from "@dcl/sdk/ecs"
import { GameData, gameDataEntity } from "./minigame-multiplayer/multiplayer"
import { Quaternion, Vector3 } from "@dcl/sdk/math"

let movesEntity: Entity
let timeEntity: Entity
let playerNameEntity: Entity

export function initStatusBoard() {
    movesEntity = engine.addEntity()
    timeEntity = engine.addEntity()
    playerNameEntity = engine.addEntity()
    
    Transform.create(movesEntity, {
      position: Vector3.create(14.85, 5.05, 5.4),
      rotation: Quaternion.fromEulerDegrees(0, 90, 0)
    })
    
    Transform.create(timeEntity, {
      position: Vector3.create(14.85, 5.05, 6.6),
      rotation: Quaternion.fromEulerDegrees(0, 90, 0)
    })
    
    Transform.create(playerNameEntity, {
      position: Vector3.create(14.85, 5.25, 10.4),
      rotation: Quaternion.fromEulerDegrees(0, 90, 0)
    })


    let elapsedTime = 0
    const gameLoopFreq = 1

    engine.addSystem((dt: number) => {
        elapsedTime += dt

        if (elapsedTime >= gameLoopFreq) {
            elapsedTime = 0
            updateTexts()
        }
    })
}

function updateTexts() {
    const gameData = GameData.get(gameDataEntity)
    const gameElapsedTime = ((gameData.levelFinishedAt || Date.now()) - gameData.levelStartedAt) / 1000
    const minutes = Math.floor(gameElapsedTime / 60)
    const seconds = Math.round(gameElapsedTime) - minutes * 60

    TextShape.createOrReplace(playerNameEntity, {
        text: `${gameData.playerName}`,
        fontSize: 3,
        textAlign: TextAlignMode.TAM_TOP_LEFT
    })

    if (gameData.currentLevel > 0) {
        TextShape.createOrReplace(timeEntity, {
            text: `${minutes.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}:${seconds.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}`,
            fontSize: 3
        })
    } else {
        TextShape.createOrReplace(timeEntity, {
            text: '',
            fontSize: 3
        })

    }

    TextShape.createOrReplace(movesEntity, {
        text: `${gameData.moves}`,
        fontSize: 3
    })
}