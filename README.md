# DBT Diary Cards

A digital DBT (Dialectical Behavior Therapy) daily diary card system with:
- **Normalized data model** for consistent, queryable diary entries
- **Custom Gutenberg components** for beautiful, semantic HTML rendering
- **Cloudflare Pages deployment** for fast, global access
- **Git-tracked history** for clinical audit trails
- **Collaborative workflow** for building entries together with your therapist

## Quick Start

### 1. Setup
```bash
# Install dependencies
npm install

# Gutenberg is linked as an npm package (not copied)
# Build TypeScript sources
npm run build

# Start local dev server (requires Node.js)
npm run dev
```

### 2. Edit an Entry
```bash
# Browse to: http://localhost:8788/diary/2026-04-17?mode=edit
# Fill in the form (sleep, emotions, urges, skills, notes)
# Click Save to store in R2 bucket

# View the entry: http://localhost:8788/diary/2026-04-17
# (no mode param = view mode)
```

### 3. Deploy to Production
```bash
# Push to main branch
git add .
git commit -m "Update diary entry for 2026-04-17"
git push origin main

# GitHub Actions automatically:
# - Installs dependencies
# - Builds TypeScript
# - Deploys to Cloudflare Pages

# Live at: https://dbt-diary-cards.pages.dev/diary/2026-04-17
```

## Project Structure

```
dbt-diary-cards/
├── components/                    # Custom Gutenberg components
│   └── diary-daily-view/         # Main diary display component
│       ├── types.ts              # TypeScript interfaces
│       ├── data.ts               # Data validation & extraction
│       ├── scaffold.ts           # HTML structure builder
│       └── styles.css            # Component styling
│
├── schemas/                       # Data schemas
│   └── diary-entry.schema.yaml   # Normalized entry definition
│
├── data/                          # User data (git-tracked)
│   ├── diary-2026-04-17-minimal.yaml
│   ├── diary-2026-04-17-standard.yaml
│   └── diary-2026-04-17-comprehensive.yaml
│
├── scripts/                       # Automation scripts
│   └── generate-diary-spec.ts    # YAML → Semantic Spec converter
│
├── templates/                     # Templates for new entries
│   ├── diary-entry-template.yaml
│   └── diary-spec-template.yaml
│
├── docs/                          # Documentation
│   ├── SCHEMA.md                 # Schema reference
│   ├── WORKFLOW.md               # Daily workflow guide
│   └── COMPONENTS.md             # Component technical docs
│
├── gutenberg.yaml                 # Gutenberg project config
├── README.md                      # This file
└── .gitignore
```

## Documentation

- **[SCHEMA.md](docs/SCHEMA.md)** - Complete schema reference for diary entries
- **[WORKFLOW.md](docs/WORKFLOW.md)** - Daily workflow guide (conversational + template modes)
- **[COMPONENTS.md](docs/COMPONENTS.md)** - Custom component technical reference

## Example Entries

Three complexity levels are provided:

### Minimal (~2 minutes)
For good days or quick entries. See: `data/diary-2026-04-17-minimal.yaml`

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

### Standard (~5 minutes)
Most typical use case. See: `data/diary-2026-04-17-standard.yaml`

Complete with behaviors, emotions, skills, functioning, therapy, and notes.

### Comprehensive (~10 minutes)
Full detail with custom emotions, rich notes. See: `data/diary-2026-04-17-comprehensive.yaml`

All optional fields included with detailed context.

## Data Model

### Required Fields
- `date` (YYYY-MM-DD)
- `therapist_id` (identifier)
- `target_behaviors.suicidal_urges` (0-10)
- `target_behaviors.self_harm_urges` (0-10)
- `emotions` (at least 1 emotion with 0-10 rating)

### Optional Fields
- `target_behaviors.suicidal_attempts`, `self_harm_acts`, `substance_use`
- `skills` (boolean for mindfulness, distress tolerance, emotion regulation, interpersonal)
- `functioning` (sleep, medication, work, social, exercise)
- `therapy` (session attendance, homework, coaching)
- `health` (eating behaviors, pain)
- `notes` (general, triggers, skills context, therapist focus)

**See [SCHEMA.md](docs/SCHEMA.md) for complete reference**

## Workflow: Building Entries Together

### Conversational Mode (Recommended)
1. You and therapist discuss your day
2. Agent captures: "Suicidal urges were 7, self-harm 5, felt sad (8), anxious (7), used mindfulness..."
3. Agent structures into normalized YAML
4. You review and adjust if needed
5. Agent generates spec, builds HTML, deploys to CF Pages
6. Entry is live and git-tracked

**See [WORKFLOW.md](docs/WORKFLOW.md) for detailed guide**

