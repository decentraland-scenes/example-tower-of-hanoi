import { EasingFunction, Entity, GltfContainer, Material, MeshRenderer, PBVisibilityComponent, TextAlignMode, TextShape, Transform, TransformType, Tween, VisibilityComponent, engine } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
// import { GameData, gameDataEntity } from "../minigame-multiplayer/multiplayer";
import { GameData, gameDataEntity } from "../game"
import { getPlayer } from "@dcl/sdk/src/players";
import * as utils from "@dcl-sdk/utils"
import * as playersQueue from "@dcl-sdk/players-queue/src"

export enum SCREENS {
    addToQueue,
    playNext,
    queueList
}

export class QueueDisplay {
    frameEntity: Entity
    positionActive: TransformType
    positionDisabled: TransformType
    displayEntity: Entity
    waitingListEntity: Entity
    myPosEntity: Entity
    active = false
    currentScreen: number
    screensAtlas = 'assets/scene/GameSigns.png'

    constructor(transform: TransformType) {

        this.currentScreen = SCREENS.addToQueue
        this.positionActive = transform
        this.positionDisabled = {
            ...transform,
            position: { ...transform.position, y: transform.position.y - 1 }
        }

        //FRAME
        this.frameEntity = engine.addEntity()
        Transform.createOrReplace(this.frameEntity, this.positionDisabled)
        GltfContainer.create(this.frameEntity, { src: "assets/scene/workstation_display.glb" })

        // if (!active) {
        //     const currentTransform = Transform.getMutable(frameEntity)
        //     currentTransform.position.y = currentTransform.position.y - 1
        // }

        //screen
        this.displayEntity = engine.addEntity()
        Transform.create(this.displayEntity, { parent: this.frameEntity, scale: Vector3.create(0.85, 0.55, 1) })
        Material.setPbrMaterial(this.displayEntity, {
            texture: Material.Texture.Common({ src: this.screensAtlas }),
            emissiveTexture: Material.Texture.Common({ src: this.screensAtlas }),
            roughness: 1.0,
            specularIntensity: 0,
            emissiveIntensity: 0.5,
            emissiveColor: Color4.create(1, 1, 2, 1),
            metallic: 0
        })
        MeshRenderer.setPlane(this.displayEntity, this.getScreenUVs(this.currentScreen))

        this.waitingListEntity = engine.addEntity()
        Transform.create(this.waitingListEntity, {
            parent: this.displayEntity,
            position: Vector3.create(0, 0.48, 0.01),
            rotation: Quaternion.fromEulerDegrees(0, 180, 0)
        })
        VisibilityComponent.create(this.waitingListEntity, { visible: false })

        this.myPosEntity = engine.addEntity()
        Transform.create(this.myPosEntity, {
            parent: this.displayEntity,
            position: Vector3.create(-0.3, -0.2, 0.01),
            rotation: Quaternion.fromEulerDegrees(0, 180, 0)
        })
        VisibilityComponent.create(this.myPosEntity, { visible: false })



        // GameData.onChange(gameDataEntity, (data) => this.updateWaitingList(data as any))
    }


    private getScreenUVs(screen: number): number[] {

        let blockSize = 1 / 16
        const width = 7
        const height = 5
        const row = Math.floor(screen / 2) * height
        const col = screen % 2 * width

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
        if (this.active) return

        this.active = true
        const { position } = Transform.get(this.frameEntity)

        Tween.createOrReplace(this.frameEntity,
            {
                mode: Tween.Mode.Move({
                    start: position,
                    end: this.positionActive.position
                }),
                duration: 1000,
                easingFunction: EasingFunction.EF_EASEOUTEXPO
            })

        console.log("setting screen change timeout")
        utils.timers.setTimeout(() => {
            console.log("starting screensystem")
            this.setScreen(SCREENS.queueList)
            engine.addSystem(this.updateWaitingList)
        }, 2000)

    }

    disable() {
        if (!this.active) return

        this.active = false
        const { position } = Transform.get(this.frameEntity)
        Tween.createOrReplace(this.frameEntity,
            {
                mode: Tween.Mode.Move({
                    start: position,
                    end: this.positionDisabled.position
                }),
                duration: 1000,
                easingFunction: EasingFunction.EF_EASEOUTEXPO
            })

        engine.removeSystem(this.updateWaitingList)
    }

    setScreen(screenIndex: number) {

        if (screenIndex === SCREENS.queueList) {
            VisibilityComponent.getMutable(this.waitingListEntity).visible = true
            VisibilityComponent.getMutable(this.myPosEntity).visible = true
        } else {
            VisibilityComponent.getMutable(this.waitingListEntity).visible = false
            VisibilityComponent.getMutable(this.myPosEntity).visible = false
        }


        this.currentScreen = screenIndex
        // MeshRenderer.createOrReplace(this.displayEntity, this.getScreenUVs(this.currentScreen))
        MeshRenderer.deleteFrom(this.displayEntity)
        MeshRenderer.setPlane(this.displayEntity, this.getScreenUVs(this.currentScreen))

    }

    private updateWaitingList(dt: number) {
            const localPlayer = getPlayer()

            // console.log(playersQueue.getQueue())
            const playerNames = ['hola', "buen dia"]
            // const playerNames = data.queue.map(player => player.name).slice(0, 4)
            // const myPos = GameData.get(gameDataEntity).queue.findIndex(item => item.address === localPlayer?.userId) + 1
            const myPos = 2

            TextShape.createOrReplace(this.waitingListEntity, {
                text: playerNames.join("\n"),
                fontSize: 1.1,
                textAlign: TextAlignMode.TAM_TOP_CENTER,
                textColor: Color4.Black()
            })

            TextShape.createOrReplace(this.myPosEntity, {
                text: `${myPos}`,
                fontSize: 2,
                textAlign: TextAlignMode.TAM_TOP_CENTER
            })

            // if (localPlayer?.userId !== data.playerAddress && myPos === 0) {
            //     this.disable()
            // }
        }

}


interface queueDataType {
    playerAddress: string
    queue: {
        name: string
        address: string
    }[]
}