import { initGame } from "./game";
import { initEnvironment } from "./environment";
import { engine } from "@dcl/sdk/ecs";
import { syncEntity, isStateSyncronized } from "@dcl/sdk/network";
import playersApi from '@dcl/sdk/players'
import * as miniGames from "@dcl-sdk/mini-games/src"
import { Vector3 } from "@dcl/sdk/math";

const _1_SEC = 1000
const _1_MIN = _1_SEC * 60

miniGames.initLibrary(engine as any, syncEntity, playersApi, isStateSyncronized, {
  gameId: "4ee1d308-5e1e-4b2b-9e91-9091878a7e3d",
  environment: "prd",
  sceneRotation: 0,
  gameArea: {
    topLeft: Vector3.create(5.15, 0, 2.23),
    bottomRight: Vector3.create(13.77, 0, 13.77),
    exitSpawnPoint: Vector3.create(1, 1, 7)
  },
  gameTimeoutMs: 6 * _1_MIN,
  inactiveTimeoutMs: 40 * _1_SEC
})

export function main() {
    initEnvironment()
    initGame()
}