#!/bin/bash
# DBT Diary Cards - Deployment Script
# Deploys the project to Cloudflare Pages with Functions and R2

set -e

echo "🚀 DBT Diary Cards Deployment"
echo "========================================"

# Check environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ Error: CLOUDFLARE_API_TOKEN is not set"
  echo ""
  echo "Set it in .env file or export it:"
  echo "  export CLOUDFLARE_API_TOKEN=your_token_here"
  exit 1
fi

if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
  echo "❌ Error: CLOUDFLARE_ACCOUNT_ID is not set"
  echo ""
  echo "Set it in .env file or export it:"
  echo "  export CLOUDFLARE_ACCOUNT_ID=your_account_id_here"
  exit 1
fi

PROJECT_NAME=${PROJECT_NAME:-dbt-diary-cards}
R2_BUCKET=${R2_BUCKET:-dbt-diary-entries}

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "📂 Copying compiled functions..."
rm -rf functions/*.ts functions/**/*.ts
cp -r dist/functions/* functions/

echo "☁️  Checking R2 bucket..."
if npx wrangler r2 bucket list 2>&1 | grep -q "$R2_BUCKET"; then
  echo "✅ R2 bucket '$R2_BUCKET' exists"
else
  echo "Creating R2 bucket: $R2_BUCKET"
  npx wrangler r2 bucket create "$R2_BUCKET"
fi

echo "📤 Uploading template to R2..."
if [ -f "templates/diary.yaml" ]; then
  npx wrangler r2 object put "$R2_BUCKET/template.yaml" --file templates/diary.yaml --remote
  echo "✅ Template uploaded to R2"
else
  echo "⚠️  Warning: templates/diary.yaml not found"
fi

echo "🔧 Configuring R2 binding for production..."
curl -s -X PATCH "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT_NAME" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"deployment_configs\": {
      \"production\": {
        \"r2_buckets\": {
          \"DIARY_BUCKET\": {
            \"name\": \"$R2_BUCKET\"
          }
        },
        \"compatibility_date\": \"2024-09-23\"
      }
    }
  }" > /dev/null

echo "✅ R2 binding configured"

echo "🌐 Deploying to Cloudflare Pages..."
npx wrangler pages deploy . --project-name "$PROJECT_NAME" --commit-dirty=true

echo ""
echo "✅ Deployment complete!"
echo "================================================"
echo ""
echo "🔗 Your site is live at:"
echo "   https://$PROJECT_NAME.pages.dev"
echo ""
echo "📝 Next steps:"
echo "   1. Visit https://$PROJECT_NAME.pages.dev/ to see the index"
echo "   2. Click 'Create Today's Entry' to create your first diary entry"
echo "   3. Fill in the form and submit to save to R2"
echo "   4. View your saved entry"
echo ""
