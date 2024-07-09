import { initGame } from "./game";
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBMeshCollider, PointerEvents, Schemas, TextShape, Transform, TransformType, Tween, TweenLoop, TweenSequence, engine, pointerEventsSystem, tweenSystem } from '@dcl/sdk/ecs'

export function main () {
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

    initGame()
}