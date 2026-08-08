import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
console.log('Total:', html.length);

const headEnd = html.indexOf('</head>') + 7;
const head = html.slice(0, headEnd);
console.log('Head:', head.length);

const mainStart = html.indexOf('<main');
const mainEnd = html.indexOf('</main>') + 7;
const main = html.slice(mainStart, mainEnd);
console.log('Main:', main.length);

const jsonld = html.match(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g) || [];
console.log('JSON-LD:', jsonld.length, 'blocks,', jsonld.reduce((a, s) => a + s.length, 0), 'chars');
for (let i = 0; i < jsonld.length; i++) {
  const typeMatch = jsonld[i].match(/"@type"\s*:\s*"([^"]+)"/);
  console.log(`  Block ${i}: ${jsonld[i].length} chars, type=${typeMatch ? typeMatch[1] : '?'}`);
}

const footerStart = html.indexOf('<footer');
const footerEnd = html.indexOf('</footer>') + 9;
const footer = html.slice(footerStart, footerEnd);
console.log('Footer:', footer.length);

// Measure nav/header
const navMatches = html.match(/<nav[\s\S]*?<\/nav>/g) || [];
console.log('Nav blocks:', navMatches.length, navMatches.reduce((a, s) => a + s.length, 0));

// Measure inline styles
const styleMatches = html.match(/<style[\s\S]*?<\/style>/g) || [];
console.log('Style blocks:', styleMatches.length, styleMatches.reduce((a, s) => a + s.length, 0));

// Class attribute overhead estimate
const classMatches = html.match(/class="[^"]*"/g) || [];
const classTotal = classMatches.reduce((a, s) => a + s.length, 0);
console.log('Class attrs:', classMatches.length, 'total chars:', classTotal);

// SVG inline
const svgMatches = html.match(/<svg[\s\S]*?<\/svg>/g) || [];
console.log('Inline SVGs:', svgMatches.length, svgMatches.reduce((a, s) => a + s.length, 0));
