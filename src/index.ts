import { initGame } from "./game";
import { initEnvironment } from "./environment";
import { engine } from "@dcl/sdk/ecs";
import { syncEntity } from "@dcl/sdk/network";
import playersApi from '@dcl/sdk/players'
import * as playersQueue from "@dcl-sdk/players-queue/src"

console.log("init playersQueue")
playersQueue.initPlayersQueue(engine, syncEntity, playersApi)

export function main() {
    initEnvironment()
    initGame()
}