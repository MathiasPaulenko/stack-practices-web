import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { isSpanish } from '../../lib/content';

export const getStaticPaths = (async () => {
  const collections = await Promise.all([
    getCollection('recipes'),
    getCollection('patterns'),
    getCollection('docs'),
    getCollection('guides'),
  ]);

  const topicMap = new Map<string, { title: string; description: string; href: string; difficulty?: string; tags?: string[] }[]>();

  for (const col of collections) {
    for (const entry of col) {
      if (isSpanish(entry.id)) continue;
      for (const topic of entry.data.topics as string[]) {
        const list = topicMap.get(topic) ?? [];
        list.push({
          title: entry.data.title,
          description: entry.data.description,
          href: `/${entry.data.contentType}/${entry.data.slug}/`,
          difficulty: entry.data.difficulty,
          tags: entry.data.tags,
        });
        topicMap.set(topic, list);
      }
    }
  }

  return Array.from(topicMap.entries()).map(([topic, entries]) => ({
    params: { topic },
    props: { entries },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { entries } = props as { entries: { title: string; description: string; href: string; difficulty?: string; tags?: string[] }[] };
  return new Response(JSON.stringify({ entries }), { headers: { 'Content-Type': 'application/json' } });
};
