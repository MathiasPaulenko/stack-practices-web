import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { extractFaqs, isSpanish } from '../../../lib/content';
import { faqPage } from '../../../lib/schema';

export async function getStaticPaths() {
  const recipes = await getCollection('recipes', ({ id }) => !isSpanish(id));
  return recipes.map((entry) => ({
    params: { slug: entry.data.slug },
    props: { entry },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: any };
  const faqs = (await extractFaqs(entry.body ?? '')).slice(0, 3);
  if (faqs.length === 0) {
    return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } });
  }
  const schema = faqPage(faqs);
  return new Response(JSON.stringify({ faqSchema: schema }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
