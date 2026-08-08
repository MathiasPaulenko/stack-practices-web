import fs from 'fs';

const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
const headStart = html.indexOf('<head>');
const headEnd = html.indexOf('</head>') + 7;
const head = html.slice(headStart, headEnd);
console.log('Head size:', head.length, 'chars');

// Break down head components
const jsonldBlocks = [...head.matchAll(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g)];
const jsonldTotal = jsonldBlocks.reduce((a, m) => a + m[0].length, 0);
console.log('  JSON-LD:', jsonldBlocks.length, 'blocks,', jsonldTotal, 'chars');

const metaTags = [...head.matchAll(/<meta[^>]*>/g)];
const metaTotal = metaTags.reduce((a, m) => a + m[0].length, 0);
console.log('  Meta tags:', metaTags.length, 'tags,', metaTotal, 'chars');
for (const m of metaTags) {
  console.log('    ', m[0].slice(0, 120));
}

const linkTags = [...head.matchAll(/<link[^>]*>/g)];
const linkTotal = linkTags.reduce((a, m) => a + m[0].length, 0);
console.log('  Link tags:', linkTags.length, 'tags,', linkTotal, 'chars');
for (const m of linkTags) {
  console.log('    ', m[0].slice(0, 120));
}

const scriptTags = [...head.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)];
const scriptTotal = scriptTags.reduce((a, m) => a + m[0].length, 0);
console.log('  Script tags:', scriptTags.length, 'tags,', scriptTotal, 'chars');

const styleTags = [...head.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)];
const styleTotal = styleTags.reduce((a, m) => a + m[0].length, 0);
console.log('  Style tags:', styleTags.length, 'tags,', styleTotal, 'chars');

// Show the full head
console.log('\n=== FULL HEAD ===');
console.log(head);
