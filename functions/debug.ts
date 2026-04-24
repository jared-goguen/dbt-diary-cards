/**
 * CF Pages Function: /debug
 *
 * Diagnostic endpoint — dumps R2 state to JSON.
 * Shows what's in the bucket, whether the template exists,
 * and a preview of its content.
 */

import { createStorage } from "../lib/storage";

interface Env {
  DIARY_BUCKET: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const storage = createStorage({ bucket: context.env.DIARY_BUCKET });

  try {
    // List all keys in the bucket
    const allKeys = await storage.list("");
    const entryKeys = await storage.list("entries/");

    // Try to load the template
    let templateInfo: Record<string, unknown>;
    try {
      const template = await storage.get("template.yaml");
      templateInfo = {
        exists: !!template,
        length: template?.length ?? 0,
        preview: template?.slice(0, 500) ?? null,
        firstLine: template?.split("\n")[0] ?? null,
      };
    } catch (err) {
      templateInfo = {
        exists: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    // Try to load a sample entry (the first one found)
    let sampleEntryInfo: Record<string, unknown> = { found: false };
    if (entryKeys.length > 0) {
      try {
        const sampleKey = entryKeys[0];
        const content = await storage.get(sampleKey);
        sampleEntryInfo = {
          found: true,
          key: sampleKey,
          length: content?.length ?? 0,
          preview: content?.slice(0, 500) ?? null,
          firstLine: content?.split("\n")[0] ?? null,
        };
      } catch (err) {
        sampleEntryInfo = {
          found: true,
          key: entryKeys[0],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      bucket: {
        allKeys,
        entryCount: entryKeys.length,
        entryKeys,
      },
      template: templateInfo,
      sampleEntry: sampleEntryInfo,
      env: {
        hasBucket: !!context.env.DIARY_BUCKET,
        cfPages: (context.env as any).CF_PAGES ?? "unknown",
        cfBranch: (context.env as any).CF_PAGES_BRANCH ?? "unknown",
      },
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
