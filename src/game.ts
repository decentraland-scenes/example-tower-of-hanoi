import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { Animator, AudioSource, Billboard, ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBTween, PlayerIdentityData, Schemas, TextShape, Transform, Tween, TweenSequence, VisibilityComponent, engine, pointerEventsSystem } from '@dcl/sdk/ecs'

import { syncEntity } from '@dcl/sdk/network'
import playersApi, { getPlayer } from '@dcl/sdk/players'
import * as playersQueue from "@dcl-sdk/players-queue/src"
import * as utils from "@dcl-sdk/utils"

import { movePlayerTo } from '~system/RestrictedActions'
import { MenuButton } from './minigame-ui/button'
// import { gameDataEntity, initPlayerData, setCurrentPlayer, checkCurrentPlayer, GameData } from './minigame-multiplayer/multiplayer'
import { initStatusBoard } from './statusBoard'
import { uiAssets } from './minigame-ui/resources'
import { upsertProgress } from './minigame-server/server'
import { QueueDisplay, SCREENS } from './minigame-ui/queueDisplay'

let movesHistory: any = []
const maxDiscs = 7
const towerLocations = [-1, 11.75, 8, 4.25]
let enableSounds = true

const gameButtons: MenuButton[] = []
const towers = ['0', 'click_tower_1', 'click_tower_2', 'click_tower_3']

export const GameData = engine.defineComponent('game-data', {
  playerAddress: Schemas.String,
  playerName: Schemas.String,
  moves: Schemas.Number,
  levelStartedAt: Schemas.Int64,
  levelFinishedAt: Schemas.Int64,
  currentLevel: Schemas.Number,
})

export let gameDataEntity: Entity
let gameAreaCollider: Entity
let queueDisplay: QueueDisplay



const sounds = engine.addEntity()

Transform.create(sounds, { parent: engine.CameraEntity })

export const Disc = engine.defineComponent('disc', {
  size: Schemas.Number,
  currentTower: Schemas.Number,
  isSelected: Schemas.Boolean
})

export function initGame() {

  initGameButtons()

  // start game button
  new MenuButton(
    {
      position: Vector3.create(4.26, 1.03, 8),
      rotation: Quaternion.fromEulerDegrees(-45, 90, 0),
      scale: Vector3.create(1.2, 1.2, 1.2)
    },
    uiAssets.shapes.RECT_GREEN,
    uiAssets.icons.playText,
    "PLAY GAME",
    () => {
      // setCurrentPlayer()
      playersQueue.addPlayer()
      queueDisplay.enable()

    }
  )

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


  //TODO: check if collider always on is ok. Else add remove collider for playing.
  disableGame()

  console.log("init discs")
  initDiscs()

  console.log("init playerData")
  initPlayerData()

  console.log("init statusBoard")
  initStatusBoard()

  console.log("init setupAnimations")
  setupWinAnimations()

  // console.log("init playersQueue")
  // playersQueue.initPlayersQueue(engine, syncEntity, playersApi)

  playersQueue.listeners.onActivePlayerChange = (player) => {
    console.log("new active player: ", player.address)
    const localPlayer = getPlayer()
    if (player.address === localPlayer?.userId) {
      getReadyToStart()
    } else {
      engine.removeSystem(gameAreaCheck)
    }
  }

}

let areaCheckTimer = 0
function gameAreaCheck(dt: number) {
  areaCheckTimer += dt

  if (areaCheckTimer >= 1) {
    areaCheckTimer = 0

    if (playersQueue.isActive()) {
      const transform = Transform.get(engine.PlayerEntity)

      if (transform.position.x >= 5.15 && transform.position.x <= 13.77 &&
        transform.position.z >= 2.23 && transform.position.z <= 13.77) {
        //inside game area
        // console.log("inside")
      } else {
        exitPlayer()
        //todo: blank player data
      }

    }
  }
}

