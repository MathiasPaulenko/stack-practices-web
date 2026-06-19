const fs = require('fs');

function fillFromTxt(mdPath, txtPath) {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const parts = mdContent.split('---');
  if (parts.length < 3) { console.error('Invalid frontmatter in', mdPath); return; }
  const frontmatter = '---' + parts[1] + '---';
  const body = fs.readFileSync(txtPath, 'utf8');
  fs.writeFileSync(mdPath, frontmatter + '\n' + body.trim() + '\n', 'utf8');
  console.log('Updated:', mdPath);
}

const pairs = [
  ['src/content/recipes/devops/immutable-infrastructure.md', 'scripts/batch15-immutable.txt'],
  ['src/content/recipes/architecture/service-discovery.md', 'scripts/batch15-service-discovery.txt'],
  ['src/content/recipes/security/security-headers.md', 'scripts/batch15-security-headers.txt'],
  ['src/content/recipes/frontend/server-side-rendering.md', 'scripts/batch15-server-side-rendering.txt'],
  ['src/content/recipes/architecture/workflow-engine.md', 'scripts/batch15-workflow-engine.txt'],
  ['src/content/recipes/observability/metrics-collection.md', 'scripts/batch15-metrics-collection.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 15 EN articles filled.');
