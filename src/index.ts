import { initGame } from "./game";
import { Color4, Quaternion, Vector3 } from '@dcl/sdk/math'
import { AudioEvent, AudioSource, Billboard, ColliderLayer, EasingFunction, Entity, GltfContainer, InputAction, Material, MeshCollider, MeshRenderer, PBMeshCollider, PointerEvents, Schemas, TextShape, Transform, TransformType, Tween, TweenLoop, TweenSequence, engine, pointerEventsSystem, tweenSystem } from '@dcl/sdk/ecs'
import { MenuButton } from "./minigame-ui/button";
import { uiAssets } from "./minigame-ui/resources";

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
        position: Vector3.create(2, 0, 15.4),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 180, 0)
    })
    let sideSignB = engine.addEntity()

    GltfContainer.create(sideSignB, {
        src: "assets/scene/sideSign.glb"

    })

    Transform.create(sideSignB, {
        position: Vector3.create(2, 0, 0.6),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 0, 0)
    })

    let sideSignHeaderA = engine.addEntity()

    GltfContainer.create(sideSignHeaderA, {
        src: "assets/scene/scoreBoardHeader.glb"

    })

    Transform.create(sideSignHeaderA, {
        position: Vector3.create(2, 0, 15.4),
        scale: Vector3.create(0.8, 0.8, 0.8),
        rotation: Quaternion.fromEulerDegrees(0, 180, 0)
    })
    let sideSignHeaderB = engine.addEntity()

    GltfContainer.create(sideSignHeaderB, {
        src: "assets/scene/InstructionsHeader.glb"

    })

    Transform.create(sideSignHeaderB, {
        position: Vector3.create(2, 0, 0.6),
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

   

    // AudioSource.create(engine.CameraEntity, {
    //     audioClipUrl: 'sounds/ambientMusic.mp3',
    //     playing: true,
    //     volume: 0.5
    // })

    new MenuButton({
            position: Vector3.create(14.9, 5.7, 4.7),
            scale: Vector3.create(2.4, 2.4, 2.4),
            rotation: Quaternion.fromEulerDegrees(-90, 0, 90)
        },
        uiAssets.shapes.SQUARE_RED,
        uiAssets.icons.music,
        'Play/Stop Music',
        () => AudioSource.getMutable(engine.CameraEntity).playing = !AudioSource.get(engine.CameraEntity).playing
    )

    initGame()
}