// We define the empty imports so the auto-complete feature works as expected.
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBMeshCollider, PointerEvents, Schemas, TextShape, Transform, TransformType, Tween, TweenLoop, TweenSequence, engine, pointerEventsSystem, tweenSystem } from '@dcl/sdk/ecs'

import { getRandomHexColor } from './utils'
import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/src/players'
import { Disc, Player } from './components'

let movesHistory: any = []
const maxDiscs = 7

const movesSign = engine.addEntity()
const playerSign = engine.addEntity()
const currentPlayerEntity = engine.addEntity()

export function initGame() {

  const levelButtons = ["spawn_level_1", "spawn_level_2", "spawn_level_3"]

  for (const button of levelButtons) {

    const entity = engine.getEntityOrNullByName(button)

    entity && pointerEventsSystem.onPointerDown(
      {
        entity: entity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: `Start level ${levelButtons.indexOf(button) + 1}`
        }
      },
      function () {
        startLevel(levelButtons.indexOf(button) + 2)
      }
    )

    const undoEntity = engine.getEntityOrNullByName("Black_Button")

    undoEntity && pointerEventsSystem.onPointerDown(
      {
        entity: undoEntity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: `Undo`
        }
      },
      function () {
        undo()
      }
    )
  }

  //add click trigger for towers
  const towers = ['init', 'click_tower_1', 'click_tower_2', 'click_tower_3']

  for (const tower of towers) {

    const entity = engine.getEntityOrNullByName(tower)

    entity && pointerEventsSystem.onPointerDown(
      {
        entity: entity,
        opts: {
          button: InputAction.IA_POINTER,
          hoverText: `tower ${towers.indexOf(tower)}`,
          maxDistance: 15
        }
      },
      () => onTowerClick(towers.indexOf(tower))
    )
  }

  // startLevel(3)
  initDiscs()

  //create moves board
  Transform.create(movesSign, {
    position: Vector3.create(15.5, 3, 8),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0)
  })

  TextShape.create(movesSign, {
    text: ''
  })

  syncEntity(movesSign, [TextShape.componentId], 3000)

  //create current player board
  Transform.create(playerSign, {
    // position: Vector3.create(15.5, 2, 8),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0)
  })
  
  TextShape.create(playerSign)

  syncEntity(playerSign, [TextShape.componentId], 3001)

  Player.create(currentPlayerEntity)
  syncEntity(currentPlayerEntity, [Player.componentId], 3002)
}


function updateMovesCounter() {
  TextShape.createOrReplace(movesSign, {
    text: `${movesHistory.length} moves`,
  })

}

function undo() {
  const [entity, disc] = movesHistory.pop()
  landDisc(entity, disc.currentTower)
  updateMovesCounter()
}

function onTowerClick(towerNumber: number) {
  if (!validateCurrentPlayer()) return

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
    updateMovesCounter()

    landDisc(selected[0], tower)

    clearSelection()

    if (tower === 2) {
      //validate win
      const discs = [...engine.getEntitiesWith(Disc)]
      const towerDiscs = discs.filter(disc => disc[1]["currentTower"] === 2)

      if (towerDiscs.length === discs.length) {
        console.log("win")
      }
    }
  }

}

function landDisc(entity: Entity, tower: number) {

  Disc.getMutable(entity).currentTower = tower

  const discTransform = Transform.get(entity)

  const towerEntities = [...engine.getEntitiesWith(Disc)].filter(([entity, disc]) => disc.currentTower === tower)

  Tween.createOrReplace(entity, {
    mode: Tween.Mode.Move({
      start: discTransform.position,
      end: { ...discTransform.position, y: 3 }
    }),
    duration: 100,
    easingFunction: EasingFunction.EF_LINEAR,
  })

  TweenSequence.createOrReplace(entity, {
    sequence: [
      {
        mode: Tween.Mode.Move({
          start: { ...discTransform.position, y: 3 },
          end: { ...discTransform.position, y: 3, z: towerLocations[tower] }
        }),
        duration: 300,
        easingFunction: EasingFunction.EF_EASEOUTEXPO
      },
      {
        mode: Tween.Mode.Move({
          start: { ...discTransform.position, y: 3, z: towerLocations[tower] },
          end: { ...discTransform.position, y: getLandingHeight(towerEntities.length - 1), z: towerLocations[tower] }
        }),
        duration: 300,
        easingFunction: EasingFunction.EF_EASEINEXPO
      },
    ]
  })
}

function getLandingHeight(towerDiscsCount: number) {
  const height = 0.25 + towerDiscsCount * 0.3
  return height
}

const towerLocations = [-1, 11, 8, 5]

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
    duration: 1000,
    easingFunction: EasingFunction.EF_LINEAR,
  })
}

function validateCurrentPlayer() {
  console.log("validating current player")
  const playerData = getPlayer()

  const currentPlayer = Player.get(currentPlayerEntity)
  console.log(currentPlayer)

  if (playerData && (!currentPlayer.address || currentPlayer.address === playerData.userId)) {
    const player = Player.getMutable(currentPlayerEntity)
    player.address = playerData.userId
    player.name = playerData.name
    TextShape.getMutable(playerSign).text = `Currently playing ${playerData.name}`
    return true
  }

  return false
}

function initDiscs() {

  for (var i = 1; i <= maxDiscs; i++) {

    const entity = engine.addEntity()

    // Transform.create(entity, { position: { x: 11.25, y: -5, z: 13 }, scale: { x: i, y: 0.3, z: i } })
    Transform.create(entity, { position: { x: 11.25, y: -5, z: towerLocations[1] } })
    // MeshRenderer.setCylinder(entity)
    GltfContainer.create(entity, { src: `assets/scene/disc${i}.glb`, visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS })
    // MeshCollider.setCylinder(entity)
    // Material.setPbrMaterial(entity, { albedoColor: Color4.fromHexString(getRandomHexColor()) })
    Disc.create(entity, {
      size: i,
      currentTower: 0
    })


    syncEntity(
      entity,
      [Transform.componentId, MeshRenderer.componentId, Material.componentId, Disc.componentId],
      5000 + i
    )
  }

}

function startLevel(levelN: number) {

  if (!validateCurrentPlayer()) return

  clearSelection()

  const discs = [...engine.getEntitiesWith(Disc)]
  // for (const [entity] of discs) {
  //   engine.removeEntityWithChildren(entity)
  // }

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
    updateMovesCounter()
  }
}
