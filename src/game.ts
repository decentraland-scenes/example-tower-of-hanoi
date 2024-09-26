import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { Animator, AudioSource, Billboard, ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, MeshCollider, MeshRenderer, PBTween, Schemas, Transform, TransformType, Tween, TweenSequence, VisibilityComponent, engine, pointerEventsSystem } from '@dcl/sdk/ecs'

import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/players'
import { queue, sceneParentEntity, ui, progress } from "@dcl-sdk/mini-games/src"

import * as utils from "@dcl-sdk/utils"

import { movePlayerTo } from '~system/RestrictedActions'
import { initStatusBoard } from './statusBoard'
import { backSign } from './environment'

const maxLevel = 5
const maxDiscs = maxLevel + 2
const towerLocations = [3.75, 0, -3.75]
const startLevelCoundown = 4

let enabledSounds = true
let movesHistory: any = []
const gameButtons: ui.MenuButton[] = []
const planks: Entity[] = []
let gameAreaCollider: Entity
let timer: ui.Timer3D
let maxProgress: progress.IProgress


const sounds = engine.addEntity()
Transform.create(sounds, { parent: engine.CameraEntity })

export let gameDataEntity: Entity

export const GameData = engine.defineComponent('game-data', {
  playerAddress: Schemas.String,
  playerName: Schemas.String,
  moves: Schemas.Number,
  levelStartedAt: Schemas.Int64,
  levelFinishedAt: Schemas.Int64,
  currentLevel: Schemas.Number,
})

export const Disc = engine.defineComponent('disc', {
  size: Schemas.Number,
  currentTower: Schemas.Number,
  isSelected: Schemas.Boolean
})

export function initGame() {

  getMaxProgress()

  initGameButtons()

  initCountdownNumbers()

  initPlanks()

  // start game button
  new ui.MenuButton(
    {
      parent: sceneParentEntity,
      position: Vector3.create(-3.74, 1.03, 0),
      rotation: Quaternion.fromEulerDegrees(-45, 90, 0),
      scale: Vector3.create(1.2, 1.2, 1.2)
    },
    ui.uiAssets.shapes.RECT_GREEN,
    ui.uiAssets.icons.playText,
    "PLAY GAME",
    () => {
      queue.addPlayer()
    }
  )

  gameAreaCollider = engine.addEntity()
  Transform.create(gameAreaCollider, {
    parent: sceneParentEntity,
    position: Vector3.create(1.5, 0, 0),
    scale: Vector3.create(9.75, 16, 12.5)
  })

  queue.initQueueDisplay({
    parent: sceneParentEntity,
    position: Vector3.create(-3.48, 1.47, 0),
    rotation: Quaternion.fromEulerDegrees(0, -90, 0),
    scale: Vector3.create(1, 1, 1)
  })


  disableGame()

  console.log("init discs")
  initDiscs()

  console.log("init playerData")
  initPlayerData()

  console.log("init statusBoard")
  initStatusBoard()

  console.log("init setupAnimations")
  setupWinAnimations()

  queue.listeners.onActivePlayerChange = (player) => {
    const localPlayer = getPlayer()
    if (player?.address === localPlayer?.userId) {
      getReadyToStart()
    } else {
      disableGame()
      firstRound = true
    }
  }

}

async function getMaxProgress() {
  const req = await progress.getProgress('level', progress.SortDirection.DESC, 1)
  if (req?.length) maxProgress = req[0]
}

function initPlanks() {
  for (const location of towerLocations) {
    const entity = engine.addEntity()
    Transform.create(entity, {
      parent: sceneParentEntity,
      position: Vector3.create(3.25, 0, location),
      scale: Vector3.create(1, 1, 1)
    })

    const plankEntity = engine.addEntity()
    GltfContainer.create(plankEntity, { src: `assets/scene/plank.glb`, visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS })
    Transform.create(plankEntity, {
      parent: entity
    })

    const colliderEntity = engine.addEntity()
    Transform.create(colliderEntity, {
      parent: entity,
      position: Vector3.create(0, 1.25, 0),
      scale: Vector3.create(1, 2.5, 1)
    })
    MeshCollider.setCylinder(colliderEntity, 1, 1, ColliderLayer.CL_POINTER)
    // MeshRenderer.setCylinder(colliderEntity, 1, 1)
    planks.push(colliderEntity)
  }
}

