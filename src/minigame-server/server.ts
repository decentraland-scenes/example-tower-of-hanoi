import { signedFetch } from "~system/SignedFetch"
import { GameData, gameDataEntity } from "../minigame-multiplayer/multiplayer"
import { getPlayer } from "@dcl/sdk/src/players"

const SERVER_URL = 'https://exploration-games.decentraland.zone'
const GAME_ID = "4ee1d308-5e1e-4b2b-9e91-9091878a7e3d"

function getProgress() {

}

export async function upsertProgress() {
    const gameData = GameData.get(gameDataEntity)
    const time = gameData.levelFinishedAt - gameData.levelStartedAt

console.log('upserting progress')

    const upsertRes = (await signedFetch({
        url: `${SERVER_URL}/api/games/${GAME_ID}/progress`, init: {
            method: "POST",
            body: JSON.stringify({
                level: gameData.currentLevel,
                time: time,
                moves: gameData.moves,
                user_name: getPlayer()?.name
            }),
            headers: {}
        }
    })).body

    //checkChallenges()
}

function getTopScores() {

}

function getChallenges() {

}

function checkChallenges() {

}