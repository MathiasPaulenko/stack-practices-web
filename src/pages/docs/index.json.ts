import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isSpanish } from '../../lib/content';

export const GET: APIRoute = async () => {
  const docs = await getCollection('docs', ({ id, data }) => !isSpanish(id) && !data.draft);
  const entries = docs.map((d) => ({
    title: d.data.title,
    description: d.data.description,
    href: `/docs/${d.data.slug}/`,
    difficulty: d.data.difficulty,
    tags: d.data.tags,
  }));
  return new Response(JSON.stringify({ entries }), { headers: { 'Content-Type': 'application/json' } });
};
