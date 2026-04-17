/**
 * DBT Diary Card Handler
 * 
 * Renders and edits diary entries using Gutenberg edit mode
 * GET /diary/[date] - View entry
 * GET /diary/[date]?mode=edit - Edit form
 * POST /diary/[date]?mode=save - Save entry
 */

import { createEditHandler } from 'gutenberg/workers';

interface Env {
  DIARY_BUCKET: R2Bucket;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
}

/**
 * Main request handler
 */
export async function onRequest(context: {
  request: Request;
  env: Env;
  params: { date: string };
}) {
  return createEditHandler({
    templateKey: 'template.yaml',
    bucket: context.env.DIARY_BUCKET,
    routeParam: 'date',
    paramValidator: isValidDate,
  })(context);
}
