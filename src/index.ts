import { initGame } from "./game";
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { ColliderLayer, EasingFunction, Entity, GltfContainer, Billboard, InputAction, Material, MeshCollider, MeshRenderer, PBMeshCollider, PointerEvents, Schemas, TextShape, Transform, TransformType, Tween, TweenLoop, TweenSequence, engine, pointerEventsSystem, tweenSystem } from '@dcl/sdk/ecs'

export function main() {
    let backSign = engine.addEntity()

    GltfContainer.create(backSign, {
        src: "assets/scene/backSign.glb"

    })

    Transform.create(backSign, {
        position: Vector3.create(15, 0, 8),
        scale: Vector3.create(1, 1, 1),
        rotation: Quaternion.fromEulerDegrees(0, -90, 0)
    })
    let sideSignA = engine.addEntity()

    GltfContainer.create(sideSignA, {
        src: "assets/scene/sideSign.glb"

    })

    Transform.create(sideSignA, {
        position: Vector3.create(2.5, 0, 14),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 180, 0)
    })
    let sideSignB = engine.addEntity()

    GltfContainer.create(sideSignB, {
        src: "assets/scene/sideSign.glb"

    })

    Transform.create(sideSignB, {
        position: Vector3.create(2.5, 0, 2),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 0, 0)
    })

    let sideSignHeaderA = engine.addEntity()

    GltfContainer.create(sideSignHeaderA, {
        src: "assets/scene/scoreBoardHeader.glb"

    })

    Transform.create(sideSignHeaderA, {
        position: Vector3.create(2.5, 0, 14),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 180, 0)
    })
    let sideSignHeaderB = engine.addEntity()

    GltfContainer.create(sideSignHeaderB, {
        src: "assets/scene/InstructionsHeader.glb"

    })

    Transform.create(sideSignHeaderB, {
        position: Vector3.create(2.5, 0, 2),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 0, 0)
    })

    let fence = engine.addEntity()

    GltfContainer.create(fence, {
        src: "assets/scene/fence.glb"

    })

    Transform.create(fence, {
        position: Vector3.create(8, 0, 8),
        scale: Vector3.create(1, 1, 1),
        rotation: Quaternion.fromEulerDegrees(0, -90, 0)
    })

    let floor = engine.addEntity()

    GltfContainer.create(floor, {
        src: "assets/scene/floor.glb"

    })

    Transform.create(floor, {
        position: Vector3.create(8, 0, 8),
        scale: Vector3.create(1, 1, 1),
        rotation: Quaternion.fromEulerDegrees(0, -90, 0)
    })

    let winAnimA = engine.addEntity()

    GltfContainer.create(winAnimA, {
        src: "assets/scene/winAnim.glb"

    })

    Transform.create(winAnimA, {
        position: Vector3.create(14, 0.2, 2),
        scale: Vector3.create(1, 1, 1),
        rotation: Quaternion.fromEulerDegrees(0,45, 0)
    })

    let winAnimB = engine.addEntity()

    GltfContainer.create(winAnimB, {
        src: "assets/scene/winAnim.glb"

    })

    Transform.create(winAnimB, {
        position: Vector3.create(14, 0.2, 8),
        scale: Vector3.create(1, 1, 1),
        rotation: Quaternion.fromEulerDegrees(0,0, 0)
    })

    let winAnimC = engine.addEntity()

    GltfContainer.create(winAnimC, {
        src: "assets/scene/winAnim.glb"

    })

    Transform.create(winAnimC, {
        position: Vector3.create(14, 0.2, 14),
        scale: Vector3.create(1, 1, 1),
        rotation: Quaternion.fromEulerDegrees(0,-45, 0)
    })

    let winAnimFollow = engine.addEntity()

    GltfContainer.create(winAnimFollow, {
        src: "assets/scene/winAnimFollow.glb"

    })

    Transform.create(winAnimFollow, {
        position: Vector3.create(10, 2, 8),
        scale: Vector3.create(0.3, 0.3, 0.3),
        rotation: Quaternion.fromEulerDegrees(0,-90, 0)
    })
    Billboard.create(winAnimFollow, {})

    
    let winAnimText = engine.addEntity()

    GltfContainer.create(winAnimText, {
        src: "assets/scene/winAnimText.glb"

    })

    Transform.create(winAnimText, {
        position: Vector3.create(10, 2, 8),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0,-90, 0)
    })
    Billboard.create(winAnimText, {})
    initGame()
}