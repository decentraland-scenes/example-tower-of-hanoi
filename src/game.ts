import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { Animator, AudioSource, Billboard, CameraModeArea, CameraType, ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBTween, PlayerIdentityData, Schemas, TextShape, Transform, Tween, TweenSequence, engine, pointerEventsSystem } from '@dcl/sdk/ecs'

import { syncEntity } from '@dcl/sdk/network'

import { movePlayerTo } from '~system/RestrictedActions'
import { MenuButton } from './minigame-ui/button'
import { playerEntity, initPlayerData, setCurrentPlayer, checkCurrentPlayer, Player } from './minigame-multiplayer/multiplayer'
import { initStatusBoard } from './statusBoard'
import { uiAssets } from './minigame-ui/resources'

let movesHistory: any = []
const maxDiscs = 7
const towerLocations = [-1, 11.75, 8, 4.25]
let enableSounds = true

export const Disc = engine.defineComponent('disc', {
  size: Schemas.Number,
  currentTower: Schemas.Number,
  isSelected: Schemas.Boolean
})

export function initGame() {

  const level1Button = new MenuButton({
    position: Vector3.create(14.9, 4.30, 9.75),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_GREEN,
    uiAssets.numbers[1],
    "START LEVEL 1",
    // () => startLevel(4)
    () => startLevel(1)
  )

  const level2Button = new MenuButton({
    position: Vector3.create(14.9, 4.30, 9),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_GREEN,
    uiAssets.numbers[2],
    "START LEVEL 2",
    () => startLevel(5)
  )

  const level3Button = new MenuButton({
    position: Vector3.create(14.9, 4.30, 8.25),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_GREEN,
    uiAssets.numbers[3],
    "START LEVEL 3",
    () => startLevel(6)
  )

  new MenuButton({
    position: Vector3.create(14.9, 4.30, 6),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_RED,
    uiAssets.icons.undo,
    "UNDO LAST MOVE",
    () => undo()
  )
  
  new MenuButton({
    position: Vector3.create(14.9, 4.30, 5.2),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_RED,
    uiAssets.icons.restart,
    "RESTART LEVEL",
    () => startLevel(Player.get(playerEntity).currentLevel)
  )

  new MenuButton({
    position: Vector3.create(14.9, 5.7, 5.4),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.SQUARE_RED,
    uiAssets.icons.sound,
    'Sound FX',
    () => enableSounds = !enableSounds
  )
  
  new MenuButton({
    position: Vector3.create(14.9, 5.7, 10.8),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    uiAssets.shapes.RECT_RED,
    uiAssets.icons.exitText,
    'Exit from game area',
    () => movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
  )

  //add click trigger for towers
  const towers = ['init', 'click_tower_1', 'click_tower_2', 'click_tower_3']

  for (const tower of towers) {

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
  }

  //create collider box
  const gameAreaCollider = engine.addEntity()

  Transform.create(gameAreaCollider, {
    position: Vector3.create(9.5, 0, 8),
    scale: Vector3.create(9.75, 16, 12.5)
  })

  // MeshRenderer.setBox(triggerAreaEntity)
  MeshCollider.setBox(gameAreaCollider, ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER)

  CameraModeArea.create(gameAreaCollider, {
    area: Vector3.create(9.65, 10, 12.4),
    mode: CameraType.CT_FIRST_PERSON
  })


  // start game button
  new MenuButton(
    {
      position: Vector3.create(4.35, 1, 8),
      rotation: Quaternion.fromEulerDegrees(-45, 90, 0),
      scale: Vector3.create(1, 1, 1)
    },
    uiAssets.shapes.RECT_GREEN,
    uiAssets.icons.playText,
    "PLAY GAME",
    () => {
      if (setCurrentPlayer()) {
        movePlayerTo({ newRelativePosition: Vector3.create(6, 2, 8), cameraTarget: Vector3.create(7, 2, 9) })
        startLevel(4)
      }
    }
  )

  initDiscs()
  initPlayerData()
  initStatusBoard()
  setupWinAnimations()

}

function undo() {
  const [entity, disc] = movesHistory.pop()
  landDisc(entity, disc.currentTower)
  Player.getMutable(playerEntity).moves = movesHistory.length
}

function onTowerClick(towerNumber: number) {
  if (!checkCurrentPlayer()) return

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
    Player.getMutable(playerEntity).moves = movesHistory.length

    landDisc(selected[0], tower)

    clearSelection()

    //validate win
    if (tower === 3) {
      const discs = [...engine.getEntitiesWith(Disc)].filter(disc => disc[1]["currentTower"] !== 0)
      const towerDiscs = discs.filter(disc => disc[1]["currentTower"] === 3)

      if (towerDiscs.length === discs.length) {
        // console.log("win")
        AudioSource.createOrReplace(discs[0][0], {
          audioClipUrl: "sounds/win.mp3",
          playing: true,
          volume: 2
        })

        playWinAnimations()

      }
    }
  }

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

  if (enableSounds) {
    AudioSource.createOrReplace(discEntity, {
      audioClipUrl: 'sounds/place.mp3',
      playing: true,
    })
  }
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

  if (enableSounds) {
    AudioSource.createOrReplace(discEntity, {
      audioClipUrl: 'sounds/select.mp3',
      playing: true,
    })
  }
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

  if (!checkCurrentPlayer()) return

  clearSelection()

  const playerData = Player.getMutable(playerEntity)

  playerData.levelStartedAt = Date.now()
  playerData.currentLevel = levelN
  playerData.moves = 0

  const discs = [...engine.getEntitiesWith(Disc)]

  for (var i = 0; i <= maxDiscs - 1; i++) {

    const entity = (discs.find(([entity, disc]) => disc.size === i + 1) || [])[0]

    if (!entity) continue

    if (i <= levelN) {
      Transform.getMutable(entity).position = { x: 11.25, y: getLandingHeight(levelN - i), z: towerLocations[1] }
      Disc.getMutable(entity).currentTower = 1
    } else {
      Transform.getMutable(entity).position = { x: 11.25, y: -5, z: 13 }
      Disc.getMutable(entity).currentTower = 0
    }
    movesHistory = []
  }
}

function setupWinAnimations () {
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
      rotation: Quaternion.fromEulerDegrees(0,45, 0)
  })

  Animator.create(winAnimA, {
    states: [
      {clip: 'armature_psAction',
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
      rotation: Quaternion.fromEulerDegrees(0,0, 0)
  })

  Animator.create(winAnimB, {
    states: [
      {clip: 'armature_psAction',
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
      rotation: Quaternion.fromEulerDegrees(0,-45, 0)
  })
  
  Animator.create(winAnimC, {
    states: [
      {clip: 'armature_psAction',
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
      rotation: Quaternion.fromEulerDegrees(0,-90, 0)
  })
  Billboard.create(winAnimFollow, {})

  Animator.create(winAnimFollow, {
    states: [
      {clip: 'RaysAnim',
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
      {clip: 'Animation',
        playing: false,
        loop: false
      }
    ]
  })

  Transform.create(winAnimText, {
      position: Vector3.create(10, 2, 8),
      scale: Vector3.create(0.8, 0.8, 0.8),
      rotation: Quaternion.fromEulerDegrees(0,-90, 0)
  })
  Billboard.create(winAnimText, {})
}

function playWinAnimations () {
  const animations = engine.getEntitiesWith(Animator)
  for (const [entity, animator] of animations) {
    Animator.getMutable(entity).states[0].playing = true
  }
}