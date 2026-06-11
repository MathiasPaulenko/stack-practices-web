import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site';
import { isSpanish } from '../lib/content';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const [recipes, patterns, docs, guides] = await Promise.all([
    getCollection('recipes', ({ id }) => !isSpanish(id)),
    getCollection('patterns', ({ id }) => !isSpanish(id)),
    getCollection('docs', ({ id }) => !isSpanish(id)),
    getCollection('guides', ({ id }) => !isSpanish(id)),
  ]);

  const allEntries = [...recipes, ...patterns, ...docs, ...guides]
    .sort((a, b) => {
      const dateA = new Date(a.data.lastUpdated).getTime();
      const dateB = new Date(b.data.lastUpdated).getTime();
      return dateB - dateA;
    })
    .slice(0, 50);

  const items = allEntries
    .map((entry) => {
      const d = entry.data;
      const url = `${SITE.url}/${d.contentType}/${d.slug}`;
      const date = new Date(d.lastUpdated).toUTCString();
      const title = escapeXml(d.title);
      const description = escapeXml(d.description);
      const contentType = d.contentType;

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${date}</pubDate>
      <description>${description}</description>
      <category>${contentType}</category>
    </item>`;
    })
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.title)}</title>
    <link>${SITE.url}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE.url}/favicon.svg</url>
      <title>${escapeXml(SITE.title)}</title>
      <link>${SITE.url}</link>
    </image>${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
