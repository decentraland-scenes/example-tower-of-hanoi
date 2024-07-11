import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { CameraModeArea, CameraType, ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBTween, PlayerIdentityData, Schemas, TextShape, Transform, Tween, TweenSequence, engine, pointerEventsSystem } from '@dcl/sdk/ecs'

import { syncEntity } from '@dcl/sdk/network'

import { movePlayerTo } from '~system/RestrictedActions'
import { MenuButton } from './minigame-ui/button'
import { playerEntity, initPlayerData, setCurrentPlayer, checkCurrentPlayer, Player } from './minigame-multiplayer/multiplayer'
import { initStatusBoard } from './statusBoard'
import { uiAssets } from './minigame-ui/resources'

let movesHistory: any = []
const maxDiscs = 7
const towerLocations = [-1, 11.75, 8, 4.25]

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
    () => startLevel(4)
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
        console.log("win")
      }
    }
  }

}

function landDisc(entity: Entity, tower: number) {

  const discData = Disc.getMutable(entity)

  const sameTower = discData.currentTower === tower

  discData.currentTower = tower

  const discTransform = Transform.get(entity)

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

  Tween.createOrReplace(entity, tweensSequence.shift())

  if (tweensSequence.length) {
    TweenSequence.createOrReplace(entity, {
      sequence: [
        ...tweensSequence
      ]
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
    //go up
    easingFunction: EasingFunction.EF_EASEOUTQUAD,
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


