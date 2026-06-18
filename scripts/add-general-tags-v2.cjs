/**
 * Add general tags based on topics to all content files.
 * Uses regex to precisely target only the tags block.
 */

const fs = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');

const TOPIC_TO_TAG = {
  'ai': 'ai',
  'security': 'security',
  'performance': 'performance',
  'databases': 'database',
  'testing': 'testing',
  'devops': 'devops',
  'api': 'api',
  'frontend': 'frontend',
  'serverless': 'serverless',
  'caching': 'caching',
  'concurrency': 'concurrency',
  'messaging': 'messaging',
  'observability': 'observability',
  'infrastructure': 'infrastructure',
  'graphql': 'graphql',
  'architecture': 'architecture',
  'design': 'design',
  'file-handling': 'file-handling',
  'data': 'data',
  'authentication': 'authentication',
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

function getTopicsFromFrontmatter(frontmatter) {
  const lines = frontmatter.split('\n');
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

function getTagsFromFrontmatter(frontmatter) {
  const lines = frontmatter.split('\n');
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
  let totalAdded = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    if (!frontmatter) continue;

    const topics = getTopicsFromFrontmatter(frontmatter);
    const existingTags = getTagsFromFrontmatter(frontmatter);
    const tagsToAdd = [];

    for (const topic of topics) {
      const generalTag = TOPIC_TO_TAG[topic];
      if (generalTag && !existingTags.includes(generalTag)) {
        tagsToAdd.push(generalTag);
      }
    }

    if (tagsToAdd.length === 0) continue;

    // Build new tags block
    const newTagLines = existingTags.map(t => `  - ${t}`).concat(
      tagsToAdd.map(t => `  - ${t}`)
    );
    const newTagsBlock = 'tags:\n' + newTagLines.join('\n') + '\n';

    // Replace the tags block in frontmatter using regex
    const tagsRegex = /^(tags:\n(?:  - .+\n)+)/m;
    const updatedFm = frontmatter.replace(tagsRegex, newTagsBlock);

    if (updatedFm === frontmatter) {
      console.log('WARN: Could not replace tags block in ' + file);
      continue;
    }

    const newContent = '---\n' + updatedFm + '\n---' + body;
    fs.writeFileSync(file, newContent, 'utf8');
    modifiedCount++;
    totalAdded += tagsToAdd.length;
  }

  console.log(`Modified ${modifiedCount} files, added ${totalAdded} tags total.`);
}

main();