function initGameButtons() {
  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 4.30, 9.75),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_GREEN,
    uiAssets.numbers[1],
    "START LEVEL 1",
    () => startLevel(1)
  ))

  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 4.30, 9),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_GREEN,
    uiAssets.numbers[2],
    "START LEVEL 2",
    () => startLevel(2)
  ))

  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 4.30, 8.25),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_GREEN,
    uiAssets.numbers[3],
    "START LEVEL 3",
    () => startLevel(3)
  ))

  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 4.30, 6),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_RED,
    uiAssets.icons.undo,
    "UNDO LAST MOVE",
    () => undo()
  ))

  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 4.30, 5.2),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_RED,
    uiAssets.icons.restart,
    "RESTART LEVEL",
    () => startLevel(GameData.get(gameDataEntity).currentLevel)
  ))

  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 5.7, 5.4),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_RED,
    uiAssets.icons.sound,
    'Sound FX',
    () => enableSounds = !enableSounds
  ))

  gameButtons.push(new MenuButton({
    position: Vector3.create(14.9, 5.7, 10.8),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.RECT_RED,
    uiAssets.icons.exitText,
    'Exit from game area',
    () => exitPlayer(true)
  ))
}

function exitPlayer(move = false) {
  if (move) {
    movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
  }
  
  GameData.createOrReplace(gameDataEntity, { playerAddress: '', playerName: '', currentLevel: -1 })
  playersQueue.setNextPlayer()
  engine.removeSystem(gameAreaCheck)

}
function initPlayerData() {

  gameDataEntity = engine.addEntity()
  GameData.create(gameDataEntity, { playerAddress: '', playerName: '', currentLevel: -1 })
  syncEntity(gameDataEntity, [GameData.componentId], 3002)

}

function disableGame() {
  MeshCollider.setBox(gameAreaCollider, ColliderLayer.CL_PHYSICS)
  // queueDisplay.disable()
  for (const button of gameButtons) {
    button.disable()
  }

  //remove click trigger for towers
  for (const tower of towers) {

    const entity = engine.getEntityOrNullByName(tower)

    entity && pointerEventsSystem.removeOnPointerDown(entity)
  }
}

function enableGame() {
  // MeshCollider.deleteFrom(gameAreaCollider)

  gameButtons.forEach((button, i) => {
    if (i <= 2) {
      // console.log("buttonIndex: ", i)
      // console.log("currentLevel: ", GameData.get(gameDataEntity).currentLevel)
      if (i < GameData.get(gameDataEntity).currentLevel) {
        button.enable()
      } else {
        button.disable()
      }

    } else {
      button.enable()
    }
  })

  //add click trigger for towers
  towers.forEach(tower => {
    const entity = engine.getEntityOrNullByName(tower)

    entity && pointerEventsSystem.onPointerDown(
      {
        entity: entity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: `SELECT TOWER ${towers.indexOf(tower)}`,
          maxDistance: 15
        }
      },
      () => onTowerClick(towers.indexOf(tower))
    )
  })

}

function getReadyToStart() {
  queueDisplay.setScreen(SCREENS.playNext)

  utils.timers.setTimeout(() => {
    queueDisplay.disable()
    movePlayerTo({ newRelativePosition: Vector3.create(6.5, 2, 8), cameraTarget: Vector3.create(13, 2, 8) })
    engine.addSystem(gameAreaCheck)

    utils.timers.setTimeout(() => {
      //TODO: add countdown
      startLevel(1)
    }, 1000)

  }, 2000)
}

function undo() {
  const [entity, disc] = movesHistory.pop()
  landDisc(entity, disc.currentTower)
  GameData.getMutable(gameDataEntity).moves = movesHistory.length

}

