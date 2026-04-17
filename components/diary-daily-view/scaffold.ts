/**
 * Scaffold builder for diary-daily-view component (Grid variant)
 *
 * Builds RenderNode tree (HTML structure, no CSS)
 * Each node has:
 * - role: semantic role for CSS class resolution in ENRICH stage
 * - layout: layout hints (variant, columns, etc.)
 * - semantic: semantic axes (vibe, intent, narrative, cohesion)
 * - children: child nodes or text content
 */

import { DiaryEntryData, Emotions, Skills, Functioning, Therapy, Health } from "./types";
import { humanizeKey, formatDateDisplay } from "./data";

/**
 * Simplified RenderNode interface
 * In real Gutenberg integration, this would use the full type
 */
interface RenderNode {
  tag: string;
  role?: string;
  layout?: Record<string, any>;
  semantic?: Record<string, any>;
  attrs?: Record<string, string>;
  children: (RenderNode | string)[];
}

/**
 * Grid variant scaffold builder
 * Creates traditional table-based layout with sections
 */
export function scaffoldDailyGrid(data: DiaryEntryData): RenderNode {
  return createNode("section", {
    role: "diary-section",
    layout: { variant: "grid" },
    semantic: {
      vibe: "steady",
      intent: "inform",
      narrative: "rising",
      cohesion: "opens",
    },
    children: [
      // Header with date
      createNode("header", {
        role: "diary-header",
        children: [
          createNode("h1", {
            role: "diary-date",
            children: [formatDateDisplay(data.date)],
          }),
        ],
      }),

      // Target Behaviors Section
      createNode("section", {
        role: "diary-behaviors-section",
        children: [
          createNode("h2", {
            role: "diary-section-title",
            children: ["Target Behaviors"],
          }),
          createBehaviorsTable(data.targetBehaviors),
        ],
      }),

      // Emotions Section
      createNode("section", {
        role: "diary-emotions-section",
        children: [
          createNode("h2", {
            role: "diary-section-title",
            children: ["Emotional States"],
          }),
          createEmotionsTable(data.emotions),
        ],
      }),

      // Skills Section (if present)
      ...(data.skills && Object.values(data.skills).some((v) => v === true)
        ? [
            createNode("section", {
              role: "diary-skills-section",
              children: [
                createNode("h2", {
                  role: "diary-section-title",
                  children: ["Skills Used"],
                }),
                createSkillsList(data.skills),
              ],
            }),
          ]
        : []),

      // Functioning Section (if present)
      ...(data.functioning
        ? [
            createNode("section", {
              role: "diary-functioning-section",
              children: [
                createNode("h2", {
                  role: "diary-section-title",
                  children: ["Daily Functioning"],
                }),
                createFunctioningTable(data.functioning),
              ],
            }),
          ]
        : []),

      // Therapy Section (if present)
      ...(data.therapy
        ? [
            createNode("section", {
              role: "diary-therapy-section",
              children: [
                createNode("h2", {
                  role: "diary-section-title",
                  children: ["Therapy Engagement"],
                }),
                createTherapySection(data.therapy),
              ],
            }),
          ]
        : []),

      // Health Section (if present)
      ...(data.health
        ? [
            createNode("section", {
              role: "diary-health-section",
              children: [
                createNode("h2", {
                  role: "diary-section-title",
                  children: ["Health & Safety"],
                }),
                createHealthTable(data.health),
              ],
            }),
          ]
        : []),

      // Notes Section (if present)
      ...(data.notes && Object.keys(data.notes).length > 0
        ? [
            createNode("section", {
              role: "diary-notes-section",
              children: [
                createNode("h2", {
                  role: "diary-section-title",
                  children: ["Notes"],
                }),
                createNotesList(data.notes),
              ],
            }),
          ]
        : []),

      // Warnings Section (if any)
      ...(data.warnings.length > 0
        ? [
            createNode("section", {
              role: "diary-warnings-section",
              layout: { variant: "alert" },
              semantic: { vibe: "vibrant", intent: "direct" },
              children: [
                createNode("h2", {
                  role: "diary-section-title",
                  children: ["Alerts"],
                }),
                createWarningsList(data.warnings),
              ],
            }),
          ]
        : []),
    ],
  });
}