function initCountdownNumbers() {
  timer = new ui.Timer3D({
    parent: sceneParentEntity,
    position: Vector3.create(3, 3, 0),
    rotation: Quaternion.fromEulerDegrees(0, -90, 0)
  }, 1, 1, false, 10)

  timer.hide()
}

function initGameButtons() {

  for (let i = 0; i < maxLevel; i++) {
    gameButtons.push(new ui.MenuButton({
      parent: backSign,
      position: Vector3.create(1.75 - (0.75 * i), 4.30, 0.1),
      scale: Vector3.create(2.4, 2.4, 2.4),
      rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
    },
      ui.uiAssets.shapes.SQUARE_GREEN,
      ui.uiAssets.numbers[i + 1],
      `START LEVEL ${i + 1}`,
      () => startLevel(i + 1),
      undefined,
      startLevelCoundown * 1000
    ))
  }

  // gameButtons.push(new ui.MenuButton({
  //   parent: backSign,
  //   position: Vector3.create(1, 4.30, 0.1),
  //   scale: Vector3.create(2.4, 2.4, 2.4),
  //   rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
  // },
  //   ui.uiAssets.shapes.SQUARE_GREEN,
  //   ui.uiAssets.numbers[2],
  //   "START LEVEL 2",
  //   () => startLevel(2)
  // ))

  // gameButtons.push(new ui.MenuButton({
  //   parent: backSign,
  //   position: Vector3.create(0.25, 4.30, 0.1),
  //   scale: Vector3.create(2.4, 2.4, 2.4),
  //   rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
  // },
  //   ui.uiAssets.shapes.SQUARE_GREEN,
  //   ui.uiAssets.numbers[3],
  //   "START LEVEL 3",
  //   () => startLevel(3)
  // ))

  gameButtons.push(new ui.MenuButton({
    parent: backSign,
    position: Vector3.create(-2, 4.30, 0.1),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
  },
    ui.uiAssets.shapes.SQUARE_RED,
    ui.uiAssets.icons.undo,
    "UNDO LAST MOVE",
    () => undo()
  ))

  gameButtons.push(new ui.MenuButton({
    parent: backSign,
    position: Vector3.create(-2.75, 4.30, 0.1),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
  },
    ui.uiAssets.shapes.SQUARE_RED,
    ui.uiAssets.icons.restart,
    "RESTART LEVEL",
    () => startLevel(GameData.get(gameDataEntity).currentLevel),
    undefined,
    startLevelCoundown * 1000
  ))

  gameButtons.push(new ui.MenuButton({
    parent: backSign,
    position: Vector3.create(-2.6, 5.7, 0.1),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
  },
    ui.uiAssets.shapes.SQUARE_RED,
    ui.uiAssets.icons.sound,
    'Sound FX',
    () => enabledSounds = !enabledSounds
  ))

  gameButtons.push(new ui.MenuButton({
    parent: backSign,
    position: Vector3.create(2.75, 5.7, 0.1),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 90, 90)
  },
    ui.uiAssets.shapes.RECT_RED,
    ui.uiAssets.icons.exitText,
    'Exit from game area',
    () => exitPlayer(true)
  ))
}

function exitPlayer(move = false) {
  if (move) {
    movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
  }
  firstRound =  true
  disableGame()
  GameData.createOrReplace(gameDataEntity, { playerAddress: '', playerName: '', currentLevel: -1 })

  queue.setNextPlayer()
}
function initPlayerData() {

  gameDataEntity = engine.addEntity()
  GameData.create(gameDataEntity, { playerAddress: '', playerName: '', currentLevel: -1 })
  syncEntity(gameDataEntity, [GameData.componentId], 3002)

}

function disableGame() {
  //TODO: check if collider always on is ok. Else add remove collider for playing.
  MeshCollider.setBox(gameAreaCollider, ColliderLayer.CL_PHYSICS)
  for (const button of gameButtons) {
    button.disable()
  }

  //remove click trigger for towers
  for (const entity of planks) {
    pointerEventsSystem.removeOnPointerDown(entity)
  }
}

let firstRound = true
function enableGame() {
  // MeshCollider.deleteFrom(gameAreaCollider)
  const gameData = GameData.get(gameDataEntity)

  //setup backsign buttons only the first time
  if (firstRound) {
    firstRound = false
    //enable buttons from backsign
    gameButtons.forEach((button, i) => {
      if (i <= maxLevel - 1) {
        //set level buttons according to currentLevel
        if (i === 0) {
          button.enable()
        }else if ( i < (maxProgress?.level ?? gameData.currentLevel) ) {
          button.enable()
        } else {
          button.disable()
        }
      } else {
        button.enable()
      }
    })
  }

  //add click trigger for towers
  planks.forEach((entity, i) => {

    pointerEventsSystem.onPointerDown(
      {
        entity: entity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: `SELECT TOWER ${i + 1}`,
          maxDistance: 15
        }
      },
      () => onTowerClick(i)
    )
  })

}


