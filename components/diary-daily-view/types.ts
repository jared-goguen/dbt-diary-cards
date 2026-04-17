/**
 * TypeScript types for diary-daily-view component
 * Generated from normalized diary entry schema
 */

export interface TargetBehaviors {
  suicidal_urges: number; // 0-10, required
  suicidal_attempts?: number;
  self_harm_urges: number; // 0-10, required
  self_harm_acts?: number;
  substance_use?: number;
}

export interface Emotions {
  [emotion: string]: number; // 0-10, at least 1 required
}

export interface Skills {
  mindfulness?: boolean;
  distress_tolerance?: boolean;
  emotion_regulation?: boolean;
  interpersonal_effectiveness?: boolean;
}

export interface Functioning {
  sleep_hours?: number;
  sleep_quality?: number;
  medication_compliance?: boolean;
  work_school?: number;
  social_contact?: number;
  exercise_minutes?: number;
}

export interface Therapy {
  individual_session?: boolean;
  group_skills?: boolean;
  coaching_calls?: number;
  homework_completion?: number;
  homework_notes?: string;
}

export interface Health {
  eating_disorder_behaviors?: number;
  pain_level?: number;
}

export interface Notes {
  general?: string;
  triggers?: string;
  skills_context?: string;
  therapist_focus?: string;
}

/**
 * Complete normalized diary entry data structure
 * Maps directly from YAML input
 */
export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  therapist_id: string;
  target_behaviors: TargetBehaviors;
  emotions: Emotions;
  skills?: Skills;
  functioning?: Functioning;
  therapy?: Therapy;
  health?: Health;
  notes?: Notes;
}

/**
 * Component-level data after extraction and validation
 */
export interface DiaryEntryData {
  date: string;
  therapistId: string;
  targetBehaviors: TargetBehaviors;
  emotions: Emotions;
  skills?: Skills;
  functioning?: Functioning;
  therapy?: Therapy;
  health?: Health;
  notes?: Notes;
  // Validation results
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning" | "info";
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "error";
}

/**
 * Gutenberg spec section type for diary-daily-view
 */
export interface DiaryDailyViewSection {
  type: "diary-daily-view";
  variant: "grid" | "cards" | "summary" | "timeline";
  data: DiaryEntry;
}