// ============ TABLE BUILDERS ============

function createBehaviorsTable(
  behaviors: Record<string, number | undefined>
): RenderNode {
  const rows = [];

  // Always show required fields
  if (behaviors.suicidal_urges !== undefined) {
    rows.push(
      createTableRow(
        "Suicidal Urges",
        behaviors.suicidal_urges,
        "suicidal_urges"
      )
    );
  }
  if (behaviors.suicidal_attempts !== undefined) {
    rows.push(
      createTableRow(
        "Suicidal Attempts",
        behaviors.suicidal_attempts,
        "suicidal_attempts"
      )
    );
  }
  if (behaviors.self_harm_urges !== undefined) {
    rows.push(
      createTableRow("Self-Harm Urges", behaviors.self_harm_urges, "self_harm_urges")
    );
  }
  if (behaviors.self_harm_acts !== undefined) {
    rows.push(
      createTableRow("Self-Harm Acts", behaviors.self_harm_acts, "self_harm_acts")
    );
  }
  if (behaviors.substance_use !== undefined) {
    rows.push(
      createTableRow("Substance Use", behaviors.substance_use, "substance_use")
    );
  }

  return createNode("table", {
    role: "diary-table",
    layout: { type: "behaviors" },
    children: [
      createNode("tbody", {
        children: rows,
      }),
    ],
  });
}

function createEmotionsTable(emotions: Emotions): RenderNode {
  const rows = Object.entries(emotions).map(([emotion, value]) =>
    createTableRow(humanizeKey(emotion), value, `emotion_${emotion}`)
  );

  return createNode("table", {
    role: "diary-table",
    layout: { type: "emotions" },
    children: [
      createNode("tbody", {
        children: rows,
      }),
    ],
  });
}

function createFunctioningTable(functioning: Partial<Functioning>): RenderNode {
  const rows = [];

  if (functioning.sleep_hours !== undefined) {
    rows.push(
      createNode("tr", {
        role: "diary-table-row",
        children: [
          createNode("td", {
            role: "diary-label",
            children: ["Sleep Hours"],
          }),
          createNode("td", {
            role: "diary-value",
            children: [`${functioning.sleep_hours} hours`],
          }),
        ],
      })
    );
  }

  if (functioning.sleep_quality !== undefined) {
    rows.push(
      createTableRow("Sleep Quality", functioning.sleep_quality, "sleep_quality")
    );
  }

  if (functioning.medication_compliance !== undefined) {
    rows.push(
      createNode("tr", {
        role: "diary-table-row",
        children: [
          createNode("td", {
            role: "diary-label",
            children: ["Medication"],
          }),
          createNode("td", {
            role: "diary-value",
            children: [functioning.medication_compliance ? "✓ Compliant" : "✗ Not taken"],
          }),
        ],
      })
    );
  }

  if (functioning.work_school !== undefined) {
    rows.push(
      createTableRow("Work/School", functioning.work_school, "work_school")
    );
  }

  if (functioning.social_contact !== undefined) {
    rows.push(
      createTableRow("Social Contact", functioning.social_contact, "social_contact")
    );
  }

  if (functioning.exercise_minutes !== undefined) {
    rows.push(
      createNode("tr", {
        role: "diary-table-row",
        children: [
          createNode("td", {
            role: "diary-label",
            children: ["Exercise"],
          }),
          createNode("td", {
            role: "diary-value",
            children: [`${functioning.exercise_minutes} minutes`],
          }),
        ],
      })
    );
  }

  return createNode("table", {
    role: "diary-table",
    layout: { type: "functioning" },
    children: [
      createNode("tbody", {
        children: rows,
      }),
    ],
  });
}

