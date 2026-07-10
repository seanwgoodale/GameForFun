/** Round length in seconds (very large maps) */
export const ROUND_DURATION_SEC = 600

/** Bonus for reaching the extraction tile */
export const GOAL_BONUS = 40

/** Starting vitals; medkits can raise you up to MAX_HEALTH */
export const STARTING_HEALTH = 100
export const MAX_HEALTH = 130

/** Vitals restored by a medkit pickup */
export const HEALTH_PICKUP_AMOUNT = 28

/** Score when a ranged shot drops a hostile */
export const WEAPON_KILL_SCORE = 12

/** Damage when stepping into residual radiation (once per hotspot id) */
export const RADIATION_DAMAGE = 12

/** Radiation pulse: min radius (tiles), max radius (tiles) */
export const RADIATION_PULSE_MIN = 0.5
export const RADIATION_PULSE_MAX = 2

/** Radiation pulse durations (ms): grow 3–6s, shrink 3–6s, rest 3–8s */
export const RADIATION_PULSE_GROW_MIN = 3000
export const RADIATION_PULSE_GROW_MAX = 6000
export const RADIATION_PULSE_SHRINK_MIN = 3000
export const RADIATION_PULSE_SHRINK_MAX = 6000
export const RADIATION_PULSE_REST_MIN = 3000
export const RADIATION_PULSE_REST_MAX = 8000

/** Full world size (procedural grid including border walls) */
export const WORLD_COLS = 84
export const WORLD_ROWS = 56

/**
 * Difficulty presets — the single source of run tuning. `survivor` matches the
 * pre-difficulty balance (which the old multiplier chain worked out to).
 * chaseSpeed is tiles/sec (player moves at 4.25); chaseRange in tiles.
 */
export const DIFFICULTIES = {
  scout: {
    label: 'Scout',
    blurb: 'Fewer dead, richer scavenging',
    zombies: 60,
    traders: 8,
    radiation: 30,
    healthPickups: 75,
    weaponPickups: 38,
    chaseSpeed: 1.9,
    chaseRange: 4.5,
  },
  survivor: {
    label: 'Survivor',
    blurb: 'The wasteland as intended',
    zombies: 90,
    traders: 6,
    radiation: 46,
    healthPickups: 60,
    weaponPickups: 30,
    chaseSpeed: 2.3,
    chaseRange: 5.5,
  },
  nightmare: {
    label: 'Nightmare',
    blurb: 'More dead, faster, hungrier',
    zombies: 120,
    traders: 4,
    radiation: 58,
    healthPickups: 45,
    weaponPickups: 24,
    chaseSpeed: 2.7,
    chaseRange: 6.5,
  },
}
export const DEFAULT_DIFFICULTY = 'survivor'

/** Zombie archetype mix (fractions of the zombie count; rest are shamblers) */
export const RUNNER_FRACTION = 0.15
export const SCREAMER_FRACTION = 0.1
export const GLOWER_FRACTION = 0.1

/** Runners chase faster and from farther away (added to difficulty values) */
export const RUNNER_SPEED_BONUS = 1.0
export const RUNNER_RANGE_BONUS = 2.5

/** Chase gives up this many tiles beyond the aggro range */
export const CHASE_RESET_MARGIN = 3

/** Chasers stop closing inside this distance (contact radius still hits) */
export const CHASE_STANDOFF = 0.45

/** Screamer: wakes zombies in radius into a timed chase, then cools down */
export const SCREAM_RADIUS = 9
export const SCREAM_CHASE_MS = 6000
export const SCREAM_COOLDOWN_MS = 12000

/** Glower: radiation aura — damage per tick, tick cooldown, radius (tiles) */
export const GLOWER_AURA_RADIUS = 1.3
export const GLOWER_AURA_DAMAGE = 6
export const GLOWER_AURA_COOLDOWN_MS = 1500