function onTowerClick(towerNumber: number) {
  if (!playersQueue.isActive()) return

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

  //disc is already on current tower
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
    if (tower === 3) {
      const discs = [...engine.getEntitiesWith(Disc)].filter(disc => disc[1]["currentTower"] !== 0)
      const towerDiscs = discs.filter(disc => disc[1]["currentTower"] === 3)

      if (towerDiscs.length === discs.length) {

        onFinishLevel()
      }
    }
  }

}

function onFinishLevel() {
  // console.log("win")
  GameData.getMutable(gameDataEntity).levelFinishedAt = Date.now()

  AudioSource.createOrReplace(sounds, {
    audioClipUrl: "sounds/win.mp3",
    playing: enableSounds,
    volume: 2
  })

  upsertProgress()

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
    playing: enableSounds,
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
    playing: enableSounds,
  })
}

function initDiscs() {
  for (var i = 1; i <= maxDiscs; i++) {

    const entity = engine.addEntity()

    Transform.create(entity, { position: { x: 11.25, y: -5, z: towerLocations[1] } })
    GltfContainer.create(entity, { src: `assets/scene/disc${i}.glb`, visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS })
    Disc.create(entity, {
      size: i,
      currentTower: 0
    })

    syncEntity(
      entity,
      [Transform.componentId, Disc.componentId],
      5000 + i
    )
  }

}

function startLevel(levelN: number) {
  if (!playersQueue.isActive()) return
  const localPlayer = getPlayer()

  clearSelection()

  const playerData = GameData.getMutable(gameDataEntity)

  playerData.levelStartedAt = Date.now()
  playerData.levelFinishedAt = 0
  playerData.currentLevel = levelN
  playerData.moves = 0

  if (localPlayer) {
    playerData.playerName = localPlayer.name
  }


  const discs = [...engine.getEntitiesWith(Disc)]

  for (var i = 0; i <= maxDiscs - 1; i++) {

    const entity = (discs.find(([entity, disc]) => disc.size === i + 1) || [])[0]

    if (!entity) continue

    if (i <= levelN + 1) {
      Transform.getMutable(entity).position = { x: 11.25, y: getLandingHeight(levelN + 1 - i), z: towerLocations[1] }
      Disc.getMutable(entity).currentTower = 1
    } else {
      Transform.getMutable(entity).position = { x: 11.25, y: -5, z: 13 }
      Disc.getMutable(entity).currentTower = 0
    }
    movesHistory = []
  }

  enableGame()

}

function setupWinAnimations() {
  let winAnimA = engine.addEntity()
  let winAnimB = engine.addEntity()
  let winAnimC = engine.addEntity()
  let winAnimFollow = engine.addEntity()
  let winAnimText = engine.addEntity()

  GltfContainer.create(winAnimA, {
    src: "assets/scene/winAnim.glb",

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
    src: "assets/scene/winAnim.glb"

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
    src: "assets/scene/winAnim.glb"
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
    src: "assets/scene/winAnimFollow.glb"
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
    src: "assets/scene/winAnimText.glb"
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
}

function startWinAnimation() {
  const animations = engine.getEntitiesWith(Animator, VisibilityComponent)
  for (const [entity, animator] of animations) {
    VisibilityComponent.getMutable(entity).visible = true
    Animator.getMutable(entity).states[0].playing = true
  }

  utils.timers.setTimeout(() => {

    const animations = engine.getEntitiesWith(Animator, VisibilityComponent)
    for (const [entity, animator, vis] of animations) {
      VisibilityComponent.getMutable(entity).visible = false
    }

    if (GameData.get(gameDataEntity).currentLevel < 3) {
      console.log("playersQueue: ", playersQueue.getQueue())
//add challenge check
      if (playersQueue.getQueue().length > 1) {
        playersQueue.setNextPlayer()
      } else {
        const nextLevel = GameData.get(gameDataEntity).currentLevel + 1
        console.log(nextLevel)
        if (nextLevel === 4){
          exitPlayer()
        } else {
          startLevel(nextLevel)
          gameButtons[nextLevel]
        }
      }

    }
  }, 8000)
}
