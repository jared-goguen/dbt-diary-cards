/**
 * CF Pages Function: /
 *
 * Landing page — monthly calendar showing diary entries.
 * Supports ?month=YYYY-MM for month navigation.
 */

import { createStorage } from "../lib/storage";
import { renderLanding } from "../lib/listing";

interface Env {
  DIARY_BUCKET: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const storage = createStorage({ bucket: context.env.DIARY_BUCKET });
  const url = new URL(context.request.url);
  const monthQuery = url.searchParams.get("month") ?? undefined;

  try {
    const html = await renderLanding(storage, monthQuery);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Error: ${msg}`, { status: 500 });
  }
};
