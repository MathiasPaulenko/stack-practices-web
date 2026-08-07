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

const patterns = [
  { name: 'gtag_consent', re: /<script>\s*window\.dataLayer = window\.dataLayer \|\| \[\];\s*function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*gtag\('consent', 'default', \{[\s\S]*?\}\);\s*<\/script>/ },
  { name: 'gtm', re: /<script>\(function\(w,d,s,l,i\)[\s\S]*?<\/script>/ },
  { name: 'gtag_script_tag', re: /<script async[^>]*?src="https:\/\/www\.googletagmanager\.com\/gtag\/js[\s\S]*?<\/script>/ },
  { name: 'gtag_config', re: /<script async crossorigin="anonymous" src="https:\/\/www\.googletagmanager\.com\/gtag\/js[\s\S]*?<\/script>\s*<script>[\s\S]*?gtag\('config'[\s\S]*?<\/script>/ },
  { name: 'jsonld', re: /<script type="application\/ld\+json">[\s\S]*?<\/script>/g },
  { name: 'canonical_hreflang', re: /<link rel="canonical"[\s\S]*?<link rel="alternate"[^>]*?hreflang="x-default"[^>]*?>/ },
  { name: 'open_graph', re: /<!-- Open Graph -->[\s\S]*?<!-- Twitter Card -->/ },
  { name: 'twitter_card', re: /<!-- Twitter Card -->[\s\S]*?<!-- JSON-LD/ },
];

const totals = {};
for (const p of patterns) totals[p.name] = 0;

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const head = html.match(/^[\s\S]*?<\/head>/)[0];
  for (const p of patterns) {
    if (p.name === 'jsonld') {
      const m = [...head.matchAll(p.re)];
      for (const x of m) totals[p.name] += x[0].length;
    } else {
      const m = head.match(p.re);
      if (m) totals[p.name] += m[0].length;
    }
  }
}

for (const [k, v] of Object.entries(totals).sort((a, b) => b[1] - a[1])) {
  console.log(k, ':', (v / 1024 / 1024).toFixed(2), 'MB avg', (v / files.length / 1024).toFixed(1), 'KB');
}
