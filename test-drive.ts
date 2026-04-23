#!/usr/bin/env bun
/**
 * Test drive: render a diary card in view + edit mode.
 * Uses the local gutenberg-jg engine directly.
 *
 * Run: bun test-drive.ts [date]
 * Opens: diary-view.html and diary-edit.html in browser
 */

import { readFileSync, writeFileSync } from "fs";
import { parse as parseYaml } from "yaml";

// Import from local gutenberg-jg (port-engine branch)
import { fromYaml } from "../gutenberg-jg/src/specs/page/yaml.js";
import { sanitizeSpec } from "../gutenberg-jg/src/specs/page/sanitize.js";
import { compile } from "../gutenberg-jg/src/compile.js";
import { compileEdit, findEditableBlocks } from "../gutenberg-jg/src/pipeline/editify.js";

// ── Load and prepare template ────────────────────────────────

const date = process.argv[2] ?? new Date().toISOString().split("T")[0];
const templateYaml = readFileSync("template.yaml", "utf-8");

// Replace {{DATE}} placeholders
const resolvedYaml = templateYaml.replace(/\{\{DATE\}\}/g, date);

// Parse the raw template to find editable blocks
const templateRaw = parseYaml(templateYaml) as Record<string, unknown>;
const editableBlocks = findEditableBlocks(templateRaw);

// Parse into PageSpec
const spec = fromYaml(resolvedYaml);
sanitizeSpec(spec);

// ── Render view mode ─────────────────────────────────────────

const view = compile(spec);
writeFileSync("diary-view.html", view.html);
console.log(`✓ diary-view.html  (${(view.html.length / 1024).toFixed(1)} KB)`);

// ── Render edit mode ─────────────────────────────────────────

const edit = compileEdit(spec, editableBlocks);
writeFileSync("diary-edit.html", edit.html);
console.log(`✓ diary-edit.html  (${(edit.html.length / 1024).toFixed(1)} KB)`);

console.log(`\nDiary card for: ${date}`);
console.log(`Editable blocks: ${[...editableBlocks].join(", ")} (of ${spec.blocks.length} total)`);
