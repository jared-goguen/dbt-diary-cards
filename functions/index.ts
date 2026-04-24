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
  const url = new URL(context.request.url);
  const monthQuery = url.searchParams.get("month") ?? undefined;

  console.log(`[landing] GET / month=${monthQuery ?? "current"}`);

  if (!context.env.DIARY_BUCKET) {
    console.error(`[landing] DIARY_BUCKET binding is missing!`);
    return new Response("Server configuration error: R2 bucket binding missing.", { status: 500 });
  }

  const storage = createStorage({ bucket: context.env.DIARY_BUCKET });

  try {
    // Check what's in R2 for logging
    const entries = await storage.list("entries/");
    console.log(`[landing] found ${entries.length} entries in R2`);

    const template = await storage.get("template.yaml");
    console.log(`[landing] template.yaml: ${template ? template.length + " bytes" : "NOT FOUND"}`);

    const html = await renderLanding(storage, monthQuery);
    console.log(`[landing] rendered HTML: ${html.length} bytes`);

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[landing] ERROR: ${msg}`);
    if (stack) console.error(`[landing] stack: ${stack}`);

    return new Response(
      `<html><body style="font-family:sans-serif;background:#0e0e10;color:#c4c4c8;max-width:640px;margin:2rem auto;padding:1.5rem">
<h1 style="color:#d23020">Calendar Error</h1>
<pre style="background:#1a1a1e;padding:1rem;border-left:3px solid #d23020;color:#f87171">${msg}</pre>
<p><a href="/debug" style="color:#d23020">Check /debug for R2 state</a></p>
</body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } },
    );
  }
};
