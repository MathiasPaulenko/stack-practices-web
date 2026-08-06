import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isSpanish } from '../../lib/content';

export const GET: APIRoute = async () => {
  const guides = await getCollection('guides', ({ id, data }) => !isSpanish(id) && !data.draft);
  const entries = guides.map((g) => ({
    title: g.data.title,
    description: g.data.description,
    href: `/guides/${g.data.slug}/`,
    difficulty: g.data.difficulty,
    tags: g.data.tags,
  }));
  return new Response(JSON.stringify({ entries }), { headers: { 'Content-Type': 'application/json' } });
};
