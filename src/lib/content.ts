import { getCollection, type CollectionEntry } from 'astro:content';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { codeToHast } from 'shiki';

const FALLBACK_LANG = 'txt';

const langMap: Record<string, string> = {
  'c#': 'csharp',
  'c++': 'cpp',
  'git': 'shell',
  'sh': 'shell',
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'yml': 'yaml',
  'md': 'markdown',
  'docker': 'dockerfile',
};

function resolveLang(raw?: string | string[]): string {
  if (!raw) return FALLBACK_LANG;
  const rawStr = Array.isArray(raw) ? raw.join(' ') : String(raw);
  const langClass = rawStr.split(/\s+/).find((c) => c.startsWith('language-'));
  const lang = langClass ? langClass.replace(/^language-/, '') : rawStr;
  return langMap[lang] || lang || FALLBACK_LANG;
}

function getClassName(node: any): string {
  const cls = node.properties?.className ?? node.properties?.class;
  if (!cls) return '';
  return Array.isArray(cls) ? cls.join(' ') : String(cls);
}

function getText(node: any): string {
  if (node.type === 'text') return node.value || '';
  if (node.type === 'element' && node.children) {
    return node.children.map(getText).join('');
  }
  return '';
}

async function highlightFaqPre(preNode: any): Promise<any> {
  const codeNode = preNode.children.find(
    (c: any) => c.type === 'element' && c.tagName === 'code',
  );
  if (!codeNode) return preNode;

  const rawCode = getText(codeNode);
  const lang = resolveLang(getClassName(codeNode));

  if (lang === 'txt') {
    const fallback = { ...preNode, properties: { ...preNode.properties, className: 'astro-code' } };
    delete fallback.properties.class;
    return fallback;
  }

  let hast;
  try {
    hast = await codeToHast(rawCode, { lang, theme: 'github-dark' });
  } catch {
    try {
      hast = await codeToHast(rawCode, { lang: 'shell', theme: 'github-dark' });
    } catch {
      const fallback = { ...preNode, properties: { ...preNode.properties, className: 'astro-code' } };
      delete fallback.properties.class;
      return fallback;
    }
  }

  const newPre = hast.children[0];
  if (!newPre || newPre.type !== 'element' || newPre.tagName !== 'pre') {
    const fallback = { ...preNode, properties: { ...preNode.properties, className: 'astro-code' } };
    delete fallback.properties.class;
    return fallback;
  }

  delete newPre.properties.class;
  newPre.properties = {
    ...newPre.properties,
    className: 'astro-code',
  };
  delete newPre.properties.style;
  delete newPre.properties.tabindex;
  delete newPre.properties['data-language'];
  delete newPre.properties.dataLanguage;

  const codeChild = newPre.children?.[0] as any;
  if (codeChild?.tagName === 'code') {
    delete codeChild.properties.class;
    codeChild.properties = {
      ...codeChild.properties,
      className: `language-${lang}`,
    };
  }

  return newPre;
}

function rehypeFaqCode() {
  return async (tree: any) => {
    const preNodes: { node: any; index: number | undefined; parent: any }[] = [];
    visit(tree, 'element', (node: any, index: number | undefined, parent: any) => {
      if (node.tagName === 'pre' && parent) {
        preNodes.push({ node, index, parent });
      }
    });
    for (const { node, index, parent } of preNodes) {
      if (index !== undefined) {
        parent.children[index] = await highlightFaqPre(node);
      }
    }
  };
}

export type AnyEntry =
  | CollectionEntry<'recipes'>
  | CollectionEntry<'patterns'>
  | CollectionEntry<'docs'>
  | CollectionEntry<'guides'>;

/** A resource is a `.es.md` translation if its id ends with `.es`. */
export function isSpanish(id: string): boolean {
  return id.endsWith('.es');
}

/** Returns the canonical slug from frontmatter. */
export function entryHref(contentType: string, slug: string, locale: 'en' | 'es'): string {
  const prefix = locale === 'es' ? '/es' : '';
  return `${prefix}/${contentType}/${slug}/`;
}

const faqProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeFaqCode)
  .use(rehypeStringify, { allowDangerousHtml: true });

async function markdownToHtml(markdown: string): Promise<string> {
  try {
    return String(await faqProcessor.process(markdown));
  } catch {
    return '';
  }
}

export interface Faq {
  question: string;
  answer: string;
  answerHtml: string;
}

/**
 * Parses a "Frequently Asked Questions" / "Preguntas Frecuentes" section from
 * raw markdown and returns Q&A pairs for FAQPage structured data and rendering.
 * Supports two formats:
 *   **Q: question?**\nA: answer
 *   ### question?\n\nanswer
 */
