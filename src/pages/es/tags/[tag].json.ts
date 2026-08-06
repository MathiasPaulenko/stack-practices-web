import type { APIRoute, GetStaticPaths } from 'astro';
import { buildTagIndex, MIN_TAG_RESOURCES } from '../../../lib/content';

export const getStaticPaths = (async () => {
  const tagIndex = await buildTagIndex('es');
  return Array.from(tagIndex.entries())
    .filter(([, items]) => items.length >= MIN_TAG_RESOURCES)
    .map(([tag, items]) => ({
      params: { tag },
      props: { tag, items },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { items } = props as { items: { title: string; href: string; description: string; contentType: string; tags: string[] }[] };
  return new Response(JSON.stringify({ entries: items }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
