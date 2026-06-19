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
  ['src/content/recipes/devops/blue-green-deployment.md', 'scripts/batch14-blue-green.txt'],
  ['src/content/recipes/architecture/multi-tenancy.md', 'scripts/batch14-multi-tenancy.txt'],
  ['src/content/recipes/devops/chaos-engineering.md', 'scripts/batch14-chaos.txt'],
  ['src/content/recipes/observability/distributed-tracing.md', 'scripts/batch14-tracing.txt'],
  ['src/content/recipes/security/data-privacy-gdpr.md', 'scripts/batch14-gdpr.txt'],
  ['src/content/recipes/messaging/event-driven-microservices.md', 'scripts/batch14-events.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 14 EN articles filled.');
