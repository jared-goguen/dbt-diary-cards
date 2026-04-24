#!/usr/bin/env bun
/**
 * Local dev server for DBT Diary Cards.
 *
 * Routes:
 *   GET  /                     → Landing page (entry listing)
 *   GET  /diary/:date          → View entry
 *   GET  /diary/:date?mode=edit → Edit entry (or blank from template)
 *   POST /diary/:date          → Save form data → entries/{date}.yaml
 */

import { mkdirSync, writeFileSync } from "fs";
import { renderView, renderEdit } from "./lib/render.js";
import { renderLanding } from "./lib/listing.js";
import { formDataToYaml, parseFormBody } from "./lib/save.js";

const PORT = 3000;
const ENTRIES_DIR = "entries";

// Ensure entries directory exists
mkdirSync(ENTRIES_DIR, { recursive: true });

const DIARY_RE = /^\/diary\/(\d{4}-\d{2}-\d{2})\/?$/;

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date + "T12:00:00Z").getTime());
}

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // ── Landing page ─────────────────────────────────────
      if (path === "/" || path === "") {
        const html = renderLanding();
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }

      // ── Diary entry routes ───────────────────────────────
      const match = path.match(DIARY_RE);
      if (match) {
        const date = match[1];

        if (!isValidDate(date)) {
          return new Response("Invalid date", { status: 400 });
        }

        // POST → save
        if (req.method === "POST") {
          const body = await req.text();
          const fields = parseFormBody(body);
          const yaml = formDataToYaml(fields, date);
          writeFileSync(`${ENTRIES_DIR}/${date}.yaml`, yaml);
          console.log(`✓ Saved entries/${date}.yaml`);
          return Response.redirect(`/diary/${date}`, 303);
        }

        // GET ?mode=edit → edit mode
        if (url.searchParams.get("mode") === "edit") {
          const html = renderEdit(date);
          return new Response(html, { headers: { "Content-Type": "text/html" } });
        }

        // GET → view mode
        const html = renderView(date);
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }

      // ── Redirect /diary/ to landing ──────────────────────
      if (path === "/diary" || path === "/diary/") {
        return Response.redirect("/", 302);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error handling ${req.method} ${path}:`, msg);
      return new Response(`<pre>Error: ${msg}</pre>`, {
        status: 500,
        headers: { "Content-Type": "text/html" },
      });
    }
  },
});

console.log(`
  DBT Diary Cards — http://localhost:${PORT}

  Routes:
    GET  /                        Landing page (entry listing)
    GET  /diary/2026-04-23        View entry
    GET  /diary/2026-04-23?mode=edit  Edit entry
    POST /diary/2026-04-23        Save entry
`);
