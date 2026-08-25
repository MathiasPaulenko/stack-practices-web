import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.argv[2] || 'dist';

const SELF_HOSTED_SCRIPTS = [
  '/analytics.js',
  '/ui.js',
  '/pagefind/pagefind-ui.js',
];

function sha384(file) {
  const data = fs.readFileSync(file);
  const hash = crypto.createHash('sha384').update(data).digest('base64');
  return `sha384-${hash}`;
}

function walk(dir, files = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, f.name);
    if (f.isDirectory()) walk(fp, files);
    else if (f.isFile() && f.name.endsWith('.html')) files.push(fp);
  }
  return files;
}

function getHashMap() {
  const map = {};
  for (const src of SELF_HOSTED_SCRIPTS) {
    const fp = path.join(ROOT, src);
    if (fs.existsSync(fp)) {
      map[src] = sha384(fp);
    } else {
      console.warn(`Missing file for SRI: ${fp}`);
    }
  }
  return map;
}

function addSri(tag, integrity) {
  // Skip if integrity already present.
  if (/\sintegrity=/.test(tag)) return tag;
  // Same-origin scripts do not require crossorigin for SRI to work.
  return tag.replace(/\ssrc=(['"])/, (m) => ` integrity="${integrity}"${m}`);
}

const hashes = getHashMap();
const files = walk(ROOT);
let total = 0;

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [src, integrity] of Object.entries(hashes)) {
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`<script\\b[^>]*\\ssrc=(['"])${escaped}\\1[^>]*>`, 'g');
    html = html.replace(re, (tag) => {
      changed = true;
      return addSri(tag, integrity);
    });
  }

  if (changed) {
    fs.writeFileSync(file, html, 'utf8');
    total++;
  }
}

console.log(`Added SRI hashes to ${total} HTML files.`);
