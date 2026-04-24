/**
 * Render — shared rendering logic for diary card pages.
 *
 * Handles view mode, edit mode, prev/next navigation, and template loading.
 */

import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import { fromYaml } from "../../gutenberg-jg/src/specs/page/yaml.js";
import { sanitizeSpec } from "../../gutenberg-jg/src/specs/page/sanitize.js";
import { compile } from "../../gutenberg-jg/src/compile.js";
import { compileEdit, findEditableBlocks } from "../../gutenberg-jg/src/pipeline/editify.js";
import type { CompileOptions } from "../../gutenberg-jg/src/engines/html5.js";

const TEMPLATE_PATH = "template.yaml";
const ENTRIES_DIR = "entries";

// ── Date helpers ─────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z"); // noon UTC to avoid DST issues
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Loading ──────────────────────────────────────────────────

/** Load an entry YAML from disk. Returns null if not found. */
export function loadEntry(date: string): string | null {
  const path = `${ENTRIES_DIR}/${date}.yaml`;
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

/** Load the template with {{DATE}} resolved. */
export function loadTemplate(date: string): string {
  const raw = readFileSync(TEMPLATE_PATH, "utf-8");
  return raw.replace(/\{\{DATE\}\}/g, date);
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
  };
}

// ── Render ───────────────────────────────────────────────────

/** Render a diary entry in view mode. */
export function renderView(date: string): string {
  const yaml = loadEntry(date);
  if (!yaml) {
    return render404(date);
  }

  const spec = fromYaml(yaml);
  sanitizeSpec(spec);
  const result = compile(spec, navOptions(date));
  return result.html;
}

/** Render a diary entry in edit mode. Falls back to template if no entry exists. */
export function renderEdit(date: string): string {
  const entryYaml = loadEntry(date) ?? loadTemplate(date);

  // Find editable blocks from the template (always)
  const templateRaw = parseYaml(readFileSync(TEMPLATE_PATH, "utf-8")) as Record<string, unknown>;
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
