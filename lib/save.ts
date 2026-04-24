/**
 * Save — reconstruct YAML from edit-mode form data.
 *
 * The edit mode HTML renders form inputs with field names:
 *   - table cells:   section_{specIdx}__r{row}_c{col}
 *   - prose text:    section_{specIdx}__text
 *   - tracker items: section_{specIdx}__item_{j}
 *   - hero title:    section_hero__title
 *   - hero subtitle: section_hero__subtitle
 *
 * All I/O goes through the Storage interface.
 */

import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { findEditableBlocks } from "@jared-goguen/gutenberg/pipeline/editify";
import { fromYaml } from "@jared-goguen/gutenberg/specs/page/yaml";
import type { Storage } from "./storage.js";

const TEMPLATE_KEY = "template.yaml";

/**
 * Convert URL-encoded form body to a Map of field name → value.
 */
export function parseFormBody(body: string): Map<string, string> {
  const fields = new Map<string, string>();
  for (const pair of body.split("&")) {
    const [rawKey, rawVal] = pair.split("=");
    if (rawKey) {
      fields.set(decodeURIComponent(rawKey), decodeURIComponent(rawVal ?? "").replace(/\+/g, " "));
    }
  }
  return fields;
}

/**
 * Build a saved entry YAML from form data + template.
 *
 * @param fields   Form field map (from parseFormBody)
 * @param date     The diary date (replaces {{DATE}})
 * @param storage  Storage backend for loading the template
 * @returns        Valid YAML string ready to write to entries/{date}.yaml
 */
export async function formDataToYaml(
  fields: Map<string, string>,
  date: string,
  storage: Storage,
): Promise<string> {
  // Load and clone template
  const templateYaml = await storage.get(TEMPLATE_KEY);
  if (!templateYaml) throw new Error("Template not found: " + TEMPLATE_KEY);

  const template = parseYaml(templateYaml) as Record<string, unknown>;
  const spec = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;

  // Replace {{DATE}} in title
  if (typeof spec.title === "string") {
    spec.title = spec.title.replace(/\{\{DATE\}\}/g, date);
  }

  // Replace {{DATE}} in hero
  const hero = spec.hero as Record<string, unknown> | undefined;
  if (hero) {
    if (typeof hero.title === "string") hero.title = hero.title.replace(/\{\{DATE\}\}/g, date);
    if (typeof hero.subtitle === "string") hero.subtitle = hero.subtitle.replace(/\{\{DATE\}\}/g, date);
    if (typeof hero.body === "string") hero.body = hero.body.replace(/\{\{DATE\}\}/g, date);

    // Apply hero edits from form
    const heroTitle = fields.get("section_hero__title");
    if (heroTitle !== undefined) hero.title = heroTitle;
    const heroSubtitle = fields.get("section_hero__subtitle");
    if (heroSubtitle !== undefined) hero.subtitle = heroSubtitle;
  }

  // Find editable block indices
  const editableBlocks = findEditableBlocks(template);
  const blocks = spec.blocks as Record<string, unknown>[] | undefined;
  if (!blocks) return stringifyYaml(spec, { lineWidth: 0 });

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!editableBlocks.has(i)) continue;

    // Determine block type (the non-underscore key)
    const typeKey = Object.keys(block).find(k => !k.startsWith("_"));
    if (!typeKey) continue;

    const value = block[typeKey] as Record<string, unknown>;
    if (!value || typeof value !== "object") continue;

    // Strip _editable from saved entries
    delete value._editable;

    switch (typeKey) {
      case "table": {
        const rows = value.rows as string[][] | undefined;
        if (!rows) break;
        for (let r = 0; r < rows.length; r++) {
          for (let c = 0; c < rows[r].length; c++) {
            const fieldName = `section_${i}__r${r}_c${c}`;
            const val = fields.get(fieldName);
            if (val !== undefined) {
              rows[r][c] = val;
            }
          }
        }
        break;
      }

      case "prose": {
        const text = fields.get(`section_${i}__text`);
        if (text !== undefined) {
          value.text = text;
        }
        break;
      }

      case "tracker": {
        const items = value.items as { value: string }[] | undefined;
        if (!items) break;
        for (let j = 0; j < items.length; j++) {
          const val = fields.get(`section_${i}__item_${j}`);
          if (val !== undefined) {
            items[j].value = val;
          }
        }
        break;
      }
    }
  }

  const yaml = stringifyYaml(spec, { lineWidth: 0 });

  // Validate round-trip: the saved YAML must parse cleanly
  fromYaml(yaml);

  return yaml;
}
