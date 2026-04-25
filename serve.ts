#!/usr/bin/env bun
/**
 * Local dev server for DBT Diary Cards.
 *
 * Uses FileStorage backed by the current directory.
 * Template at ./template.yaml, entries at ./entries/{date}.yaml.
 *
 * Routes:
 *   GET  /                     → Landing page (calendar)
 *   GET  /diary/:date          → View entry
 *   GET  /diary/:date?mode=edit → Edit entry (or blank from template)
 *   POST /diary/:date          → Save form data → entries/{date}.yaml
 */

import { mkdirSync } from "fs";
import { join } from "path";
import { createStorage } from "./lib/storage.js";
import { renderView, renderEdit } from "./lib/render.js";
import { renderLanding } from "./lib/listing.js";
import { formDataToYaml, parseFormBody } from "./lib/save.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Create storage from environment
const storage = createStorage();
const storageDir = process.env.STORAGE_DIR ?? ".";

// Ensure entries directory exists (FileStorage only)
mkdirSync(join(storageDir, "entries"), { recursive: true });

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
        const monthQuery = url.searchParams.get("month") ?? undefined;
        const html = await renderLanding(storage, monthQuery);
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      }

      // ── Diary entry routes ───────────────────────────────
      const match = path.match(DIARY_RE);
      if (match) {
        const date = match[1];

        if (!isValidDate(date)) {
          return new Response("Invalid date", { status: 400 });
        }

        // POST → save or delete
        if (req.method === "POST") {
          const body = await req.text();
          const fields = parseFormBody(body);

          // DELETE via _method=delete
          if (fields.get("_method") === "delete") {
            await storage.delete(`entries/${date}.yaml`);
            console.log(`✗ Deleted entries/${date}.yaml`);
            return Response.redirect("/", 303);
          }

          // SAVE
          const yaml = await formDataToYaml(fields, date, storage);
          await storage.put(`entries/${date}.yaml`, yaml);
          console.log(`✓ Saved entries/${date}.yaml`);
          return Response.redirect(`/diary/${date}`, 303);
        }

        // GET ?mode=edit → edit mode
        if (url.searchParams.get("mode") === "edit") {
          const html = await renderEdit(date, storage);
          return new Response(html, { headers: { "Content-Type": "text/html" } });
        }

        // GET → view mode
        const html = await renderView(date, storage);
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
    GET  /                        Landing page (calendar)
    GET  /diary/2026-04-24        View entry
    GET  /diary/2026-04-24?mode=edit  Edit entry
    POST /diary/2026-04-24        Save entry

  Storage: ${process.env.STORAGE_BACKEND ?? "file"} (${storageDir})
`);
