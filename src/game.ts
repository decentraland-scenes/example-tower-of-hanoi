import { Quaternion, Vector3 } from '@dcl/sdk/math'
import { CameraModeArea, CameraType, ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PlayerIdentityData, TextShape, Transform, Tween, TweenSequence, engine, pointerEventsSystem } from '@dcl/sdk/ecs'

import { syncEntity } from '@dcl/sdk/network'
import { getPlayer } from '@dcl/sdk/src/players'

import { Disc, Player } from './components'
import { movePlayerTo } from '~system/RestrictedActions'
import { MenuButton } from './minigame-ui/button'
import { iconData } from './minigame-ui/resources'

let movesHistory: any = []
const maxDiscs = 7
const towerLocations = [-1, 11.75, 8, 4.25]
const sessionMaxTime = 300

export function initGame() {

  const level1Button = new MenuButton({
    position: Vector3.create(14.9, 4.30, 9.75),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    iconData.shapes.SQUARE_GREEN,
    iconData.numbers[1],
    "START LEVEL 1",
    () => startLevel(4)
  )

  const level2Button = new MenuButton({
    position: Vector3.create(14.9, 4.30, 9),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    iconData.shapes.SQUARE_GREEN,
    iconData.numbers[2],
    "START LEVEL 2",
    () => startLevel(5)
  )

  const level3Button = new MenuButton({
    position: Vector3.create(14.9, 4.30, 8.25),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    iconData.shapes.SQUARE_GREEN,
    iconData.numbers[3],
    "START LEVEL 3",
    () => startLevel(6)
  )

  new MenuButton({
    position: Vector3.create(14.9, 4.30, 6),
    scale: Vector3.create(2.4, 2.4, 2.4),
    rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
  },
    iconData.shapes.SQUARE_RED,
    iconData.icons.undo,
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

  initDiscs()


  //create moves board
  const movesTextEntity = engine.addEntity()

  Transform.create(movesTextEntity, {
    position: Vector3.create(14.85, 5.05, 5.4),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0)
  })

  const timeTextEntity = engine.addEntity()

  Transform.create(timeTextEntity, {
    position: Vector3.create(14.85, 5.05, 6.6),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0)
  })

  const currentPlayerTextEntity = engine.addEntity()

  Transform.create(currentPlayerTextEntity, {
    position: Vector3.create(14.85, 5.05, 9.8),
    rotation: Quaternion.fromEulerDegrees(0, 90, 0)
  })

  const currentPlayerEntity = engine.addEntity()

  Player.create(currentPlayerEntity, { id: '', name: '', currentLevel: -1 })

  syncEntity(currentPlayerEntity, [Player.componentId], 3002)
  
  // Player.onChange(currentPlayerEntity, (data: any) => console.log(data))

  const gameAreaCollider = engine.addEntity()

  Transform.create(gameAreaCollider, {
    position: Vector3.create(9.5, 0, 8),
    scale: Vector3.create(9.75, 16, 12.5)
  })

  // MeshRenderer.setBox(triggerAreaEntity)
  MeshCollider.setBox(gameAreaCollider, ColliderLayer.CL_PHYSICS | ColliderLayer.CL_POINTER)

  CameraModeArea.create(gameAreaCollider, {
    area: Vector3.create(9.75, 10, 12.5),
    mode: CameraType.CT_FIRST_PERSON
  })



  // enter to game area button 
  new MenuButton(
    {
      position: Vector3.create(4.35, 1, 8),
      rotation: Quaternion.fromEulerDegrees(-45, 90, 0),
      scale: Vector3.create(1, 1, 1)
    },
    iconData.shapes.RECT_GREEN,
    iconData.icons.play,
    "PLAY GAME",
    () => {
      if (setCurrentPlayer()) {
        movePlayerTo({ newRelativePosition: Vector3.create(5.5, 2, 8), cameraTarget: Vector3.create(7, 2, 9) })
        startLevel(-1)
      }
    }
  )


  
  //Game Loop
  let elapsedTime = 0
  const gameLoopFreq = 1
  
  engine.addSystem((dt: number) => {
    elapsedTime += dt
    
    if (elapsedTime >= gameLoopFreq) {
      elapsedTime = 0
      updateTexts()
      checkTimer()
      checkPlayerIsAlive()
      
    }
  })
  

  //functions declarations
  function checkPlayerIsAlive() {
    const playerData = Player.get(currentPlayerEntity)
    if (playerData.id !== '') {
      const players = [...engine.getEntitiesWith(PlayerIdentityData, Transform)]
      const playerInsideGame = players.find(([entity, data, transform]) => {
        if (data.address === playerData.id) {
          if (transform.position.z >= 2.23 && transform.position.z <= 13.77) {
            if (transform.position.x >= 5.15 && transform.position.x <= 13.77) {
              return true
            }
          }
        }
      })

      if (!playerInsideGame?.length) {
        clearPlayerData()
      }
    }
  }

  function clearPlayerData() {
    Player.createOrReplace(currentPlayerEntity, { id: '', name: '', moves: 0 })
  }

  function checkTimer() {
    const playerData = Player.get(currentPlayerEntity)

    if (playerData.id !== '') {

      const now = Date.now()
      if (now - parseInt(playerData.arrivedAt) >= sessionMaxTime * 1000) {
        clearPlayerData()
        movePlayerTo({ newRelativePosition: Vector3.create(1, 0, 8) })
      }
    }
  }

  function updateTexts() {
    const playerData = Player.get(currentPlayerEntity)
// console.log("Date.now(): ", Date.now())
// console.log("playerData.levelStartedAt: ", playerData.levelStartedAt)
    const gameElapsedTime = (Date.now() - parseInt(playerData.levelStartedAt)) / 1000
    const minutes = Math.floor(gameElapsedTime / 60)
    const seconds = Math.round(gameElapsedTime) - minutes * 60

    TextShape.createOrReplace(currentPlayerTextEntity, {
      text: `${playerData.name}`,
      fontSize: 3
    })

    if (playerData.currentLevel > 0) {
      TextShape.createOrReplace(timeTextEntity, {
        text: `${minutes}:${seconds}`,
        fontSize: 3
      })
    } else {
      TextShape.createOrReplace(timeTextEntity, {
        text: '',
        fontSize: 3
      })

    }

     TextShape.createOrReplace(movesTextEntity, {
      text: `${playerData.moves}`,
      fontSize: 3
    })

  }

  function undo() {
    const [entity, disc] = movesHistory.pop()
    landDisc(entity, disc.currentTower)
    Player.getMutable(currentPlayerEntity).moves = movesHistory.length
    // updateMovesCounter()
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
      Player.getMutable(currentPlayerEntity).moves = movesHistory.length
      // updateMovesCounter()

      landDisc(selected[0], tower)

      clearSelection()

      if (tower === 3) {
        //validate win
        const discs = [...engine.getEntitiesWith(Disc)].filter(disc => disc[1]["currentTower"] !== 0)
        const towerDiscs = discs.filter(disc => disc[1]["currentTower"] === 3)

        // console.log("discs: ", discs)
        // console.log("towerDiscs: ", towerDiscs)
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
      duration: 50,
      easingFunction: EasingFunction.EF_LINEAR,
    })

    TweenSequence.createOrReplace(entity, {
      sequence: [
        {
          mode: Tween.Mode.Move({
            start: { ...discTransform.position, y: 3 },
            end: { ...discTransform.position, y: 3, z: towerLocations[tower] }
          }),
          duration: 50,
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
    // playerData && console.log("playerData.userId: ", playerData.userId)

    if (!playerData) return false

    if (currentPlayer.id === playerData.userId) {
      return true
    }

    return false
  }

  function setCurrentPlayer() {
    const playerData = getPlayer()
    const currentPlayer = Player.get(currentPlayerEntity)
    if (!playerData) return false

    if (currentPlayer.id === '') {
      Player.createOrReplace(currentPlayerEntity, { id: playerData.userId, name: playerData.name, arrivedAt: `${Date.now()}` })
      return true
    }

    return false

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

    const playerData = Player.getMutable(currentPlayerEntity)

    playerData.levelStartedAt = `${Date.now()}`
    playerData.currentLevel = levelN

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
}


