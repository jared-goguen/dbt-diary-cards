/**
 * Index Page Handler
 *
 * Serves the diary archive page listing all entries
 */
import type { PagesFunction } from '@cloudflare/workers-types';
interface Env {
    DIARY_BUCKET: R2Bucket;
}
export declare const onRequest: PagesFunction<Env>;
export {};
//# sourceMappingURL=index.d.ts.map