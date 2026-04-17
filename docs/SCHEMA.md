# DBT Diary Entry Schema Documentation

## Overview

The normalized diary entry schema is a Standard complexity DBT diary card designed for hand-authoring during therapeutic sessions. All numeric scales use 0-10 ranges for consistency and simplicity.

## Required Fields

### `date` (string, YYYY-MM-DD format)
The date of the diary entry.

**Example:** `"2026-04-17"`

### `therapist_id` (string)
Identifier for the therapist or treatment program.

**Example:** `"T001"`

### `target_behaviors` (object)
Primary behaviors targeted in DBT treatment.

#### Required sub-fields:
- **`suicidal_urges`** (0-10): Strength of desire to harm oneself
- **`self_harm_urges`** (0-10): Strength of desire to self-injure

#### Optional sub-fields:
- **`suicidal_attempts`** (0-10): Severity/frequency of actual self-harm
- **`self_harm_acts`** (0-10): Severity/frequency of self-injury incidents
- **`substance_use`** (0-10): Drug/alcohol use frequency

### `emotions` (object)
Emotional states during the day. At least 1 emotion is required.

**Standard emotions:**
- `sadness` (0-10): Intensity of sad feelings
- `anger` (0-10): Intensity of angry feelings
- `anxiety` (0-10): Intensity of anxious feelings
- `shame` (0-10): Intensity of shameful/embarrassed feelings
- `loneliness` (0-10): Intensity of lonely feelings
- `hopelessness` (0-10): Intensity of hopeless feelings

**Custom emotions:** You can add any emotions with 0-10 ratings:
```yaml
emotions:
  sadness: 8
  joy: 3
  frustration: 6
  irritability: 4
```

## Optional Fields

### `skills` (object)
Whether DBT skills were used today. All fields are boolean (true/false).

**Available modules:**
- `mindfulness`: Observing, describing, or being fully present (true/false)
- `distress_tolerance`: TIPP, distracting, self-soothing, radical acceptance (true/false)
- `emotion_regulation`: ABC PLEASE, opposite action, problem-solving (true/false)
- `interpersonal_effectiveness`: DEAR MAN, GIVE, FAST (true/false)

**Example:**
```yaml
skills:
  mindfulness: true
  distress_tolerance: false
  emotion_regulation: true
  interpersonal_effectiveness: false
```

### `functioning` (object)
Daily life engagement and health metrics.

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `sleep_hours` | number | 0-24 | Hours of sleep |
| `sleep_quality` | number | 0-10 | Quality of sleep (0=poor, 10=excellent) |
| `medication_compliance` | boolean | - | Took prescribed meds as directed |
| `work_school` | number | 0-10 | Engagement/productivity at work or school |
| `social_contact` | number | 0-10 | Quality of social interactions |
| `exercise_minutes` | number | 0+ | Minutes of physical activity |

### `therapy` (object)
Engagement in treatment and homework completion.

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `individual_session` | boolean | - | Attended individual therapy |
| `group_skills` | boolean | - | Attended DBT skills group |
| `coaching_calls` | number | 0+ | Between-session crisis calls |
| `homework_completion` | number | 0-10 | Homework completion level |
| `homework_notes` | string | - | Description of homework done |

### `health` (object)
Additional health and safety metrics.

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `eating_disorder_behaviors` | number | 0-10 | Binge/purge frequency or severity |
| `pain_level` | number | 0-10 | Physical pain level |

### `notes` (object)
Qualitative reflections on the day. All fields are optional strings.

| Field | Description |
|-------|-------------|
| `general` | Overall reflection on the day |
| `triggers` | Situations that activated urges |
| `skills_context` | Where/when skills were used and effectiveness |
| `therapist_focus` | Recommendations for next session focus |

## Validation Rules

The schema enforces these validation rules:

| Rule | Severity | Message |
|------|----------|---------|
| At least 1 emotion | error | "At least one emotion is required" |
| All 0-10 scales | error | "Value must be 0-10" |
| Sleep hours 0-24 | error | "Sleep hours must be 0-24" |
| No skills used | warning | "No skills were used today. This may indicate difficulty accessing coping strategies." |
| High suicidal urges (>7) | warning | "High suicidal urges. Please reach out to your therapist or crisis line if needed." |
| Sleep deprivation (<5 hours) | warning | "Sleep was significantly reduced. This may impact mood and coping ability." |
| Therapy missed + low homework | warning | "Therapy session missed and low homework engagement. Consider scheduling make-up session." |

## Examples

### Minimal Entry (Good Day)
```yaml
entry:
  date: "2026-04-17"
  therapist_id: "T001"
  target_behaviors:
    suicidal_urges: 2
    self_harm_urges: 1
  emotions:
    sadness: 3
    anxiety: 2
  notes:
    general: "Good day. Urges manageable."
```

### Standard Entry (Typical Day)
See `data/diary-2026-04-17-standard.yaml` for a complete example.

### Comprehensive Entry (Detailed)
See `data/diary-2026-04-17-comprehensive.yaml` for a full example with all optional fields.

## Scale Interpretation Guide

### Urges/Intensity Scales (0-10)
- **0-2:** Minimal or no presence
- **3-4:** Slight presence but manageable
- **5-6:** Moderate intensity, requires attention
- **7-8:** Strong intensity, concerning
- **9-10:** Overwhelming, immediate intervention needed

### Quality/Engagement Scales (0-10)
- **0-2:** Very poor or no engagement
- **3-4:** Minimal engagement
- **5-6:** Moderate engagement
- **7-8:** Good engagement
- **9-10:** Excellent engagement

## Data Storage & Retrieval

All entries are stored in `data/` directory with filenames: `diary-YYYY-MM-DD.yaml`

**Examples:**
- `data/diary-2026-04-17.yaml`
- `data/diary-2026-04-18.yaml`
- `data/diary-2026-04-19.yaml`

Entries are git-tracked for historical audit trail and version control.
