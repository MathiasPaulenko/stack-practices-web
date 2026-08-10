import fs from 'fs';
const text = fs.readFileSync('src/content/recipes/serverless/scheduled-jobs.md', 'utf8');
const lines = text.split('\n');
// Show lines 220-285 (the padding sections)
console.log(lines.slice(220, 285).join('\n'));
