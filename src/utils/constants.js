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

/** Multiply zombie & radiation counts after other tuning (×3) */
export const HOSTILE_ZOMBIE_RAD_MULT = 3

/** Full world size (procedural grid including border walls) */
export const WORLD_COLS = 84
export const WORLD_ROWS = 56

/** Medkits + weapon pickups: multiply base counts by this (e.g. 2.5 = +150%) */
export const POSITIVE_PICKUP_COUNT_MULT = 2.5

/** Zombies, traders, radiation hotspots: multiply base counts (+200% = ×3) */
export const NEGATIVE_ENCOUNTER_MULT = 3

/** Extra multiplier for zombie + trader counts only (+300% = ×4 on top of the above) */
export const HOSTILE_EXTRA_MULT = 4

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
}

export const LEADERBOARD_NAME_MAX_LENGTH = 13
