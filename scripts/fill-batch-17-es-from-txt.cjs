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
  ['src/content/recipes/performance/web-performance.es.md', 'scripts/batch17-web-performance-es.txt'],
  ['src/content/recipes/infrastructure/cost-optimization.es.md', 'scripts/batch17-cost-optimization-es.txt'],
  ['src/content/recipes/databases/schema-evolution.es.md', 'scripts/batch17-schema-evolution-es.txt'],
  ['src/content/recipes/security/container-security.es.md', 'scripts/batch17-container-security-es.txt'],
  ['src/content/recipes/devops/traffic-mirroring.es.md', 'scripts/batch17-traffic-mirroring-es.txt'],
  ['src/content/recipes/observability/real-user-monitoring.es.md', 'scripts/batch17-real-user-monitoring-es.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 17 ES articles filled.');
