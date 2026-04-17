# Custom Gutenberg Components Reference

## Overview

Custom Gutenberg components for the DBT diary card system. Currently implemented:

- **`diary-daily-view`** (Grid variant) - MVP, single-day diary display

Future variants (architecture supports):
- Cards variant - Stacked card-based layout
- Summary variant - Compact high-level overview
- Timeline variant - Vertical metrics timeline

## diary-daily-view Component

### Purpose
Renders a complete daily DBT diary entry with organized sections for behaviors, emotions, skills, and functioning.

### Location
```
components/diary-daily-view/
├── types.ts        # TypeScript interfaces
├── data.ts         # Data extraction & validation
├── scaffold.ts     # RenderNode builder
└── styles.css      # Component styles
```

### Usage in Semantic Spec

```yaml
page:
  sections:
    - type: diary-daily-view
      variant: grid
      data:
        date: "2026-04-17"
        therapist_id: "T001"
        target_behaviors: {...}
        emotions: {...}
        # ... complete normalized entry
```

### Variants

#### Grid (MVP - Currently Implemented)
Traditional table-based layout with organized sections.

**Structure:**
```
┌─────────────────────────────────────────┐
│ April 17, 2026                          │
├─────────────────────────────────────────┤
│ TARGET BEHAVIORS                        │
│  Suicidal Urges:    7/10  [████████░]  │
│  Self-Harm Urges:   5/10  [█████░░░░]  │
│  Substance Use:     0/10  [░░░░░░░░░░] │
├─────────────────────────────────────────┤
│ EMOTIONAL STATES                        │
│  Sadness:           8/10  [████████░░] │
│  Anxiety:           7/10  [███████░░░] │
│  Anger:             6/10  [██████░░░░] │
├─────────────────────────────────────────┤
│ SKILLS USED                             │
│  ✓ Mindfulness                          │
│  ✓ Emotion Regulation                   │
├─────────────────────────────────────────┤
│ DAILY FUNCTIONING                       │
│  Sleep Hours:       6 hours             │
│  Medication:        ✓ Compliant         │
│  Work/School:       7/10  [███████░░░] │
├─────────────────────────────────────────┤
│ NOTES                                   │
│  General:  Had difficult day but...     │
│  Triggers: Family conflict              │
└─────────────────────────────────────────┘
```

**Features:**
- Progress bars for 0-10 scales
- Organized sections (behaviors, emotions, skills, functioning, therapy, health)
- Only includes sections with data (optional fields)
- Checkmarks for used skills
- Rich notes display

**CSS Classes Applied:**
- `.diary-section` - Root container
- `.diary-behaviors-section`, `.diary-emotions-section`, etc. - Section containers
- `.diary-table` - Tables within sections
- `.diary-label`, `.diary-value` - Table cells
- `.diary-skills-list`, `.diary-skill-item` - Skills list
- `.diary-notes-list`, `.diary-note-item` - Notes
- `.diary-warnings-list`, `.diary-warning-item` - Safety warnings

---

#### Cards (Future)
Stacked card-based layout with expandable sections.

**Planned structure:**
```
┌────────────────────────┐
│ April 17, 2026         │
└────────────────────────┘

┌────────────────────────┐
│ TARGET BEHAVIORS   [∨] │
│  7  5  0               │
│  ↑  ↑  ↑               │
│ SUI SF SU              │
└────────────────────────┘

┌────────────────────────┐
│ EMOTIONAL STATES   [∨] │
│  8  7  6  5            │
│  ↑  ↑  ↑  ↑            │
│ SAD ANX ANG SHA        │
└────────────────────────┘

┌────────────────────────┐
│ SKILLS USED        [∨] │
│  ✓ Mindfulness         │
│  ✓ Emotion Reg.        │
└────────────────────────┘

[Continue for other sections...]
```

**Advantages:**
- Mobile-friendly
- Expandable/collapsible sections
- Cleaner visual hierarchy

---

#### Summary (Future)
Compact high-level overview with key metrics.

