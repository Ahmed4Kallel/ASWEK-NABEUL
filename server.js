#!/usr/bin/env node
'use strict';
/*
 * Serveur statique ASWEK + journalisation des recherches sans résultat.
 * Aucune dépendance externe. La clé Gemini n'est jamais nécessaire ici.
 *
 *   node server.js            # http://localhost:8099
 *   $env:PORT=3000; node server.js
 *
 * Journal : data/search-log.jsonl (une ligne JSON par recherche sans résultat)
 * Rapport : http://localhost:8099/api/search-log
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8099);
const LOG_FILE = path.join(ROOT, 'data', 'search-log.jsonl');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const clean = path.normalize(decoded).replace(/^([/\\])+/, '');
  const full = path.join(root, clean);
  if (!full.toLowerCase().startsWith(root.toLowerCase())) return null;
  return full;
}

function appendLog(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) { /* disque non inscriptible : on ignore */ }
}

function readLog() {
  const agg = {};
  try {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      let j; try { j = JSON.parse(line); } catch (e) { continue; }
      const key = String(j.q || '').toLowerCase().trim();
      if (!key) continue;
      if (!agg[key]) agg[key] = { q: j.q, count: 0, first: j.ts, last: 0, url: j.url };
      agg[key].count++;
      agg[key].last = j.ts;
    }
  } catch (e) {}
  return Object.values(agg).sort((a, b) => b.count - a.count);
}

/* Fichiers/dossiers jamais servis publiquement (mot de passe admin, sources serveur, journaux, outils). */
const BLOCKED = [/^\/data\/admin(\/|$)/i, /^\/scripts(\/|$)/i, /^\/tools(\/|$)/i, /^\/server\.js$/i,
  /^\/data\/search-log\.jsonl$/i, /(^|\/)\./, /\.(md|bak|log|env|lock)$/i, /^\/package(-lock)?\.json$/i];
const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  let decoded = '';
  try { decoded = decodeURIComponent(parsed.pathname || '/'); } catch (e) { res.writeHead(400); res.end('Bad Request'); return; }
  if (BLOCKED.some(r => r.test(decoded))) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); return; }

  // API : journalisation
  if (parsed.pathname === '/api/search-log') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 8192) req.destroy(); });
      req.on('end', () => {
        let data = {};
        try { data = JSON.parse(body || '{}'); } catch (e) {}
        const q = String(data.q || '').trim().slice(0, 160);
        if (q) appendLog({ q, results: Number(data.results) || 0, url: String(data.url || '').slice(0, 300), ts: Date.now() });
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
        res.end();
      });
      return;
    }
    if (req.method === 'GET') {
      if (!isLocal(req)) { res.writeHead(403); res.end('Forbidden'); return; }
      const report = readLog();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(report, null, 2));
      return;
    }
    res.writeHead(405); res.end('Method Not Allowed'); return;
  }

  // Statique
  let target = safeJoin(ROOT, parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  if (!target) { res.writeHead(400); res.end('Bad Request'); return; }

  fs.stat(target, (err, st) => {
    if (!err && st.isDirectory()) target = path.join(target, 'index.html');
    fs.readFile(target, (e, buf) => {
      if (e) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404</h1><p>Page introuvable. <a href="/">Retour à l\'accueil</a></p>');
        return;
      }
      const ext = path.extname(target).toLowerCase();
      const noCache = ['.html', '.js', '.css', '.json', '.xml', '.txt'].includes(ext);
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': noCache ? 'no-cache' : 'public, max-age=604800',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      });
      res.end(buf);
    });
  });
});

server.listen(PORT, () => {
  console.log(`ASWEK : http://localhost:${PORT}/`);
  console.log(`Journal des recherches : http://localhost:${PORT}/api/search-log`);
});
