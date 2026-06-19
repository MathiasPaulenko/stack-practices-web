const fs = require('fs');
const path = require('path');

const TAGS_TO_REMOVE = new Set([
  // Orphan / redundant
  'backend', 'elk', 'database-encryption',
  // API
  'api-design', 'slack', 'postgresql',
  // Architecture
  'patterns', 'grpc', 'protocol-buffers', 'reverse-proxy', 'event-bus',
  // Auth
  'magic-links', 'passwordless', 'hashing', '2fa', 'totp',
  // Concurrency
  'coroutines', 'executors',
  // Data
  'formatting', 'flatten', 'currency', 'array', 'url',
  'migrations', 'database-views', 'materialized-views',
  'analytics', 'search', 'full-text-search',
  // DevOps
  'background-jobs', 'argument-parsing', 'trivy', 'docker-compose',
  'dynamic', 'grafana', 'helm', 'config',
  // File
  'file-upload', 'excel', 'files', 'mjml',
  // Frontend / Messaging
  'websocket', 'kafka', 'rabbitmq',
  // Performance / Security / Testing
  'cache-invalidation', 'debounce', 'throttle', 'zod'
]);

function findMarkdownFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = findMarkdownFiles('src/content/recipes');
let modified = 0;
let tagsRemoved = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) continue;
  
  const fm = parts[1];
  const tagMatch = fm.match(/tags:\s*\n((?:\s*-\s*[^\n]+\n?)*)/);
  if (!tagMatch) continue;
  
  const lines = tagMatch[1].trim().split('\n');
  const originalTags = lines.map(l => l.replace(/^\s*-\s*/, '').trim());
  const newTags = originalTags.filter(t => !TAGS_TO_REMOVE.has(t));
  
  if (newTags.length < originalTags.length) {
    const newTagsBlock = newTags.map(t => `  - ${t}`).join('\n') + '\n';
    const newFm = fm.replace(tagMatch[0], `tags:\n${newTagsBlock}`);
    const newContent = '---' + newFm + '---' + parts.slice(2).join('---');
    fs.writeFileSync(file, newContent, 'utf8');
    modified++;
    tagsRemoved += originalTags.length - newTags.length;
  }
}

console.log('Modified ' + modified + ' files. Tags removed: ' + tagsRemoved);
