# DBT Diary Cards - Deployment Guide

Deploy your DBT Diary Cards project to Cloudflare Pages with Functions and R2 storage.

## Prerequisites

1. **Cloudflare Account** with Pages and R2 enabled
2. **Node.js** (v18 or later)
3. **Cloudflare API Token** with permissions for:
   - Workers
   - Pages
   - R2

## Quick Start

### 1. Set up environment variables

Create a `.env` file in the project root:

```bash
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
```

**Get your API token:**
1. Go to https://dash.cloudflare.com/?to=/:account/profile/api-tokens
2. Click **Create Token**
3. Select **Edit Cloudflare Workers** template
4. Create the token and copy it

**Get your Account ID:**
1. Go to https://dash.cloudflare.com/
2. Select any site or go to Workers & Pages
3. Copy the Account ID from the right sidebar

### 2. Deploy

Run the deployment script:

```bash
# Load environment variables
source .env

# Run deployment
./scripts/deploy.sh
```

The script will:
- Install dependencies
- Build TypeScript
- Create R2 bucket (if it doesn't exist)
- Upload the template to R2
- Configure R2 bindings
- Deploy to Cloudflare Pages

### 3. Access your site

Your site will be live at:
```
https://dbt-diary-cards.pages.dev
```

## Manual Deployment

If you prefer to deploy manually:

### Step 1: Install and build

```bash
npm install
npm run build
```

### Step 2: Copy compiled functions

```bash
rm -rf functions/*.ts functions/**/*.ts
cp -r dist/functions/* functions/
```

### Step 3: Create R2 bucket

```bash
npx wrangler r2 bucket create dbt-diary-entries
```

### Step 4: Upload template

```bash
npx wrangler r2 object put dbt-diary-entries/template.yaml \
  --file templates/diary.yaml \
  --remote
```

### Step 5: Configure R2 binding

```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/dbt-diary-cards" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deployment_configs": {
      "production": {
        "r2_buckets": {
          "DIARY_BUCKET": {
            "name": "dbt-diary-entries"
          }
        },
        "compatibility_date": "2024-09-23"
      }
    }
  }'
```

### Step 6: Deploy to Pages

```bash
npx wrangler pages deploy . --project-name dbt-diary-cards
```

## Updating Your Deployment

To update your deployment after making changes:

```bash
# Build TypeScript
npm run build

# Copy compiled functions
rm -rf functions/*.ts functions/**/*.ts
cp -r dist/functions/* functions/

# Deploy
npx wrangler pages deploy . --project-name dbt-diary-cards
```

Or simply run the deploy script again:

```bash
source .env && ./scripts/deploy.sh
```

## Project Structure

```
dbt-diary-cards/
├── _gutenberg/          # Gutenberg runtime (copied for self-contained deployment)
├── functions/           # Cloudflare Pages Functions (compiled JS)
│   ├── index.js        # Index page handler
│   └── diary/
│       └── [date].js   # Dynamic diary entry handler
├── templates/
│   └── diary.yaml      # Diary template definition
├── public/             # Static assets (empty for this project)
├── data/               # Local entry storage (for git-friendly workflow)
├── dist/               # TypeScript build output
├── scripts/
│   └── deploy.sh       # Deployment script
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── wrangler.toml       # Cloudflare Pages configuration
└── .env                # Environment variables (gitignored)
```

## How It Works

1. **Templates**: Stored in `templates/` and uploaded to R2 with key `template.yaml`
2. **Entries**: Created at runtime via forms, saved to R2 under `entries/{date}.yaml`
3. **Functions**: TypeScript handlers in `functions/` compiled to JavaScript
4. **R2 Storage**: All dynamic data (template + entries) stored in R2
5. **Pages Functions**: Serve dynamic routes like `/diary/2026-04-17`

## Troubleshooting

### Functions return 404

**Cause**: R2 binding not configured for production environment

**Fix**: Run the R2 binding configuration step (Step 5 in manual deployment)

### "Template not found" error

**Cause**: Template not uploaded to R2

**Fix**: Upload template to R2:
```bash
npx wrangler r2 object put dbt-diary-entries/template.yaml \
  --file templates/diary.yaml \
  --remote
```

### TypeScript errors

**Cause**: Missing dependencies or incorrect types

**Fix**: Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Local Development

To test locally with wrangler:

```bash
# Start dev server (with R2 emulation)
npm run dev
```

Visit http://localhost:8788 to test your site locally.

**Note**: Local R2 emulation stores data in `.wrangler/state/v3/r2/` and is separate from remote R2.

## Environment Variables

The deployment script supports these environment variables:

- `CLOUDFLARE_API_TOKEN` (required): Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID` (required): Your Cloudflare account ID
- `PROJECT_NAME` (optional): Pages project name (default: `dbt-diary-cards`)
- `R2_BUCKET` (optional): R2 bucket name (default: `dbt-diary-entries`)

## Support

For issues or questions, refer to:
- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- Cloudflare R2 docs: https://developers.cloudflare.com/r2/
- Gutenberg docs: ../gutenberg/docs/
