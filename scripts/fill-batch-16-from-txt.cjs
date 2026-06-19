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
  ['src/content/recipes/testing/api-mocking.md', 'scripts/batch16-api-mocking.txt'],
  ['src/content/recipes/databases/database-replication.md', 'scripts/batch16-database-replication.txt'],
  ['src/content/recipes/observability/log-aggregation.md', 'scripts/batch16-log-aggregation.txt'],
  ['src/content/recipes/architecture/retry-backoff.md', 'scripts/batch16-retry-backoff.txt'],
  ['src/content/recipes/messaging/dead-letter-queue.md', 'scripts/batch16-dead-letter-queue.txt'],
  ['src/content/recipes/messaging/message-idempotency.md', 'scripts/batch16-message-idempotency.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 16 EN articles filled.');
