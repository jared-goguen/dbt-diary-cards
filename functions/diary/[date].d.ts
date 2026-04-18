/**
 * DBT Diary Card Handler
 *
 * Renders and edits diary entries using Gutenberg edit mode
 * GET /diary/[date] - View entry
 * GET /diary/[date]?mode=edit - Edit form
 * POST /diary/[date]?mode=save - Save entry
 */
import type { PagesFunction } from '@cloudflare/workers-types';
interface Env {
    DIARY_BUCKET: R2Bucket;
}
/**
 * Main request handler - Cloudflare Pages Function
 */
export declare const onRequest: PagesFunction<Env>;
export {};
//# sourceMappingURL=%5Bdate%5D.d.ts.map