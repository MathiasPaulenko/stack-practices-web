/**
 * Second consolidation: reduce recipe tags to max 3 per article.
 * Keep: 1 general tag (from topic) + up to 2 most specific/relevant tags.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

const TOPIC_TO_TAG = {
  'ai': 'ai', 'security': 'security', 'performance': 'performance',
  'databases': 'database', 'testing': 'testing', 'devops': 'devops',
  'api': 'api', 'frontend': 'frontend', 'serverless': 'serverless',
  'caching': 'caching', 'concurrency': 'concurrency', 'messaging': 'messaging',
  'observability': 'observability', 'infrastructure': 'infrastructure',
  'graphql': 'graphql', 'architecture': 'architecture', 'design': 'design',
  'file-handling': 'file-handling', 'data': 'data', 'authentication': 'authentication',
};

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

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { frontmatter: null, body: content };
  const end = content.indexOf('---', 3);
  if (end === -1) return { frontmatter: null, body: content };
  return {
    frontmatter: content.slice(3, end).trim(),
    body: content.slice(end + 3),
  };
}

function getTopics(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  let inTopics = false;
  const topics = [];
  for (const line of lines) {
    if (!inTopics && line.trim() === 'topics:') {
      inTopics = true;
      continue;
    }
    if (inTopics) {
      if (line.trim() === '' || (!line.trim().startsWith('-') && line.trim() !== '')) {
        break;
      }
      const match = line.match(/^\s*-\s*(.+)$/);
      if (match) topics.push(match[1].trim());
    }
  }
  return topics;
}

function getTags(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  let inTags = false;
  const tags = [];
  for (const line of lines) {
    if (!inTags && line.trim() === 'tags:') {
      inTags = true;
      continue;
    }
    if (inTags) {
      if (line.trim() === '' || (!line.trim().startsWith('-') && line.trim() !== '')) {
        break;
      }
      const match = line.match(/^\s*-\s*(.+)$/);
      if (match) tags.push(match[1].trim());
    }
  }
  return tags;
}

function main() {
  const files = findMarkdownFiles(CONTENT_DIR);
  let modifiedCount = 0;
  let totalRemoved = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    if (!frontmatter) continue;

    // Only process recipes
    const contentTypeMatch = frontmatter.match(/^contentType:\s*(.+)$/m);
    if (!contentTypeMatch || contentTypeMatch[1].trim() !== 'recipes') continue;

    const topics = getTopics(frontmatter);
    const tags = getTags(frontmatter);
    if (tags.length <= 3) continue;

    // Get general tags from topics
    const generalTags = topics.map(t => TOPIC_TO_TAG[t]).filter(Boolean);
    const specificTags = tags.filter(t => !generalTags.includes(t));

    // Keep all general tags + up to 2 most specific tags
    const keptSpecific = specificTags.slice(0, 2);
    const newTags = [...generalTags, ...keptSpecific];

    // Remove duplicates
    const uniqueTags = [...new Set(newTags)];

    if (uniqueTags.length === tags.length) continue;

    // Rebuild tags block
    const newTagsBlock = 'tags:\n' + uniqueTags.map(t => `  - ${t}`).join('\n') + '\n';
    const tagsRegex = /^(tags:\n((?:[ \t]*-[^\n]*\n)+))/m;
    const normalizedFm = frontmatter.replace(/\r\n/g, '\n');
    const updatedFm = normalizedFm.replace(tagsRegex, newTagsBlock);

    if (updatedFm === normalizedFm) {
      console.log('WARN: Could not replace tags in ' + file);
      continue;
    }

    const usesCRLF = content.includes('\r\n');
    const finalFm = usesCRLF ? updatedFm.replace(/\n/g, '\r\n') : updatedFm;
    const newContent = '---\n' + finalFm + '\n---' + body;
    fs.writeFileSync(file, newContent, 'utf8');

    modifiedCount++;
    totalRemoved += tags.length - uniqueTags.length;
  }

  console.log(`Modified ${modifiedCount} recipe files.`);
  console.log(`Tags removed: ${totalRemoved}`);
}

main();
