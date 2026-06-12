/**
 * sportConfig.ts — THE single source of truth for all sport-specific strings
 * in the frontend.
 *
 * To switch this entire application from Track & Field to Swimming (or any
 * future sport), change ACTIVE_SPORT below and the rest updates automatically.
 *
 * This is the frontend mirror of backend/app/core/sport_config.py
 */

export type ActiveSport = 'swimming' | 'track_field'

interface SportConfig {
  sportName: string
  meetTypeLabel: string
  participantLabel: string
  participantsLabel: string
  performanceLabel: string
  performanceUnit: string
  disciplineLabel: string
  venueConfigLabel: string
  venueConfigs: string[]
  defaultVenueConfig: string
  laneLabel: string
  lanesDefault: number
  heatLabel: string
  seedPerformanceLabel: string
  sidebarIcon: string         // lucide icon name
  themeColorClass: string     // CSS class prefix
  /** discipline → is it a field event (mark in metres, not timed) */
  fieldDisciplines: string[]
  relayDisciplines: string[]
  disciplines: string[]
  /** human-readable labels for disciplines */
  disciplineLabels: Record<string, string>
  dqCodes: Record<string, string>
  maxAttempts: number          // field events: number of attempts
}

export const SPORT_CONFIGS: Record<ActiveSport, SportConfig> = {

  // ── Swimming ─────────────────────────────────────────────────────────────
  swimming: {
    sportName:           'Swimming',
    meetTypeLabel:       'Swim Meet',
    participantLabel:    'Swimmer',
    participantsLabel:   'Swimmers',
    performanceLabel:    'Time',
    performanceUnit:     'seconds',
    disciplineLabel:     'Stroke',
    venueConfigLabel:    'Course',
    venueConfigs:        ['SCY', 'SCM', 'LCM'],
    defaultVenueConfig:  'SCM',
    laneLabel:           'Lane',
    lanesDefault:        8,
    heatLabel:           'Heat',
    seedPerformanceLabel:'Seed Time',
    sidebarIcon:         'Waves',
    themeColorClass:     'pool',
    fieldDisciplines:    [],
    relayDisciplines:    ['relay_freestyle', 'relay_medley'],
    disciplines: [
      'freestyle', 'backstroke', 'breaststroke',
      'butterfly', 'individual_medley',
      'relay_freestyle', 'relay_medley',
    ],
    disciplineLabels: {
      freestyle: 'Freestyle', backstroke: 'Backstroke',
      breaststroke: 'Breaststroke', butterfly: 'Butterfly',
      individual_medley: 'Individual Medley',
      relay_freestyle: 'Relay Freestyle', relay_medley: 'Relay Medley',
    },
    dqCodes: {
      'SW 4.4': 'False start',
      'SW 5.3': 'Did not finish',
      'SW 6.5': 'Freestyle — illegal kick / stroke',
      'SW 7.1': 'Backstroke — not on back at finish',
      'SW 8.2': 'Breaststroke — illegal kick',
      'SW 9.3': 'Butterfly — illegal arm recovery',
      'SW 10.2': 'IM — stroke order incorrect',
      'SW 11.3': 'Relay — early take-off',
    },
    maxAttempts: 0,
  },

  // ── Track & Field ────────────────────────────────────────────────────────
  track_field: {
    sportName:           'Track & Field',
    meetTypeLabel:       'Track Meet',
    participantLabel:    'Athlete',
    participantsLabel:   'Athletes',
    performanceLabel:    'Performance',
    performanceUnit:     'seconds or metres',
    disciplineLabel:     'Discipline',
    venueConfigLabel:    'Surface',
    venueConfigs:        ['Synthetic', 'Grass', 'Indoor'],
    defaultVenueConfig:  'Synthetic',
    laneLabel:           'Lane',
    lanesDefault:        8,
    heatLabel:           'Heat / Round',
    seedPerformanceLabel:'Seed Mark',
    sidebarIcon:         'Zap',
    themeColorClass:     'track',
    fieldDisciplines: [
      'long_jump', 'triple_jump', 'high_jump', 'pole_vault',
      'shot_put', 'discus', 'javelin', 'hammer',
    ],
    relayDisciplines: ['relay_4x100m', 'relay_4x400m'],
    disciplines: [
      'sprint_60m', 'sprint_100m', 'sprint_200m', 'sprint_400m',
      'middle_800m', 'middle_1500m', 'long_3000m', 'long_5000m', 'long_10000m',
      'hurdles_100m', 'hurdles_110m', 'hurdles_400m', 'steeplechase_3000m',
      'relay_4x100m', 'relay_4x400m',
      'long_jump', 'triple_jump', 'high_jump', 'pole_vault',
      'shot_put', 'discus', 'javelin', 'hammer',
    ],
    disciplineLabels: {
      sprint_60m: '60m Sprint', sprint_100m: '100m Sprint',
      sprint_200m: '200m Sprint', sprint_400m: '400m Sprint',
      middle_800m: '800m', middle_1500m: '1500m',
      long_3000m: '3000m', long_5000m: '5000m', long_10000m: '10000m',
      hurdles_100m: '100m Hurdles', hurdles_110m: '110m Hurdles',
      hurdles_400m: '400m Hurdles', steeplechase_3000m: '3000m Steeplechase',
      relay_4x100m: '4×100m Relay', relay_4x400m: '4×400m Relay',
      long_jump: 'Long Jump', triple_jump: 'Triple Jump',
      high_jump: 'High Jump', pole_vault: 'Pole Vault',
      shot_put: 'Shot Put', discus: 'Discus Throw',
      javelin: 'Javelin Throw', hammer: 'Hammer Throw',
    },
    dqCodes: {
      'TR 1.1': 'False start',
      'TR 2.3': 'Lane violation / run outside lane',
      'TR 3.1': 'Obstruction / impeding another athlete',
      'TR 4.2': 'Failure to complete all attempts (field)',
      'TR 5.1': 'Implement lands outside sector (field)',
      'TR 6.3': 'Relay — baton exchange outside zone',
      'TR 7.1': 'Relay — baton dropped and not recovered',
      'TR 8.2': 'Did not attempt / DNS',
      'TR 9.1': 'Foot fault (field events)',
    },
    maxAttempts: 6,
  },
}