export async function extractFaqs(markdown: string, maxFaqs = 10): Promise<Faq[]> {
  if (!markdown) return [];
  const faqHeading = /^##\s+(Frequently Asked Questions|Preguntas Frecuentes|FAQ)\s*$/im;
  const match = faqHeading.exec(markdown);
  if (!match) return [];

  const section = markdown.slice(match.index + match[0].length);
  // Stop at the next H2 (start of a new top-level section).
  const nextH2 = section.search(/^##\s+/m);
  const body = nextH2 === -1 ? section : section.slice(0, nextH2);

  const faqs: Faq[] = [];

  // Format A: **Q: ...?** / A: ...
  const qaRegex = /\*\*Q:\s*([\s\S]*?)\*\*\s*\n+A:\s*([\s\S]*?)(?=\n\s*\*\*Q:|\n\s*###|\s*(?![\s\S]))/g;
  let m: RegExpExecArray | null;
  while ((m = qaRegex.exec(body)) !== null) {
    const rawAnswer = m[2];
    faqs.push({
      question: clean(m[1]),
      answer: clean(rawAnswer, Infinity),
      answerHtml: await markdownToHtml(rawAnswer),
    });
    if (faqs.length >= maxFaqs) break;
  }
  if (faqs.length > 0) return faqs;

  // Format B: ### question? / answer
  const hRegex = /^###\s+(.+?)\s*\n+([\s\S]*?)(?=\n###\s+|\s*(?![\s\S]))/gm;
  while ((m = hRegex.exec(body)) !== null) {
    const rawAnswer = m[2];
    faqs.push({
      question: clean(m[1]),
      answer: clean(rawAnswer, Infinity),
      answerHtml: await markdownToHtml(rawAnswer),
    });
    if (faqs.length >= maxFaqs) break;
  }
  return faqs;
}

function smartTruncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

function clean(text: string, maxLength = 200): string {
  return smartTruncate(
    text
      .replace(/\*\*/g, '')
      .replace(/`/g, '')
      // Escape raw HTML tags so they appear as plain text in JSON-LD answers
      // and don't get picked up by downstream HTML audits.
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\s+/g, ' ')
      .trim(),
    maxLength
  );
}

const resourceIndexCache = new Map<'en' | 'es', Map<string, { title: string; description: string; contentType: string; slug: string }>>();

/** Builds a lookup map of `/contentType/slug` -> resolved link metadata for the requested locale. */
export async function buildResourceIndex(locale: 'en' | 'es' = 'en') {
  const cached = resourceIndexCache.get(locale);
  if (cached) return cached;

  const collections = ['recipes', 'patterns', 'docs', 'guides'] as const;
  const index = new Map<string, { title: string; description: string; contentType: string; slug: string }>();

  for (const name of collections) {
    const entries = await getCollection(name, ({ id }) => {
      const isEs = isSpanish(id);
      return locale === 'es' ? isEs : !isEs;
    });
    for (const entry of entries) {
      const d = entry.data;
      index.set(`/${d.contentType}/${d.slug}`, {
        title: d.title,
        description: d.description,
        contentType: d.contentType,
        slug: d.slug,
      });
    }
  }
  resourceIndexCache.set(locale, index);
  return index;
}

const tagIndexCache = new Map<'en' | 'es', Map<string, { title: string; href: string; description: string; contentType: string; tags: string[] }[]>>();

/** Builds a tag index: tag -> list of resources with title, href, description, contentType. */
export async function buildTagIndex(locale: 'en' | 'es') {
  const cached = tagIndexCache.get(locale);
  if (cached) return cached;

  const collections = ['recipes', 'patterns', 'docs', 'guides'] as const;
  const index = new Map<string, { title: string; href: string; description: string; contentType: string; tags: string[] }[]>();
  const prefix = locale === 'es' ? '/es' : '';

  for (const name of collections) {
    const entries = await getCollection(name, ({ id }) => {
      const isEs = isSpanish(id);
      return locale === 'es' ? isEs : !isEs;
    });
    for (const entry of entries) {
      const d = entry.data;
      if (d.draft) continue;
      for (const tag of d.tags) {
        const items = index.get(tag) ?? [];
        items.push({
          title: d.title,
          href: `${prefix}/${d.contentType}/${d.slug}/`,
          description: d.description,
          contentType: d.contentType,
          tags: d.tags,
        });
        index.set(tag, items);
      }
    }
  }
  tagIndexCache.set(locale, index);
  return index;
}

export const MIN_TAG_RESOURCES = 3;

const MAX_RELATED = 8;

/** Returns a Set of tags that have at least MIN_TAG_RESOURCES resources for the given locale. */
export async function getPublicTagSet(locale: 'en' | 'es') {
  const tagIndex = await buildTagIndex(locale);
  return new Set(
    Array.from(tagIndex.entries())
      .filter(([, items]) => items.length >= MIN_TAG_RESOURCES)
      .map(([tag]) => tag),
  );
}

export interface TopicEntry {
  title: string;
  description: string;
  href: string;
  difficulty?: string;
  tags?: string[];
}

const topicEntriesCache = new Map<string, TopicEntry[]>();

/** Returns all resources (recipes, patterns, docs, guides) matching a topic for a locale. */
export async function getTopicEntries(topic: string, locale: 'en' | 'es') {
  const key = `${locale}:${topic}`;
  const cached = topicEntriesCache.get(key);
  if (cached) return cached;

  const collections = ['recipes', 'patterns', 'docs', 'guides'] as const;
  const entries: AnyEntry[] = [];
  for (const name of collections) {
    const col = await getCollection(name, ({ id, data }) => {
      const isEs = isSpanish(id);
      return locale === 'es' ? isEs : !isEs && !data.draft;
    });
    entries.push(...col);
  }
  const prefix = locale === 'es' ? '/es' : '';
  const result = entries
    .filter((entry) => (entry.data.topics as string[]).some((t) => t === topic))
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      href: `${prefix}/${entry.data.contentType}/${entry.data.slug}/`,
      difficulty: entry.data.difficulty,
      tags: entry.data.tags,
    }));
  topicEntriesCache.set(key, result);
  return result;
}

export function resolveRelated(
  paths: string[],
  index: Map<string, { title: string; description: string; contentType: string; slug: string }>,
  locale: 'en' | 'es',
) {
  const prefix = locale === 'es' ? '/es' : '';
  return paths
    .slice(0, MAX_RELATED)
    .map((p) => {
      const found = index.get(p);
      if (!found) return null;
      return {
        title: found.title,
        description: found.description,
        href: `${prefix}/${found.contentType}/${found.slug}/`,
        contentType: found.contentType,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
