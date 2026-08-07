/**
 * Single source of truth for author metadata.
 *
 * StackPractices currently has one author, but keeping this in a dedicated
 * data module makes it easy to consume from schemas, layout components, and
 * static pages without duplicating values.
 */

import authorsData from './authors.json';

export interface Author {
  name: string;
  url: string;
  image: string;
  jobTitle: string;
  jobTitleEs: string;
  description: string;
  descriptionEs: string;
  bio: string;
  bioEs: string;
  sameAs: string[];
  knowsAbout: string[];
  email: string;
}

export const PRIMARY_AUTHOR: Author = authorsData.authors[0];