function createHealthTable(health: Partial<Health>): RenderNode {
  const rows = [];

  if (health.eating_disorder_behaviors !== undefined) {
    rows.push(
      createTableRow(
        "Eating Disorder Behaviors",
        health.eating_disorder_behaviors,
        "eating_disorder_behaviors"
      )
    );
  }

  if (health.pain_level !== undefined) {
    rows.push(createTableRow("Pain Level", health.pain_level, "pain_level"));
  }

  return createNode("table", {
    role: "diary-table",
    layout: { type: "health" },
    children: [
      createNode("tbody", {
        children: rows,
      }),
    ],
  });
}

// ============ LIST BUILDERS ============

function createSkillsList(skills: Skills): RenderNode {
  const usedSkills = Object.entries(skills)
    .filter(([_, used]) => used === true)
    .map(([skill]) => skill);

  return createNode("ul", {
    role: "diary-skills-list",
    children: usedSkills.map((skill) =>
      createNode("li", {
        role: "diary-skill-item",
        children: [`✓ ${humanizeKey(skill)}`],
      })
    ),
  });
}

function createTherapySection(therapy: Partial<Therapy>): RenderNode {
  const items = [];

  if (therapy.individual_session !== undefined) {
    items.push(
      createNode("div", {
        role: "diary-therapy-item",
        children: [
          `Individual Session: ${therapy.individual_session ? "✓ Attended" : "✗ Missed"}`,
        ],
      })
    );
  }

  if (therapy.group_skills !== undefined) {
    items.push(
      createNode("div", {
        role: "diary-therapy-item",
        children: [
          `Skills Group: ${therapy.group_skills ? "✓ Attended" : "✗ Missed"}`,
        ],
      })
    );
  }

  if (therapy.coaching_calls !== undefined) {
    items.push(
      createNode("div", {
        role: "diary-therapy-item",
        children: [`Coaching Calls: ${therapy.coaching_calls}`],
      })
    );
  }

  if (therapy.homework_completion !== undefined) {
    items.push(
      createTableRow("Homework Completion", therapy.homework_completion, "homework_completion")
    );
  }

  if (therapy.homework_notes) {
    items.push(
      createNode("div", {
        role: "diary-therapy-notes",
        children: [`Homework: ${therapy.homework_notes}`],
      })
    );
  }

  return createNode("div", {
    role: "diary-therapy-content",
    children: items,
  });
}

function createNotesList(notes: Record<string, string | undefined>): RenderNode {
  const items = [];

  for (const [key, value] of Object.entries(notes)) {
    if (value) {
      items.push(
        createNode("div", {
          role: "diary-note-item",
          children: [
            createNode("div", {
              role: "diary-note-label",
              children: [humanizeKey(key)],
            }),
            createNode("div", {
              role: "diary-note-content",
              children: [value],
            }),
          ],
        })
      );
    }
  }

  return createNode("div", {
    role: "diary-notes-list",
    children: items,
  });
}

function createWarningsList(warnings: Array<{ message: string }>): RenderNode {
  return createNode("ul", {
    role: "diary-warnings-list",
    children: warnings.map((w) =>
      createNode("li", {
        role: "diary-warning-item",
        children: [w.message],
      })
    ),
  });
}

// ============ HELPER FUNCTIONS ============

function createTableRow(
  label: string,
  value: number,
  fieldId: string
): RenderNode {
  const percentage = (value / 10) * 100;

  return createNode("tr", {
    role: "diary-table-row",
    attrs: { "data-field": fieldId },
    children: [
      createNode("td", {
        role: "diary-label",
        children: [label],
      }),
      createNode("td", {
        role: "diary-value",
        layout: { progressBar: { value, max: 10, percentage } },
        attrs: { "data-progress": percentage.toString() },
        children: [`${value}/10`],
      }),
    ],
  });
}

function createNode(
  tag: string,
  options: {
    role?: string;
    layout?: Record<string, any>;
    semantic?: Record<string, any>;
    attrs?: Record<string, string>;
    children?: (RenderNode | string)[];
  } = {}
): RenderNode {
  return {
    tag,
    role: options.role,
    layout: options.layout,
    semantic: options.semantic,
    attrs: options.attrs,
    children: options.children || [],
  };
}
