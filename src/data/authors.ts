/**
 * Single source of truth for author metadata.
 *
 * StackPractices currently has one author, but keeping this in a dedicated
 * data module makes it easy to consume from schemas, layout components, and
 * static pages without duplicating values.
 */

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

export const PRIMARY_AUTHOR: Author = {
  name: 'Mathias Paulenko',
  url: 'https://mathiaspaulenko.com',
  image: 'https://stackpractices.com/mathias-avatar.png',
  jobTitle: 'Software Engineer',
  jobTitleEs: 'Ingeniero de Software',
  description:
    'Software engineer with 12+ years of experience building production systems across Python, JavaScript, React, and DevOps.',
  descriptionEs:
    'Ingeniero de software con más de 12 años de experiencia construyendo sistemas de producción con Python, JavaScript, React y DevOps.',
  bio: 'Software engineer with 12+ years of experience building production systems across Python, JavaScript, React, and DevOps. I have contributed to enterprise projects spanning CI/CD pipelines, API design, cloud infrastructure, and full-stack development.',
  bioEs: 'Ingeniero de software con más de 12 años de experiencia construyendo sistemas de producción con Python, JavaScript, React y DevOps. He contribuido a proyectos empresariales que abarcan pipelines de CI/CD, diseño de APIs, infraestructura cloud y desarrollo full-stack.',
  sameAs: [
    'https://github.com/MathiasPaulenko',
    'https://www.linkedin.com/in/mathias-paulenko-echeverz',
  ],
  knowsAbout: [
    'Software Engineering',
    'Python',
    'JavaScript',
    'React',
    'DevOps',
    'CI/CD',
    'API Design',
    'Cloud Infrastructure',
    'Full-Stack Development',
    'System Design',
  ],
  email: 'mathias.paulenko@outlook.com',
};
