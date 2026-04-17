# 🚀 DBT Diary Edit Mode - Deploy Now

## Quick Deploy (Copy-Paste Commands)

### Prerequisites
- Cloudflare account with Pages + R2 enabled
- `wrangler` CLI installed: `npm install -g wrangler` (or `bun install -g wrangler`)
- Cloudflare API credentials configured

### Step 1: Verify Wrangler Setup

```bash
wrangler --version
wrangler whoami
```

If not authenticated, run:
```bash
wrangler login
```

### Step 2: Create R2 Bucket

```bash
wrangler r2 bucket create dbt-diary-entries
```

### Step 3: Upload Template to R2

```bash
cd /path/to/dbt-diary-cards
wrangler r2 object put dbt-diary-entries template.yaml --file template.yaml
```

Verify upload:
```bash
wrangler r2 object get dbt-diary-entries template.yaml
```

### Step 4: Deploy Pages Functions

```bash
cd /path/to/dbt-diary-cards
wrangler pages deploy ./public --project-name dbt-diary-cards
```

This will:
- Create or update the Cloudflare Pages project named `dbt-diary-cards`
- Deploy the `functions/` directory as Pages Functions
- Bind the R2 bucket as `DIARY_BUCKET`

### Step 5: Verify Deployment

Test the live site:

```bash
# View mode (should return 404 with create button)
curl https://dbt-diary-cards.pages.dev/diary/2026-04-18

# Edit mode
curl "https://dbt-diary-cards.pages.dev/diary/2026-04-18?mode=edit"

# Existing entry (needs to be migrated)
curl https://dbt-diary-cards.pages.dev/diary/2026-04-17
```

Or open in browser:
- https://dbt-diary-cards.pages.dev/diary/2026-04-18?mode=edit

### Step 6: Migrate Existing Entry (Optional)

Upload the existing diary entry to R2:

```bash
wrangler r2 object put dbt-diary-entries entries/2026-04-17.yaml --file diary-2026-04-17.yaml
```

Then verify it loads:
```bash
curl https://dbt-diary-cards.pages.dev/diary/2026-04-17
```

---

## Testing Workflow

### Create New Entry

1. Visit: `https://dbt-diary-cards.pages.dev/diary/2026-04-20?mode=edit`
2. Should see form with all fields empty
3. Fill in values:
   - Change hero heading
   - Enter sleep hours
   - Set emotion scores
   - Fill daily notes
4. Click "Save & Publish"
5. Should redirect to view mode and show saved data

### Edit Existing Entry

1. Visit: `https://dbt-diary-cards.pages.dev/diary/2026-04-17`
2. Click "Edit This Page" button (top-right)
3. Should load form with current values
4. Modify some values
5. Click "Save & Publish"
6. Verify changes are reflected in view mode

### View Index

1. Visit: `https://dbt-diary-cards.pages.dev/`
2. Should show list of all entries
3. After saving a new entry, index should automatically update

---

## Troubleshooting

### "Template not found" error

**Cause:** Template.yaml wasn't uploaded to R2

**Fix:**
```bash
wrangler r2 object put dbt-diary-entries template.yaml --file template.yaml
```

### "DIARY_BUCKET is not defined" error

**Cause:** R2 bucket binding not configured properly

**Fix:**
1. Verify `wrangler.toml` has the binding:
   ```toml
   [[r2_buckets]]
   binding = "DIARY_BUCKET"
   bucket_name = "dbt-diary-entries"
   ```
2. Re-deploy: `wrangler pages deploy ./public --project-name dbt-diary-cards`

### Form data not saving

**Cause:** R2 bucket permissions or Worker deployment issue

**Fix:**
1. Check R2 bucket exists:
   ```bash
   wrangler r2 bucket list
   ```
2. Check bucket is writable:
   ```bash
   wrangler r2 object put dbt-diary-entries test.txt --file /dev/null
   wrangler r2 object delete dbt-diary-entries test.txt
   ```
3. Check Pages Functions deployment:
   ```bash
   wrangler pages deployment list --project-name dbt-diary-cards
   ```

### Date format errors

**Cause:** Invalid date format in URL

**Fix:** Use YYYY-MM-DD format:
- ✅ `/diary/2026-04-17`
- ❌ `/diary/04-17-2026`
- ❌ `/diary/april-17`

---

## Architecture Verification

After deployment, verify the complete flow:

### 1. GET /diary/[date] (View Mode)
- Should load existing entry or return 404
- Should show "Edit This Page" button
- Should display heat-mapped tables

### 2. GET /diary/[date]?mode=edit (Edit Mode)
- Should load form with current values (or template defaults)
- Should have input fields for hero, tables, content
- Should have "Save & Publish" button

### 3. POST /diary/[date]?mode=save (Save)
- Should accept FormData from form submission
- Should convert to YAML and store in R2
- Should rebuild index.html
- Should redirect to view mode

### 4. GET / (Index)
- Should serve pre-generated index.html
- Should list all entries

---

## Files Deployed

```
Cloudflare Pages Project: dbt-diary-cards
├── functions/
│   ├── diary/[date].ts     ← Main handler (GET/POST)
│   └── index.ts            ← Archive index handler
└── public/
    └── index.html          ← Pages build placeholder

R2 Bucket: dbt-diary-entries
├── template.yaml           ← Entry template (required)
├── entries/
│   ├── 2026-04-17.yaml     ← User data (created on save)
│   ├── 2026-04-18.yaml
│   └── ...
├── rendered/
│   ├── 2026-04-17.html     ← Cached view (optional)
│   └── ...
└── index.html              ← Auto-generated archive
```

---

## Rollback

If something goes wrong:

### Revert deployment
```bash
wrangler pages deployment rollback --project-name dbt-diary-cards
```

### Delete everything (careful!)
```bash
# Delete R2 bucket (and all data!)
wrangler r2 bucket delete dbt-diary-entries

# Delete Pages project via dashboard
# Cloudflare Dashboard → Pages → dbt-diary-cards → Delete
```

---

## Live URL

After deployment, your diary will be live at:

**Base URL:** `https://dbt-diary-cards.pages.dev`

**Entry URLs:**
- View: `https://dbt-diary-cards.pages.dev/diary/2026-04-17`
- Edit: `https://dbt-diary-cards.pages.dev/diary/2026-04-17?mode=edit`
- Create: `https://dbt-diary-cards.pages.dev/diary/2026-04-18?mode=edit`

---

## Next Steps

1. ✅ Run deploy commands above
2. 📝 Create first entry via web UI
3. 🎨 Customize styling (edit ink theme colors)
4. 🔐 Add authentication (Cloudflare Workers Auth)
5. 📊 Set up analytics and monitoring
6. 💾 Configure R2 backup strategy
7. 🌍 Use custom domain instead of pages.dev

---

## Support

For detailed information, see:
- `DEPLOYMENT.md` - Complete deployment guide
- `template.yaml` - Entry template structure
- `functions/diary/[date].ts` - Main handler code
- `wrangler.toml` - Cloudflare configuration
