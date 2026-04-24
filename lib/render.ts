/**
 * Render — shared rendering logic for diary card pages.
 *
 * Handles view mode, edit mode, prev/next navigation, and template loading.
 * All I/O goes through the Storage interface.
 */

import { parse as parseYaml } from "yaml";
import { fromYaml } from "@jared-goguen/gutenberg/specs/page/yaml";
import { sanitizeSpec } from "@jared-goguen/gutenberg/specs/page/sanitize";
import { compile } from "@jared-goguen/gutenberg/compile";
import { compileEdit, findEditableBlocks } from "@jared-goguen/gutenberg/pipeline/editify";
import type { CompileOptions } from "@jared-goguen/gutenberg/engines/html5";
import type { Storage } from "./storage.js";

const TEMPLATE_KEY = "template.yaml";

// ── Date helpers ─────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Loading ──────────────────────────────────────────────────

/** Load an entry YAML from storage. Returns null if not found. */
async function loadEntry(date: string, storage: Storage): Promise<string | null> {
  return storage.get(`entries/${date}.yaml`);
}

/** Load the template with {{DATE}} resolved. */
async function loadTemplate(date: string, storage: Storage): Promise<string> {
  const raw = await storage.get(TEMPLATE_KEY);
  if (!raw) throw new Error("Template not found: " + TEMPLATE_KEY);
  return raw.replace(/\{\{DATE\}\}/g, date);
}

/** Load the raw template for editable block discovery. */
async function loadTemplateRaw(storage: Storage): Promise<Record<string, unknown>> {
  const raw = await storage.get(TEMPLATE_KEY);
  if (!raw) throw new Error("Template not found: " + TEMPLATE_KEY);
  return parseYaml(raw) as Record<string, unknown>;
}

// ── Nav options ──────────────────────────────────────────────

function navOptions(date: string): Partial<CompileOptions> {
  const prev = addDays(date, -1);
  const next = addDays(date, 1);
  const today = todayStr();

  return {
    prevPage: { urlPath: `/diary/${prev}`, title: `← ${prev}` },
    nextPage: next <= today
      ? { urlPath: `/diary/${next}`, title: `${next} →` }
      : undefined,
    breadcrumbs: [
      { title: "Diary Cards", url: "/" },
      { title: date },
    ],
    editLink: `/diary/${date}?mode=edit`,
  };
}

// ── Render ───────────────────────────────────────────────────

/** Render a diary entry in view mode. */
export async function renderView(date: string, storage: Storage): Promise<string> {
  const yaml = await loadEntry(date, storage);
  if (!yaml) {
    return render404(date);
  }

  const spec = fromYaml(yaml);
  sanitizeSpec(spec);
  const result = compile(spec, navOptions(date));
  return result.html;
}

/** Render a diary entry in edit mode. Falls back to template if no entry exists. */
export async function renderEdit(date: string, storage: Storage): Promise<string> {
  const entryYaml = await loadEntry(date, storage) ?? await loadTemplate(date, storage);

  const templateRaw = await loadTemplateRaw(storage);
  const editableBlocks = findEditableBlocks(templateRaw);

  const spec = fromYaml(entryYaml);
  sanitizeSpec(spec);
  const result = compileEdit(spec, editableBlocks, navOptions(date));
  return result.html;
}

/** Render a 404 page with a link to create the entry. */
function render404(date: string): string {
  const yaml = `
title: "No Entry — ${date}"
theme: mono
blocks:
  - heading:
      text: No entry for ${date}
  - prose:
      text: |
        This date doesn't have a diary entry yet.

        [Create entry for ${date}](/diary/${date}?mode=edit)
  - closing:
      text: |
        Use the link above or navigate to another date.
`;
  const spec = fromYaml(yaml);
  sanitizeSpec(spec);
  return compile(spec, navOptions(date)).html;
}
