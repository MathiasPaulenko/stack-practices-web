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
  ['src/content/recipes/devops/blue-green-deployment.es.md', 'scripts/batch14-blue-green-es.txt'],
  ['src/content/recipes/architecture/multi-tenancy.es.md', 'scripts/batch14-multi-tenancy-es.txt'],
  ['src/content/recipes/devops/chaos-engineering.es.md', 'scripts/batch14-chaos-es.txt'],
  ['src/content/recipes/observability/distributed-tracing.es.md', 'scripts/batch14-tracing-es.txt'],
  ['src/content/recipes/security/data-privacy-gdpr.es.md', 'scripts/batch14-gdpr-es.txt'],
  ['src/content/recipes/messaging/event-driven-microservices.es.md', 'scripts/batch14-events-es.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 14 ES articles filled.');
