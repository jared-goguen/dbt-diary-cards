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

  if (!isValidDate(date)) {
    return new Response("Invalid date format. Expected YYYY-MM-DD.", { status: 400 });
  }

  const storage = createStorage({ bucket: context.env.DIARY_BUCKET });
  const url = new URL(context.request.url);

  try {
    // POST → save entry
    if (context.request.method === "POST") {
      const body = await context.request.text();
      const fields = parseFormBody(body);
      const yaml = await formDataToYaml(fields, date, storage);
      await storage.put(`entries/${date}.yaml`, yaml);
      const redirectUrl = new URL(`/diary/${date}`, context.request.url).toString();
      return Response.redirect(redirectUrl, 303);
    }

    // GET ?mode=edit → edit mode
    if (url.searchParams.get("mode") === "edit") {
      const html = await renderEdit(date, storage);
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }

    // GET → view mode
    const html = await renderView(date, storage);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(`Error: ${msg}`, { status: 500 });
  }
};
