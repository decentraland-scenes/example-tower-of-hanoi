import { syncEntity } from "@dcl/sdk/network"
import { CameraModeArea, CameraType, ColliderLayer, engine, Entity, MeshCollider, PlayerIdentityData, Schemas, Transform } from "@dcl/sdk/ecs"
import { getPlayer } from "@dcl/sdk/src/players"
import { movePlayerTo } from "~system/RestrictedActions"
import { Vector3 } from "@dcl/sdk/math"
import { startGame } from "../game"

const sessionMaxTime = 300 //in seconds
const gameLoopTime = 1 //times in seconds

let gameAreaCollider: Entity


export const MultiPlayer = engine.defineComponent('player', {
    id: Schemas.String,
    name: Schemas.String,
    arrivedAt: Schemas.Int64,
    moves: Schemas.Number,
    levelStartedAt: Schemas.Int64,
    currentLevel: Schemas.Number,
    queue: Schemas.Array(Schemas.Map({
        name: Schemas.String,
        id: Schemas.String
    }))
})

export let multiPlayerEntity: Entity

export function initPlayerData() {

    multiPlayerEntity = engine.addEntity()
    MultiPlayer.create(multiPlayerEntity, { id: '', name: '', currentLevel: -1 })
    syncEntity(multiPlayerEntity, [MultiPlayer.componentId], 3002)

    let elapsedTime = 0
    engine.addSystem((dt: number) => {
        elapsedTime += dt

        if (elapsedTime >= gameLoopTime) {
            elapsedTime = 0
            checkTimer()
            checkPlayerIsAlive()
        }
    })

    //create collider to limit external players
    gameAreaCollider = engine.addEntity()
    Transform.create(gameAreaCollider, {
        position: Vector3.create(9.5, 0, 8),
        scale: Vector3.create(9.75, 16, 12.5)
    })
    setCollider()
}

export function checkPlayerIsAlive() {
    const networkPlayer = MultiPlayer.get(multiPlayerEntity)
    const localPlayer = getPlayer()

    if (networkPlayer.id == '') return setCollider()

    const connectedPlayers = [...engine.getEntitiesWith(PlayerIdentityData, Transform)]

    const playerInGameArea = connectedPlayers.some(([entity, playerData, transform]) => {
        return playerData.address === networkPlayer.id &&
            transform.position.x >= 5.15 && transform.position.x <= 13.77 &&
            transform.position.z >= 2.23 && transform.position.z <= 13.77
    })

    if (!playerInGameArea) {
        if (Date.now() > networkPlayer.arrivedAt + 3000) {
            //player has been playing 3 sec and left
            setCollider()
            switchToNextPlayer()
        } else {
            if (localPlayer?.userId === networkPlayer.id) {
                //player just arrived
                console.log('player just arrived')
                setCurrentPlayer()
                startGame()
            }
        }
    }
}

function switchToNextPlayer() {
    const multiplayer = MultiPlayer.getMutable(multiPlayerEntity)

    if (multiplayer.queue.length) {

        const newPlayer = multiplayer.queue[0]
        multiplayer.queue = multiplayer.queue.slice(1, multiplayer.queue.length)

        const playersInScene = [...engine.getEntitiesWith(PlayerIdentityData)]
        const newPlayerIsAlive = playersInScene.some(([entity, player]) => player.address === newPlayer.id)

        if (newPlayerIsAlive) {
            //pre-set data to prevent race condition on sync
            multiplayer.id = newPlayer.id
            multiplayer.name = newPlayer.name
            multiplayer.moves = 0
            multiplayer.arrivedAt = Date.now()

            const localPlayer = getPlayer()

            if (localPlayer?.userId === newPlayer.id) {
                setCurrentPlayer()
                startGame()
            }
        } else {
            switchToNextPlayer()
        }

    } else {
        multiplayer.id = ''
        multiplayer.name = ''
    }
}

export function checkCurrentPlayer() {
    const localPlayer = getPlayer()
    const networkPlayer = MultiPlayer.get(multiPlayerEntity)

    if (networkPlayer.id === localPlayer?.userId) {
        return true
    }

    return false
}

export function setCurrentPlayer() {
    const localPlayer = getPlayer()
    const multiPlayer = MultiPlayer.getMutable(multiPlayerEntity)

    if (localPlayer && (multiPlayer.id === '' || multiPlayer.id === localPlayer?.userId)) {
        multiPlayer.id = localPlayer.userId
        multiPlayer.name = localPlayer.name
        multiPlayer.arrivedAt = Date.now()
        multiPlayer.moves = 0

        MeshCollider.deleteFrom(gameAreaCollider)
        return true
    }
    addToQueue()
    return false
}

function addToQueue() {
    const localPlayer = getPlayer()
    const multiPlayer = MultiPlayer.get(multiPlayerEntity)

    if (localPlayer && !multiPlayer.queue.find(player => player.id === localPlayer?.userId)) {
        MultiPlayer.getMutable(multiPlayerEntity).queue.push({ id: localPlayer.userId, name: localPlayer.name })
    }
}

export function checkTimer() {
    //kick the player after 5 minutes (sessionMaxTime)
    const multiPlayer = MultiPlayer.get(multiPlayerEntity)
    const localPlayer = getPlayer()

    if (multiPlayer.id !== '' || multiPlayer.queue.length) {
        const now = Date.now()
        if (now - multiPlayer.arrivedAt >= sessionMaxTime * 1000) {
            //kickPlayer
            if (localPlayer?.userId === multiPlayer.id) {
                switchToNextPlayer()
                movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
                setCollider()
            }
        }
    }
}

function setCollider() {
    MeshCollider.setBox(gameAreaCollider, ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER)
}