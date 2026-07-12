import { getCollection, type CollectionEntry } from 'astro:content';

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

/**
 * Parses a "Frequently Asked Questions" / "Preguntas Frecuentes" section from
 * raw markdown and returns Q&A pairs for FAQPage structured data.
 * Supports two formats:
 *   **Q: question?**\nA: answer
 *   ### question?\n\nanswer
 */
export function extractFaqs(markdown: string): { question: string; answer: string }[] {
  if (!markdown) return [];
  const faqHeading = /^##\s+(Frequently Asked Questions|Preguntas Frecuentes|FAQ)\s*$/im;
  const match = faqHeading.exec(markdown);
  if (!match) return [];

  const section = markdown.slice(match.index + match[0].length);
  // Stop at the next H2 (start of a new top-level section).
  const nextH2 = section.search(/^##\s+/m);
  const body = nextH2 === -1 ? section : section.slice(0, nextH2);

  const faqs: { question: string; answer: string }[] = [];

  // Format A: **Q: ...?** / A: ...
  const qaRegex = /\*\*Q:\s*([\s\S]*?)\*\*\s*\n+A:\s*([\s\S]*?)(?=\n\s*\*\*Q:|\n\s*###|\s*$)/g;
  let m: RegExpExecArray | null;
  while ((m = qaRegex.exec(body)) !== null) {
    faqs.push({ question: clean(m[1]), answer: clean(m[2]) });
  }
  if (faqs.length > 0) return faqs;

  // Format B: ### question? / answer
  const hRegex = /^###\s+(.+?)\s*\n+([\s\S]*?)(?=\n###\s+|\s*$)/gm;
  while ((m = hRegex.exec(body)) !== null) {
    faqs.push({ question: clean(m[1]), answer: clean(m[2]) });
  }
  return faqs;
}

function clean(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Builds a lookup map of `/contentType/slug` -> resolved link metadata (English). */
export async function buildResourceIndex() {
  const collections = ['recipes', 'patterns', 'docs', 'guides'] as const;
  const index = new Map<string, { title: string; description: string; contentType: string; slug: string }>();

  for (const name of collections) {
    const entries = await getCollection(name, ({ id }) => !isSpanish(id));
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
  return index;
}

/** Builds a tag index: tag -> list of resources with title, href, description, contentType. */
export async function buildTagIndex(locale: 'en' | 'es') {
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
  return index;
}

/** Resolves relatedResources paths into renderable link data for a given locale. */
export function resolveRelated(
  paths: string[],
  index: Map<string, { title: string; description: string; contentType: string; slug: string }>,
  locale: 'en' | 'es',
) {
  const prefix = locale === 'es' ? '/es' : '';
  return paths
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
