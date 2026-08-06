import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isSpanish } from '../../../lib/content';

export const GET: APIRoute = async () => {
  const patterns = await getCollection('patterns', ({ id, data }) => isSpanish(id) && !data.draft);
  const entries = patterns.map((p) => ({
    title: p.data.title,
    description: p.data.description,
    href: `/es/patterns/${p.data.slug}/`,
    difficulty: p.data.difficulty,
    tags: p.data.tags,
  }));
  return new Response(JSON.stringify({ entries }), { headers: { 'Content-Type': 'application/json' } });
};
