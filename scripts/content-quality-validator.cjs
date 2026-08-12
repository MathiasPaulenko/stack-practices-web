#!/usr/bin/env node
/**
 * content-quality-validator.cjs — Unified Content Quality Validator
 *
 * Validates ALL content files against the complete StackPractices quality standard.
 * This script unifies and improves upon: validate-content, check-meta-descriptions,
 * check-missing-translations, check-orphan-translations, and check-broken-links.
 *
 * Usage:
 *   node content-quality-validator.cjs              # validate all content
 *   node content-quality-validator.cjs --strict     # warnings treated as errors
 *   node content-quality-validator.cjs --new        # extra-strict for newly created content
 *   node content-quality-validator.cjs <path>       # validate a single file or directory
 *
 * Exit code 0 = all clean
 * Exit code 1 = errors found
 */

const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '..', 'src', 'content');
const STRICT = process.argv.includes('--strict');
const NEW_CONTENT_MODE = process.argv.includes('--new');
const targetPath = process.argv.find((a, i) => i > 1 && !a.startsWith('--'));

const VALID_CONTENT_TYPES = ['recipes', 'patterns', 'docs', 'guides'];
const VALID_TOPICS = [
  'data', 'api', 'authentication', 'file-handling', 'performance',
  'testing', 'architecture', 'design', 'devops', 'databases',
  'concurrency', 'security', 'ai', 'frontend', 'infrastructure',
  'messaging', 'observability', 'graphql', 'serverless', 'caching'
];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_TEMPLATE_TYPES = [
  'readme', 'adr', 'api-doc', 'runbook', 'guideline',
  'changelog', 'code-of-conduct', 'postmortem', 'pr-template', 'onboarding',
  'bug-report', 'feature-request', 'release-notes', 'api-deprecation',
  'slo-document', 'data-retention-policy', 'security-incident-response',
  'disaster-recovery', 'user-story', 'database-migration-runbook',
  'dependency-audit', 'penetration-test', 'post-deployment-checklist',
  'api-error-response', 'api-status-page', 'capacity-planning',
  'database-schema-doc', 'incident-response', 'capacity-planning-template'
];
const VALID_PATTERN_CATEGORIES = ['creational', 'structural', 'behavioral', 'architectural'];

const WORD_COUNT_MIN = {
  recipes: 300,
  patterns: 400,
  guides: 500,
  docs: 200,
};

let errors = [];
let warnings = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addError(file, msg) { errors.push({ file, msg, type: 'error' }); }
function addWarning(file, msg) { warnings.push({ file, msg, type: 'warning' }); }

