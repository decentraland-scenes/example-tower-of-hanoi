import { initGame } from "./game";
import { initEnvironment } from "./environment";
import { engine } from "@dcl/sdk/ecs";
import { syncEntity } from "@dcl/sdk/network";
import playersApi from '@dcl/sdk/players'
import * as miniGames from "@dcl-sdk/mini-games/src"
import { Vector3 } from "@dcl/sdk/math";

const _1_SEC = 1000
const _1_MIN = _1_SEC * 60

miniGames.initLibrary(engine as any, syncEntity, playersApi, {
    gameId: "4ee1d308-5e1e-4b2b-9e91-9091878a7e3d",
    environment: "dev",
    gameTimeoutMs: _1_MIN,
    sceneRotation: 0,
    gameArea: {
        topLeft: Vector3.create(5.15, 0, 2.23),
        bottomRight: Vector3.create(13.77, 0, 13.77),
        exitSpawnPoint: Vector3.create(0,0,7)
    }
})

export function main() {
    initEnvironment()
    initGame()
}