export const getSportConfig = (sportType: string): SportConfig => 
  SPORT_CONFIGS[sportType as ActiveSport] || SPORT_CONFIGS['swimming']

/** Returns true if the discipline is a field event (mark in metres) */
export const isFieldDiscipline = (discipline: string, sportType: string): boolean =>
  getSportConfig(sportType).fieldDisciplines.includes(discipline)

/** Returns true if the discipline is a relay event */
export const isRelayDiscipline = (discipline: string, sportType: string): boolean =>
  getSportConfig(sportType).relayDisciplines.includes(discipline)

/** Human-readable discipline name */
export const disciplineName = (discipline: string, sportType: string): string =>
  getSportConfig(sportType).disciplineLabels[discipline] ?? discipline.replace(/_/g, ' ')

/**
 * Format a performance value for display.
 * - Timed events: ms → mm:ss.hh
 * - Field events: best attempt_mark (cm) → X.XX m
 */
export function formatPerformance(
  valueMs: number | undefined | null,
  sportType: string,
  discipline?: string,
  attemptMarks?: number[] | null,
): string {
  if (discipline && isFieldDiscipline(discipline, sportType)) {
    const valid = (attemptMarks ?? []).filter(m => m && m > 0)
    if (valid.length === 0) return 'NM'
    const best = Math.max(...valid)
    return `${(best / 100).toFixed(2)} m`
  }
  if (!valueMs) return 'NT'
  const totalS = valueMs / 1000
  const mins   = Math.floor(totalS / 60)
  const secs   = totalS % 60
  return mins > 0
    ? `${mins}:${secs.toFixed(2).padStart(5, '0')}`
    : secs.toFixed(2)
}
