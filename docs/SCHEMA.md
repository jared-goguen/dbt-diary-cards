# DBT Diary Card Schema

## Overview

The diary card uses gutenberg page spec format with tracker blocks for structured ratings and prose blocks for free-text notes. All data follows the same YAML structure for both the template and saved entries.

## Template Structure

`template.yaml` defines the card layout. Blocks marked with `_editable: true` become interactive form inputs in edit mode.

```yaml
title: "Diary Card — {{DATE}}"
theme: mono

hero:
  title: "Daily Diary Card"
  subtitle: "{{DATE}}"
  body: "Track emotions, urges, skills, and daily functioning."

blocks:
  - section_label:
      text: SECTION_NAME

  - tracker:
      _editable: true
      caption: "1 = low · 3 = neutral · 5 = high"
      cols: 4
      items:
        - {label: Name, value: "3", type: rating, max: 5}
        - {label: Other, value: "", type: text}

  - prose:
      _editable: true
      text: ""

  - closing:
      text: |
        ---
        *Complete at end of day. All data stored securely.*
```

## Current Sections

### BOOKKEEPING
| Item | Type | Description |
|------|------|-------------|
| Self | rating (1-5) | Self-assessment |
| Partner | rating (1-5) | Relationship assessment |
| World | rating (1-5) | World-view assessment |
| Sleep | text | Free-text sleep notes |

### EMOTIONS
| Item | Type | Description |
|------|------|-------------|
| Depression | rating (1-5) | Intensity of depressive feelings |
| Anxiety | rating (1-5) | Intensity of anxious feelings |
| Frustration | rating (1-5) | Intensity of frustrated feelings |
| Joy | rating (1-5) | Intensity of joyful feelings |

### BEHAVIOR
| Item | Type | Description |
|------|------|-------------|
| Ideation | rating (1-5) | Suicidal ideation intensity |
| Injury | rating (1-5) | Self-harm urge intensity |
| Substance | rating (1-5) | Substance use intensity |
| Participation | rating (1-5) | Treatment participation level |

### DAILY NOTES
Free-text prose block for reflections, triggers, skills used, or any observations.

## Tracker Item Types

### rating
Segmented 1-5 scale. 3 is neutral (default). Visual intensity is driven by deviation from the neutral center — further from center means stronger color saturation. Each item uses its own chromata accent color for all states.

**Scale interpretation:**
- **1** — Minimal / absent
- **2** — Slight
- **3** — Neutral (default)
- **4** — Moderate
- **5** — Intense / severe

The scale is intentionally abstract — no numbers are displayed to the user. Intensity is communicated through color saturation only.

### toggle
On/off switch. Stored as `"on"` or `"off"`.

### text
Free-text input. Stored as a string.

## _editable Marker

Blocks with `_editable: true` become interactive form inputs in edit mode. The marker is preserved in saved entries so they can be re-edited. The `findEditableBlocks()` function in gutenberg's editify pipeline detects these markers.

## Entry Storage

Entries are stored in R2 at key `diary/YYYY-MM-DD`. The format is identical to the template, but with user-filled values and the `{{DATE}}` placeholder resolved:

```yaml
title: "Diary Card — 2026-04-17"
theme: mono

hero:
  title: "Daily Diary Card"
  subtitle: "2026-04-17"
  body: "Track emotions, urges, skills, and daily functioning."

blocks:
  - section_label:
      text: BOOKKEEPING
  - tracker:
      _editable: true
      caption: "1 = low · 3 = neutral · 5 = high"
      cols: 4
      items:
        - {label: Self, value: "4", type: rating, max: 5}
        - {label: Partner, value: "2", type: rating, max: 5}
        - {label: World, value: "3", type: rating, max: 5}
        - {label: Sleep, value: "7 hours", type: text}
  # ...remaining sections with filled values
```

## Form Data Serialization

When the edit form is submitted, `formDataToYaml()` in `lib/save.ts` converts POST form data back to YAML:

| Form Field Pattern | Maps To |
|---|---|
| `hero__title` | `hero.title` |
| `hero__subtitle` | `hero.subtitle` |
| `section_{i}__item_{j}` | `blocks[i].tracker.items[j].value` |
| `section_{i}__text` | `blocks[i].prose.text` |

The serialized YAML preserves `_editable` markers and all non-editable blocks unchanged, so entries can be re-edited.

## {{DATE}} Placeholder

The template uses `{{DATE}}` in the title and hero subtitle. When creating a new entry from the template, the handler substitutes the actual date in `YYYY-MM-DD` format. Saved entries store the resolved date.