### Template Mode
1. Copy `templates/diary-entry-template.yaml` → `data/diary-YYYY-MM-DD.yaml`
2. Fill in values (annotations guide you)
3. Run generation script
4. Deploy

## Dynamic Edit Mode

The application supports **two rendering modes** for diary entries:

### View Mode (Default)
```
GET /diary/2026-04-17
```
- Displays a formatted, read-only view of the diary entry
- Shows tables for bookkeeping, emotions, urges/skills
- Shows notes section
- Rendered from R2-stored data or template defaults

### Edit Mode (Form-Based)
```
GET /diary/2026-04-17?mode=edit
```
- Interactive web form for data entry
- Form fields auto-generated from template structure
- **Field types supported:**
  - Text fields (e.g., sleep duration)
  - Numeric inputs (0-10 scales for emotions, urges)
  - Boolean toggles (e.g., took medication, used skills)
  - Textarea (notes and reflections)
- Real-time form validation
- Save button stores entry to R2 bucket

### Implementation
- Handler: `src/diary/[date].ts` → compiled to `functions/diary/[date].js`
- Template: `templates/diary.yaml` with `_editable: true` sections
- Library: `createEditHandler()` from `gutenberg/workers`

## Custom Gutenberg Component: diary-daily-view

### Features
- **Grid variant** (MVP): Traditional table layout with organized sections
- **Future variants**: Cards (mobile), Summary (dashboard), Timeline (visual)
- **Validation**: Built-in warnings for safety (high urges, no skills, sleep deprivation)
- **Semantic styling**: Gutenberg semantic axes (vibe, intent, narrative, cohesion)
- **Responsive**: Mobile-friendly tables and sections
- **Print-friendly**: CSS includes print media queries

### Sections Rendered
1. **Header**: Date in human-readable format
2. **Target Behaviors**: Suicidal/self-harm urges and attempts
3. **Emotional States**: All emotions with 0-10 ratings
4. **Skills Used**: Checkmarks for applied DBT skills
5. **Daily Functioning**: Sleep, medication, work, social, exercise
6. **Therapy Engagement**: Session attendance, homework completion
7. **Health & Safety**: Eating disorder behaviors, pain level
8. **Notes**: Qualitative reflections and context
9. **Alerts**: Safety warnings if triggered

**See [COMPONENTS.md](docs/COMPONENTS.md) for technical details**

## Data Flow: Dynamic Edit Mode

```
Browser Request
    ↓
Cloudflare Pages Function (/functions/diary/[date].ts)
    ├─ Read: template/diary.yaml
    ├─ Read: R2 entry (if exists)
    └─ Call: createEditHandler() from gutenberg/workers
    ↓
Gutenberg Pipeline (runtime)
├─ mode=edit?  → Render form inputs
├─ mode=save?  → Save to R2 bucket
└─ mode=null?  → Render view mode (static)
    ↓
HTML Response
    ├─ Edit Mode: Interactive form (text, numbers, booleans)
    ├─ View Mode: Static formatted display
    └─ Save Mode: JSON response + redirect
    ↓
Browser
├─ Edit Form → Submit → Save to R2
├─ View Page → Live display of saved data
└─ Navigation → Links to other diary dates
```

## Deployment Flow

```
Local Development (npm run dev)
    ↓
Git push to main branch
    ↓
GitHub Actions workflow triggered
├─ Install dependencies
├─ Build TypeScript (src/ → functions/)
├─ Run tests (bun test)
└─ Deploy to Cloudflare Pages
    ↓
Live: https://dbt-diary-cards.pages.dev
├─ Edit form: /diary/[date]?mode=edit
├─ View mode: /diary/[date]
└─ R2 storage: Persisted entries
```

## Technology Stack

- **Data Storage**: R2 (Cloudflare object storage) + Git (audit trail)
- **Runtime**: Cloudflare Pages Functions (serverless)
- **Library**: Gutenberg (semantic HTML generation, form rendering)
  - Imported via npm link (development) or npm package (production)
  - Provides: pipeline (lint/scaffold/enrich/style), workers (createEditHandler), types
- **Build**: TypeScript, Bun (runtime), tsc (compiler)
- **Styling**: CSS with theme system (ink theme)
- **CI/CD**: GitHub Actions (build on push to main)
- **Tracking**: Git (audit trail, entry history)

## Why This Architecture?

1. **Separated Concerns**
   - Normalized data (what) is separate from presentation (how)
   - Easy to create new views without changing data
   - Future: can export data for analysis, change themes, etc.

2. **Hand-Authorable Data**
   - YAML is readable and writable by humans
   - Conversational entry feels natural in therapy context
   - Template provides structure but allows flexibility

3. **Semantic Rendering**
   - Components describe *meaning*, not just appearance
   - Gutenberg handles CSS class resolution
   - Responsive design without media queries in component code

