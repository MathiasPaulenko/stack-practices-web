import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isSpanish } from '../../lib/content';

export const GET: APIRoute = async () => {
  const recipes = await getCollection('recipes', ({ id, data }) => !isSpanish(id) && !data.draft);
  const entries = recipes.map((r) => ({
    title: r.data.title,
    description: r.data.description,
    href: `/recipes/${r.data.slug}/`,
    difficulty: r.data.difficulty,
    tags: r.data.tags,
  }));
  return new Response(JSON.stringify({ entries }), { headers: { 'Content-Type': 'application/json' } });
};
