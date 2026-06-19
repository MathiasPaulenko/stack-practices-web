const fs = require('fs');

function fillFromTxt(mdPath, txtPath) {
  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const parts = mdContent.split('---');
  if (parts.length < 3) { console.error('Invalid frontmatter in', mdPath); return; }
  const frontmatter = '---' + parts[1] + '---';
  const body = fs.readFileSync(txtPath, 'utf8');
  fs.writeFileSync(mdPath, frontmatter + '\n' + body.trim() + '\n', 'utf8');
  console.log('Updated ES:', mdPath);
}

const pairs = [
  ['src/content/recipes/devops/immutable-infrastructure.es.md', 'scripts/batch15-immutable-es.txt'],
  ['src/content/recipes/architecture/service-discovery.es.md', 'scripts/batch15-service-discovery-es.txt'],
  ['src/content/recipes/security/security-headers.es.md', 'scripts/batch15-security-headers-es.txt'],
  ['src/content/recipes/frontend/server-side-rendering.es.md', 'scripts/batch15-server-side-rendering-es.txt'],
  ['src/content/recipes/architecture/workflow-engine.es.md', 'scripts/batch15-workflow-engine-es.txt'],
  ['src/content/recipes/observability/metrics-collection.es.md', 'scripts/batch15-metrics-collection-es.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 15 ES articles filled.');
