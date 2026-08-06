import type { APIRoute } from 'astro';
import { buildTagIndex } from '../../../lib/content';

export const GET: APIRoute = async () => {
  const tagIndex = await buildTagIndex('es');
  const tags = Array.from(tagIndex.entries())
    .map(([tag, items]) => ({ tag, count: items.length }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return new Response(JSON.stringify({ tags, total: tags.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
