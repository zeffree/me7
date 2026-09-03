/**
 * Static file server for Azure App Service (Linux).
 *
 * Linux App Service has no IIS, so this reproduces the rules that
 * public/web.config would apply on a Windows host. Both must be kept in sync:
 *   - security headers (including CSP)
 *   - immutable caching for hashed assets, no-cache for index.html
 *   - SPA fallback to index.html
 *
 * Zero dependencies, so there is no install step on cold start. The whole
 * build is ~1 MB, so every file is read into memory once at startup and its
 * compressed variants are precomputed — requests never touch the disk.
 *
 * HTTPS redirection is handled by the App Service httpsOnly setting.
 */
import { createServer } from 'node:http';
import { readdirSync, readFileSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import { createHash } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
    "font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; " +
    "base-uri 'self'; form-action 'none'; frame-ancestors 'none'",
};

// Hosting config describes this server; serving it would leak the CSP and
// routing rules for no benefit.
const NEVER_SERVE = new Set(['web.config', 'server.mjs']);

const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json|javascript)|image\/svg)/;

/** @type {Map<string, {body: Buffer, gzip?: Buffer, br?: Buffer, type: string, etag: string, cacheControl: string}>} */
const files = new Map();

function cacheControlFor(urlPath) {
  if (urlPath === '/index.html') return 'no-cache, must-revalidate';
  // Vite fingerprints everything under /assets/, so it can be cached forever.
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  return 'public, max-age=3600';
}

function load(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      load(abs);
      continue;
    }
    const rel = relative(ROOT, abs);
    if (NEVER_SERVE.has(rel)) continue;

    const body = readFileSync(abs);
    const type = MIME[extname(abs).toLowerCase()] || 'application/octet-stream';
    const urlPath = '/' + rel.split(sep).join('/');
    const record = {
      body,
      type,
      etag: '"' + createHash('sha1').update(body).digest('base64').slice(0, 27) + '"',
      cacheControl: cacheControlFor(urlPath),
    };
    // Only compress what benefits; images and fonts are already compressed.
    if (COMPRESSIBLE.test(type) && body.length > 512) {
      record.gzip = gzipSync(body, { level: 9 });
      record.br = brotliCompressSync(body, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: body.length,
        },
      });
    }
    files.set(urlPath, record);
  }
}

load(ROOT);

const index = files.get('/index.html');
if (!index) {
  console.error('FATAL: index.html not found in ' + ROOT);
  process.exit(1);
}

function send(req, res, record, status = 200) {
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': record.type,
    'Cache-Control': record.cacheControl,
    ETag: record.etag,
    Vary: 'Accept-Encoding',
  };

  if (req.headers['if-none-match'] === record.etag) {
    res.writeHead(304, headers);
    return res.end();
  }

  const accepted = String(req.headers['accept-encoding'] || '');
  let body = record.body;
  if (record.br && /\bbr\b/.test(accepted)) {
    body = record.br;
    headers['Content-Encoding'] = 'br';
  } else if (record.gzip && /\bgzip\b/.test(accepted)) {
    body = record.gzip;
    headers['Content-Encoding'] = 'gzip';
  }

  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...SECURITY_HEADERS, Allow: 'GET, HEAD' });
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, SECURITY_HEADERS);
    return res.end('Bad Request');
  }

  // Rejecting '..' keeps the lookup confined to the preloaded map, which
  // cannot reach outside ROOT anyway.
  if (pathname.includes('..') || pathname.includes('\0')) {
    res.writeHead(400, SECURITY_HEADERS);
    return res.end('Bad Request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const hit = files.get(pathname);
  if (hit) return send(req, res, hit);

  // Anything else is a client-side route: serve the SPA shell with 200 so the
  // router can resolve it, matching the other two hosting configs.
  return send(req, res, index, 200);
}).listen(PORT, () => {
  console.log(`serving ${files.size} files from ${ROOT} on :${PORT}`);
});
