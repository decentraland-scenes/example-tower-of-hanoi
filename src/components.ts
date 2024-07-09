import { Schemas, engine } from '@dcl/sdk/ecs'

export const Disc = engine.defineComponent('disc', {
    size: Schemas.Number,
    currentTower: Schemas.Number,
    isSelected: Schemas.Boolean
})

export const Player = engine.defineComponent('player', {
    id: Schemas.String,
    name: Schemas.String,
    arrivedAt: Schemas.String,
    moves: Schemas.Number,
    levelStartedAt: Schemas.String,
    currentLevel: Schemas.Number
})
