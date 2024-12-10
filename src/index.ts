import { initGame } from "./game";
import { initEnvironment } from "./environment";
import { engine, RealmInfo } from "@dcl/sdk/ecs";

import { __DEV__ } from '@dcl/ecs/dist/runtime/invariant'


export function main() {
  initEnvironment()
  initGame()

  if (__DEV__) {
    //Enable local PLAY button
    let timer = 0
    engine.addSystem((dt: number) => {
      timer += dt
      if (timer < 10) return
      timer = 0
      const realmInfo = RealmInfo.getOrCreateMutable(engine.RootEntity)
      if (!realmInfo) return
      if (!realmInfo.isConnectedSceneRoom) {

        (globalThis as any).DEBUG_NETWORK_MESSAGES = false
        realmInfo.isConnectedSceneRoom = true
      }
    })
  }
}