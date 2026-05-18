// Local dev server that emulates Vercel routing.
// Run: node dev-server.js
//
// What it does:
//   • Loads .env.local
//   • Maps /api/* URL paths to api/*.js handler files (same as Vercel)
//   • Parses JSON request bodies and cookies (same shape req as Vercel)
//   • Serves index.html, admin.html and other static files
//   • Honours the rewrites declared in vercel.json (so /admin → admin.html)

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

// ---- load env ----
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = process.env[m[1]] || m[2];
  }
}

const PORT = Number(process.env.DEV_PORT || 3939);

// ---- helpers ----
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ---- route → handler resolution (mirrors Vercel's filesystem routing) ----
function resolveApiHandler(pathname) {
  // Strip query, normalize trailing slash
  let p = pathname.replace(/\/+$/, '');
  if (!p.startsWith('/api/')) return null;
  const rel = p.slice(5); // after "/api/"
  // Try direct file: api/<rel>.js
  const candidates = [
    path.join(__dirname, 'api', rel + '.js'),
    path.join(__dirname, 'api', rel, 'index.js'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// ---- static file serving ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function tryServeStatic(reqPath, res) {
  // vercel.json rewrite: /admin → /admin.html
  let p = reqPath;
  if (p === '/admin' || p === '/admin/') p = '/admin.html';
  if (p === '/') p = '/index.html';

  // Block path traversal
  if (p.includes('..')) return false;
  const filePath = path.join(__dirname, p);
  if (!filePath.startsWith(__dirname)) return false;

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(filePath).pipe(res);
  return true;
}

// ---- server ----
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  // 1. API route?
  const handlerPath = resolveApiHandler(pathname);
  if (handlerPath) {
    try {
      // Parse JSON body for POST/PUT/PATCH
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const raw = await readBody(req);
        const ctype = (req.headers['content-type'] || '').toLowerCase();
        if (ctype.includes('application/json') && raw) {
          try { body = JSON.parse(raw); } catch (e) { body = {}; }
        } else if (ctype.includes('application/x-www-form-urlencoded')) {
          body = Object.fromEntries(new URLSearchParams(raw));
        }
      }
      req.body = body;
      req.cookies = parseCookies(req.headers.cookie);
      req.query = parsed.query;

      // Patch res with Vercel-style helpers
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (obj) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(obj));
        return res;
      };
      const origSend = (b) => {
        if (typeof b === 'string' || Buffer.isBuffer(b)) res.end(b);
        else res.end(JSON.stringify(b));
        return res;
      };
      res.send = origSend;

      // Bust require cache so we pick up edits without restart
      delete require.cache[require.resolve(handlerPath)];
      const handler = require(handlerPath);
      const fn = (typeof handler === 'function') ? handler : (handler && handler.default);
      if (typeof fn !== 'function') {
        res.statusCode = 500;
        return res.end('Handler is not a function: ' + handlerPath);
      }
      await fn(req, res);
      if (!res.writableEnded) res.end();
    } catch (err) {
      console.error('Handler error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'internal', message: String(err.message || err) }));
    }
    return;
  }

  // 2. Static file?
  if (tryServeStatic(pathname, res)) return;

  // 3. 404
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not found: ' + pathname);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔════════════════════════════════════════════════════╗');
  console.log('  ║                                                    ║');
  console.log('  ║   👻  unGhost local dev server                     ║');
  console.log('  ║                                                    ║');
  console.log(`  ║   Landing:  http://localhost:${PORT}                  ║`);
  console.log(`  ║   Admin:    http://localhost:${PORT}/admin            ║`);
  console.log(`  ║   Password: ${(process.env.ADMIN_PASSWORD || '—').padEnd(40, ' ')}║`);
  console.log('  ║                                                    ║');
  console.log('  ║   API routes hot-reload on every request           ║');
  console.log('  ║   Ctrl+C to stop                                   ║');
  console.log('  ║                                                    ║');
  console.log('  ╚════════════════════════════════════════════════════╝');
  console.log('');
});
