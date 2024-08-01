import { syncEntity } from "@dcl/sdk/network"
import { ColliderLayer, engine, Entity, MeshCollider, PlayerIdentityData, Schemas, Transform } from "@dcl/sdk/ecs"
import { getPlayer } from "@dcl/sdk/src/players"
import { movePlayerTo } from "~system/RestrictedActions"
import { Quaternion, Vector3 } from "@dcl/sdk/math"
// import { startGame } from "../game"
import { QueueDisplay, SCREENS } from "../minigame-ui/queueDisplay"

const sessionMaxTime = 300 //in seconds
const gameLoopTime = 1 //times in seconds

let gameAreaCollider: Entity


export const GameData = engine.defineComponent('game-data', {
    playerAddress: Schemas.String,
    playerName: Schemas.String,
    playerArrivedAt: Schemas.Int64,
    moves: Schemas.Number,
    levelStartedAt: Schemas.Int64,
    levelFinishedAt: Schemas.Int64,
    currentLevel: Schemas.Number,   
    queue: Schemas.Array(Schemas.Map({
        name: Schemas.String,
        address: Schemas.String
    }))
})

export let gameDataEntity: Entity

let queueDisplay: QueueDisplay
// let queueDisplay: QueueDisplay = new QueueDisplay({
//     position: Vector3.create(4.52, 1.47, 8),
//     rotation: Quaternion.fromEulerDegrees(0, -90, 0)
// },
//     false
// )

export function initPlayerData() {

    gameDataEntity = engine.addEntity()
    GameData.create(gameDataEntity, { playerAddress: '', playerName: '', currentLevel: -1 })
    syncEntity(gameDataEntity, [GameData.componentId], 3002)

    let elapsedTime = 0
    engine.addSystem((dt: number) => {
        elapsedTime += dt

        if (elapsedTime >= gameLoopTime) {
            elapsedTime = 0
            checkSessionTimer()
            checkPlayerIsAlive()
        }
    })

    //create collider to limit external players
    gameAreaCollider = engine.addEntity()
    Transform.create(gameAreaCollider, {
        position: Vector3.create(9.5, 0, 8),
        scale: Vector3.create(9.75, 16, 12.5)
    })

    
    queueDisplay = new QueueDisplay({
        position: Vector3.create(4.52, 1.47, 8),
        rotation: Quaternion.fromEulerDegrees(0, -90, 0),
        scale: Vector3.create(1, 1, 1)
    })
    setCollider()
}

export function checkPlayerIsAlive() {
    const gameData = GameData.get(gameDataEntity)
    const localPlayer = getPlayer()
    // console.log('cheking player alive')

    if (gameData.playerAddress == '') return setCollider()

    const connectedPlayers = [...engine.getEntitiesWith(PlayerIdentityData, Transform)]

    const playerInGameArea = connectedPlayers.some(([entity, playerData, transform]) => {
        return playerData.address === gameData.playerAddress &&
            transform.position.x >= 5.15 && transform.position.x <= 13.77 &&
            transform.position.z >= 2.23 && transform.position.z <= 13.77
    })
    if (!playerInGameArea) {
        if (Date.now() > gameData.playerArrivedAt + 3000) {
            console.log('player left')
            //player left
            setCollider()
            switchToNextPlayer()
        } else {
            if (localPlayer?.userId === gameData.playerAddress) {
                //this player will start
                getReadyToStart()
            }
        }
    }
}

let enterCountdown = false

function getReadyToStart () {
    queueDisplay.setScreen(SCREENS.playNext)
    setCurrentPlayer()
    
    if (enterCountdown) return
    enterCountdown = true
    delayedFunction(2, () => {
        console.log("startGame")
        // startGame()
        queueDisplay.disable()
        delayedFunction(1, () => enterCountdown = false)
    })
}


function delayedFunction(time: number, cb: () => void) {
    let timer = 0
    const name = `timer-${Math.random()}`
    engine.addSystem(dt => {
        timer += dt
        if (timer >= time) {
            cb()
            timer = 0
            engine.removeSystem(name)
        }
    }, undefined, name)
}

function switchToNextPlayer() {
    const gameData = GameData.getMutable(gameDataEntity)

    if (gameData.queue.length) {

        const newPlayer = gameData.queue[0]
        gameData.queue = gameData.queue.slice(1, gameData.queue.length)

        const playersInScene = [...engine.getEntitiesWith(PlayerIdentityData)]
        const newPlayerIsAlive = playersInScene.some(([entity, player]) => player.address === newPlayer.address)

        if (newPlayerIsAlive) {
            //pre-set data to prevent race condition on sync
            gameData.playerAddress = newPlayer.address
            gameData.playerName = newPlayer.name
            gameData.moves = 0
            gameData.playerArrivedAt = Date.now()

            const localPlayer = getPlayer()

            if (localPlayer?.userId === newPlayer.address) {
                // setCurrentPlayer()
                // startGame()
                getReadyToStart()
            }
        } else {
            switchToNextPlayer()
        }

    } else {
        gameData.playerAddress = ''
        gameData.playerName = ''
    }
}

export function checkCurrentPlayer() {
    const localPlayer = getPlayer()
    const gameData = GameData.get(gameDataEntity)

    if (gameData.playerAddress === localPlayer?.userId) {
        return true
    }

    return false
}

export function setCurrentPlayer() {
    queueDisplay.enable()

    const localPlayer = getPlayer()
    const multiPlayer = GameData.getMutable(gameDataEntity)

    if (localPlayer && (multiPlayer.playerAddress === '' || multiPlayer.playerAddress === localPlayer?.userId)) {
        multiPlayer.playerAddress = localPlayer.userId
        multiPlayer.playerName = localPlayer.name
        multiPlayer.playerArrivedAt = Date.now()
        multiPlayer.moves = 0

        MeshCollider.deleteFrom(gameAreaCollider)

        return true
    }
    addToQueue()
    return false
}

function addToQueue() {
    const localPlayer = getPlayer()
    const gameData = GameData.get(gameDataEntity)

    if (localPlayer && !gameData.queue.find(player => player.address === localPlayer?.userId)) {
        GameData.getMutable(gameDataEntity).queue.push({ address: localPlayer.userId, name: localPlayer.name })
        queueDisplay.setScreen(SCREENS.addToQueue)
        delayedFunction(2, () => queueDisplay.setScreen(SCREENS.queueList))
    }
}

export function checkSessionTimer() {
    //kick the player after 5 minutes (sessionMaxTime)
    const gameData = GameData.get(gameDataEntity)
    const localPlayer = getPlayer()

    if (gameData.playerAddress !== '' || gameData.queue.length) {
        const now = Date.now()
        if (now - gameData.playerArrivedAt >= sessionMaxTime * 1000) {
            //kickPlayer
            if (localPlayer?.userId === gameData.playerAddress) {
                switchToNextPlayer()
                movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
                setCollider()
            }
        }
    }
}

function setCollider() {
    MeshCollider.setBox(gameAreaCollider, ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER)
    // queueDisplay.disable()
}