async function countdown(cb: () => void, number: number) {

  let currentValue = number
  let time = 1

  engine.addSystem((dt: number) => {
    time += dt

    if (time >= 1) {
      time = 0

      if (currentValue > 0) {
        timer.show()
        timer.setTimeAnimated(currentValue--)
      } else {
        timer.hide()
        engine.removeSystem("countdown-system")
        cb && cb()
      }

    }
  }, undefined, "countdown-system")

}

function getReadyToStart() {

  AudioSource.createOrReplace(sounds, {
    audioClipUrl: "sounds/pre_countdown.mp3",
    playing: enabledSounds
  })

  utils.timers.setTimeout(() => {
    movePlayerTo({ newRelativePosition: Vector3.create(6.5, 2, 8), cameraTarget: Vector3.create(13, 2, 8) })
    startLevel(1)

  }, 4000)
  // countdown(() => {
  // }, 4)
}

function undo() {
  const [entity, disc] = movesHistory.pop()
  landDisc(entity, disc.currentTower)
  GameData.getMutable(gameDataEntity).moves = movesHistory.length
}

function onTowerClick(towerNumber: number) {
  if (!queue.isActive()) return

  if (getSelectedDisc()) {
    validateMove(towerNumber)
  } else {
    selectDisc(towerNumber)
  }
}

function getSelectedDisc() {
  const discEntities = [...engine.getEntitiesWith(Disc)]
  return discEntities.find(([entity, disc]) => disc.isSelected)
}

function validateMove(tower: number) {

  const selected = getSelectedDisc()
  if (!selected) return

  //disc is already on currentTower
  if (selected[1].currentTower === tower) {
    landDisc(selected[0], tower)
    clearSelection()
  }

  const towerEntities = [...engine.getEntitiesWith(Disc)].filter(([entity, disc]) => disc.currentTower === tower)

  let towerMinSize = Math.min(...towerEntities.map(([entity, disc]) => disc.size))

  //move is valid
  if (selected[1].size < towerMinSize) {
    movesHistory.push(selected)
    GameData.getMutable(gameDataEntity).moves = movesHistory.length

    landDisc(selected[0], tower)

    clearSelection()

    //validate win
    if (tower === 2) {
      const discs = [...engine.getEntitiesWith(Disc)].filter(disc => disc[1]["currentTower"] !== -1)
      const towerDiscs = discs.filter(disc => disc[1]["currentTower"] === 2)

      if (towerDiscs.length === discs.length) {

        onFinishLevel()
      }
    }
  }

}

function onFinishLevel() {
  const gameData = GameData.getMutable(gameDataEntity)
  gameData.levelFinishedAt = Date.now()

  AudioSource.createOrReplace(sounds, {
    audioClipUrl: "sounds/win.mp3",
    playing: enabledSounds,
    volume: 2
  })

  progress.upsertProgress({
    level: gameData.currentLevel,
    time: gameData.levelFinishedAt - gameData.levelStartedAt,
    moves: gameData.moves
  })


  startWinAnimation()
}

function landDisc(discEntity: Entity, tower: number) {

  const discData = Disc.getMutable(discEntity)
  const discTransform = Transform.get(discEntity)
  const sameTower = discData.currentTower === tower
  discData.currentTower = tower

  const towerEntities = [...engine.getEntitiesWith(Disc)].filter(([entity, disc]) => disc.currentTower === tower)

  const horizontalTween = {
    mode: Tween.Mode.Move({
      start: { ...discTransform.position, y: 3 },
      end: { ...discTransform.position, y: 3, z: towerLocations[tower] }
    }),
    duration: 300,
    easingFunction: EasingFunction.EF_EASEOUTEXPO
  }

  const verticalTween = {
    mode: Tween.Mode.Move({
      start: { ...discTransform.position, y: 3, z: towerLocations[tower] },
      end: { ...discTransform.position, y: getLandingHeight(towerEntities.length - 1), z: towerLocations[tower] }
    }),
    duration: 300,
    easingFunction: EasingFunction.EF_EASEOUTEXPO
  }

  const tweensSequence: PBTween[] = []

  if (!sameTower) {
    tweensSequence.push(horizontalTween)
  }

  tweensSequence.push(verticalTween)

  Tween.createOrReplace(discEntity, tweensSequence.shift())

  if (tweensSequence.length) {
    TweenSequence.createOrReplace(discEntity, {
      sequence: [
        ...tweensSequence
      ]
    })
  }

  AudioSource.createOrReplace(sounds, {
    audioClipUrl: 'sounds/place.mp3',
    playing: enabledSounds,
  })
}

