import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { extractFaqs, isSpanish } from '../../../../lib/content';
import { faqPage } from '../../../../lib/schema';

export async function getStaticPaths() {
  const patterns = await getCollection('patterns', ({ id }) => isSpanish(id));
  return patterns.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: any };
  const faqs = extractFaqs(entry.body ?? '').slice(0, 3);
  if (faqs.length === 0) {
    return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } });
  }
  const schema = faqPage(faqs);
  return new Response(JSON.stringify({ faqSchema: schema }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
