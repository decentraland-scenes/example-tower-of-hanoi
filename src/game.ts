// We define the empty imports so the auto-complete feature works as expected.
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBMeshCollider, PointerEvents, Schemas, TextShape, Transform, TransformType, Tween, TweenLoop, TweenSequence, engine, pointerEventsSystem, tweenSystem } from '@dcl/sdk/ecs'

import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/src/players'
import * as utils from '@dcl-sdk/utils'

import { Disc, Player } from './components'
import { movePlayerTo } from '~system/RestrictedActions'

let movesHistory: any = []
const maxDiscs = 7
const towerLocations = [-1, 11.75, 8, 4.25]
const sessionMaxTime = 300
let sessionRemainingTime = sessionMaxTime

let backSign = engine.addEntity()

GltfContainer.create(backSign, { src: "assets/scene/backSign.glb"
  // invisibleMeshesCollisionMask: ColliderLayer.CL_NONE,
  // visibleMeshesCollisionMask:
  //   ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS,
 })

Transform.create(backSign, {
  position: Vector3.create(15, 0, 8),
  scale: Vector3.create(1, 1, 1),
  rotation: Quaternion.fromEulerDegrees(0, -90, 0)
})

export function initGame() {
  const textEntity = engine.addEntity()
  const currentPlayerEntity = engine.addEntity()

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
        startLevel(levelButtons.indexOf(button) + 4)
      }
    )
  }

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

  initDiscs()


  //create moves board
  Transform.create(textEntity, {
    position: Vector3.create(15.5, 3, 8),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0)
  })

  TextShape.create(textEntity, {
    text: ''
  })

  syncEntity(textEntity, [TextShape.componentId], 3000)

  Player.create(currentPlayerEntity, { id: '', name: '' })

  syncEntity(currentPlayerEntity, [Player.componentId], 3002)

  const triggerAreaEntity = engine.addEntity()

  Transform.create(triggerAreaEntity, {
    position: Vector3.create(8, 0, 8),
    scale: Vector3.create(12, 16, 12)
  })

  syncEntity(triggerAreaEntity, [MeshCollider.componentId], triggerAreaEntity)

  utils.triggers.addTrigger(
    triggerAreaEntity,
    utils.NO_LAYERS,
    utils.LAYER_1,
    [
      {
        type: 'box',
        scale: Vector3.create(12.5, 16, 12.5)
      }
    ],
    () => {
      console.log("player enters scene")
      if (!validateCurrentPlayer()) {
        MeshCollider.setBox(triggerAreaEntity, ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER)
      } else {
        MeshCollider.deleteFrom(triggerAreaEntity)
        engine.addSystem(playerTimer)
      }
    },
    () => {
      onPlayerLeavesScene()
    },
  )

  //functions declarations

  function onPlayerLeavesScene() {
    const playerData = getPlayer()
    const player = Player.get(currentPlayerEntity)
    console.log("player leaves scene")
    if (playerData?.userId === player.id)
      Player.createOrReplace(currentPlayerEntity, { id: '', name: '' })
    console.log("removing collider")
    MeshCollider.deleteFrom(triggerAreaEntity)
    sessionRemainingTime = sessionMaxTime

  }

  function playerTimer(dt: number) {
    sessionRemainingTime -= dt
    updateMovesCounter()

    if (sessionRemainingTime <= 0) {
      sessionRemainingTime = sessionMaxTime
      onPlayerLeavesScene()
      engine.removeSystem(playerTimer)
      movePlayerTo({newRelativePosition: Vector3.create(1, 0, 8)})
    }
  }

  function updateMovesCounter() {
    const playerData = Player.get(currentPlayerEntity)
    const minutes = Math.floor(sessionRemainingTime / 60)
    const seconds = Math.round(sessionRemainingTime) - minutes * 60

    TextShape.createOrReplace(textEntity, {
      text: `${movesHistory.length} moves${playerData.name ? `\nCurrent Player: ${playerData.name}\nRemaining time: ${minutes}:${seconds}` : ''}`,
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
    // console.log("validating current player")
    const playerData = getPlayer()

    const currentPlayer = Player.get(currentPlayerEntity)
    // console.log("currentPlayer.id: ", currentPlayer.id)
    playerData && console.log("playerData.userId: ", playerData.userId)

    if (playerData && (currentPlayer.id === '' || currentPlayer.id === playerData.userId)) {
      Player.createOrReplace(currentPlayerEntity, { id: playerData.userId, name: playerData.name })
      // console.log("true")
      return true
    } else {
      // console.log("false")
      return false
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
}


