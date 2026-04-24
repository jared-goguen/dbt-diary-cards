/**
 * Storage abstraction — same interface for local filesystem and R2.
 *
 * Every lib module takes a Storage instance as a parameter instead of
 * reaching for `fs` directly. This lets the same code run in:
 *   - Local dev (FileStorage backed by the filesystem)
 *   - Cloudflare Pages (R2Storage backed by an R2 bucket)
 */

// ── Interface ────────────────────────────────────────────────

export interface Storage {
  /** Get a value by key. Returns null if not found. */
  get(key: string): Promise<string | null>;
  /** Put a value by key. Creates parent directories if needed. */
  put(key: string, value: string): Promise<void>;
  /** List all keys with the given prefix. Returns full keys sorted. */
  list(prefix: string): Promise<string[]>;
}

// ── FileStorage (local dev) ──────────────────────────────────

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

export class FileStorage implements Storage {
  constructor(private baseDir: string) {}

  async get(key: string): Promise<string | null> {
    const path = join(this.baseDir, key);
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf-8");
  }

  async put(key: string, value: string): Promise<void> {
    const path = join(this.baseDir, key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, value);
  }

  async list(prefix: string): Promise<string[]> {
    const dir = join(this.baseDir, prefix);
    try {
      return readdirSync(dir)
        .filter(f => f.endsWith(".yaml"))
        .map(f => `${prefix}${f}`)
        .sort();
    } catch {
      return [];
    }
  }
}

// ── R2Storage (Cloudflare Pages) ─────────────────────────────
// Uses the R2Bucket binding from the Workers runtime.
// Type-only import — R2Bucket is a global in the Workers environment.

export class R2Storage implements Storage {
  private bucket: any; // R2Bucket — typed as any to avoid needing @cloudflare/workers-types at build time

  constructor(bucket: any) {
    this.bucket = bucket;
  }

  async get(key: string): Promise<string | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return await obj.text();
  }

  async put(key: string, value: string): Promise<void> {
    await this.bucket.put(key, value, {
      httpMetadata: { contentType: "text/yaml" },
    });
  }

  async list(prefix: string): Promise<string[]> {
    const listed = await this.bucket.list({ prefix });
    return listed.objects
      .map((o: any) => o.key as string)
      .sort();
  }
}
