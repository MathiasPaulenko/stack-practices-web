#!/usr/bin/env node
/**
 * validate-content.cjs — Comprehensive Content Validator
 *
 * Validates ALL content files for:
 * 1. Required frontmatter fields (slug, title, description, topics, tags, difficulty, lastUpdated)
 * 2. Slug uniqueness (no duplicates)
 * 3. Meta description length (150-160 chars)
 * 4. relatedResources links (all point to existing resources)
 * 5. Bilingual parity (every .md has .es.md)
 * 6. FAQ section presence (strongly recommended)
 * 7. lastUpdated is valid date
 * 8. SEO block completeness
 * 9. Duplicate heading warnings (MD024 prevention)
 *
 * Exit code 0 = all clean
 * Exit code 1 = errors found
 *
 * Usage:
 *   node .devin/skills/stackp-content-creator/scripts/validate-content.cjs           # validate all
 *   node .devin/skills/stackp-content-creator/scripts/validate-content.cjs --strict  # fail on warnings too
 *   node .devin/skills/stackp-content-creator/scripts/validate-content.cjs --fix     # auto-fix where possible
 */

const fs = require('fs');
const path = require('path');
const matter = require('front-matter');

const CONTENT_DIR = path.join(__dirname, '../../../..', 'src', 'content');
const STRICT = process.argv.includes('--strict');
const FIX = process.argv.includes('--fix');

let errors = [];
let warnings = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addError(file, msg) { errors.push(`[${file}] ${msg}`); }
function addWarning(file, msg) { warnings.push(`[${file}] ${msg}`); }

function walk(dir, basePath, callback) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = basePath ? path.join(basePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      walk(full, rel, callback);
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('AGENTS')) {
      callback(full, rel);
    }
  }
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ─── Phase 1: Index all resources ────────────────────────────────────────────
const allSlugs = {};          // slug -> [files]
const allResources = [];      // all parsed resources
const slugToType = {};        // slug -> contentType
const enFiles = new Set();    // relative paths of EN files
const esFiles = new Set();    // relative paths of ES files

walk(CONTENT_DIR, '', (full, rel) => {
  const content = fs.readFileSync(full, 'utf8');
  const parsed = matter(content);
  const meta = parsed.attributes;
  const isEs = rel.endsWith('.es.md');
  const baseRel = isEs ? rel.replace('.es.md', '.md') : rel;

  if (isEs) {
    esFiles.add(baseRel);
  } else {
    enFiles.add(baseRel);
  }

  // Skip Spanish files for slug uniqueness (they share slug with EN)
  if (!isEs) {
    const slug = meta.slug;
    const type = meta.contentType || rel.split(path.sep)[0];

    if (slug) {
      allSlugs[slug] = allSlugs[slug] || [];
      allSlugs[slug].push(rel);
      slugToType[slug] = type;
    }

    allResources.push({
      rel,
      full,
      slug,
      type,
      meta,
      body: parsed.body,
      isEs
    });
  }
});

