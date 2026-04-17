/**
 * Auto-embed script: Transform normalized diary YAML → Gutenberg semantic spec
 *
 * Usage:
 *   npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-17.yaml
 *
 * Input:  data/diary-2026-04-17.yaml (normalized entry)
 * Output: specs/diary-spec-2026-04-17.yaml (complete semantic spec with embedded data)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, basename } from "path";

interface DiaryEntry {
  entry: {
    date: string;
    therapist_id: string;
    [key: string]: any;
  };
}

interface SemanticSpec {
  page: {
    meta: {
      title: string;
      description: string;
      author: string;
    };
    layout: {
      type: string;
      theme: string;
    };
    sections: Array<{
      type: string;
      variant?: string;
      logo?: string;
      links?: Array<{ text: string; href: string }>;
      data?: any;
      copyright?: string;
    }>;
  };
}

/**
 * Generate Gutenberg semantic spec from normalized diary YAML
 */
function generateDiarySpec(normalizedData: DiaryEntry): SemanticSpec {
  const { date } = normalizedData.entry;

  const spec: SemanticSpec = {
    page: {
      meta: {
        title: `Diary Card — ${formatDateDisplay(date)}`,
        description: `Daily DBT diary entry for ${date}`,
        author: normalizedData.entry.therapist_id,
      },
      layout: {
        type: "standard",
        theme: "ink",
      },
      sections: [
        {
          type: "navigation",
          variant: "default",
          logo: "DBT Diary",
          links: [
            { text: "Home", href: "/" },
            { text: "Archive", href: "/archive" },
          ],
        },
        {
          type: "diary-daily-view",
          variant: "grid",
          data: normalizedData.entry, // Embed entire normalized entry
        },
        {
          type: "footer",
          variant: "simple",
          copyright: "© 2026 DBT Support",
        },
      ],
    },
  };

  return spec;
}

/**
 * Format a date string for display
 * Example: "2026-04-17" -> "Thursday, April 17, 2026"
 */
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00Z");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Convert spec object to YAML string
 * Simple YAML serializer (doesn't require external library)
 */
function specToYaml(spec: SemanticSpec, indent = 0): string {
  const lines: string[] = [];
  const baseIndent = " ".repeat(indent);

  function addLine(content: string, level = 0) {
    lines.push(" ".repeat(level * 2) + content);
  }

  function serializeObject(obj: any, level = 0): string[] {
    const result: string[] = [];
    const objIndent = " ".repeat(level * 2);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === "object" && !Array.isArray(value)) {
        result.push(`${objIndent}${key}:`);
        result.push(...serializeObject(value, level + 1));
      } else if (Array.isArray(value)) {
        result.push(`${objIndent}${key}:`);
        for (const item of value) {
          if (typeof item === "object") {
            result.push(`${objIndent}  -`);
            for (const [k, v] of Object.entries(item)) {
              if (typeof v === "object") {
                result.push(`${objIndent}    ${k}:`);
                result.push(...serializeObject(v, level + 2));
              } else {
                const quotedValue =
                  typeof v === "string" && (v.includes(":") || v.includes("#"))
                    ? `"${v}"`
                    : v;
                result.push(`${objIndent}    ${k}: ${quotedValue}`);
              }
            }
          } else {
            result.push(`${objIndent}  - ${item}`);
          }
        }
      } else {
        const quotedValue =
          typeof value === "string" && (value.includes(":") || value.includes("#"))
            ? `"${value}"`
            : value;
        result.push(`${objIndent}${key}: ${quotedValue}`);
      }
    }

    return result;
  }

  return serializeObject(spec).join("\n");
}

/**
 * Main CLI handler
 */
function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: npx ts-node scripts/generate-diary-spec.ts <path-to-normalized-yaml>");
    console.error("Example: npx ts-node scripts/generate-diary-spec.ts data/diary-2026-04-17.yaml");
    process.exit(1);
  }

  const fullInputPath = resolve(inputPath);

  if (!existsSync(fullInputPath)) {
    console.error(`Error: File not found: ${fullInputPath}`);
    process.exit(1);
  }

  try {
    // Read and parse normalized YAML
    const yamlContent = readFileSync(fullInputPath, "utf-8");
    
    // Simple YAML parser (handle basic structure)
    const normalized = parseSimpleYaml(yamlContent);

    // Generate spec
    const spec = generateDiarySpec(normalized);

    // Determine output path
    const filename = basename(fullInputPath, ".yaml");
    const outputPath = fullInputPath.replace(/^data\//, "specs/").replace(/\.yaml$/, "-spec.yaml");

    // Write spec to file
    const yamlOutput = specToYaml(spec);
    writeFileSync(outputPath, yamlOutput);

    console.log(`✓ Generated semantic spec`);
    console.log(`  Input:  ${fullInputPath}`);
    console.log(`  Output: ${outputPath}`);
  } catch (error) {
    console.error("Error generating spec:", error);
    process.exit(1);
  }
}

/**
 * Simplified YAML parser for diary entries
 * Handles nested objects and arrays
 */
function parseSimpleYaml(content: string): DiaryEntry {
  const lines = content.split("\n");
  const result: any = { entry: {} };
  const stack: any[] = [result.entry];

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const match = line.match(/^(\s*)([^:]+):\s*(.*?)$/);
    if (!match) continue;

    const [, indent, key, value] = match;
    const level = Math.floor(indent.length / 2);

    // Trim key and value
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    // Navigate to correct level
    while (stack.length > level + 1) {
      stack.pop();
    }

    const currentObj = stack[stack.length - 1];

    // Parse value
    if (trimmedValue === "") {
      // Create new nested object
      const newObj: any = {};
      currentObj[trimmedKey] = newObj;
      stack.push(newObj);
    } else if (trimmedValue === "true") {
      currentObj[trimmedKey] = true;
    } else if (trimmedValue === "false") {
      currentObj[trimmedKey] = false;
    } else if (!isNaN(Number(trimmedValue)) && trimmedValue !== "") {
      currentObj[trimmedKey] = Number(trimmedValue);
    } else {
      currentObj[trimmedKey] = trimmedValue.replace(/^["']|["']$/g, "");
    }
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateDiarySpec, formatDateDisplay };
