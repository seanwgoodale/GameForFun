/**
 * Encounter copy for zombies, traders, and hazards — keyed by `id` from map entities.
 * @typedef {{ id: string; title: string; prompt: string; options: string[]; correctIndex: number }} Scenario
 */

/** @type {Scenario[]} */
export const scenarios = [
  {
    id: 'enc-001',
    title: 'Shambling courier',
    prompt:
      'A zombie in a shredded courier vest blocks the trail. It groans and holds out a cracked tablet showing error spikes. What do you trade for safe passage?',
    options: [
      'Offer a hard reboot of “everything”',
      'Share triage steps: deploys, error budget, dependency health',
      'Walk away without exchanging info',
    ],
    correctIndex: 1,
  },
  {
    id: 'enc-002',
    title: 'Hot zone survivor',
    prompt:
      'Behind a flickering rad-meter at a roadside checkpoint, someone demands proof you know containment basics before they wave you through. What is the sound first response?',
    options: [
      'Seal vents, verify readings, map the plume before moving people',
      'Open all doors to “air it out”',
      'Ignore sensors if the UI looks fine',
    ],
    correctIndex: 0,
  },
  {
    id: 'enc-003',
    title: 'Wasteland broker',
    prompt:
      'A trader slides a stained holotape across the dirt. “Intel for iodine tabs,” they rasp. They want a crisp incident narrative. What do you offer?',
    options: [
      'A timeline with unknowns, owners, and next verification steps',
      '“We fixed it” with no receipts',
      'A rumor from another caravan',
    ],
    correctIndex: 0,
  },
]

/** @type {Record<string, Scenario>} */
export const scenarioById = Object.fromEntries(scenarios.map((s) => [s.id, s]))

/**
 * @param {string} id
 */
export function getScenarioById(id) {
  return scenarioById[id] ?? null
}
