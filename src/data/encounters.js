/**
 * Diegetic encounter deck. Touching a hostile or trader draws its encounter:
 * a situation, 2–4 choices, each with weighted outcomes.
 *
 * @typedef {{
 *   health?: number    // vitals delta (negative = damage, runs the death pipeline)
 *   ammo?: number
 *   medkits?: number
 *   score?: number
 *   kill?: boolean     // hostile eliminated — counts toward the extraction quota
 *   trade?: boolean    // trader satisfied; never engages again
 *   anger?: boolean    // trader hostile-flagged for a while
 * }} EncounterEffects
 *
 * @typedef {{ chance: number; text: string; effects?: EncounterEffects }} Outcome
 *
 * @typedef {{
 *   label: string
 *   detail?: string                              // risk/reward hint under the label
 *   cost?: { ammo?: number; medkits?: number }   // paid up front; disabled if unaffordable
 *   outcomes: Outcome[]                          // chances are weights (normalized)
 * }} Choice
 *
 * @typedef {{ id: string; kind: 'zombie' | 'trader'; title: string; text: string; choices: Choice[] }} Encounter
 */

/** @type {Encounter[]} */
export const encounters = [
  // ───────────────────────── hostiles ─────────────────────────
  {
    id: 'z-lunge',
    kind: 'zombie',
    title: 'Feral stalker',
    text: 'It bursts from the scrub at a dead sprint — jaw slack, hands out. Three steps between you and it.',
    choices: [
      {
        label: 'Drop it — one round',
        detail: 'Reliable, costs ammo',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.8, text: 'The shot takes it mid-stride. It folds into the dirt.', effects: { kill: true, score: 15 } },
          { chance: 0.2, text: 'The round clips its shoulder — it keeps coming and rakes your arm before you kick free.', effects: { health: -12 } },
        ],
      },
      {
        label: 'Sidestep and shove',
        detail: 'Free, risky',
        outcomes: [
          { chance: 0.45, text: 'You pivot; it piles into a boulder skull-first and stops moving.', effects: { kill: true, score: 10 } },
          { chance: 0.35, text: 'You slip past, but its nails tear a line down your back.', effects: { health: -10 } },
          { chance: 0.2, text: 'You stumble. It lands on you before you throw it off.', effects: { health: -18 } },
        ],
      },
      {
        label: 'Back away slowly',
        detail: 'Live to fight later',
        outcomes: [
          { chance: 0.7, text: 'It loses your scent in the wind and wanders off, snarling.', effects: {} },
          { chance: 0.3, text: 'It snaps at you as you retreat — a graze, but it burns.', effects: { health: -6 } },
        ],
      },
    ],
  },
  {
    id: 'z-crawler',
    kind: 'zombie',
    title: 'Crawler in the trail',
    text: 'Half of it is missing, but the half that’s left is dragging itself across your path, patient as rot.',
    choices: [
      {
        label: 'Stomp it',
        detail: 'Free, up close',
        outcomes: [
          { chance: 0.65, text: 'One heavy boot. It stops crawling.', effects: { kill: true, score: 12 } },
          { chance: 0.35, text: 'It twists and sinks its teeth into your boot — you finish it, bleeding.', effects: { kill: true, score: 12, health: -9 } },
        ],
      },
      {
        label: 'Put a round in it',
        detail: 'Clean and certain',
        cost: { ammo: 1 },
        outcomes: [{ chance: 1, text: 'From a safe distance. No drama.', effects: { kill: true, score: 15 } }],
      },
      {
        label: 'Step around it',
        outcomes: [
          { chance: 0.85, text: 'It claws the air behind you. Not your problem today.', effects: {} },
          { chance: 0.15, text: 'It catches your ankle — you wrench free.', effects: { health: -5 } },
        ],
      },
    ],
  },
  {
    id: 'z-pair-scrap',
    kind: 'zombie',
    title: 'Feeding frenzy',
    text: 'It’s hunched over something dead, tearing. It hasn’t seen you. The wind is about to change.',
    choices: [
      {
        label: 'Silent takedown',
        detail: 'Free, needs nerve',
        outcomes: [
          { chance: 0.6, text: 'You cross the gap in four quiet steps and it never hears the fifth.', effects: { kill: true, score: 18 } },
          { chance: 0.4, text: 'A bottle rolls under your foot. It spins and you fight it off the hard way.', effects: { health: -14 } },
        ],
      },
      {
        label: 'Shoot from cover',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.85, text: 'It slumps over its last meal.', effects: { kill: true, score: 15 } },
          { chance: 0.15, text: 'The shot goes wide and it charges — you drop it with the butt of your rifle, badly.', effects: { kill: true, score: 15, health: -10 } },
        ],
      },
      {
        label: 'Leave it to its meal',
        outcomes: [{ chance: 1, text: 'Whatever it’s eating buys you the time to slip away.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-doorway',
    kind: 'zombie',
    title: 'The one in the doorway',
    text: 'It stands wedged in a ruined doorframe you need to pass, swaying, milk-white eyes tracking nothing.',
    choices: [
      {
        label: 'Knife it quiet',
        detail: 'Free, close work',
        outcomes: [
          { chance: 0.55, text: 'You pin it to the frame and it goes still.', effects: { kill: true, score: 14 } },
          { chance: 0.45, text: 'It shrieks and grabs your collar — you put it down in a bad scramble.', effects: { kill: true, score: 14, health: -13 } },
        ],
      },
      {
        label: 'Lure it out, trip it',
        outcomes: [
          { chance: 0.5, text: 'It lurches after your whistle and goes down a rubble slope, headfirst.', effects: { kill: true, score: 12 } },
          { chance: 0.5, text: 'It stumbles but recovers, and now it’s between you and daylight.', effects: { health: -8 } },
        ],
      },
      {
        label: 'Find another way around',
        outcomes: [{ chance: 1, text: 'A window, a wall, ten wasted minutes. It keeps its doorway.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-runner-pack',
    kind: 'zombie',
    title: 'Runner off the ridge',
    text: 'A scream from above — one of the fast ones is skidding down the slope at you, kicking scree.',
    choices: [
      {
        label: 'Two quick rounds',
        detail: 'Spend big, stop it dead',
        cost: { ammo: 2 },
        outcomes: [{ chance: 1, text: 'The first slows it, the second stops it. It rolls to your feet.', effects: { kill: true, score: 20 } }],
      },
      {
        label: 'One careful shot',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.6, text: 'Caught it mid-leap. It cartwheels past you, done.', effects: { kill: true, score: 15 } },
          { chance: 0.4, text: 'It jinks. It hits you at full speed before you throw it off.', effects: { health: -16 } },
        ],
      },
      {
        label: 'Brace and grapple',
        detail: 'Free, ugly',
        outcomes: [
          { chance: 0.4, text: 'You use its speed against it — its neck meets a fence post.', effects: { kill: true, score: 12 } },
          { chance: 0.6, text: 'It bowls you over. Teeth graze your shoulder before you kick it into a gully.', effects: { health: -15 } },
        ],
      },
    ],
  },
  {
    id: 'z-mud',
    kind: 'zombie',
    title: 'Stuck in the mire',
    text: 'It’s sunk to the waist in radioactive mud, hissing, arms windmilling. It will get out. Eventually.',
    choices: [
      {
        label: 'End it now',
        cost: { ammo: 1 },
        outcomes: [{ chance: 1, text: 'Target practice. The mire keeps the rest.', effects: { kill: true, score: 15 } }],
      },
      {
        label: 'Wade in with the knife',
        detail: 'Free, filthy, risky',
        outcomes: [
          { chance: 0.5, text: 'You finish it and slog out, reeking but unhurt.', effects: { kill: true, score: 12 } },
          { chance: 0.5, text: 'The mud grabs you too. It’s a close, horrible thing.', effects: { kill: true, score: 12, health: -14 } },
        ],
      },
      {
        label: 'Let the mire have it',
        outcomes: [{ chance: 1, text: 'You leave it screaming at the sky. It might still be there tomorrow.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-swarmbait',
    kind: 'zombie',
    title: 'Bell-collar',
    text: 'Someone tied a cowbell around its neck as a joke or a warning. Every step it takes rings across the flat. It’s heard you.',
    choices: [
      {
        label: 'Silence the bell',
        detail: 'Kill it before the noise draws more',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.75, text: 'The ringing stops. The silence afterward feels like payment.', effects: { kill: true, score: 18 } },
          { chance: 0.25, text: 'You hit the bell instead. The clang is deafening — it’s on you before the echo dies.', effects: { health: -12 } },
        ],
      },
      {
        label: 'Outrun the noise',
        outcomes: [
          { chance: 0.65, text: 'You put a hill between you and the bell.', effects: {} },
          { chance: 0.35, text: 'It herds you through a bramble field. The thorns take their toll.', effects: { health: -8 } },
        ],
      },
    ],
  },
  {
    id: 'z-firelight',
    kind: 'zombie',
    title: 'Drawn to the embers',
    text: 'It’s circling the remains of someone’s campfire, stepping through hot coals without noticing. There’s a full pack still by the bedroll.',
    choices: [
      {
        label: 'Kill it, take the pack',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.7, text: 'It drops in the ashes. The pack holds a field kit and loose rounds.', effects: { kill: true, score: 15, medkits: 1, ammo: 2 } },
          { chance: 0.3, text: 'It drops — but the pack was already looted. Story of this place.', effects: { kill: true, score: 15 } },
        ],
      },
      {
        label: 'Snatch the pack quietly',
        detail: 'Free, greedy',
        outcomes: [
          { chance: 0.5, text: 'You lift the pack without a sound. Medkit inside.', effects: { medkits: 1, score: 8 } },
          { chance: 0.5, text: 'A coal pops. It turns. You keep the pack but pay skin for it.', effects: { medkits: 1, health: -12 } },
        ],
      },
      {
        label: 'Not worth it',
        outcomes: [{ chance: 1, text: 'You back out of the firelight and let the dead keep the camp.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-uniform',
    kind: 'zombie',
    title: 'The soldier it was',
    text: 'Rotted fatigues, a cracked helmet, a rifle it no longer remembers how to hold. It salutes at nothing, then notices you.',
    choices: [
      {
        label: 'Center mass',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.8, text: 'Whatever it was guarding, it’s relieved of duty. Its webbing has two good rounds.', effects: { kill: true, score: 15, ammo: 2 } },
          { chance: 0.2, text: 'The old plate carrier eats your round. It closes the distance snapping.', effects: { health: -12 } },
        ],
      },
      {
        label: 'Take it hand-to-hand',
        detail: 'Free, it’s slow',
        outcomes: [
          { chance: 0.55, text: 'Its reflexes died years ago. Yours didn’t.', effects: { kill: true, score: 12 } },
          { chance: 0.45, text: 'The helmet makes it awkward. You win, but it costs you.', effects: { kill: true, score: 12, health: -11 } },
        ],
      },
      {
        label: 'Retreat with respect',
        outcomes: [{ chance: 1, text: 'You leave the soldier to its post.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-window',
    kind: 'zombie',
    title: 'Arms through the fence',
    text: 'It’s tangled in old chain-link, arms through the gaps, wire cutting it to ribbons as it strains toward you.',
    choices: [
      {
        label: 'Finish it through the wire',
        detail: 'Free, almost safe',
        outcomes: [
          { chance: 0.8, text: 'The fence holds it still for the knife. Almost merciful.', effects: { kill: true, score: 12 } },
          { chance: 0.2, text: 'The fence gives at the worst moment. You finish it under a collapsing gate.', effects: { kill: true, score: 12, health: -10 } },
        ],
      },
      {
        label: 'Walk the long way',
        outcomes: [{ chance: 1, text: 'The rattling fades behind you.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-two-legs',
    kind: 'zombie',
    title: 'It brought a friend',
    text: 'Two of them, shoulder to shoulder in the gully mouth. One drags a shovel it will never use again.',
    choices: [
      {
        label: 'Two rounds, two bodies',
        cost: { ammo: 2 },
        outcomes: [
          { chance: 0.75, text: 'Both drop before they clear the gully. Textbook.', effects: { kill: true, score: 25 } },
          { chance: 0.25, text: 'One drops. The other reaches you — it’s knife work after that.', effects: { kill: true, score: 20, health: -12 } },
        ],
      },
      {
        label: 'Funnel them, fight one',
        detail: 'Free, tactical',
        outcomes: [
          { chance: 0.45, text: 'The narrow gap forces them single file. The first falls, the second flees a rockslide you start.', effects: { kill: true, score: 15 } },
          { chance: 0.55, text: 'They don’t queue politely. You escape the scrum bleeding.', effects: { health: -16 } },
        ],
      },
      {
        label: 'Cede the gully',
        outcomes: [{ chance: 1, text: 'Some doors aren’t worth the toll.', effects: {} }],
      },
    ],
  },
  {
    id: 'z-sleeper',
    kind: 'zombie',
    title: 'Sleeper in the grass',
    text: 'You nearly stepped on it — curled in the weeds like something dreaming. Its fingers twitch.',
    choices: [
      {
        label: 'Never let it wake',
        detail: 'Free, now or never',
        outcomes: [
          { chance: 0.75, text: 'It never knows. The grass barely moves.', effects: { kill: true, score: 16 } },
          { chance: 0.25, text: 'Its eyes open on the downswing. The struggle is brief and loud.', effects: { kill: true, score: 16, health: -9 } },
        ],
      },
      {
        label: 'Step over it',
        outcomes: [
          { chance: 0.75, text: 'You clear it in two long, silent strides.', effects: {} },
          { chance: 0.25, text: 'A dry stick. Of course. You sprint out of its waking lunge with a scratch.', effects: { health: -6 } },
        ],
      },
    ],
  },
  {
    id: 'z-scream',
    kind: 'zombie',
    title: 'The screamer',
    text: 'This one doesn’t attack. It just inhales — the scream that follows will bring every dead thing in a mile.',
    choices: [
      {
        label: 'Cut the scream short',
        detail: 'Shoot before the lungs fill',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.7, text: 'The scream dies as a hiss. Your ears ring in the quiet.', effects: { kill: true, score: 20 } },
          { chance: 0.3, text: 'Too slow — the scream rakes the valley, and something answers it. You take a hit slipping away.', effects: { health: -14 } },
        ],
      },
      {
        label: 'Charge it',
        detail: 'Free, desperate',
        outcomes: [
          { chance: 0.5, text: 'You tackle it mid-breath into a dry cistern. The scream stays in the hole with it.', effects: { kill: true, score: 15 } },
          { chance: 0.5, text: 'It screams directly into your face. Your head rings; its claws find you.', effects: { health: -15 } },
        ],
      },
      {
        label: 'Run before it finishes',
        outcomes: [
          { chance: 0.6, text: 'You’re over the ridge before the echo finds you.', effects: {} },
          { chance: 0.4, text: 'The scream chases you into a barbed thicket.', effects: { health: -8 } },
        ],
      },
    ],
  },
  {
    id: 'z-radglow',
    kind: 'zombie',
    title: 'Glowing one',
    text: 'It shuffles out of a hotspot trailing steam, skin lit faintly green from the inside. The air around it clicks.',
    choices: [
      {
        label: 'Kill it at range',
        detail: 'Don’t let it close',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.75, text: 'It bursts like a lanced blister, safely far away.', effects: { kill: true, score: 18 } },
          { chance: 0.25, text: 'It pops in a hot mist that drifts your way. You taste metal.', effects: { kill: true, score: 18, health: -10 } },
        ],
      },
      {
        label: 'Keep your distance',
        outcomes: [
          { chance: 0.7, text: 'You circle wide. The clicking fades.', effects: {} },
          { chance: 0.3, text: 'It’s faster than it looks — you outpace it but catch a dose.', effects: { health: -9 } },
        ],
      },
    ],
  },
  {
    id: 'z-cellar',
    kind: 'zombie',
    title: 'Noise under the boards',
    text: 'A root cellar door thumps from below. Whatever’s down there has heard your footsteps on the boards — and cellars mean supplies.',
    choices: [
      {
        label: 'Open it on your terms',
        detail: 'Ambush it as it climbs',
        outcomes: [
          { chance: 0.6, text: 'It climbs into your swing. Below: dusty shelves and a sealed medkit.', effects: { kill: true, score: 15, medkits: 1 } },
          { chance: 0.4, text: 'Two hands, not one — it’s strong. You win the door fight at a price.', effects: { kill: true, score: 15, health: -13 } },
        ],
      },
      {
        label: 'Shoot through the boards',
        cost: { ammo: 2 },
        outcomes: [
          { chance: 0.65, text: 'The thumping stops. The cellar is yours — cans and a medkit.', effects: { kill: true, score: 14, medkits: 1 } },
          { chance: 0.35, text: 'Splinters and noise, but the thing below keeps thumping. You leave it entombed.', effects: { score: 4 } },
        ],
      },
      {
        label: 'Weight the door shut',
        outcomes: [{ chance: 1, text: 'You drag a stove onto the door. Problem deferred is problem solved, out here.', effects: { score: 6 } }],
      },
    ],
  },

  // ───────────────────────── traders ─────────────────────────
  {
    id: 't-caravan',
    kind: 'trader',
    title: 'Caravan straggler',
    text: 'A wiry figure under a tarp-cloak raises one open hand. “Lost my caravan at the river. Trade? I travel light but I travel smart.”',
    choices: [
      {
        label: 'Trade intel for rounds',
        detail: 'Tell them what you’ve seen',
        outcomes: [
          { chance: 0.8, text: 'Your map markings are worth more than scrap out here. They count rounds into your palm.', effects: { trade: true, ammo: 4, score: 10 } },
          { chance: 0.2, text: 'They know these flats better than you. Pity rounds, but pity counts.', effects: { trade: true, ammo: 2, score: 5 } },
        ],
      },
      {
        label: 'Ask for medical stock',
        outcomes: [
          { chance: 0.7, text: '“Field kits I’ve got.” Two sealed medkits, no questions.', effects: { trade: true, medkits: 2, score: 10 } },
          { chance: 0.3, text: 'One kit, half their stock. They wave off your thanks.', effects: { trade: true, medkits: 1, score: 8 } },
        ],
      },
      {
        label: 'Keep walking',
        outcomes: [{ chance: 1, text: 'They shrug and melt back into the scrub. Maybe next time.', effects: {} }],
      },
    ],
  },
  {
    id: 't-doctor',
    kind: 'trader',
    title: 'The circuit doctor',
    text: 'Red cross painted on a steel briefcase. “I walk the settlements. You look like my kind of customer — the upright kind, barely.”',
    choices: [
      {
        label: 'Get patched up',
        detail: 'Free care, they take notes',
        outcomes: [
          { chance: 0.75, text: 'Quick hands, clean sutures. “Tell people the doctor still walks the circuit.”', effects: { trade: true, health: 25, score: 10 } },
          { chance: 0.25, text: 'They do what they can with what’s left in the case.', effects: { trade: true, health: 12, score: 8 } },
        ],
      },
      {
        label: 'Buy supplies instead',
        outcomes: [{ chance: 1, text: 'Two kits, wrapped in cloth. “Use them slower than the last guy.”', effects: { trade: true, medkits: 2, score: 10 } }],
      },
      {
        label: 'Decline politely',
        outcomes: [{ chance: 1, text: 'They tip an imaginary hat and move on down the trail.', effects: {} }],
      },
    ],
  },
  {
    id: 't-scrapper',
    kind: 'trader',
    title: 'Scrap baroness',
    text: 'She’s dismantling a drone with a wrench taller than her forearm. “Ammo’s my currency. What’s yours?”',
    choices: [
      {
        label: 'Trade a medkit for rounds',
        detail: 'Costs 1 medkit',
        cost: { medkits: 1 },
        outcomes: [{ chance: 1, text: 'She weighs the kit in one hand and pays out fair: five rounds.', effects: { trade: true, ammo: 5, score: 10 } }],
      },
      {
        label: 'Help strip the drone',
        detail: 'Free labor, uncertain pay',
        outcomes: [
          { chance: 0.6, text: 'An hour of knuckle-skinning work. She flips you rounds and a kit for the trouble.', effects: { trade: true, ammo: 3, medkits: 1, score: 12 } },
          { chance: 0.4, text: 'The drone’s capacitor bites you. She laughs, pays in rounds and advice.', effects: { trade: true, ammo: 3, health: -6, score: 8 } },
        ],
      },
      {
        label: 'Nothing to trade',
        outcomes: [{ chance: 1, text: '“Then quit blocking my light.” Fair enough.', effects: {} }],
      },
    ],
  },
  {
    id: 't-ferryman',
    kind: 'trader',
    title: 'The ferryman',
    text: 'He guards a plank bridge over a rad-creek, toll box open. “Everyone pays. Coin, calories, or conversation.”',
    choices: [
      {
        label: 'Pay in ammo',
        cost: { ammo: 1 },
        outcomes: [{ chance: 1, text: 'He bites the round like it’s gold, nods, and shares his geiger readings — you’ll dodge the worst pockets. Plus a kit “for the road.”', effects: { trade: true, medkits: 1, score: 12 } }],
      },
      {
        label: 'Pay in conversation',
        detail: 'Free, he’s lonely',
        outcomes: [
          { chance: 0.65, text: 'An hour of his war stories. He stuffs your pockets with jerky and three loose rounds at the end.', effects: { trade: true, ammo: 3, score: 10 } },
          { chance: 0.35, text: 'His stories are long and the sun is short. You get two rounds and a proverb.', effects: { trade: true, ammo: 2, score: 6 } },
        ],
      },
      {
        label: 'Ford the creek instead',
        outcomes: [
          { chance: 0.5, text: 'Cold, fast, and only mildly radioactive.', effects: { health: -6 } },
          { chance: 0.5, text: 'You find a dry crossing downstream. The ferryman salutes your stubbornness.', effects: {} },
        ],
      },
    ],
  },
  {
    id: 't-archivist',
    kind: 'trader',
    title: 'The archivist',
    text: 'Books in waterproof wrap, stacked in a shopping cart. “I buy memories. Tell me something true about the world before, and I pay in supplies.”',
    choices: [
      {
        label: 'Tell a true story',
        outcomes: [
          { chance: 0.7, text: 'You talk about traffic jams and cold milk. They write every word. Payment: a kit and rounds.', effects: { trade: true, medkits: 1, ammo: 2, score: 12 } },
          { chance: 0.3, text: 'Halfway through, you realize you’re not sure it’s true anymore. They pay for the doubt too.', effects: { trade: true, ammo: 2, score: 8 } },
        ],
      },
      {
        label: 'Trade for their map margin notes',
        cost: { ammo: 1 },
        outcomes: [{ chance: 1, text: 'The margins mark two supply caches and a warning circled twice. Worth every grain of powder.', effects: { trade: true, medkits: 1, score: 14 } }],
      },
      {
        label: 'Move along',
        outcomes: [{ chance: 1, text: 'They’re already reading again before you’ve gone ten steps.', effects: {} }],
      },
    ],
  },
  {
    id: 't-chef',
    kind: 'trader',
    title: 'Roadside kitchen',
    text: 'A dented pot over a careful fire. The smell hits you like a memory. “Sit. Everyone sits. Payment negotiable.”',
    choices: [
      {
        label: 'Sit and eat',
        detail: 'Free meal, probably',
        outcomes: [
          { chance: 0.8, text: 'Hot stew, real salt. You leave stronger and they wave off payment.', effects: { trade: true, health: 15, score: 10 } },
          { chance: 0.2, text: 'The mystery meat asks questions on the way down. Still — calories.', effects: { trade: true, health: 6, score: 5 } },
        ],
      },
      {
        label: 'Trade a round for the recipe',
        cost: { ammo: 1 },
        outcomes: [{ chance: 1, text: 'Stew, seconds, and a medkit they insist you take. “Return the favor down the road.”', effects: { trade: true, health: 15, medkits: 1, score: 12 } }],
      },
      {
        label: 'Never eat wasteland stew',
        outcomes: [{ chance: 1, text: 'Rule one. The chef respects rule one.', effects: {} }],
      },
    ],
  },
  {
    id: 't-pilgrim',
    kind: 'trader',
    title: 'Pilgrim of the pad',
    text: 'Robes stitched from parachute silk. “I walk to the helipad shrine. All who help a pilgrim are blessed with provisions.”',
    choices: [
      {
        label: 'Share your heading',
        detail: 'Point them true',
        outcomes: [
          { chance: 0.75, text: 'You orient them by the ridge line. The blessing is concrete: rounds and a kit.', effects: { trade: true, ammo: 3, medkits: 1, score: 12 } },
          { chance: 0.25, text: 'They correct YOUR heading, gently, then bless you anyway.', effects: { trade: true, ammo: 2, score: 8 } },
        ],
      },
      {
        label: 'Escort them a stretch',
        detail: 'Free, slow',
        outcomes: [
          { chance: 0.6, text: 'A quiet mile together. At the fork they press supplies into your hands.', effects: { trade: true, medkits: 2, score: 14 } },
          { chance: 0.4, text: 'Their pace is glacial and the sun is cruel, but the blessing is real.', effects: { trade: true, medkits: 1, health: -4, score: 8 } },
        ],
      },
      {
        label: 'Walk on by',
        outcomes: [{ chance: 1, text: 'They bless your dust anyway.', effects: {} }],
      },
    ],
  },
  {
    id: 't-tinker',
    kind: 'trader',
    title: 'The ammunition tinker',
    text: 'Workbench bolted to a bicycle trailer. Reloading dies, powder scale, steady hands. “Brass for brains, friend. I stretch ammo further than anyone.”',
    choices: [
      {
        label: 'Have your rounds rebalanced',
        detail: 'Costs 1 round, returns more',
        cost: { ammo: 1 },
        outcomes: [
          { chance: 0.75, text: 'They break your round into components and hand back three that shoot straighter.', effects: { trade: true, ammo: 3, score: 12 } },
          { chance: 0.25, text: 'The powder’s damp. Two rounds, and an apology you believe.', effects: { trade: true, ammo: 2, score: 6 } },
        ],
      },
      {
        label: 'Just talk shop',
        outcomes: [{ chance: 1, text: 'Twenty minutes on seating depth. They gift you a round for listening right.', effects: { trade: true, ammo: 1, score: 6 } }],
      },
    ],
  },
  {
    id: 't-warden',
    kind: 'trader',
    title: 'Self-appointed warden',
    text: 'Binoculars, a ledger, and an air of authority nobody granted. “I log everything that moves out here. You’re ‘unidentified.’ Fix that and I’ll make it worth your while.”',
    choices: [
      {
        label: 'Give a name and heading',
        outcomes: [
          { chance: 0.7, text: 'Your entry gets a neat checkmark. The reward drawer holds rounds and a kit.', effects: { trade: true, ammo: 2, medkits: 1, score: 10 } },
          { chance: 0.3, text: 'They cross-reference you against nothing for ten minutes, then pay up anyway.', effects: { trade: true, ammo: 2, score: 6 } },
        ],
      },
      {
        label: 'Give a fake name',
        detail: 'Free, cheeky',
        outcomes: [
          { chance: 0.55, text: '“Welcome, ‘Captain Helipad.’” They know. They pay anyway, for the laugh.', effects: { trade: true, ammo: 3, score: 10 } },
          { chance: 0.45, text: 'The ledger snaps shut. “Unidentified it stays.” No reward, no hard feelings.', effects: { score: 2 } },
        ],
      },
      {
        label: 'Refuse the census',
        outcomes: [{ chance: 1, text: 'You remain a rumor in someone’s ledger.', effects: {} }],
      },
    ],
  },
  {
    id: 't-gravedigger',
    kind: 'trader',
    title: 'The gravedigger',
    text: 'A spade over one shoulder, a row of neat mounds behind him. “I bury what you people leave. Help me dig one and I’ll share what the dead don’t need.”',
    choices: [
      {
        label: 'Pick up a shovel',
        detail: 'Free, honest work',
        outcomes: [
          { chance: 0.7, text: 'An hour of silence and dirt. He splits the effects fairly: rounds, a kit, a nod.', effects: { trade: true, ammo: 2, medkits: 1, score: 14 } },
          { chance: 0.3, text: 'The ground fights back — roots and rebar. Blistered hands, honest pay.', effects: { trade: true, ammo: 2, health: -5, score: 10 } },
        ],
      },
      {
        label: 'Pay respects, keep moving',
        outcomes: [{ chance: 1, text: 'He nods at the mounds. “They appreciate the traffic.”', effects: {} }],
      },
    ],
  },
]

/** @type {Record<string, Encounter>} */
export const encounterById = Object.fromEntries(encounters.map((e) => [e.id, e]))

export const hostileEncounterIds = encounters
  .filter((e) => e.kind === 'zombie')
  .map((e) => e.id)
export const traderEncounterIds = encounters
  .filter((e) => e.kind === 'trader')
  .map((e) => e.id)

/** @param {string} id */
export function getEncounterById(id) {
  return encounterById[id] ?? null
}
