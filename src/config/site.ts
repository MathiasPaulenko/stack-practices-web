/**
 * Central site configuration.
 * Single source of truth for SEO defaults, navigation, and brand metadata.
 */

export const SITE = {
  name: 'StackPractices',
  domain: 'stackpractices.com',
  url: 'https://stackpractices.com',
  title: 'StackPractices — Code Recipes, Patterns & Engineering Docs',
  description:
    'A practical knowledge base for software engineers: code recipes, design patterns, and reusable technical documentation across multiple languages.',
  defaultLocale: 'en',
  locales: ['en', 'es'] as const,
  author: 'StackPractices',
  twitter: '@stackpractices',
  themeColor: '#2563eb',
} as const;

export type Locale = (typeof SITE.locales)[number];

/** Content types and their listing routes. */
export const CONTENT_TYPES = [
  { slug: 'recipes', label: 'Recipes', labelEs: 'Recetas', description: 'Practical solutions to real development problems.' },
  { slug: 'patterns', label: 'Patterns', labelEs: 'Patrones', description: 'Design and architecture patterns with real examples.' },
  { slug: 'docs', label: 'Documentation', labelEs: 'Documentación', description: 'Reusable technical documentation templates.' },
  { slug: 'guides', label: 'Guides', labelEs: 'Guías', description: 'Long-form content connecting recipes and patterns.' },
] as const;

/** Main navigation (By Type). */
export const MAIN_NAV = [
  { label: 'Recipes', href: '/recipes' },
  { label: 'Patterns', href: '/patterns' },
  { label: 'Docs', href: '/docs' },
  { label: 'Guides', href: '/guides' },
  { label: 'Tags', href: '/tags' },
  { label: 'Topics', href: '/topics' },
] as const;

/** Technologies (By Technology navigation dimension). */
export const TECHNOLOGIES = [
  'python',
  'java',
  'javascript',
  'typescript',
  'sql',
  'bash',
  'docker',
  'git',
] as const;

/** Footer link groups. */
export const FOOTER_NAV = {
  content: [
    { label: 'Recipes', href: '/recipes' },
    { label: 'Patterns', href: '/patterns' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Guides', href: '/guides' },
  ],
  site: [
    { label: 'About', href: '/about' },
    { label: 'Authors', href: '/authors' },
    { label: 'Contact', href: '/contact' },
    { label: 'Tags', href: '/tags' },
    { label: 'Topics', href: '/topics' },
  ],
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'Legal Notice', href: '/legal-notice' },
    { label: 'Affiliate Disclosure', href: '/affiliate-disclosure' },
  ],
} as const;
