/**
 * Listing — build the landing page as a calendar view.
 *
 * Scans entries/ for saved diary cards and renders a monthly calendar
 * with filled/empty day indicators.
 */

import { readdirSync } from "fs";
import { fromYaml } from "../../gutenberg-jg/src/specs/page/yaml.js";
import { sanitizeSpec } from "../../gutenberg-jg/src/specs/page/sanitize.js";
import { compile } from "../../gutenberg-jg/src/compile.js";
import type { PageSpec } from "../../gutenberg-jg/src/specs/page/types.js";

const ENTRIES_DIR = "entries";

/** Scan entries/ and return all YYYY-MM-DD dates that have entries. */
function scanEntryDates(): string[] {
  try {
    return readdirSync(ENTRIES_DIR)
      .filter(f => f.endsWith(".yaml"))
      .map(f => f.replace(".yaml", ""))
      .sort();
  } catch {
    return [];
  }
}

/** Parse a YYYY-MM string into [year, month]. Defaults to current month. */
function parseMonth(monthStr?: string): [number, number] {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    if (y >= 2020 && y <= 2100 && m >= 1 && m <= 12) {
      return [y, m];
    }
  }
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1];
}

/**
 * Build and render the landing page with a calendar block.
 *
 * @param monthQuery  Optional YYYY-MM from ?month= query param
 */
export function renderLanding(monthQuery?: string): string {
  const entries = scanEntryDates();
  const today = new Date().toISOString().split("T")[0];
  const [year, month] = parseMonth(monthQuery);

  // Build the PageSpec with a calendar block
  const specYaml = `
title: DBT Diary Cards
theme: mono
hero:
  title: DBT Diary Cards
  subtitle: Daily emotion and skill tracking
  body: Track target behaviors, emotions, urges, and DBT skills.
blocks: []
`;

  const spec = fromYaml(specYaml);
  spec.blocks = [
    {
      calendar: {
        year,
        month,
        entries,
        today,
        linkPattern: "/diary/{date}",
        monthPattern: "/?month={month}",
      },
    },
  ] as PageSpec["blocks"];

  sanitizeSpec(spec);
  return compile(spec).html;
}