function getLandingHeight(towerDiscsCount: number) {
  const height = 0.25 + towerDiscsCount * 0.3
  return height
}


function clearSelection() {
  const selectedEntity = [...engine.getEntitiesWith(Disc)].find(([entity, disc]) => disc.isSelected)
  if (selectedEntity) Disc.getMutable(selectedEntity[0]).isSelected = false
}

function selectDisc(tower: number) {
  const discs = engine.getEntitiesWith(Disc)

  let minSize: number = 100
  let selectedEntity

  for (const [entity] of discs) {
    const discEntity = Disc.get(entity)
    if (discEntity.currentTower === tower) {

      if (discEntity.size < minSize) {
        minSize = discEntity.size
        selectedEntity = entity
      }

    }
  }

  if (selectedEntity) {
    Disc.getMutable(selectedEntity).isSelected = true
    elevateDisc(selectedEntity)
  }
}


function elevateDisc(discEntity: Entity) {
  const selectedTransform = Transform.get(discEntity)

  Tween.createOrReplace(discEntity, {
    mode: Tween.Mode.Move({
      start: selectedTransform.position,
      end: { ...selectedTransform.position, y: 3 }
    }),
    duration: 300,
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
  })

  AudioSource.createOrReplace(sounds, {
    audioClipUrl: 'sounds/select.mp3',
    playing: enabledSounds,
  })
}

function initDiscs() {
  for (var i = 1; i <= maxDiscs; i++) {

    const entity = engine.addEntity()

    Transform.create(entity, {
      parent: sceneParentEntity,
      position: { x: 3.25, y: -5, z: towerLocations[0] }
    })

    GltfContainer.create(entity, { src: `assets/scene/disc${i}.glb`, visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS })
    Disc.create(entity, { size: i, currentTower: 1 })

    syncEntity(
      entity,
      [Tween.componentId, Disc.componentId],
      5000 + i
    )
  }
}

function startLevel(levelN: number) {
  if (!queue.isActive()) return

  AudioSource.createOrReplace(sounds, {
    audioClipUrl: "sounds/countdown.mp3",
    playing: enabledSounds
  })

  clearSelection()
  const localPlayer = getPlayer()
  const playerData = GameData.getMutable(gameDataEntity)
  playerData.currentLevel = levelN
  playerData.moves = 0
  playerData.levelStartedAt = 0
  playerData.levelFinishedAt = 1

  if (localPlayer) {
    playerData.playerName = localPlayer.name
  }

  countdown(() => {

    playerData.levelStartedAt = Date.now()
    playerData.levelFinishedAt = 0

    const discs = [...engine.getEntitiesWith(Disc)]

    for (var i = 0; i <= maxDiscs - 1; i++) {

      const entity = (discs.find(([entity, disc]) => disc.size === i + 1) || [])[0]

      if (!entity) continue

      if (i <= levelN + 1) {
        Tween.createOrReplace(entity, {
          mode: Tween.Mode.Move({
            start: Transform.get(entity).position,
            end: { x: 3.25, y: getLandingHeight(levelN + 1 - i), z: towerLocations[0] }
          }),
          duration: 300,
          easingFunction: EasingFunction.EF_EASEOUTEXPO
        })
        Disc.getMutable(entity).currentTower = 0
      } else {
        Tween.createOrReplace(entity, {
          mode: Tween.Mode.Move({
            start: Transform.get(entity).position,
            end: { x: 3.25, y: -5, z: 13 }
          }),
          duration: 10,
          easingFunction: EasingFunction.EF_EASEOUTEXPO
        })
        Disc.getMutable(entity).currentTower = -1
      }
      movesHistory = []
    }

    enableGame()
  }, startLevelCoundown)

}