// ─── Phase 2: Validate each file ───────────────────────────────────────────
allResources.forEach(res => {
  const { rel, full, slug, meta, body, isEs } = res;

  // 1. Required fields
  const requiredFields = ['title', 'description', 'slug', 'topics', 'tags', 'difficulty', 'lastUpdated', 'seo'];
  const missing = requiredFields.filter(f => {
    const v = meta[f];
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
  });
  if (missing.length > 0) {
    addError(rel, `Missing frontmatter fields: ${missing.join(', ')}`);
  }

  // 2. Slug must be present for EN files
  if (!isEs && !slug) {
    addError(rel, 'Missing required "slug" field');
  }

  // 3. Meta description length
  const metaDesc = meta.metaDescription || meta.seo?.metaDescription || meta.description;
  if (metaDesc) {
    if (metaDesc.length < 120) {
      addWarning(rel, `Meta description too short (${metaDesc.length} chars). Recommended: 150-160.`);
    } else if (metaDesc.length > 170) {
      addWarning(rel, `Meta description too long (${metaDesc.length} chars). Recommended: 150-160.`);
    }
  } else {
    addError(rel, 'Missing metaDescription (top-level or in seo block)');
  }

  // 4. lastUpdated format
  if (meta.lastUpdated) {
    const d = new Date(meta.lastUpdated);
    if (isNaN(d.getTime())) {
      addError(rel, `Invalid lastUpdated: "${meta.lastUpdated}"`);
    }
  }

  // 5. Difficulty value
  const validDiff = ['beginner', 'intermediate', 'advanced'];
  if (meta.difficulty && !validDiff.includes(meta.difficulty)) {
    addError(rel, `Invalid difficulty: "${meta.difficulty}". Must be: ${validDiff.join(', ')}`);
  }

  // 6. Topics non-empty
  if (!meta.topics || meta.topics.length === 0) {
    addError(rel, 'No topics assigned. Add at least 1 topic.');
  }

  // 7. Tags non-empty
  if (!meta.tags || meta.tags.length === 0) {
    addError(rel, 'No tags assigned. Add at least 1 tag.');
  }

  // 8. Related resources exist
  const related = meta.relatedResources || [];
  for (const link of related) {
    const targetSlug = link.split('/').pop();
    if (!allSlugs[targetSlug]) {
      addError(rel, `Broken relatedResources link: "${link}" -> slug "${targetSlug}" not found`);
    }
  }

  // 9. SEO block completeness
  if (!meta.seo) {
    addError(rel, 'Missing "seo" frontmatter block');
  } else {
    if (!meta.seo.metaDescription) {
      addWarning(rel, 'seo.metaDescription missing (fallback to top-level description)');
    }
    if (!meta.seo.keywords || meta.seo.keywords.length === 0) {
      addWarning(rel, 'seo.keywords missing or empty');
    }
  }

  // 10. FAQ section (strongly recommended)
  const hasFaq = /##\s+(Frequently Asked Questions|Preguntas Frecuentes|FAQ)/i.test(body);
  if (!hasFaq) {
    addWarning(rel, 'No FAQ section found. Add ## Frequently Asked Questions for GEO optimization.');
  }

  // 11. No manual Related Resources in body
  const hasManualRelated = /##\s+(Related Resources|Recursos Relacionados)/i.test(body);
  if (hasManualRelated) {
    addError(rel, 'Manual "## Related Resources" section found in body. Use frontmatter relatedResources instead.');
    if (FIX) {
      const newBody = body.replace(/##\s+(Related Resources|Recursos Relacionados)[\s\S]*?(?=\n## |\n---|$)/i, '').trim();
      const newContent = matter.stringify(newBody, meta);
      fs.writeFileSync(full, newContent);
      console.log(`   🔧 Auto-removed manual Related Resources from ${rel}`);
    }
  }

  // 12. Body length
  const wordCount = countWords(body);
  if (wordCount < 200) {
    addWarning(rel, `Body content too short (${wordCount} words). Aim for 500+ words.`);
  }

  // 13. Duplicate headings (MD024 prevention)
  // Strip fenced code blocks (handling 3+ backtick fences) so headings inside
  // template examples are not counted as real headings.
  const bodyLines = body.split('\n');
  const filteredLines = [];
  let inFence = false;
  let fenceLen = 0;
  for (const line of bodyLines) {
    const fenceMatch = line.match(/^(`{3,})/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceLen = fenceMatch[1].length;
        continue;
      } else if (fenceMatch[1].length >= fenceLen) {
        inFence = false;
        fenceLen = 0;
        continue;
      }
    }
    if (!inFence) filteredLines.push(line);
  }
  const bodyWithoutCodeBlocks = filteredLines.join('\n');
  const headings = bodyWithoutCodeBlocks.match(/^#{2,3}\s+.+$/gm) || [];
  const seenH2 = new Set();
  const seenH3 = new Map(); // parent -> set
  let currentH2 = '';
  for (const h of headings) {
    const level = h.match(/^#+/)[0].length;
    const text = h.replace(/^#+\s+/, '').trim().toLowerCase();
    if (level === 2) {
      if (seenH2.has(text)) {
        addWarning(rel, `Duplicate H2 heading: "${text}". Make unique to prevent MD024 lint errors.`);
      }
      seenH2.add(text);
      currentH2 = text;
      seenH3.set(currentH2, new Set());
    } else if (level === 3 && currentH2) {
      const h3Set = seenH3.get(currentH2);
      if (h3Set && h3Set.has(text)) {
        addWarning(rel, `Duplicate H3 heading under "${currentH2}": "${text}"`);
      }
      if (h3Set) h3Set.add(text);
    }
  }
});

// ─── Phase 3: Cross-file checks ──────────────────────────────────────────────
// Duplicate slugs
Object.entries(allSlugs).forEach(([slug, files]) => {
  if (files.length > 1) {
    addError(files[0], `Duplicate slug "${slug}" also found in: ${files.slice(1).join(', ')}`);
  }
});

// Missing translations (both sets are keyed by the base ".md" path)
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

// ─── Report ──────────────────────────────────────────────────────────────────
console.log(`\n📋 Content Validation Report`);
console.log(`   Files checked: ${allResources.length}`);
console.log(`   Errors: ${errors.length}`);
console.log(`   Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\n❌ Errors (must fix before commit):');
  errors.forEach(e => console.log(`   ${e}`));
}

if (warnings.length > 0) {
  console.log(`\n${STRICT ? '❌' : '⚠️'}  Warnings${STRICT ? ' (strict mode: treated as errors)' : ''}:`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (errors.length === 0 && (warnings.length === 0 || !STRICT)) {
  console.log('\n✅ All content passes validation!');
  process.exit(0);
} else {
  process.exit(1);
}
