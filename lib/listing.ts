/**
 * Listing — build the landing page as a gutenberg-rendered page.
 *
 * Scans entries/ for saved diary cards, extracts light summaries,
 * and renders a page with cards for each entry + a CTA for today.
 */

import { readdirSync, readFileSync } from "fs";
import { parse as parseYaml } from "yaml";
import { fromYaml } from "../../gutenberg-jg/src/specs/page/yaml.js";
import { sanitizeSpec } from "../../gutenberg-jg/src/specs/page/sanitize.js";
import { compile } from "../../gutenberg-jg/src/compile.js";
import type { PageSpec } from "../../gutenberg-jg/src/specs/page/types.js";

const ENTRIES_DIR = "entries";

interface EntrySummary {
  date: string;
  emotions: string;
  skills: string;
}

/** Extract a light summary from a saved entry YAML. */
function summarizeEntry(yamlContent: string): { emotions: string; skills: string } {
  try {
    const raw = parseYaml(yamlContent) as Record<string, unknown>;
    const blocks = (raw.blocks ?? []) as Record<string, unknown>[];

    let emotions = "";
    let skillCount = 0;
    let skillTotal = 0;

    for (const block of blocks) {
      const table = block.table as Record<string, unknown> | undefined;
      if (!table) continue;

      const caption = table.caption as string | undefined;
      const rows = table.rows as string[][] | undefined;
      if (!rows) continue;

      // Emotions table — extract top ratings
      if (caption?.includes("emotion") || caption?.includes("0–10")) {
        const rated = rows
          .filter(r => r[1] && r[1] !== "0")
          .map(r => `${r[0]}: ${r[1]}`)
          .slice(0, 3);
        emotions = rated.length > 0 ? rated.join(" · ") : "All 0";
      }

      // Skills table
      if (caption?.includes("skill") || caption?.includes("Yes/No")) {
        for (const row of rows) {
          if (row[1]?.toLowerCase() === "yes") skillCount++;
          if (row[1]?.toLowerCase() === "yes" || row[1]?.toLowerCase() === "no") skillTotal++;
        }
      }
    }

    const skills = skillTotal > 0 ? `${skillCount}/${skillTotal} skills` : "";
    return { emotions, skills };
  } catch {
    return { emotions: "", skills: "" };
  }
}

/** Scan entries directory and return sorted summaries. */
function scanEntries(): EntrySummary[] {
  let files: string[];
  try {
    files = readdirSync(ENTRIES_DIR).filter(f => f.endsWith(".yaml")).sort().reverse();
  } catch {
    return [];
  }

  return files.map(f => {
    const date = f.replace(".yaml", "");
    const content = readFileSync(`${ENTRIES_DIR}/${f}`, "utf-8");
    const { emotions, skills } = summarizeEntry(content);
    return { date, emotions, skills };
  });
}

/** Build and render the landing page. */
export function renderLanding(): string {
  const entries = scanEntries();
  const today = new Date().toISOString().split("T")[0];

  // Build cards from entries
  const entryCards = entries.map(e => {
    const parts = [e.emotions, e.skills].filter(Boolean);
    const body = parts.length > 0 ? parts.join(" — ") : "No data recorded";
    return { title: e.date, body, link: `/diary/${e.date}` };
  });

  // CTA card for today (always first)
  const todayExists = entries.some(e => e.date === today);
  const todayCard = {
    title: `${todayExists ? "Continue" : "Start"} Today's Entry`,
    body: today,
    link: `/diary/${today}?mode=edit`,
  };

  // Build PageSpec
  const blocks: Record<string, unknown>[] = [];

  // Cards: today CTA + past entries
  blocks.push({
    cards: {
      items: [todayCard, ...entryCards],
    },
  });

  const specYaml = `
title: DBT Diary Cards
theme: mono
hero:
  title: DBT Diary Cards
  subtitle: Daily emotion and skill tracking
  body: Track target behaviors, emotions, urges, and DBT skills daily.
blocks: []
`;

  const spec = fromYaml(specYaml);
  spec.blocks = blocks as PageSpec["blocks"];
  sanitizeSpec(spec);
  return compile(spec).html;
}
