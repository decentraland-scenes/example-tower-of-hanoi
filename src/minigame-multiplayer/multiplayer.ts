import { syncEntity } from "@dcl/sdk/network"
import { engine, Entity, PlayerIdentityData, Schemas, Transform } from "@dcl/sdk/ecs"
import { getPlayer } from "@dcl/sdk/src/players"
import { movePlayerTo } from "~system/RestrictedActions"
import { Vector3 } from "@dcl/sdk/math"

const sessionMaxTime = 300 //in seconds
const gameLoopFreq = 1 //times per second

export const Player = engine.defineComponent('player', {
    id: Schemas.String,
    name: Schemas.String,
    arrivedAt: Schemas.Int64,
    moves: Schemas.Number,
    levelStartedAt: Schemas.Int64,
    currentLevel: Schemas.Number
})

export let playerEntity: Entity

export function initPlayerData() {
    playerEntity = engine.addEntity()

    Player.create(playerEntity, { id: '', name: '', currentLevel: -1 })
    Player.onChange(playerEntity, (data) => console.log(data))
    
    syncEntity(playerEntity, [Player.componentId], 3002)

    let elapsedTime = 0

    engine.addSystem((dt: number) => {
        elapsedTime += dt

        if (elapsedTime >= gameLoopFreq) {
            elapsedTime = 0
            checkTimer()
            checkPlayerIsAlive()
        }
    })
}

export function checkPlayerIsAlive() {
    const networkPlayer = Player.get(playerEntity)
    if (networkPlayer.id !== '') {
        const players = [...engine.getEntitiesWith(PlayerIdentityData, Transform)]
        const playerInGameArea = players.find(([entity, playerData, transform]) => {
            return playerData.address === networkPlayer.id && 
            transform.position.z >= 2.23 && transform.position.z <= 13.77 && 
            transform.position.x >= 5.15 && transform.position.x <= 13.77
        })
        
        if (!playerInGameArea) {
            clearPlayerData()
        }
    }
}

function clearPlayerData() {
    Player.createOrReplace(playerEntity, { id: '', name: '', moves: 0 })
}

export function checkCurrentPlayer() {
    const localPlayer = getPlayer()
    const networkPlayer = Player.get(playerEntity)

    if (!localPlayer) return false

    if (networkPlayer.id === localPlayer.userId) {
        return true
    }

    return false
}

export function setCurrentPlayer() {
    const localPlayer = getPlayer()
    const networkPlayer = Player.get(playerEntity)
    if (!localPlayer) return false

    if (networkPlayer.id === '') {
        Player.createOrReplace(playerEntity, { id: localPlayer.userId, name: localPlayer.name, arrivedAt: Date.now() })
        return true
    }

    return false
}

export function checkTimer() {
    //kick the player after 5 minutes (sessionMaxTime)
    const localPlayer = Player.get(playerEntity)

    if (localPlayer.id !== '') {
        const now = Date.now()
        if (now - localPlayer.arrivedAt >= sessionMaxTime * 1000) {
            clearPlayerData()
            movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
        }
    }
}