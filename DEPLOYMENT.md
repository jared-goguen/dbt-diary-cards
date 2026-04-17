# DBT Diary Edit Mode Deployment Guide

## Phase 7: Cloudflare Deployment

### Prerequisites
- Cloudflare account with Pages enabled
- `wrangler` CLI installed (`npm install -g wrangler`)
- Cloudflare credentials configured (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`)

### Step 1: Create R2 Bucket

Create an R2 bucket named `dbt-diary-entries` in the Cloudflare dashboard:

1. Go to Cloudflare Dashboard → R2 Storage
2. Click "Create bucket"
3. Name: `dbt-diary-entries`
4. Click "Create bucket"

### Step 2: Upload Template to R2

Upload the template.yaml file to the R2 bucket root:

```bash
wrangler r2 object put dbt-diary-entries template.yaml --path template.yaml
```

### Step 3: Deploy Pages Functions

Deploy the Pages Functions to your existing project or create a new one:

```bash
cd dbt-diary-cards
wrangler pages deploy --project-name dbt-diary-cards ./public
```

**Note:** The `./public` directory can be empty since all content is rendered dynamically by the Functions.

### Step 4: Verify Deployment

Test the live site:

- View mode: https://dbt-diary-cards.pages.dev/diary/2026-04-17
- Edit mode: https://dbt-diary-cards.pages.dev/diary/2026-04-17?mode=edit
- Create new: https://dbt-diary-cards.pages.dev/diary/2026-04-18?mode=edit

## Phase 8: Migration & Testing

### Step 1: Migrate Existing Entry

Convert the existing diary entry to R2:

```bash
wrangler r2 object put dbt-diary-entries entries/2026-04-17.yaml --path diary-2026-04-17.yaml
```

### Step 2: Manual Testing

Test the complete workflow:

1. **Create new entry**
   - Visit: `?mode=edit` URL for a new date (e.g., 2026-04-18)
   - Should see form with empty fields
   - Fill out some values
   - Click "Save & Publish"
   - Should redirect to view mode

2. **Edit existing entry**
   - Visit: existing entry `/diary/2026-04-17`
   - Click "Edit This Page" button
   - Should see form with current values
   - Modify some values
   - Click "Save & Publish"
   - Should redirect to view mode
   - Verify changes are persisted

3. **View mode**
   - All tables should render with current values
   - Heat-map colors should be visible
   - "Edit This Page" button should be visible in top-right

4. **Non-existent entry**
   - Visit: `/diary/2099-01-01`
   - Should show 404 with "Create New Entry" button
   - Click button and create entry

### Step 3: Verify R2 Content

Check that files are being created in R2:

```bash
# List all entries
wrangler r2 object list dbt-diary-entries --prefix entries/

# List rendered cache
wrangler r2 object list dbt-diary-entries --prefix rendered/

# View entry YAML
wrangler r2 object get dbt-diary-entries entries/2026-04-17.yaml
```

## Environment Variables

The Workers Functions need access to the R2 bucket. This is configured in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "DIARY_BUCKET"
bucket_name = "dbt-diary-entries"
```

The binding name `DIARY_BUCKET` is used in the TypeScript code as `env.DIARY_BUCKET`.

## Architecture Notes

### Request Flow

1. **GET /diary/[date]** → `functions/diary/[date].ts`
   - Check query param `?mode=edit` or `?mode=view` (default)
   - Load YAML from R2: `entries/[date].yaml`
   - If not found and mode=edit: use template with {{DATE}} replaced
   - If not found and mode=view: return 404
   - Run Gutenberg pipeline with mode parameter
   - Render HTML and return

2. **POST /diary/[date]?mode=save** → `functions/diary/[date].ts`
   - Read FormData from request
   - Load template.yaml from R2
   - Reconstruct YAML spec from form data
   - Save to R2: `entries/[date].yaml`
   - Rebuild index.html
   - Redirect to GET /diary/[date] (view mode)

3. **GET /** → `functions/index.ts`
   - Try to load `index.html` from R2
   - If exists: serve it
   - If not: show placeholder page

### Data Storage

All data lives in R2 `dbt-diary-entries` bucket:

```
template.yaml           ← Template file (source of truth for new entries)
entries/2026-04-17.yaml ← Entry YAML (user data)
entries/2026-04-18.yaml
...
rendered/2026-04-17.html ← Cached HTML (optional, for faster view mode)
index.html              ← Archive index page (rebuilt on save)
```

## Rollback

If something goes wrong:

1. **Revert to previous version** (if committed to git)
   ```bash
   git revert HEAD
   git push
   wrangler pages deploy
   ```

2. **Remove R2 bucket** (careful - destroys all data)
   ```bash
   wrangler r2 bucket delete dbt-diary-entries
   ```

3. **Clear Pages deployment cache**
   - Use Cloudflare Dashboard → Pages → dbt-diary-cards → Deployments

## Troubleshooting

### "Template not found" error
- Verify template.yaml was uploaded to R2
- Check bucket name matches `dbt-diary-entries`

### "DIARY_BUCKET is not defined" error
- Check wrangler.toml has the R2 binding
- Verify bucket name in binding matches actual bucket

### Form data not saving
- Check R2 bucket has write permissions
- Review browser console for form submission errors
- Check Network tab for POST response status

### Dates showing as NaN
- Verify date format is YYYY-MM-DD
- Check browser console for parsing errors

## Testing Locally

To test locally with `wrangler dev`:

```bash
cd dbt-diary-cards
wrangler dev
```

This runs a local version that connects to your real R2 bucket. Visit:
- http://localhost:8787/diary/2026-04-17
- http://localhost:8787/diary/2026-04-17?mode=edit

## Next Steps

After successful deployment:

1. Populate with real diary entries (or migrate from existing source)
2. Set up custom domain if desired
3. Consider adding authentication (Cloudflare Workers Auth)
4. Set up automated backups of R2 data
5. Monitor Pages analytics for usage patterns
