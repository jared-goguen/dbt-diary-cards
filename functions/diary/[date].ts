/**
 * CF Pages Function: /diary/:date
 *
 * GET  /diary/:date           → View entry (read-only)
 * GET  /diary/:date?mode=edit → Edit entry (form inputs)
 * POST /diary/:date           → Save form data → R2
 */

import { createStorage } from "../../lib/storage";
import { renderView, renderEdit } from "../../lib/render";
import { formDataToYaml, parseFormBody } from "../../lib/save";

interface Env {
  DIARY_BUCKET: R2Bucket;
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date + "T12:00:00Z").getTime());
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const date = context.params.date as string;
  const url = new URL(context.request.url);
  const mode = url.searchParams.get("mode") ?? "view";
  const method = context.request.method;

  console.log(`[diary] ${method} /diary/${date} mode=${mode}`);

  if (!isValidDate(date)) {
    console.log(`[diary] invalid date: ${date}`);
    return new Response("Invalid date format. Expected YYYY-MM-DD.", { status: 400 });
  }

  if (!context.env.DIARY_BUCKET) {
    console.error(`[diary] DIARY_BUCKET binding is missing!`);
    return new Response("Server configuration error: R2 bucket binding missing.", { status: 500 });
  }

  const storage = createStorage({ bucket: context.env.DIARY_BUCKET });

  try {
    // POST → save or delete entry
    if (method === "POST") {
      const body = await context.request.text();
      const fields = parseFormBody(body);

      // DELETE via _method=delete hidden field
      if (fields.get("_method") === "delete") {
        console.log(`[diary] DELETE entry for ${date}`);
        await storage.delete(`entries/${date}.yaml`);
        console.log(`[diary] deleted entries/${date}.yaml from R2`);
        const redirectUrl = new URL("/", context.request.url).toString();
        return Response.redirect(redirectUrl, 303);
      }

      // SAVE
      console.log(`[diary] processing POST save for ${date}`);
      console.log(`[diary] form body: ${body.length} bytes, fields: ${body.split("&").length}`);
      console.log(`[diary] parsed ${fields.size} fields`);

      const yaml = await formDataToYaml(fields, date, storage);
      console.log(`[diary] generated YAML: ${yaml.length} bytes`);

      await storage.put(`entries/${date}.yaml`, yaml);
      console.log(`[diary] saved entries/${date}.yaml to R2`);

      const redirectUrl = new URL(`/diary/${date}`, context.request.url).toString();
      return Response.redirect(redirectUrl, 303);
    }

    // GET ?mode=edit → edit mode
    if (mode === "edit") {
      console.log(`[diary] rendering edit mode for ${date}`);

      // Check template
      const templateCheck = await storage.get("template.yaml");
      console.log(`[diary] template.yaml: ${templateCheck ? templateCheck.length + " bytes" : "NOT FOUND"}`);

      // Check entry
      const entryCheck = await storage.get(`entries/${date}.yaml`);
      console.log(`[diary] entries/${date}.yaml: ${entryCheck ? entryCheck.length + " bytes" : "NOT FOUND (will use template)"}`);

      const html = await renderEdit(date, storage);
      console.log(`[diary] edit HTML: ${html.length} bytes`);
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    // GET → view mode
    console.log(`[diary] rendering view mode for ${date}`);

    const entryCheck = await storage.get(`entries/${date}.yaml`);
    console.log(`[diary] entries/${date}.yaml: ${entryCheck ? entryCheck.length + " bytes" : "NOT FOUND"}`);

    const html = await renderView(date, storage);
    console.log(`[diary] view HTML: ${html.length} bytes`);
    return new Response(html, { headers: { "Content-Type": "text/html" } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[diary] ERROR in ${method} /diary/${date} mode=${mode}: ${msg}`);
    if (stack) console.error(`[diary] stack: ${stack}`);

    // Return a diagnostic error page instead of bare text
    return new Response(errorPage(date, mode, msg, stack), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
};

/** Render a styled error page with diagnostic info. */
function errorPage(date: string, mode: string, message: string, stack?: string): string {
  const stackHtml = stack
    ? `<pre style="font-size:0.75rem;color:#888;margin-top:1rem;overflow-x:auto;white-space:pre-wrap">${escHtml(stack)}</pre>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Error — ${escHtml(date)}</title>
<style>
body { font-family: 'Helvetica Neue', sans-serif; background: #0e0e10; color: #c4c4c8; max-width: 640px; margin: 2rem auto; padding: 1.5rem; line-height: 1.6; }
h1 { color: #d23020; font-size: 1.5rem; margin-bottom: 0.5rem; }
h2 { color: #f0f0f2; font-size: 1rem; margin: 1.5rem 0 0.5rem; }
.error-msg { background: #1a1a1e; border-left: 3px solid #d23020; padding: 1rem 1.5rem; font-family: 'SF Mono', monospace; font-size: 0.875rem; color: #f87171; margin: 1rem 0; }
a { color: #d23020; }
.meta { font-size: 0.8125rem; color: #787880; margin-top: 2rem; }
</style>
</head>
<body>
<h1>Something went wrong</h1>
<p>An error occurred while rendering the diary entry for <strong>${escHtml(date)}</strong> (mode: ${escHtml(mode)}).</p>

<div class="error-msg">${escHtml(message)}</div>

<h2>What to try</h2>
<ul>
<li><a href="/diary/${escHtml(date)}?mode=edit">Open in edit mode</a> — creates from template if no entry exists</li>
<li><a href="/">Back to calendar</a></li>
<li>Check <a href="/debug">/debug</a> to see R2 storage state</li>
</ul>

${stackHtml}

<div class="meta">
Date: ${escHtml(date)} · Mode: ${escHtml(mode)} · Time: ${new Date().toISOString()}
</div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
