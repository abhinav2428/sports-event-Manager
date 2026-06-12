/**
 * Frontend type definitions — sport-agnostic.
 *
 * Key renames from swim-specific to sport-agnostic:
 *   Stroke      → Discipline
 *   CourseType  → VenueConfig (string)
 *   SwimEvent   → SportEvent  (alias kept)
 *   pool_lanes  → lanes
 *
 * All sport-specific string literals are no longer hard-coded here;
 * they live in sportConfig.ts instead.
 */

export type UserType    = 'administrator' | 'recorder'
export type Gender      = 'M' | 'F'
export type VenueConfig = string           // was CourseType: 'SCY'|'SCM'|'LCM'
export type MeetStatus  = 'draft' | 'active' | 'completed'

// Discipline: was Stroke. Actual values come from SPORT.disciplines in sportConfig.ts
export type Discipline  = string

export type EventGender = 'M' | 'F' | 'mixed'
export type EventStatus = 'upcoming' | 'seeded' | 'ongoing' | 'completed'
export type HeatStatus  = 'pending' | 'active' | 'completed'
export type ResultStatus = 'DRAFT' | 'SAVED' | 'FINALIZED'
export type AwardType   = 'gold'|'silver'|'bronze'|'best_athlete'|'most_improved'|'special'

/** Participant in any sport meet (was Swimmer) */
export interface Participant {
  id: string; name: string; roll_number: string
  college: string; gender: Gender
  email?: string; year_of_study?: number
}

/** Backward-compat alias */
export type Swimmer = Participant

export interface Team {
  id: string; name: string; college: string; gender?: Gender
}

export interface Meet {
  id: string; name: string; venue?: string
  start_date: string; end_date: string
  sport_type: string
  venue_config: string              // was course: CourseType
  lanes: string
  status: MeetStatus
}

/** Sport-agnostic event (was SwimEvent) */
export interface SportEvent {
  id: string; meet_id: string; event_number: number
  name: string
  discipline: string               // was stroke: Stroke
  distance: number
  gender: EventGender; is_relay: boolean
  is_field: boolean                // true for jumps/throws (field events)
  relay_legs: number
  status: EventStatus; total_distance: number
}

/** Backward-compat alias */
export type SwimEvent = SportEvent

export interface Heat {
  id: string; event_id: string; heat_number: number
  status: HeatStatus; scheduled_time?: string
}

export interface IndividualEntry {
  id: string; event_id: string; swimmer_id: string
  swimmer_name?: string; college?: string; gender?: string
  heat_id?: string; heat_number?: number; lane?: number
  seed_time_ms?: number; seed_time_display?: string; withdrawn: boolean
}

export interface RelayLeg {
  leg_number: number; swimmer_name?: string; split_time_display?: string
}

export interface RelayEntry {
  id: string; event_id: string; team_id: string; team_name?: string
  heat_id?: string; heat_number?: number; lane?: number
  seed_time_ms?: number; seed_time_display?: string
  withdrawn: boolean; legs: RelayLeg[]
}

export interface TimeResult {
  id: string
  individual_entry_id?: string; relay_entry_id?: string
  final_time_ms?: number; time_display: string
  splits_ms?: Record<string, number>
  attempt_marks?: number[]           // field events: up to 6 attempts in cm
  dns: boolean; dnf: boolean; dq: boolean
  dq_code?: string; dq_description?: string
  rank?: number; status: ResultStatus
  recorded_at: string; edited_at?: string; finalized_at?: string
  notes?: string; participant_name?: string
  heat_number?: number; lane?: number
}

export interface Award {
  id: string; meet_id: string
  swimmer_id?: string; swimmer_name?: string; event_id?: string
  title: string; award_type: AwardType; awarded_on: string; notes?: string
}

export interface Assignment {
  id: string; event_id: string; event_name?: string
  recorder_id: string; recorder_name?: string
  admin_id: string; assigned_at: string
}
