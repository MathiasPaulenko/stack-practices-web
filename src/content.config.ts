import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Shared topic slugs (language-agnostic keys).
 * Add new topics here and they become valid for all content types.
 */
export const topicsEnum = z.enum([
  'data',
  'api',
  'authentication',
  'file-handling',
  'performance',
  'testing',
  'architecture',
  'design',
  'devops',
  'databases',
  'concurrency',
  'security',
  'ai',
  'frontend',
  'infrastructure',
  'messaging',
  'observability',
  'graphql',
  'serverless',
  'caching',
]);

const difficultyEnum = z.enum(['beginner', 'intermediate', 'advanced']);

/**
 * Base schema shared by every content type.
 * Mirrors the frontmatter produced by the stackp-content-creator skill.
 */
const baseSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  metaDescription: z.string().min(50).max(170),
  difficulty: difficultyEnum,
  topics: z.array(topicsEnum).min(1),
  tags: z.array(z.string()).min(1),
  relatedResources: z.array(z.string()).default([]),
  lastUpdated: z.coerce.date(),
  author: z.string().default('StackPractices'),
  draft: z.boolean().default(false),
  seo: z.object({
    metaDescription: z.string(),
    keywords: z.array(z.string()).default([]),
  }),
});

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes', generateId: ({ entry }: { entry: string }) => entry.replace(/\.md$/, '') }),
  schema: baseSchema.extend({
    contentType: z.literal('recipes'),
  }),
});

const patterns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/patterns', generateId: ({ entry }: { entry: string }) => entry.replace(/\.md$/, '') }),
  schema: baseSchema.extend({
    contentType: z.literal('patterns'),
    category: z
      .enum(['creational', 'structural', 'behavioral', 'architectural'])
      .optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs', generateId: ({ entry }: { entry: string }) => entry.replace(/\.md$/, '') }),
  schema: baseSchema.extend({
    contentType: z.literal('docs'),
    templateType: z
      .enum(['readme', 'adr', 'api-doc', 'runbook', 'guideline', 'changelog', 'code-of-conduct', 'postmortem', 'pr-template', 'onboarding', 'bug-report', 'feature-request', 'release-notes', 'api-deprecation', 'slo-document', 'data-retention-policy', 'security-incident-response', 'disaster-recovery', 'user-story', 'database-migration-runbook', 'dependency-audit', 'penetration-test', 'post-deployment-checklist'])
      .optional(),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides', generateId: ({ entry }: { entry: string }) => entry.replace(/\.md$/, '') }),
  schema: baseSchema.extend({
    contentType: z.literal('guides'),
    estimatedReadTime: z.number().optional(),
  }),
});

export const collections = { recipes, patterns, docs, guides };
