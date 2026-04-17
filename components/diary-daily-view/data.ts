/**
 * Data extractor for diary-daily-view component
 * 
 * Responsibilities:
 * - Validate incoming YAML data against schema
 * - Convert snake_case → camelCase if needed
 * - Check ranges (0-10 for scales, etc.)
 * - Apply validation rules (emit warnings/errors)
 * - Return typed DiaryEntryData
 */

import {
  DiaryEntry,
  DiaryEntryData,
  ValidationWarning,
  ValidationError,
} from "./types";

/**
 * Main extraction function
 * Takes raw YAML data and returns validated component data
 */
export function extractDiaryData(rawData: unknown): DiaryEntryData {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Type guard
  if (!rawData || typeof rawData !== "object") {
    throw new Error("Invalid diary entry: expected object");
  }

  const data = rawData as Partial<DiaryEntry>;

  // ============ REQUIRED FIELD VALIDATION ============

  // Validate date
  if (!data.date) {
    errors.push({
      field: "date",
      message: "Date is required (YYYY-MM-DD format)",
      severity: "error",
    });
  } else if (!isValidDate(data.date)) {
    errors.push({
      field: "date",
      message: `Invalid date format: "${data.date}". Expected YYYY-MM-DD`,
      severity: "error",
    });
  }

  // Validate therapist_id
  if (!data.therapist_id) {
    errors.push({
      field: "therapist_id",
      message: "Therapist ID is required",
      severity: "error",
    });
  }

  // Validate target_behaviors
  if (!data.target_behaviors) {
    errors.push({
      field: "target_behaviors",
      message: "Target behaviors object is required",
      severity: "error",
    });
  } else {
    const bv = data.target_behaviors;

    // Required: suicidal_urges
    if (typeof bv.suicidal_urges !== "number") {
      errors.push({
        field: "target_behaviors.suicidal_urges",
        message: "Suicidal urges is required and must be a number (0-10)",
        severity: "error",
      });
    } else if (!isInRange(bv.suicidal_urges, 0, 10)) {
      errors.push({
        field: "target_behaviors.suicidal_urges",
        message: `Suicidal urges must be 0-10, got ${bv.suicidal_urges}`,
        severity: "error",
      });
    }

    // Required: self_harm_urges
    if (typeof bv.self_harm_urges !== "number") {
      errors.push({
        field: "target_behaviors.self_harm_urges",
        message: "Self-harm urges is required and must be a number (0-10)",
        severity: "error",
      });
    } else if (!isInRange(bv.self_harm_urges, 0, 10)) {
      errors.push({
        field: "target_behaviors.self_harm_urges",
        message: `Self-harm urges must be 0-10, got ${bv.self_harm_urges}`,
        severity: "error",
      });
    }

    // Optional but validate ranges
    if (
      bv.suicidal_attempts !== undefined &&
      !isInRange(bv.suicidal_attempts, 0, 10)
    ) {
      errors.push({
        field: "target_behaviors.suicidal_attempts",
        message: `Suicidal attempts must be 0-10, got ${bv.suicidal_attempts}`,
        severity: "error",
      });
    }

    if (
      bv.self_harm_acts !== undefined &&
      !isInRange(bv.self_harm_acts, 0, 10)
    ) {
      errors.push({
        field: "target_behaviors.self_harm_acts",
        message: `Self-harm acts must be 0-10, got ${bv.self_harm_acts}`,
        severity: "error",
      });
    }

    if (bv.substance_use !== undefined && !isInRange(bv.substance_use, 0, 10)) {
      errors.push({
        field: "target_behaviors.substance_use",
        message: `Substance use must be 0-10, got ${bv.substance_use}`,
        severity: "error",
      });
    }
  }

  // Validate emotions
  if (!data.emotions || Object.keys(data.emotions).length === 0) {
    errors.push({
      field: "emotions",
      message: "At least one emotion is required",
      severity: "error",
    });
  } else {
    for (const [emotion, value] of Object.entries(data.emotions)) {
      if (typeof value !== "number" || !isInRange(value, 0, 10)) {
        errors.push({
          field: `emotions.${emotion}`,
          message: `Emotion value must be 0-10, got ${value}`,
          severity: "error",
        });
      }
    }
  }

  // ============ OPTIONAL FIELD VALIDATION ============

  // Validate skills (optional)
  if (data.skills) {
    const skillCount = Object.values(data.skills).filter((v) => v === true)
      .length;
    if (skillCount === 0) {
      warnings.push({
        field: "skills",
        message:
          "No skills were used today. This may indicate difficulty accessing coping strategies.",
        severity: "warning",
      });
    }
  }

  // Validate functioning (optional)
  if (data.functioning) {
    const { sleep_hours, sleep_quality, work_school, social_contact } =
      data.functioning;

    if (
      sleep_hours !== undefined &&
      !isInRange(sleep_hours, 0, 24)
    ) {
      errors.push({
        field: "functioning.sleep_hours",
        message: `Sleep hours must be 0-24, got ${sleep_hours}`,
        severity: "error",
      });
    }

    if (
      sleep_hours !== undefined &&
      sleep_hours < 5
    ) {
      warnings.push({
        field: "functioning.sleep_hours",
        message:
          "Sleep was significantly reduced (< 5 hours). This may impact mood and coping ability.",
        severity: "warning",
      });
    }

    if (
      sleep_quality !== undefined &&
      !isInRange(sleep_quality, 0, 10)
    ) {
      errors.push({
        field: "functioning.sleep_quality",
        message: `Sleep quality must be 0-10, got ${sleep_quality}`,
        severity: "error",
      });
    }

    if (work_school !== undefined && !isInRange(work_school, 0, 10)) {
      errors.push({
        field: "functioning.work_school",
        message: `Work/school engagement must be 0-10, got ${work_school}`,
        severity: "error",
      });
    }

    if (social_contact !== undefined && !isInRange(social_contact, 0, 10)) {
      errors.push({
        field: "functioning.social_contact",
        message: `Social contact must be 0-10, got ${social_contact}`,
        severity: "error",
      });
    }
  }

  // Validate therapy (optional)
  if (data.therapy) {
    const { homework_completion } = data.therapy;

    if (
      homework_completion !== undefined &&
      !isInRange(homework_completion, 0, 10)
    ) {
      errors.push({
        field: "therapy.homework_completion",
        message: `Homework completion must be 0-10, got ${homework_completion}`,
        severity: "error",
      });
    }

    if (data.therapy.individual_session === false && homework_completion && homework_completion < 5) {
      warnings.push({
        field: "therapy",
        message:
          "Therapy session missed and low homework engagement. Consider scheduling make-up session.",
        severity: "warning",
      });
    }
  }

  // Validate health (optional)
  if (data.health) {
    const { eating_disorder_behaviors, pain_level } = data.health;

    if (
      eating_disorder_behaviors !== undefined &&
      !isInRange(eating_disorder_behaviors, 0, 10)
    ) {
      errors.push({
        field: "health.eating_disorder_behaviors",
        message: `Eating disorder behaviors must be 0-10, got ${eating_disorder_behaviors}`,
        severity: "error",
      });
    }

    if (pain_level !== undefined && !isInRange(pain_level, 0, 10)) {
      errors.push({
        field: "health.pain_level",
        message: `Pain level must be 0-10, got ${pain_level}`,
        severity: "error",
      });
    }
  }

  // ============ ADDITIONAL SAFETY CHECKS ============

  // High suicidal urges warning
  if (data.target_behaviors?.suicidal_urges !== undefined && data.target_behaviors.suicidal_urges > 7) {
    warnings.push({
      field: "target_behaviors.suicidal_urges",
      message:
        "High suicidal urges. Please reach out to your therapist or crisis line if needed.",
      severity: "warning",
    });
  }

  // If errors exist, throw or return with errors
  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `${e.field}: ${e.message}`).join("; ");
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  // Return typed, validated data
  return {
    date: data.date!,
    therapistId: data.therapist_id!,
    targetBehaviors: data.target_behaviors!,
    emotions: data.emotions!,
    skills: data.skills,
    functioning: data.functioning,
    therapy: data.therapy,
    health: data.health,
    notes: data.notes,
    warnings,
    errors,
  };
}

// ============ HELPER FUNCTIONS ============

function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === "number" && value >= min && value <= max;
}

/**
 * Format a camelCase key to human readable
 * Example: "suicidal_urges" -> "Suicidal Urges"
 */
export function humanizeKey(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format a date string for display
 * Example: "2026-04-17" -> "Thursday, April 17, 2026"
 */
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
