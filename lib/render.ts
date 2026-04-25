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
    deleteLink: `/diary/${date}`,
  };
}

// ── Render ───────────────────────────────────────────────────

/** Render a diary entry in view mode. */
export async function renderView(date: string, storage: Storage): Promise<string> {
  const yaml = await loadEntry(date, storage);
  console.log(`[render] view ${date}: entry=${yaml ? yaml.length + "b" : "null"}`);

  if (!yaml) {
    return render404(date);
  }

  // Defensive: check if YAML is empty or whitespace-only
  if (!yaml.trim()) {
    console.warn(`[render] view ${date}: entry exists but is empty, showing 404`);
    return render404(date);
  }

  const spec = fromYaml(yaml);
  console.log(`[render] view ${date}: parsed spec — title="${spec.title ?? "?"}" blocks=${spec.blocks?.length ?? 0} hero=${!!spec.hero}`);

  // Defensive: if spec has no content, show 404 instead of blank page
  if (!spec.blocks?.length && !spec.hero) {
    console.warn(`[render] view ${date}: spec has no blocks and no hero, showing 404`);
    return render404(date);
  }

  sanitizeSpec(spec);
  const result = compile(spec, navOptions(date));
  return result.html;
}

/** Render a diary entry in edit mode. Falls back to template if no entry exists. */
export async function renderEdit(date: string, storage: Storage): Promise<string> {
  const entry = await loadEntry(date, storage);
  console.log(`[render] edit ${date}: entry=${entry ? entry.length + "b" : "null"}`);

  let entryYaml: string;
  if (entry && entry.trim()) {
    entryYaml = entry;
    console.log(`[render] edit ${date}: using saved entry`);
  } else {
    entryYaml = await loadTemplate(date, storage);
    console.log(`[render] edit ${date}: using template (${entryYaml.length}b)`);
  }

  const templateRaw = await loadTemplateRaw(storage);
  const editableBlocks = findEditableBlocks(templateRaw);
  console.log(`[render] edit ${date}: editable blocks=${[...editableBlocks].join(",")}`);

  const spec = fromYaml(entryYaml);
  console.log(`[render] edit ${date}: parsed spec — title="${spec.title ?? "?"}" blocks=${spec.blocks?.length ?? 0} hero=${!!spec.hero}`);

  sanitizeSpec(spec);
  const result = compileEdit(spec, editableBlocks, navOptions(date));
  console.log(`[render] edit ${date}: HTML=${result.html.length}b`);
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