/** Supply drop side objective: spawn window after start, lifetime, contents */
export const SUPPLY_DROP_DELAY_MIN_MS = 60000
export const SUPPLY_DROP_DELAY_MAX_MS = 120000
export const SUPPLY_DROP_DURATION_MS = 90000
export const SUPPLY_DROP_SCORE = 25
export const SUPPLY_DROP_MIN_DIST = 12
export const SUPPLY_DROP_MAX_DIST = 40
export const SUPPLY_DROP_MEDKITS = 2
export const SUPPLY_DROP_AMMO = 3

/** Vitals per second while standing on a rest-house tile */
export const HOUSE_HEAL_PER_SEC = 11

/** Visible window (camera follows player, clamped to world edges) */
export const VIEWPORT_COLS = 19
export const VIEWPORT_ROWS = 15

/** Fog clears in a square around the player (Chebyshev distance) */
export const VISION_RADIUS = 8

/** Hostiles / hazards wander on this cadence (5× faster than original 4500) */
export const ENTITY_MOVE_INTERVAL_MS = 900

/** Min tiles zombies/traders move in one direction before changing course */
export const ENTITY_MIN_TILES_PER_DIR = 2

/** Smooth walk speed (tile widths per second) */
export const PLAYER_MOVE_SPEED = 4.25

/** Player hitbox radius in tile units (circle vs wall squares) */
export const PLAYER_RADIUS = 0.29

/** Starting ammo (Space bar ranged shots) */
export const STARTING_WEAPONS = 10

/** Health threshold (0-1); below this, health packs auto-use on pickup */
export const HEALTH_PACK_AUTO_USE_THRESHOLD = 0.5

/** Ranged shot range in tiles (Space bar) */
export const RANGED_SHOT_RANGE = 4

/** Hostile aggro range (tiles); within this, 25% chance to shoot and periodic shots occur */
export const HOSTILE_AGGRO_RANGE = 4

/** Distance (tiles) beyond which hostile aggro fully resets; re-enter 4 to re-roll */
export const HOSTILE_RESET_RANGE = 6

/** Hostile shot range in tiles (matches player ranged shot) */
export const HOSTILE_SHOT_RANGE = 4

/** Chance (0–1) hostile shoots instead of engaging when player enters aggro range */
export const HOSTILE_SHOT_CHANCE = 0.25

/** Damage from hostile shot as fraction of max health (e.g. 0.2 = 20%) */
export const HOSTILE_SHOT_DAMAGE_PERCENT = 0.2

/** Min/max ms between periodic hostile shots (randomized per shot) */
export const HOSTILE_SHOT_INTERVAL_MIN_MS = 3000
export const HOSTILE_SHOT_INTERVAL_MAX_MS = 5000

/** Duration of player projectile flight (ms); damage/defeated applied on contact */
export const PROJECTILE_FLIGHT_MS = 320

/** Duration of hostile projectile flight (ms); damage applied on contact */
export const HOSTILE_PROJECTILE_FLIGHT_MS = 220

/** Trigger encounters / rads / exit when center is within this tile radius */
export const PLAYER_INTERACT_RADIUS = 0.48
export const PLAYER_INTERACT_RADIUS_SQ =
  PLAYER_INTERACT_RADIUS * PLAYER_INTERACT_RADIUS

/** Zombies to eliminate before extraction */
export const ZOMBIES_TO_ELIMINATE = 10

/** Duration (ms) a shot trader stays angry and untradeable */
export const TRADER_ANGRY_DURATION_MS = 5 * 60 * 1000

/** After closing an encounter without a kill/trade, the survivor ignores the
 * player this long so walking away doesn't re-trigger it instantly. */
export const ENCOUNTER_PACIFIED_MS = 6000

/** Zombie contact damage: min/max fraction of max health (0.05 = 5%) */
export const ZOMBIE_CONTACT_DAMAGE_MIN = 0.05
export const ZOMBIE_CONTACT_DAMAGE_MAX = 0.10

/** Cooldown (ms) between zombie contact damage ticks */
export const ZOMBIE_CONTACT_COOLDOWN_MS = 1200

export const STORAGE_KEYS = {
  highScore: '1mo-high-score',
  difficulty: 'we-difficulty',
}

export const LEADERBOARD_NAME_MAX_LENGTH = 13
