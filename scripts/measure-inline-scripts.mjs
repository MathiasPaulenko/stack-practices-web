import fs from 'fs';
import path from 'path';

const files = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.html')) files.push(full);
  }
}
walk('dist');

const byPrefix = {};
let total = 0;
const re = /<script\b[^>]*?>([\s\S]*?)<\/script>/g;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[0].slice(0, m[0].indexOf('>') + 1);
    const content = m[1].trim();
    total += m[0].length;

    let key;
    if (attrs.includes('type="application/ld+json"')) key = 'json-ld';
    else if (content.startsWith('window.dataLayer') || content.startsWith('function gtag')) key = 'gtag-consent';
    else if (content.includes('gtm.start')) key = 'gtm';
    else if (content.includes('mobile-menu-toggle')) key = 'mobile-menu';
    else if (content.includes('copy-btn') || content.includes('copyCode')) key = 'copy-button';
    else if (content.includes('toc') || content.includes('table-of-contents')) key = 'toc';
    else if (content.includes('frequently asked questions') || content.includes('preguntas frecuentes')) key = 'faq-accordion';
    else if (content.includes('LANGS')) key = 'language-tabs';
    else if (content.includes('cookie') || content.includes('consent') || content.includes('gdrp')) key = 'cookie-banner';
    else if (content.includes('adsbygoogle')) key = 'adsense';
    else {
      key = content.slice(0, 60).replace(/\s+/g, ' ');
    }

    byPrefix[key] = (byPrefix[key] || 0) + m[0].length;
  }
}

console.log('Total inline scripts:', (total / 1024 / 1024).toFixed(2), 'MB');
const sorted = Object.entries(byPrefix).sort((a, b) => b[1] - a[1]);
for (const [k, v] of sorted) {
  console.log(k, ':', (v / 1024 / 1024).toFixed(2), 'MB');
}
