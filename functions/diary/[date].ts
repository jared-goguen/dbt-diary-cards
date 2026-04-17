/**
 * Diary Handler — GET/POST for viewing, editing, and saving diary entries
 * 
 * GET /?mode=view (default) — Render existing entry or 404 if not found
 * GET /?mode=edit — Open entry in edit mode (create new if doesn't exist)
 * POST /?mode=save — Save form data and redirect to view
 */

import { lint, scaffold, enrich, style } from '../../../../gutenberg/src/pipeline/index.js';
import type { PageSchema } from '../../../../gutenberg/src/types.js';
import YAML from 'yaml';

interface Env {
  DIARY_BUCKET: R2Bucket;
}

interface RequestContext {
  request: Request;
  env: Env;
  params: { date: string };
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
}

/**
 * Main handler for diary requests
 */
export async function onRequest(context: RequestContext) {
  const { request, env, params } = context;
  const date = params.date;

  // Validate date format
  if (!isValidDate(date)) {
    return new Response('Invalid date format. Use YYYY-MM-DD', { status: 400 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode');

  // POST = save
  if (request.method === 'POST') {
    return handleSave(request, env, date);
  }

  // GET = render (view or edit)
  const renderMode: 'view' | 'edit' = mode === 'edit' ? 'edit' : 'view';
  return handleRender(env, date, renderMode);
}

/**
 * Handle GET requests - render entry in view or edit mode
 */
async function handleRender(env: Env, date: string, mode: 'view' | 'edit'): Promise<Response> {
  try {
    // Try to load existing entry
    const existing = await env.DIARY_BUCKET.get(`entries/${date}.yaml`);

    let yamlContent: string;

    if (existing) {
      // Load existing entry
      yamlContent = await existing.text();
    } else if (mode === 'edit') {
      // New entry in edit mode: use template
      const templateObj = await env.DIARY_BUCKET.get('template.yaml');
      if (!templateObj) {
        return new Response('Template not found', { status: 500 });
      }
      let template = await templateObj.text();
      // Replace {{DATE}} placeholders
      template = template.replace(/{{DATE}}/g, date);
      yamlContent = template;
    } else {
      // New entry in view mode: show 404 with create button
      return new Response(get404HTML(date), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Run Gutenberg pipeline
    const { schema, result } = lint(yamlContent);

    if (!result.valid) {
      return new Response(
        `Validation error: ${JSON.stringify(result.errors, null, 2)}`,
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const renderNodes = scaffold(schema, mode);
    const annotatedNodes = enrich(renderNodes);
    const html = style(annotatedNodes, schema.page.meta, { mode });

    // Cache rendered HTML in view mode
    if (mode === 'view' && existing) {
      await env.DIARY_BUCKET.put(`rendered/${date}.html`, html, {
        httpMetadata: { contentType: 'text/html' },
        customMetadata: { updated: new Date().toISOString() },
      });
    }

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorHtml = getErrorHTML(errorMsg);
    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Handle POST requests - save form data
 */
async function handleSave(request: Request, env: Env, date: string): Promise<Response> {
  try {
    const formData = await request.formData();

    // Load template to reconstruct YAML structure
    const templateObj = await env.DIARY_BUCKET.get('template.yaml');
    if (!templateObj) {
      return new Response('Template not found', { status: 500 });
    }
    const templateYAML = await templateObj.text();
    const template = YAML.parse(templateYAML) as PageSchema;

    // Convert form data to YAML
    const newYAML = formDataToYAML(formData, template, date);

    // Save to R2
    await env.DIARY_BUCKET.put(`entries/${date}.yaml`, newYAML, {
      httpMetadata: { contentType: 'text/yaml' },
      customMetadata: { updated: new Date().toISOString() },
    });

    // Rebuild index page
    await rebuildIndex(env);

    // Redirect to view mode
    return new Response(null, {
      status: 303,
      headers: { Location: `/diary/${date}` },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorHtml = getErrorHTML(errorMsg);
    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Convert form data back to YAML structure
 */
function formDataToYAML(formData: FormData, template: PageSchema, date: string): string {
  const spec = JSON.parse(JSON.stringify(template));

  // Replace {{DATE}} placeholders in meta
  if (spec.page.meta?.title) {
    spec.page.meta.title = spec.page.meta.title.replace(/{{DATE}}/g, date);
  }
  if (spec.page.meta?.description) {
    spec.page.meta.description = spec.page.meta.description.replace(/{{DATE}}/g, date);
  }

  // Update sections from form data
  for (const section of spec.page.sections) {
    if (section.type === 'hero' && section._editable) {
      const heading = formData.get('hero__heading');
      if (heading) {
        section.content.heading = heading.toString();
      }
      delete section._editable;
    } else if (section.type === 'table' && section._editable) {
      for (const cell of section.cells) {
        const fieldName = `${section.label}__${cell.label}`;
        const value = formData.get(fieldName);

        if (value !== null) {
          if (cell.type === 'bool') {
            cell.value = value === 'on';
          } else if (cell.type === 'numeric') {
            cell.value = parseFloat(value as string) || 0;
          } else {
            cell.value = value.toString();
          }
        }
      }
      delete section._editable;
    } else if (section.type === 'content' && section._editable) {
      const markdown = formData.get('content__markdown');
      if (markdown) {
        section.markdown = markdown.toString();
      }
      delete section._editable;
    }
  }

  return YAML.stringify(spec);
}

/**
 * Rebuild the index page listing all entries
 */
async function rebuildIndex(env: Env): Promise<void> {
  try {
    const entries = await env.DIARY_BUCKET.list({ prefix: 'entries/' });
    const dates = entries.objects
      .map((obj) => obj.key.replace('entries/', '').replace('.yaml', ''))
      .sort()
      .reverse();

    // Generate index page using Gutenberg
    const indexSpec: PageSchema = {
      page: {
        meta: {
          title: 'Diary Archive',
          description: 'All diary entries',
        },
        sections: [
          {
            type: 'hero',
            content: {
              heading: 'Diary Archive',
            },
          },
          {
            type: 'content',
            variant: 'prose',
            markdown: `## All Entries\n\n${dates.map((d) => `- [${d}](/diary/${d})`).join('\n')}`,
          },
        ],
      },
    };

    const yamlContent = YAML.stringify(indexSpec);
    const { schema } = lint(yamlContent);
    const renderNodes = scaffold(schema, 'view');
    const annotatedNodes = enrich(renderNodes);
    const html = style(annotatedNodes, schema.page.meta, { mode: 'view' });

    await env.DIARY_BUCKET.put('index.html', html, {
      httpMetadata: { contentType: 'text/html' },
      customMetadata: { updated: new Date().toISOString() },
    });
  } catch (error) {
    // Log error but don't fail the save
    console.error('Failed to rebuild index:', error);
  }
}

/**
 * Generate 404 HTML page with create button
 */
function get404HTML(date: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entry Not Found</title>
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
      text-align: center;
    }
    h1 { color: white; margin-bottom: 1rem; }
    p { margin: 1rem 0; line-height: 1.6; }
    a {
      display: inline-block;
      margin-top: 2rem;
      padding: 1rem 2rem;
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
  <h1>Entry Not Found</h1>
  <p>No diary entry exists for <strong>${date}</strong></p>
  <p>Create a new entry to get started:</p>
  <a href="/diary/${date}?mode=edit">Create New Entry</a>
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
      text-align: center;
    }
    h1 { color: #e63946; margin-bottom: 1rem; }
    p { margin: 1rem 0; line-height: 1.6; }
    code { background: rgba(255,255,255,0.1); padding: 0.25rem 0.5rem; border-radius: 2px; }
    a {
      display: inline-block;
      margin-top: 2rem;
      padding: 1rem 2rem;
      background: rgba(0,0,0,0.8);
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.2);
    }
    a:hover {
      background: rgba(0,0,0,0.95);
    }
  </style>
</head>
<body>
  <h1>Error</h1>
  <p><code>${escapeHTML(errorMsg)}</code></p>
  <a href="/">Back to Home</a>
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