**Planned structure:**
```
┌──────────────────────────┐
│ April 17 — Daily Summary │
├──────────────────────────┤
│ Most Difficult:          │
│ Suicidal Urges (7/10)    │
│                          │
│ Emotional Peak:          │
│ Sadness (8/10)           │
│                          │
│ Skills Used: 2 of 4      │
│ ✓ Mindfulness            │
│ ✓ Emotion Regulation     │
│                          │
│ Sleep: 6 hours (poor)    │
│ Therapy: Session attended│
│ Homework: 8/10 complete  │
│                          │
│ Status: Managing w/support
└──────────────────────────┘
```

**Use cases:**
- Quick overview for therapist
- Daily dashboard
- Mobile view

---

#### Timeline (Future)
Vertical timeline showing metrics progression.

**Planned structure:**
```
April 17, 2026 — Metrics Timeline

Suicidal Urges ━━━━━━━━━━━━ 7/10 (High)
Self-Harm Urges ━━━━━━ 5/10 (Moderate)
Sadness ━━━━━━━━━━━━━ 8/10 (Very High)
Anxiety ━━━━━━━━━━━ 7/10 (High)
Anger ━━━━━━ 6/10 (Moderate)
Sleep ━━━ 6 hours (Below target)
Mood Stability ━━━━ 5/10 (Improving)
```

**Use cases:**
- Quick visual comparison
- Identify highest-impact metrics
- Trend spotting

---

## Data Flow: Schema → Component

### 1. Normalized Data (diary-entry.schema.yaml)
```yaml
entry:
  date: "2026-04-17"
  target_behaviors:
    suicidal_urges: 7
    self_harm_urges: 5
  emotions:
    sadness: 8
    # ... etc
```

### 2. Data Extraction (data.ts)
```typescript
extractDiaryData(rawData) → DiaryEntryData
  ├─ Validate schema
  ├─ Check ranges (0-10)
  ├─ Apply validation rules
  └─ Emit warnings/errors
```

**Example output:**
```typescript
{
  date: "2026-04-17",
  therapistId: "T001",
  targetBehaviors: {
    suicidalUrges: 7,
    selfHarmUrges: 5,
    // ...
  },
  emotions: {
    sadness: 8,
    anxiety: 7,
    // ...
  },
  warnings: [
    { field: "suicidal_urges", message: "High suicidal urges. Please reach out..." }
  ],
  errors: []
}
```

### 3. Scaffold Building (scaffold.ts)
```typescript
scaffoldDailyGrid(data) → RenderNode
  ├─ Create section nodes
  ├─ Build tables for metrics
  ├─ Create lists for skills
  ├─ Add notes sections
  └─ Assign semantic roles
```

**Semantic roles assigned:**
- `.diary-section` - Root
- `.diary-behaviors-section` - Behaviors container
- `.diary-table` - Table element
- `.diary-label`, `.diary-value` - Table cells
- `.diary-skill-item` - Skills
- `.diary-note-item` - Notes

### 4. Enrichment (ENRICH stage - Gutenberg)
```
RenderNode + Semantic Roles
  ↓
Resolve CSS classes via three mappings:
  1. Role → component class
  2. Layout hints → structural class
  3. Semantic axes → modifier class
  ↓
AnnotatedNode (with .classes resolved)
```

**Example class resolution:**
```
role: "diary-label" → classes: ["diary-label"]
layout: { progressBar: { value: 7, max: 10 } } → classes: ["layout-progress"]
semantic: { vibe: "steady", intent: "inform" } → classes: ["vibe-steady", "intent-inform"]
```

### 5. Styling (STYLE stage - Gutenberg)
```
AnnotatedNode + Theme CSS (ink.css)
  ↓
Cascade matching: 
  .diary-table { width: 100%; ... }
  .diary-value[data-progress] { background: gradient; ... }
  .vibe-steady .diary-section { padding: 2rem; ... }
  ↓
Complete HTML with embedded CSS
```

---

## Component Styling