function setupWinAnimations() {
  let winAnimA = engine.addEntity()
  let winAnimB = engine.addEntity()
  let winAnimC = engine.addEntity()
  let winAnimFollow = engine.addEntity()
  let winAnimText = engine.addEntity()

  GltfContainer.create(winAnimA, {
    src: "mini-game-assets/models/winAnim.glb",

  })

  Transform.create(winAnimA, {
    position: Vector3.create(14, 0.2, 2),
    scale: Vector3.create(1, 1, 1),
    rotation: Quaternion.fromEulerDegrees(0, 45, 0)
  })

  Animator.create(winAnimA, {
    states: [
      {
        clip: 'armature_psAction',
        playing: false,
        loop: false
      }
    ]
  })

  GltfContainer.create(winAnimB, {
    src: "mini-game-assets/models/winAnim.glb"

  })

  Transform.create(winAnimB, {
    position: Vector3.create(14, 0.2, 8),
    scale: Vector3.create(1, 1, 1),
    rotation: Quaternion.fromEulerDegrees(0, 0, 0)
  })

  Animator.create(winAnimB, {
    states: [
      {
        clip: 'armature_psAction',
        playing: false,
        loop: false
      }
    ]
  })

  GltfContainer.create(winAnimC, {
    src: "mini-game-assets/models/winAnim.glb"
  })

  Transform.create(winAnimC, {
    position: Vector3.create(14, 0.2, 14),
    scale: Vector3.create(1, 1, 1),
    rotation: Quaternion.fromEulerDegrees(0, -45, 0)
  })

  Animator.create(winAnimC, {
    states: [
      {
        clip: 'armature_psAction',
        playing: false,
        loop: false
      }
    ]
  })

  GltfContainer.create(winAnimFollow, {
    src: "mini-game-assets/models/winAnimFollow.glb"
  })

  Transform.create(winAnimFollow, {
    position: Vector3.create(10, 2, 8),
    scale: Vector3.create(0.3, 0.3, 0.3),
    rotation: Quaternion.fromEulerDegrees(0, -90, 0)
  })
  Billboard.create(winAnimFollow, {})

  Animator.create(winAnimFollow, {
    states: [
      {
        clip: 'RaysAnim',
        playing: false,
        loop: false
      }
    ]
  })

  GltfContainer.create(winAnimText, {
    src: "mini-game-assets/models/winAnimText.glb"
  })

  Animator.create(winAnimText, {
    states: [
      {
        clip: 'Animation',
        playing: false,
        loop: false
      }
    ]
  })

  Transform.create(winAnimText, {
    position: Vector3.create(10, 2, 8),
    scale: Vector3.create(0.8, 0.8, 0.8),
    rotation: Quaternion.fromEulerDegrees(0, -90, 0)
  })
  Billboard.create(winAnimText, {})

  VisibilityComponent.create(winAnimA, { visible: false })
  VisibilityComponent.create(winAnimB, { visible: false })
  VisibilityComponent.create(winAnimC, { visible: false })
  VisibilityComponent.create(winAnimFollow, { visible: false })
  VisibilityComponent.create(winAnimText, { visible: false })

  syncEntity(winAnimA, [VisibilityComponent.componentId, Animator.componentId])
  syncEntity(winAnimB, [VisibilityComponent.componentId, Animator.componentId])
  syncEntity(winAnimC, [VisibilityComponent.componentId, Animator.componentId])
  syncEntity(winAnimFollow, [VisibilityComponent.componentId, Animator.componentId])
  syncEntity(winAnimText, [VisibilityComponent.componentId, Animator.componentId])
}

function startWinAnimation() {
  const animations = engine.getEntitiesWith(Animator, VisibilityComponent)
  for (const [entity] of animations) {
    VisibilityComponent.getMutable(entity).visible = true
    Animator.getMutable(entity).states[0].playing = true
  }

  utils.timers.setTimeout(() => {

    const animations = engine.getEntitiesWith(Animator, VisibilityComponent)
    for (const [entity] of animations) {
      VisibilityComponent.getMutable(entity).visible = false
    }
    console.log("GameData current level: ", GameData.get(gameDataEntity).currentLevel)
    if (GameData.get(gameDataEntity).currentLevel <= maxLevel) {
      // console.log("playersQueue: ", queue.getQueue())
      //add challenge check
      if (queue.getQueue().length > 1) {
        queue.setNextPlayer()
      } else {
        const nextLevel = GameData.get(gameDataEntity).currentLevel + 1
        console.log(nextLevel)
        if (nextLevel === maxLevel + 1) {
          queue.setNextPlayer()
        } else {
          gameButtons[nextLevel - 1].enable()
          startLevel(nextLevel)
        }
      }
    }
  }, 8000)
}
