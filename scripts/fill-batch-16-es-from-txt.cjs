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
  ['src/content/recipes/testing/api-mocking.es.md', 'scripts/batch16-api-mocking-es.txt'],
  ['src/content/recipes/databases/database-replication.es.md', 'scripts/batch16-database-replication-es.txt'],
  ['src/content/recipes/observability/log-aggregation.es.md', 'scripts/batch16-log-aggregation-es.txt'],
  ['src/content/recipes/architecture/retry-backoff.es.md', 'scripts/batch16-retry-backoff-es.txt'],
  ['src/content/recipes/messaging/dead-letter-queue.es.md', 'scripts/batch16-dead-letter-queue-es.txt'],
  ['src/content/recipes/messaging/message-idempotency.es.md', 'scripts/batch16-message-idempotency-es.txt']
];

for (const [md, txt] of pairs) {
  fillFromTxt(md, txt);
}

console.log('All batch 16 ES articles filled.');
