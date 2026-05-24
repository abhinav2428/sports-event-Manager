export type UserType    = 'administrator' | 'recorder'
export type Gender      = 'M' | 'F'
export type CourseType  = 'SCY' | 'SCM' | 'LCM'
export type MeetStatus  = 'draft' | 'active' | 'completed'
export type Stroke      = 'freestyle'|'backstroke'|'breaststroke'|'butterfly'|'individual_medley'|'relay_freestyle'|'relay_medley'
export type EventGender = 'M' | 'F' | 'mixed'
export type EventStatus = 'upcoming' | 'seeded' | 'ongoing' | 'completed'
export type HeatStatus  = 'pending' | 'active' | 'completed'
export type ResultStatus = 'DRAFT' | 'SAVED' | 'FINALIZED'
export type AwardType   = 'gold'|'silver'|'bronze'|'best_swimmer'|'most_improved'|'special'

export interface Swimmer {
  id: string; name: string; roll_number: string
  college: string; gender: Gender
  email?: string; year_of_study?: number
}

export interface Team {
  id: string; name: string; college: string; gender?: Gender
}

export interface Meet {
  id: string; name: string; venue?: string
  start_date: string; end_date: string
  course: CourseType; pool_lanes: string; status: MeetStatus
}

export interface SwimEvent {
  id: string; meet_id: string; event_number: number
  name: string; stroke: Stroke; distance: number
  gender: EventGender; is_relay: boolean; relay_legs: number
  status: EventStatus; total_distance: number
}

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
