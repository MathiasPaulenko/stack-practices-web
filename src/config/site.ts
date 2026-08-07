/**
 * Central site configuration.
 * Single source of truth for SEO defaults, navigation, and brand metadata.
 */

import { PRIMARY_AUTHOR } from '../data/authors';

export const SITE = {
  name: 'StackPractices',
  domain: 'stackpractices.com',
  url: 'https://stackpractices.com',
  title: 'StackPractices — Code Recipes, Patterns and Engineering Docs',
  description:
    'A practical knowledge base for software engineers: code recipes, design patterns, and reusable technical documentation across multiple languages.',
  defaultLocale: 'en',
  locales: ['en', 'es'] as const,
  author: PRIMARY_AUTHOR.name,
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
  { label: 'Recipes', href: '/recipes/' },
  { label: 'Patterns', href: '/patterns/' },
  { label: 'Docs', href: '/docs/' },
  { label: 'Guides', href: '/guides/' },
  { label: 'Tags', href: '/tags/' },
  { label: 'Topics', href: '/topics/' },
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
    { label: 'Recipes', labelEs: 'Recetas', href: '/recipes/' },
    { label: 'Patterns', labelEs: 'Patrones', href: '/patterns/' },
    { label: 'Documentation', labelEs: 'Documentación', href: '/docs/' },
    { label: 'Guides', labelEs: 'Guías', href: '/guides/' },
  ],
  site: [
    { label: 'About', labelEs: 'Acerca de', href: '/about/' },
    { label: 'Authors', labelEs: 'Autores', href: '/authors/' },
    { label: 'Contact', labelEs: 'Contacto', href: '/contact/' },
    { label: 'Tags', labelEs: 'Etiquetas', href: '/tags/' },
    { label: 'Topics', labelEs: 'Temas', href: '/topics/' },
  ],
  legal: [
    { label: 'Privacy', labelEs: 'Privacidad', href: '/privacy/' },
    { label: 'Terms', labelEs: 'Términos', href: '/terms/' },
    { label: 'Cookies', labelEs: 'Cookies', href: '/cookies/' },
    { label: 'Legal Notice', labelEs: 'Aviso Legal', href: '/legal-notice/' },
    { label: 'Affiliate Disclosure', labelEs: 'Divulgación de Afiliados', href: '/affiliate-disclosure/' },
    { label: 'Editorial Policy', labelEs: 'Política Editorial', href: '/editorial-policy/' },
  ],
} as const;
