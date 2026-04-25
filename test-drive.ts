#!/usr/bin/env bun
import { fromYaml } from "@jared-goguen/gutenberg/specs/page/yaml";
import { sanitizeSpec } from "@jared-goguen/gutenberg/specs/page/sanitize";
import { compile } from "@jared-goguen/gutenberg/compile";
import { compileEdit, findEditableBlocks } from "@jared-goguen/gutenberg/pipeline/editify";
import { readFileSync, writeFileSync } from "fs";
import { parse as parseYaml } from "yaml";

const templateYaml = readFileSync("template.yaml", "utf-8");
const date = "2026-04-24";
const resolved = templateYaml.replace(/\{\{DATE\}\}/g, date);

// View with some filled-in values
const filledYaml = resolved
  .replace(/Self, value: "3"/, 'Self, value: "4"')
  .replace(/Depression, value: "3"/, 'Depression, value: "5"')
  .replace(/Anxiety, value: "3"/, 'Anxiety, value: "4"')
  .replace(/Joy, value: "3"/, 'Joy, value: "5"')
  .replace(/Ideation, value: "3"/, 'Ideation, value: "1"')
  .replace(/Participation, value: "3"/, 'Participation, value: "4"');

const viewSpec = fromYaml(filledYaml);
sanitizeSpec(viewSpec);
writeFileSync("test-view.html", compile(viewSpec).html);
console.log("✓ test-view.html (filled values)");

// Edit mode from template
const editSpec = fromYaml(resolved);
sanitizeSpec(editSpec);
const templateRaw = parseYaml(templateYaml) as Record<string, unknown>;
const editableBlocks = findEditableBlocks(templateRaw);
writeFileSync("test-edit.html", compileEdit(editSpec, editableBlocks).html);
console.log("✓ test-edit.html (edit mode)");
