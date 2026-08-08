import fs from 'fs';
const html = fs.readFileSync('dist/recipes/scheduled-jobs/index.html', 'utf8');
const pre = html.match(/<pre[^>]*data-language="yaml"[^>]*>[\s\S]{0,500}/);
if (pre) {
  console.log(pre[0]);
}
