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
  ['src/content/recipes/performance/web-performance.md', 'scripts/batch17-web-performance.txt'],
  ['src/content/recipes/infrastructure/cost-optimization.md', 'scripts/batch17-cost-optimization.txt'],
  ['src/content/recipes/databases/schema-evolution.md', 'scripts/batch17-schema-evolution.txt'],
  ['src/content/recipes/security/container-security.md', 'scripts/batch17-container-security.txt'],
  ['src/content/recipes/devops/traffic-mirroring.md', 'scripts/batch17-traffic-mirroring.txt'],
  ['src/content/recipes/observability/real-user-monitoring.md', 'scripts/batch17-real-user-monitoring.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 17 EN articles filled.');
