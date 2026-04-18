/**
 * Index Page Handler
 * 
 * Serves the diary archive page listing all entries
 */

import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DIARY_BUCKET: R2Bucket;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // Try to serve pre-built index
    const indexObj = await env.DIARY_BUCKET.get('index.html');

    if (indexObj) {
      return new Response(await indexObj.text(), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // No index yet - show placeholder
    return new Response(getPlaceholderHTML(), {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(getErrorHTML(errorMsg), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
};

/**
 * Generate placeholder HTML for empty index
 */
function getPlaceholderHTML(): string {
  const today = new Date().toISOString().split('T')[0];
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diary Archive</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', system-ui, sans-serif;
      max-width: 600px;
      margin: 4rem auto;
      padding: 2rem;
      background: #0a0a0a;
      color: #e0e0e0;
    }
    h1 { color: white; }
    p { line-height: 1.6; margin: 1rem 0; }
    a {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #e63946;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      transition: background 0.2s;
    }
    a:hover {
      background: #d62828;
    }
  </style>
</head>
<body>
  <h1>Diary Archive</h1>
  <p>Welcome! No entries yet. Create your first diary entry today.</p>
  <a href="/diary/${today}?mode=edit">Create Today's Entry</a>
</body>
</html>`;
}

/**
 * Generate error HTML page
 */
function getErrorHTML(errorMsg: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', system-ui, sans-serif;
      max-width: 600px;
      margin: 4rem auto;
      padding: 2rem;
      background: #0a0a0a;
      color: #e0e0e0;
    }
    h1 { color: #e63946; }
    p { line-height: 1.6; margin: 1rem 0; }
    code { background: rgba(255,255,255,0.1); padding: 0.25rem 0.5rem; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>Error</h1>
  <p><code>${escapeHTML(errorMsg)}</code></p>
</body>
</html>`;
}

/**
 * Escape HTML entities
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