function walk(dir, basePath, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = basePath ? path.join(basePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      walk(full, rel, callback);
    } else if (entry.name.endsWith('.md')) {
      callback(full, rel);
    }
  }
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function isValidDate(str) {
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isKebabCase(str) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

function removeCodeBlocks(body) {
  const lines = body.split('\n');
  const out = [];
  const stack = [];
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const match = line.match(/^(`{3,}|~{3,})\s*(\S.*)?$/);
    if (match) {
      const fence = match[1];
      const info = (match[2] || '').trim();
      if (stack.length === 0) {
        stack.push({ type: fence[0], length: fence.length });
      } else {
        const top = stack[stack.length - 1];
        if (fence[0] === top.type && fence.length >= top.length && info === '') {
          stack.pop();
        }
      }
      continue;
    }
    if (stack.length === 0) out.push(rawLine);
  }
  return out.join('\n');
}

// ─── Phase 1: Index all resources ────────────────────────────────────────────
const allSlugs = {};        // slug -> [files]
const slugToType = {};      // slug -> contentType
const slugToFullPath = {};  // slug -> full path
const enFiles = new Set();
const esFiles = new Set();
const allResources = [];

walk(CONTENT_DIR, '', (full, rel) => {
  const content = fs.readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
  const parsed = matter(content);
  const meta = parsed.attributes;
  const isEs = rel.endsWith('.es.md');
  const baseRel = isEs ? rel.replace('.es.md', '.md') : rel;

  if (isEs) esFiles.add(baseRel);
  else enFiles.add(baseRel);

  const slug = meta.slug;
  const type = meta.contentType || rel.split(path.sep)[0];

  // Only index EN files for slug uniqueness check (ES files share slug with EN)
  if (slug && !isEs) {
    allSlugs[slug] = allSlugs[slug] || [];
    allSlugs[slug].push(rel);
    slugToType[slug] = type;
    slugToFullPath[slug] = full;
  }

  allResources.push({
    rel, full, slug, type, meta,
    body: parsed.body,
    isEs,
    wordCount: countWords(parsed.body),
  });
});

// ─── Optional: limit validation to a single resource or directory ────────────
if (targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  const relativeTarget = path.relative(CONTENT_DIR, resolvedTarget).replace(/\\/g, '/');
  if (relativeTarget.startsWith('..')) {
    console.error(`Target path is outside the content directory: ${resolvedTarget}`);
    process.exit(1);
  }
  const targetIsDir = fs.statSync(resolvedTarget).isDirectory();
  const targetDir = targetIsDir ? relativeTarget : path.dirname(relativeTarget);
  const targetBase = relativeTarget.replace(/\.es\.md$/, '').replace(/\.md$/, '');
  const filtered = allResources.filter(res => {
    const resRel = res.rel.replace(/\\/g, '/');
    const resBase = resRel.replace(/\.es\.md$/, '').replace(/\.md$/, '');
    if (targetIsDir) {
      return resRel === relativeTarget || resRel.startsWith(`${relativeTarget}/`);
    }
    return resBase === targetBase;
  });
  if (filtered.length === 0) {
    console.error(`No matching content files for target: ${resolvedTarget}`);
    process.exit(1);
  }
  allResources.length = 0;
  allResources.push(...filtered);
}

// ─── Phase 2: Validate each file ─────────────────────────────────────────────
allResources.forEach(res => {
  const { rel, full, slug, type, meta, body, isEs, wordCount } = res;
  const displayFile = rel.replace(/\\/g, '/');

  // ── 1. contentType ──────────────────────────────────────────────────────
  if (!meta.contentType) {
    addError(displayFile, 'Missing "contentType" frontmatter field');
  } else if (!VALID_CONTENT_TYPES.includes(meta.contentType)) {
    addError(displayFile, `Invalid contentType: "${meta.contentType}". Must be: ${VALID_CONTENT_TYPES.join(', ')}`);
  }

  // ── 2. slug ─────────────────────────────────────────────────────────────
  if (!slug) {
    addError(displayFile, 'Missing "slug" frontmatter field');
  } else {
    if (!isKebabCase(slug)) {
      addWarning(displayFile, `Slug "${slug}" is not kebab-case. Suggested: "${slugify(slug)}"`);
    }
  }

  // ── 3. title ────────────────────────────────────────────────────────────
  if (!meta.title) {
    addError(displayFile, 'Missing "title" frontmatter field');
  } else if (meta.title.length > 80) {
    addWarning(displayFile, `Title too long (${meta.title.length} chars). Keep under 80 for SEO.`);
  }

  // ── 4. description ──────────────────────────────────────────────────────
  if (!meta.description) {
    addError(displayFile, 'Missing "description" frontmatter field');
  } else if (meta.description.length < 30) {
    addWarning(displayFile, `Frontmatter "description" too short (${meta.description.length} chars). Aim for 80-160.`);
  }

  // ── 5. metaDescription ────────────────────────────────────────────────
  const metaDesc = meta.metaDescription;
  if (!metaDesc) {
    addError(displayFile, 'Missing "metaDescription" frontmatter field');
  } else {
    if (metaDesc.length < 120) {
      addError(displayFile, `metaDescription too short (${metaDesc.length} chars). Minimum: 120. Recommended: 150-160.`);
    } else if (metaDesc.length > 170) {
      addError(displayFile, `metaDescription too long (${metaDesc.length} chars). Maximum: 170.`);
    }
  }

  // ── 6. seo block ────────────────────────────────────────────────────────
  if (!meta.seo) {
    addError(displayFile, 'Missing "seo" frontmatter block');
  } else {
    const seoDesc = meta.seo.metaDescription;
    if (!seoDesc) {
      addError(displayFile, 'Missing seo.metaDescription');
    } else if (metaDesc && seoDesc !== metaDesc) {
      addError(displayFile, `seo.metaDescription must match top-level metaDescription. Got: "${seoDesc}" vs "${metaDesc}"`);
    }

    const keywords = meta.seo.keywords;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      addError(displayFile, 'seo.keywords missing or empty. Add at least 3 SEO keywords.');
    } else if (keywords.length < 3) {
      addWarning(displayFile, `Only ${keywords.length} SEO keyword(s). Aim for 3-8.`);
    }
  }

  // ── 7. difficulty ─────────────────────────────────────────────────────
  if (!meta.difficulty) {
    addError(displayFile, 'Missing "difficulty" frontmatter field');
  } else if (!VALID_DIFFICULTIES.includes(meta.difficulty)) {
    addError(displayFile, `Invalid difficulty: "${meta.difficulty}". Must be: ${VALID_DIFFICULTIES.join(', ')}`);
  }

  // ── 8. topics ───────────────────────────────────────────────────────────
  if (!meta.topics || !Array.isArray(meta.topics) || meta.topics.length === 0) {
    addError(displayFile, 'Missing or empty "topics" frontmatter field. Add at least 1 valid topic.');
  } else {
    const invalidTopics = meta.topics.filter(t => !VALID_TOPICS.includes(t));
    if (invalidTopics.length > 0) {
      addError(displayFile, `Invalid topic(s): "${invalidTopics.join(', ')}". Valid: ${VALID_TOPICS.join(', ')}`);
    }
  }

  // ── 9. tags ─────────────────────────────────────────────────────────────
  if (!meta.tags || !Array.isArray(meta.tags) || meta.tags.length === 0) {
    addError(displayFile, 'Missing or empty "tags" frontmatter field. Add at least 3 tags.');
  } else if (meta.tags.length < 3) {
    addWarning(displayFile, `Only ${meta.tags.length} tag(s). Aim for 5-10 relevant tags.`);
  }

  // ── 10. relatedResources ───────────────────────────────────────────────
  if (!meta.relatedResources || !Array.isArray(meta.relatedResources)) {
    addError(displayFile, 'Missing "relatedResources" frontmatter field. Add at least 2 related resources.');
  } else {
    if (meta.relatedResources.length < 2) {
      addWarning(displayFile, `Only ${meta.relatedResources.length} relatedResource(s). Aim for at least 2-3.`);
    }
    for (const link of meta.relatedResources) {
      const targetSlug = link.split('/').pop();
      if (!allSlugs[targetSlug]) {
        addError(displayFile, `Broken relatedResources link: "${link}" -> slug "${targetSlug}" not found`);
      }
    }
  }

  // ── 11. lastUpdated ─────────────────────────────────────────────────────
  if (!meta.lastUpdated) {
    addError(displayFile, 'Missing "lastUpdated" frontmatter field');
  } else if (!isValidDate(meta.lastUpdated)) {
    addError(displayFile, `Invalid lastUpdated: "${meta.lastUpdated}". Use ISO 8601 format (YYYY-MM-DD).`);
  }

  // ── 12. author ──────────────────────────────────────────────────────────
  if (!meta.author) {
    addError(displayFile, 'Missing "author" frontmatter field');
  }

  // ── 13. templateType (docs only) ──────────────────────────────────────
  if (meta.contentType === 'docs') {
    if (meta.templateType && !VALID_TEMPLATE_TYPES.includes(meta.templateType)) {
      addError(displayFile, `Invalid templateType: "${meta.templateType}". Valid: ${VALID_TEMPLATE_TYPES.join(', ')}`);
    }
  }

  // ── 14. category (patterns only) ─────────────────────────────────────────
  if (meta.contentType === 'patterns') {
    if (meta.category && !VALID_PATTERN_CATEGORIES.includes(meta.category)) {
      addError(displayFile, `Invalid category: "${meta.category}". Valid: ${VALID_PATTERN_CATEGORIES.join(', ')}`);
    }
  }

  // ── 15. FAQ section ─────────────────────────────────────────────────────
  const hasFaq = /##\s+(Frequently Asked Questions|Preguntas Frecuentes|FAQ)/i.test(body);
  if (!hasFaq) {
    addError(displayFile, 'Missing FAQ section. Add "## Frequently Asked Questions" with at least 3 Q&A pairs.');
  } else {
    const faqMatches = body.match(/###\s+.+\n\n/g) || [];
    if (faqMatches.length < 3) {
      addWarning(displayFile, `Only ${faqMatches.length} FAQ question(s). Aim for at least 3 Q&A pairs.`);
    }
  }

  // ── 16. Body word count ─────────────────────────────────────────────────
  const minWords = WORD_COUNT_MIN[meta.contentType] || 200;
  if (wordCount < minWords) {
    addError(displayFile, `Body too short (${wordCount} words). Minimum for ${meta.contentType}: ${minWords}.`);
  }

  // ── 17. Code blocks with language ──────────────────────────────────────
  const codeBlocks = body.match(/```[a-zA-Z0-9+-]*\n/g) || [];
  const codeBlocksWithLang = codeBlocks.filter(cb => cb.length > 3);
  const hasCodeBlock = codeBlocks.length > 0;
  if (['recipes', 'patterns', 'guides'].includes(meta.contentType)) {
    if (!hasCodeBlock) {
      addWarning(displayFile, `No code blocks found. ${meta.contentType} should include runnable examples.`);
    } else if (codeBlocksWithLang.length < codeBlocks.length) {
      addWarning(displayFile, `${codeBlocks.length - codeBlocksWithLang.length} code block(s) missing language tag (e.g. \`\`\`python).`);
    }
  }

  // ── 18. Duplicate headings ──────────────────────────────────────────────
  const bodyWithoutCodeBlocks = removeCodeBlocks(body);
  const headings = bodyWithoutCodeBlocks.match(/^#{2,3}\s+.+$/gm) || [];
  const seenH2 = new Set();
  for (const h of headings) {
    const level = h.match(/^#+/)[0].length;
    const text = h.replace(/^#+\s+/, '').trim().toLowerCase();
    if (level === 2) {
      if (seenH2.has(text)) {
        addError(displayFile, `Duplicate H2 heading: "${text}". Rename one to prevent MD024 lint errors.`);
      }
      seenH2.add(text);
    }
  }

  // ── 19. No manual Related Resources ────────────────────────────────────
  const hasManualRelated = /##\s+(Related Resources|Recursos Relacionados)/i.test(body);
  if (hasManualRelated) {
    addError(displayFile, 'Manual "## Related Resources" section found in body. Use frontmatter relatedResources instead.');
  }

  // ── 20. New content extra checks ────────────────────────────────────────
  if (NEW_CONTENT_MODE) {
    if (meta.draft) {
      addWarning(displayFile, 'Content is marked as draft. Remove "draft: true" before publishing.');
    }
    // Ensure description != metaDescription
    if (meta.description && metaDesc && meta.description === metaDesc) {
      addError(displayFile, 'Frontmatter "description" must differ from "metaDescription". description = user-facing summary, metaDescription = SEO snippet.');
    }
    // Ensure lastUpdated is recent (within last 7 days)
    if (meta.lastUpdated) {
      const updated = new Date(meta.lastUpdated);
      const daysAgo = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo > 7) {
        addWarning(displayFile, `lastUpdated is ${Math.round(daysAgo)} days old. Update if content changed recently.`);
      }
    }
  }
});

// ─── Phase 3: Cross-file checks (skip when validating a single resource) ───────
if (!targetPath) {
// Duplicate slugs
Object.entries(allSlugs).forEach(([slug, files]) => {
  if (files.length > 1) {
    addError(files[0], `Duplicate slug "${slug}" also found in: ${files.slice(1).join(', ')}`);
  }
});

// Missing translations
for (const en of enFiles) {
  if (!esFiles.has(en)) {
    addError(en, `Missing Spanish translation: ${path.basename(en).replace('.md', '.es.md')}`);
  }
}

// Orphan translations
for (const es of esFiles) {
  if (!enFiles.has(es)) {
    addError(es.replace('.md', '.es.md'), `Orphan Spanish translation (no English source): ${path.basename(es)}`);
  }
}

}

// ─── Phase 4: Report ───────────────────────────────────────────────────────
const totalFiles = allResources.length;
const totalErrors = errors.length;
const totalWarnings = warnings.length;

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║       StackPractices Content Quality Validator                  ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log(`║  Files checked:  ${String(totalFiles).padStart(3)}                                            ║`);
console.log(`║  Errors:         ${String(totalErrors).padStart(3)}   ${totalErrors === 0 ? '✅' : '❌'}                                        ║`);
console.log(`║  Warnings:       ${String(totalWarnings).padStart(3)}   ${totalWarnings === 0 ? '✅' : '⚠️'}                                        ║`);
if (STRICT) console.log('║  Mode:           STRICT (warnings = errors)                    ║');
if (NEW_CONTENT_MODE) console.log('║  Mode:           NEW CONTENT (extra strict)                    ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');

if (totalErrors > 0) {
  console.log('\n❌ ERRORS (must fix before commit):');
  // Group by file
  const byFile = {};
  errors.forEach(e => {
    byFile[e.file] = byFile[e.file] || [];
    byFile[e.file].push(e.msg);
  });
  Object.entries(byFile).forEach(([file, msgs]) => {
    console.log(`\n  📄 ${file}`);
    msgs.forEach(m => console.log(`     • ${m}`));
  });
}

if (totalWarnings > 0) {
  const label = STRICT ? '\n❌ WARNINGS (strict mode — treated as errors):' : '\n⚠️  WARNINGS (recommended fixes):';
  console.log(label);
  const byFile = {};
  warnings.forEach(w => {
    byFile[w.file] = byFile[w.file] || [];
    byFile[w.file].push(w.msg);
  });
  Object.entries(byFile).forEach(([file, msgs]) => {
    console.log(`\n  📄 ${file}`);
    msgs.forEach(m => console.log(`     • ${m}`));
  });
}

if (totalErrors === 0 && (totalWarnings === 0 || !STRICT)) {
  console.log('\n✅ All content passes quality validation!');
  process.exit(0);
} else {
  console.log(`\n⛔ Validation failed: ${totalErrors} error(s), ${totalWarnings} warning(s).`);
  process.exit(1);
}
