import fs from 'fs';
const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (m) {
  const json = JSON.parse(m[1]);
  console.log(JSON.stringify(json, null, 2).slice(0, 800));
  console.log('\n...total chars:', JSON.stringify(json).length);
}
