import { initGame } from "./game";
import { initEnvironment } from "./environment";
import { engine } from "@dcl/sdk/ecs";
import { syncEntity } from "@dcl/sdk/network";
import playersApi from '@dcl/sdk/players'
import * as miniGames from "@dcl-sdk/mini-games/src"

miniGames.initLibrary(engine as any, syncEntity, playersApi, { gameId: 'someGameId' })

export function main() {
    initEnvironment()
    initGame()
}