import { AudioSource, EasingFunction, Entity, GltfContainer, InputAction, Material, MaterialTransparencyMode, MeshRenderer, PointerEventType, PointerEvents, Transform, TransformTypeWithOptionals, Tween, VisibilityComponent, engine, inputSystem, pointerEventsSystem } from "@dcl/sdk/ecs";
import { Color4, Quaternion, Vector3 } from "@dcl/sdk/math";
import { IconData, ButtonShapeData, uiAtlas }from "../minigame-ui/resources"
import * as utils from "@dcl-sdk/utils"


export class MenuButton {
    staticFrame:Entity
    button:Entity
    icon:Entity 
    glowPlane:Entity 

    constructor(transform:TransformTypeWithOptionals,  buttonShapeData:ButtonShapeData, icon:IconData, _hoverText:string, callback : () => void ){

        
        //FRAME
        this.staticFrame = engine.addEntity()
        Transform.createOrReplace(this.staticFrame, transform)
        GltfContainer.create(this.staticFrame, {src: buttonShapeData.base})
       
       
        //BUTTON
        this.button = engine.addEntity()
        Transform.createOrReplace(this.button, {
            parent: this.staticFrame
        })
        GltfContainer.create(this.button, {src: buttonShapeData.shape})

        PointerEvents.create(this.button, { pointerEvents: [
            {
              eventType: PointerEventType.PET_DOWN,
              eventInfo: {
                button: InputAction.IA_POINTER,
                showFeedback: true,
                hoverText: _hoverText,
                maxDistance: 18
              }
            }
          ]})

        engine.addSystem(() => {
            if (inputSystem.isTriggered(InputAction.IA_POINTER, PointerEventType.PET_DOWN, this.button)){
               
                callback()
                this.playSound()          

                Material.setPbrMaterial(this.icon, {
                    texture: Material.Texture.Common({src: uiAtlas}),
                    albedoColor: Color4.White(),
                    emissiveColor: Color4.White(),
                    emissiveIntensity: 4,
                    alphaTexture: Material.Texture.Common({src: uiAtlas}),
                    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
                })

               utils.tweens.stopTranslation(this.button)    
               VisibilityComponent.getMutable(this.glowPlane).visible = true
               //tween button inward 
               utils.tweens.startTranslation(
                    this.button,
                    Vector3.create(0,0,0),
                    Vector3.create(0,-0.03,0),
                    0.05,
                    utils.InterpolationType.EASEOUTSINE,
                    () => {        
                        //when finished tween button outward 
                       
                        utils.tweens.startTranslation(
                            this.button,
                            Vector3.create(0,-0.03,0),
                            Vector3.create(0,0,0),
                            0.3,
                            utils.InterpolationType.EASEOUTSINE,
                            () => {
                                VisibilityComponent.getMutable(this.glowPlane).visible = false
                                //flash the emissive of the icon
                                Material.setPbrMaterial(this.icon, {
                                    texture: Material.Texture.Common({src: uiAtlas}),
                                    albedoColor: Color4.White(),
                                    emissiveColor: Color4.White(),
                                    emissiveIntensity: 2,
                                    alphaTexture: Material.Texture.Common({src: uiAtlas}),
                                    transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
                                })
                            }
                      )
                    }
              )
            }
        })

        //ICON
        this.icon = engine.addEntity()
        Transform.createOrReplace(this.icon, {
            rotation: Quaternion.fromEulerDegrees(90,0,0),
            position: Vector3.create(0,0.076,0),
            scale: Vector3.create(0.15, 0.15, 0.15),
            parent: this.button
        })
        MeshRenderer.setPlane(this.icon, icon.uvs)
        Material.setPbrMaterial(this.icon, {
            texture: Material.Texture.Common({src: uiAtlas}),
            albedoColor: Color4.White(),
            emissiveColor: Color4.White(),
            alphaTexture: Material.Texture.Common({src: uiAtlas}),
            transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
        })

        //GLOW BACKGROUND
        this.glowPlane = engine.addEntity()
        Transform.createOrReplace(this.glowPlane, {
            rotation: Quaternion.fromEulerDegrees(90,0,0),
            position: Vector3.create(0,0.03,0),
            scale: buttonShapeData.isRect?Vector3.create(0.45, 0.20, 0.22):Vector3.create(0.24, 0.24, 0.24),
            parent: this.staticFrame
        })
        MeshRenderer.setPlane(this.glowPlane, icon.uvs)
        Material.setPbrMaterial(this.glowPlane, {            
            albedoColor: Color4.White(),
            emissiveColor: Color4.White(),  
            emissiveIntensity: 4         
            
        })
        VisibilityComponent.create(this.glowPlane, {visible: false})

       
                  
    }

    changeIcon(iconData:IconData){
        MeshRenderer.setPlane(this.icon, iconData.uvs)
        Material.setPbrMaterial(this.icon, {
            texture: Material.Texture.Common({src: uiAtlas}),
            albedoColor: Color4.White(),
            emissiveColor: Color4.White(),
            alphaTexture: Material.Texture.Common({src: uiAtlas}),
            transparencyMode: MaterialTransparencyMode.MTM_ALPHA_TEST
        })
    }
    

    playSound(){
        AudioSource.createOrReplace(this.button,{
            audioClipUrl: "sounds/button_click.mp3",
            loop: false,
            playing: true,
            volume: 2
        })
    }

    

  
}