4. **Audit Trail**
   - Git tracks all entries (who, what, when)
   - Clinical documentation requirement
   - Easy to view historical progression

5. **Extensible**
   - New views (cards, summary, timeline) reuse same normalized data
   - Custom components follow Gutenberg patterns
   - Validation rules can be enhanced without breaking data

## Future Enhancements

### Planned Views
- [ ] Week grid (7 days side-by-side)
- [ ] Trend charts (emotions over time)
- [ ] Summary dashboard (high-level overview)
- [ ] Skills analytics (which skills help most)
- [ ] Therapist dashboard (client progress view)

### Planned Features
- [ ] Time-of-day tracking (morning/afternoon/evening)
- [ ] Photo attachments
- [ ] Audio notes
- [ ] Skill effectiveness ratings
- [ ] Data export (CSV, PDF)
- [ ] Privacy/encryption options
- [ ] Mobile app view

## Deployment Configuration

### GitHub Actions Requirements
The `.github/workflows/deploy.yml` workflow requires two secrets:
- `CLOUDFLARE_API_TOKEN` - API token with Cloudflare Pages deploy access
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

**To set up:**
1. Generate API token at: https://dash.cloudflare.com/profile/api-tokens
2. Go to repo Settings → Secrets and variables → Actions
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
4. Workflow triggers automatically on push to `main` branch

### Cloudflare Configuration
The project requires:
- **R2 Bucket**: `dbt-diary-entries` (for storing diary data)
- **Pages Project**: `dbt-diary-cards` (deployment target)
- **Environment Variables**: Set in `wrangler.toml`
  - `CF_PAGES="1"`
  - `CF_PAGES_BRANCH="main"`
  - `CLOUDFLARE_API_TOKEN` (for Gutenberg publish tool)
  - `CLOUDFLARE_ACCOUNT_ID` (for Gutenberg publish tool)

### Local Development Setup
```bash
# Install dependencies
npm install

# Create .env if needed (credentials are optional for local dev)
# The app uses local R2 emulation (wrangler-provided)

# Build TypeScript
npm run build

# Start dev server
npm run dev

# Access at: http://localhost:8788
```

## Getting Started

### For Therapists/Users
1. Read [WORKFLOW.md](docs/WORKFLOW.md) to understand daily process
2. Review [SCHEMA.md](docs/SCHEMA.md) to understand fields
3. Start with an example entry or template

### For Developers
1. Read [COMPONENTS.md](docs/COMPONENTS.md) to understand architecture
2. Review `components/diary-daily-view/` to see implementation
3. Look at example entries in `data/` to understand data format

### First Entry

#### Development Workflow
```bash
# Build and start local dev server
npm run build
npm run dev

# Access the form at:
# http://localhost:8788/diary/2026-04-17?mode=edit

# Fill in the form:
# - Sleep duration, medication status
# - Emotions (sadness, anxiety, etc.) on 0-10 scale
# - Urges and skills used
# - Daily notes

# Click "Save" to store in local R2 emulation
# View the entry at: http://localhost:8788/diary/2026-04-17
```

#### Production Deployment
```bash
# Build and commit
npm run build
git add -A
git commit -m "Add diary entry for 2026-04-17"
git push origin main

# GitHub Actions automatically deploys to:
# https://dbt-diary-cards.pages.dev/diary/2026-04-17?mode=edit

# Data is persisted in Cloudflare R2
```

## Support & Troubleshooting

### Data Entry Issues
**Q: "I don't know what to put for emotions"**
A: Start with the standard 6 (sadness, anger, anxiety, shame, loneliness, hopelessness). Add custom emotions as needed. Use 0-10 scale: 0=none, 5=moderate, 10=overwhelming.

**Q: "Some fields don't apply to my situation"**
A: Leave them blank/unset. Only required fields (date, therapist_id, target_behaviors, emotions) must be present. All others are optional.

**Q: "Can I go back and edit previous entries?"**
A: Yes! Entries are YAML files in `data/`. You can edit them anytime. Git tracks changes, so you have history.

### Schema Questions
See [SCHEMA.md](docs/SCHEMA.md) for complete reference.

### Component Questions
See [COMPONENTS.md](docs/COMPONENTS.md) for technical details.

## Workflow Questions
See [WORKFLOW.md](docs/WORKFLOW.md) for step-by-step guide.

## License

Provided for therapeutic and educational use.

## Credits

Built with:
- **Gutenberg**: Semantic page specification system
- **Cloudflare Pages**: Fast static hosting
- **DBT Treatment Manual**: Marsha Linehan's Dialectical Behavior Therapy framework

---

**Ready to build your first diary card?** Start with [WORKFLOW.md](docs/WORKFLOW.md)!
