import { AudioSource, EasingFunction, Entity, GltfContainer, InputAction, Material, MaterialTransparencyMode, MeshRenderer, PBMaterial_PbrMaterial, PointerEventType, PointerEvents, Transform, TransformTypeWithOptionals, Tween, VisibilityComponent, engine, inputSystem, pointerEventsSystem } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { IconData, ButtonShapeData, uiAtlas, uiAssets } from "../minigame-ui/resources"
import * as utils from "@dcl-sdk/utils"

export enum SCREENS {
    addToQueue,
    queueList,
    playNext
}

export class QueueDisplay {
    frameEntity: Entity
    displayEntity: Entity
    enabled = false
    currentScreen: number
    screensAtlas = 'assets/scene/GameSigns.png'


    constructor(transform: TransformTypeWithOptionals, enabled: boolean) {

        this.currentScreen = 1
        this.enabled = enabled

        //FRAME
        this.frameEntity = engine.addEntity()
        Transform.createOrReplace(this.frameEntity, transform)
        GltfContainer.create(this.frameEntity, { src: "assets/scene/workstation_display.glb" })

        if (!enabled){
            const currentTransform = Transform.getMutable(this.frameEntity)
            currentTransform.position.y = currentTransform.position.y - 1
        }

        //screen
        this.displayEntity = engine.addEntity()
        Transform.create(this.displayEntity, {parent: this.frameEntity, scale: Vector3.create(0.85, 0.55, 1)})
        MeshRenderer.setPlane(this.displayEntity, this.getScreenUVs(0,7))
        Material.setPbrMaterial(this.displayEntity, {
            texture: Material.Texture.Common({src: this.screensAtlas}),
        })
    }

    getScreenUVs(row: number, col: number): number[] {
        let blockSize = 1 / 16
        const width = 7
        const height = 5
        
        return [
            col * blockSize, 1 - (blockSize * (row + height)),
            col * blockSize, 1 - (blockSize * (row)),
            (col + width) * blockSize, 1 - (blockSize * (row)),
            (col + width) * blockSize, 1 - (blockSize * (row + height)),

            col * blockSize, 1 - (blockSize * (row + height)),
            col * blockSize, 1 - (blockSize * (row)),
            (col + width) * blockSize, 1 - (blockSize * (row)),
            (col + width) * blockSize, 1 - (blockSize * (row + height)),
        ]

    }

    enable() {
        this.enabled = true
        GltfContainer.createOrReplace(this.button, { src: this.buttonShapeEnabled.shape })
        Material.setPbrMaterial(this.icon, this.iconGlowMat)

    }

    disable() {
        this.enabled = false
        GltfContainer.createOrReplace(this.button, { src: this.buttonShapeDisabled.shape })
        Material.setPbrMaterial(this.icon, this.iconDisabledMat)
    }

}