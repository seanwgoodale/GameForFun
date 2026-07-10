/**
 * Map geometry is generated per run — see `utils/generateLevel.js`.
 *
 * @typedef {'radiation' | 'zombie' | 'trader' | 'pickup'} EntityKind
 * @typedef {'health' | 'weapon'} PickupType
 * @typedef {{
 *   id: string
 *   kind: EntityKind
 *   x: number
 *   y: number
 *   scenarioId?: string
 *   defeated?: boolean
 *   pickupType?: PickupType
 * }} MapEntity
 */

export {}