### Theme System

Styles are applied via Gutenberg's theme system (ink theme).

**CSS Custom Properties Available:**
```css
/* Colors */
--primary-color
--secondary-color
--success-color
--warning-color
--error-color

/* Backgrounds */
--background-primary
--background-secondary

/* Text */
--text-primary
--text-secondary
--heading-color

/* Semantic */
--progress-color
--border-color
```

### Semantic Axes

Components inherit Gutenberg's semantic axes for consistent theming:

```yaml
semantic:
  vibe: "steady"           # steady | gentle | vibrant | intense
  intent: "inform"         # inform | engage | persuade | direct
  narrative: "rising"      # exposition | rising | climax | falling
  cohesion: "opens"        # opens | continues | amplifies | supports | closes
```

**Example:** Different vibes affect padding, font sizes, colors:
```css
.vibe-vibrant .diary-section {
  padding: 3rem;  /* More breathing room */
}

.vibe-gentle .diary-section {
  padding: 1rem;  /* Minimal space */
}
```

---

## Validation & Error Handling

### Data Validation (data.ts)

Errors are thrown (prevent page generation):
```
✗ suicidal_urges: 0-10 range required
✗ At least one emotion required
✗ Date must be YYYY-MM-DD format
```

Warnings are captured (generate page with alerts):
```
⚠ High suicidal urges (>7)
⚠ No skills used today
⚠ Sleep deprivation (<5 hours)
```

### Rendering Alerts

Warnings are displayed in a special section:

```yaml
# In rendered HTML
<section class="diary-warnings-section">
  <h2>Alerts</h2>
  <ul class="diary-warnings-list">
    <li class="diary-warning-item">
      ⚠ High suicidal urges. Please reach out to your therapist...
    </li>
  </ul>
</section>
```

---

## Future Component Plans

### 1. diary-weekly-view
Displays all 7 days in a single grid.

### 2. diary-trend-chart
Line charts showing metric progression over time.

### 3. diary-skills-dashboard
Statistics on skill usage patterns.

### 4. diary-emotion-heatmap
Heat map showing emotional intensity by time of day.

### 5. diary-therapist-dashboard
Aggregated view of client progress for therapist.

---

## Integration Checklist

To integrate custom components with Gutenberg:

- [ ] Add component type to `types.ts`
- [ ] Register in Gutenberg's component types
- [ ] Create data extractor (`data.ts`)
- [ ] Create scaffold builder (`scaffold.ts`)
- [ ] Add CSS styles (`styles.css`)
- [ ] Register in Gutenberg's enricher
- [ ] Test with example data
- [ ] Document in this file

---

## Testing Components

### Unit Tests (data.ts)
```typescript
// Test validation
const result = extractDiaryData({
  entry: {
    date: "2026-04-17",
    therapist_id: "T001",
    target_behaviors: { suicidal_urges: 7, self_harm_urges: 5 },
    emotions: { sadness: 8 }
  }
});

expect(result.targetBehaviors.suicidalUrges).toBe(7);
expect(result.warnings.length).toBe(1); // High urges warning
```

### Integration Tests
```typescript
// Test scaffold building
const data = extractDiaryData(validEntry);
const node = scaffoldDailyGrid(data);

expect(node.tag).toBe("section");
expect(node.role).toBe("diary-section");
expect(node.children.length).toBeGreaterThan(0);
```

### Visual Tests
1. Render example entry
2. Verify sections appear
3. Check table formatting
4. Validate colors and spacing
5. Test responsive design on mobile

---

## Performance Considerations

- Minimal JavaScript - CSS-driven styling
- No network requests within component
- Static HTML generation (no runtime processing)
- Suitable for static hosting (CF Pages)
- Fast page loads (pre-rendered HTML)

## Accessibility

Component follows semantic HTML principles:
- Proper heading hierarchy (`<h1>`, `<h2>`, `<h3>`)
- Semantic roles for screen readers
- Readable text contrast
- Responsive layout
- Focus indicators

---
