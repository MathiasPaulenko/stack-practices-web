import { SITE } from '../config/site';

/** Ensures a path ends with a trailing slash (for SSG directory URLs). */
function withSlash(url: string): string {
  return url === SITE.url ? url : url.endsWith('/') ? url : `${url}/`;
}

/** Maps difficulty to Schema.org educationalLevel. */
export function educationalLevel(difficulty: string): string {
  switch (difficulty) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
    default:
      return 'Beginner';
  }
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** Builds a BreadcrumbList schema. */
export function breadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: withSlash(`${SITE.url}${item.url}`),
    })),
  };
}

/** Builds a Person schema for author pages. */
export function person(opts: {
  name: string;
  url: string;
  image?: string;
  description?: string;
  jobTitle?: string;
  sameAs?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: opts.name,
    url: opts.url,
    ...(opts.image && { image: opts.image }),
    ...(opts.description && { description: opts.description }),
    ...(opts.jobTitle && { jobTitle: opts.jobTitle }),
    ...(opts.sameAs && opts.sameAs.length > 0 && { sameAs: opts.sameAs }),
  };
}

/** Builds a WebPage schema. */
export function webPage(opts: {
  name: string;
  description: string;
  url: string;
  locale: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: opts.name,
    description: opts.description,
    url: withSlash(`${SITE.url}${opts.url}`),
    inLanguage: opts.locale,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE.name,
      url: SITE.url,
    },
  };
}

/** Builds a TechArticle schema for recipe/pattern detail pages. */
export function techArticle(opts: {
  headline: string;
  description: string;
  url: string;
  locale: string;
  datePublished?: string;
  dateModified?: string;
  difficulty: string;
  section?: string;
  keywords?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: opts.headline,
    description: opts.description,
    url: withSlash(`${SITE.url}${opts.url}`),
    inLanguage: opts.locale,
    educationalLevel: educationalLevel(opts.difficulty),
    ...(opts.section && { articleSection: opts.section }),
    ...(opts.keywords && opts.keywords.length > 0 && { keywords: opts.keywords.join(', ') }),
    ...(opts.dateModified && { dateModified: opts.dateModified }),
    ...(opts.datePublished && { datePublished: opts.datePublished }),
    author: {
      '@type': 'Person',
      name: 'Mathias Vladimir Paulenko Echeverz',
      url: 'https://mathiaspaulenko.com',
      sameAs: [
        'https://github.com/MathiasPaulenko',
        'https://cn.linkedin.com/in/mathias-paulenko-echeverz',
      ],
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      url: SITE.url,
    },
  };
}

/** Builds a CollectionPage + ItemList schema for listing pages. */
export function collectionPage(opts: {
  name: string;
  description: string;
  url: string;
  locale: string;
  items: { name: string; url: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: withSlash(`${SITE.url}${opts.url}`),
    inLanguage: opts.locale,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: withSlash(`${SITE.url}${item.url}`),
      })),
    },
  };
}

/** Builds an Organization schema. */
export function organization(opts: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: opts.name,
    url: opts.url,
    ...(opts.logo && { logo: opts.logo }),
    ...(opts.description && { description: opts.description }),
  };
}

/** Builds a FAQPage schema from Q&A pairs. */
export function faqPage(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
