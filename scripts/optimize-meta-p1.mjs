import fs from 'node:fs';
import path from 'node:path';
import fm from 'front-matter';
import yaml from 'js-yaml';

const today = '2026-08-10';

const updates = [
  {
    slug: 'api-documentation-openapi',
    en: {
      title: 'OpenAPI Docs: Swagger and Redoc',
      description: 'Create interactive OpenAPI documentation with Swagger and Redoc. Includes examples in Python, JavaScript, and Java for clear API docs.',
      metaDescription: 'Create interactive OpenAPI documentation with Swagger and Redoc. Includes examples in Python, JavaScript, and Java for clear API docs.',
      seoKeywords: ['openapi docs', 'swagger documentation', 'redoc', 'api documentation example'],
    },
    es: {
      title: 'OpenAPI con Swagger y Redoc',
      description: 'Crea documentación OpenAPI interactiva con Swagger y Redoc. Incluye ejemplos en Python, JavaScript y Java para documentar APIs claras.',
      metaDescription: 'Crea documentación OpenAPI interactiva con Swagger y Redoc. Incluye ejemplos en Python, JavaScript y Java para documentar APIs claras.',
      seoKeywords: ['openapi docs', 'documentacion swagger', 'redoc', 'ejemplo documentacion api'],
    },
  },
  {
    slug: 'penetration-test-template',
    en: {
      title: 'Penetration Test Plan Template',
      description: 'Use this penetration test plan template to document findings, risks, reproduction steps, and remediation guidance for security assessments.',
      metaDescription: 'Use this penetration test plan template to document findings, risks, reproduction steps, and remediation guidance for security assessments.',
      seoKeywords: ['penetration test plan', 'pen test template', 'security assessment template'],
    },
    es: {
      title: 'Plantilla de Plan de Penetration Test',
      description: 'Usa esta plantilla de plan de penetration test para documentar hallazgos, riesgos, pasos de reproducción y remedios en auditorías de seguridad.',
      metaDescription: 'Usa esta plantilla de plan de penetration test para documentar hallazgos, riesgos, pasos de reproducción y remedios en auditorías de seguridad.',
      seoKeywords: ['plan de penetration test', 'plantilla pen test', 'auditoria seguridad'],
    },
  },
  {
    slug: 'optimistic-locking',
    en: {
      title: 'Optimistic Locking in Databases',
      description: 'Implement optimistic locking with versioning to prevent lost updates. Practical examples in PostgreSQL, MySQL, and JPA/Hibernate.',
      metaDescription: 'Implement optimistic locking with versioning to prevent lost updates. Practical examples in PostgreSQL, MySQL, and JPA/Hibernate.',
      seoKeywords: ['optimistic locking', 'database versioning', 'jpa optimistic locking'],
    },
    es: {
      title: 'Bloqueo Optimista: Versionado',
      description: 'Implementa bloqueo optimista con versionado para evitar actualizaciones perdidas. Ejemplos prácticos en PostgreSQL, MySQL y JPA/Hibernate.',
      metaDescription: 'Implementa bloqueo optimista con versionado para evitar actualizaciones perdidas. Ejemplos prácticos en PostgreSQL, MySQL y JPA/Hibernate.',
      seoKeywords: ['bloqueo optimista', 'versionado base de datos', 'jpa bloqueo optimista'],
    },
  },
  {
    slug: 'graphql-federated-entity-pattern',
    en: {
      title: 'GraphQL Federated Entity Pattern',
      description: 'Learn the GraphQL federated entity pattern with Apollo Federation. Share entity types across subgraphs using @key, @external, and @extends.',
      metaDescription: 'Learn the GraphQL federated entity pattern with Apollo Federation. Share entity types across subgraphs using @key, @external, and @extends.',
      seoKeywords: ['graphql federation', 'federated entity pattern', 'apollo federation'],
    },
    es: {
      title: 'Federación GraphQL: Entidades',
      description: 'Aprende el patrón de entidades federadas en GraphQL con Apollo Federation. Comparte tipos entre subgraphs con @key, @external y @extends.',
      metaDescription: 'Aprende el patrón de entidades federadas en GraphQL con Apollo Federation. Comparte tipos entre subgraphs con @key, @external y @extends.',
      seoKeywords: ['federacion graphql', 'entidades federadas', 'apollo federation'],
    },
  },
  {
    slug: 'context-object-pattern',
    en: {
      title: 'Context Object Pattern: Examples',
      description: 'Learn the Context Object Pattern to reduce parameter bloat. Practical examples in Python, Java, and JavaScript for request contexts and DI containers.',
      metaDescription: 'Learn the Context Object Pattern to reduce parameter bloat. Practical examples in Python, Java, and JavaScript for request contexts and DI containers.',
      seoKeywords: ['context object pattern', 'parameter bloat', 'request context'],
    },
    es: {
      title: 'Patrón Context Object: Ejemplos',
      description: 'Aprende el patrón Context Object para reducir el bloat de parámetros. Ejemplos en Python, Java y JavaScript para contextos de petición y DI.',
      metaDescription: 'Aprende el patrón Context Object para reducir el bloat de parámetros. Ejemplos en Python, Java y JavaScript para contextos de petición y DI.',
      seoKeywords: ['patron context object', 'bloat parametros', 'contexto de peticion'],
    },
  },
  {
    slug: 'partial-class-pattern',
    en: {
      title: 'Partial Class Pattern: Examples',
      description: 'Learn the Partial Class Pattern to split class definitions across multiple files. Examples in Python, Java, and JavaScript for code generation.',
      metaDescription: 'Learn the Partial Class Pattern to split class definitions across multiple files. Examples in Python, Java, and JavaScript for code generation.',
      seoKeywords: ['partial class pattern', 'split class files', 'code generation'],
    },
    es: {
      title: 'Patrón Partial Class: Ejemplos',
      description: 'Aprende el patrón Partial Class para dividir una clase en varios archivos. Ejemplos en Python, Java y JavaScript para generación de código.',
      metaDescription: 'Aprende el patrón Partial Class para dividir una clase en varios archivos. Ejemplos en Python, Java y JavaScript para generación de código.',
      seoKeywords: ['patron partial class', 'dividir clase archivos', 'generacion de codigo'],
    },
  },
  {
    slug: 'soft-deletes',
    en: {
      title: 'Soft Deletes: Database Pattern',
      description: 'Learn to implement soft deletes in databases. Practical examples in Python, JavaScript, and Java with flag columns, filtered queries, and hard deletes.',
      metaDescription: 'Learn to implement soft deletes in databases. Practical examples in Python, JavaScript, and Java with flag columns, filtered queries, and hard deletes.',
      seoKeywords: ['soft deletes', 'logical delete pattern', 'database soft delete'],
    },
    es: {
      title: 'Borrado Lógico: Guía Práctica',
      description: 'Aprende a implementar borrado lógico (soft deletes) en Python, JavaScript y Java. Ejemplos con columnas flag, consultas filtradas y eliminación permanente.',
      metaDescription: 'Aprende a implementar borrado lógico (soft deletes) en Python, JavaScript y Java. Ejemplos con columnas flag, consultas filtradas y eliminación permanente.',
      seoKeywords: ['borrado logico', 'soft delete postgresql', 'eliminacion suave'],
    },
  },
  {
    slug: 'data-migration-runbook-template',
    en: {
      title: 'Data Migration Runbook: Checklist',
      description: 'Use this data migration runbook template to plan safe migrations. Includes pre-migration checks, execution steps, rollback, and post-migration validation.',
      metaDescription: 'Use this data migration runbook template to plan safe migrations. Includes pre-migration checks, execution steps, rollback, and post-migration validation.',
      seoKeywords: ['data migration runbook', 'migration checklist', 'database migration template'],
    },
    es: {
      title: 'Plantilla de Runbook de Migración de Datos',
      description: 'Usa esta plantilla de runbook para migrar datos de forma segura. Incluye pre-chequeos, pasos de ejecución, rollback y validación post-migración.',
      metaDescription: 'Usa esta plantilla de runbook para migrar datos de forma segura. Incluye pre-chequeos, pasos de ejecución, rollback y validación post-migración.',
      seoKeywords: ['runbook migracion datos', 'checklist migracion', 'plantilla migracion base de datos'],
    },
  },
  {
    slug: 'test-strategy-document-template',
    en: {
      title: 'Test Strategy Document Template',
      description: 'Define your testing approach with this test strategy document template. Covers scope, types, tools, entry/exit criteria, risks, and schedule.',
      metaDescription: 'Define your testing approach with this test strategy document template. Covers scope, types, tools, entry/exit criteria, risks, and schedule.',
      seoKeywords: ['test strategy document', 'test plan template', 'testing approach'],
    },
    es: {
      title: 'Plantilla de Estrategia de Pruebas',
      description: 'Define tu enfoque de pruebas con esta plantilla de estrategia. Cubre alcance, tipos, herramientas, criterios de entrada/salida, riesgos y cronograma.',
      metaDescription: 'Define tu enfoque de pruebas con esta plantilla de estrategia. Cubre alcance, tipos, herramientas, criterios de entrada/salida, riesgos y cronograma.',
      seoKeywords: ['estrategia de pruebas', 'plan de pruebas', 'plantilla testing'],
    },
  },
  {
    slug: 'encryption-key-rotation-runbook',
    en: {
      title: 'Encryption Key Rotation: Runbook',
      description: 'Use this encryption key rotation runbook to rotate keys with zero downtime. Covers schedules, dual-key migration, verification, and rollback.',
      metaDescription: 'Use this encryption key rotation runbook to rotate keys with zero downtime. Covers schedules, dual-key migration, verification, and rollback.',
      seoKeywords: ['encryption key rotation', 'kms key rotation', 'key management runbook'],
    },
    es: {
      title: 'Runbook de Rotación de Claves',
      description: 'Usa este runbook de rotación de claves para rotarlas sin downtime. Cubre cronogramas, migración dual, verificación y rollback.',
      metaDescription: 'Usa este runbook de rotación de claves para rotarlas sin downtime. Cubre cronogramas, migración dual, verificación y rollback.',
      seoKeywords: ['rotacion claves cifrado', 'rotacion claves kms', 'gestion de claves'],
    },
  },
  {
    slug: 'graphql-api-design-guideline',
    en: {
      title: 'GraphQL API Design Guidelines',
      description: 'GraphQL API design guidelines with schema structure, naming, mutations, pagination, auth, rate limiting, versioning, and federation rules.',
      metaDescription: 'GraphQL API design guidelines with schema structure, naming, mutations, pagination, auth, rate limiting, versioning, and federation rules.',
      seoKeywords: ['graphql api design', 'graphql schema design', 'graphql best practices'],
    },
    es: {
      title: 'Guía de Diseño de GraphQL API',
      description: 'Guía de diseño de APIs GraphQL con estructura de schema, nombres, mutaciones, paginación, auth, rate limiting, versionado y federación.',
      metaDescription: 'Guía de diseño de APIs GraphQL con estructura de schema, nombres, mutaciones, paginación, auth, rate limiting, versionado y federación.',
      seoKeywords: ['diseno api graphql', 'schema graphql', 'mejores practicas graphql'],
    },
  },
  {
    slug: 'technical-spec-template',
    en: {
      title: 'Technical Specification Template',
      description: 'Use this technical specification template to document requirements, design decisions, architecture, API contracts, and acceptance criteria.',
      metaDescription: 'Use this technical specification template to document requirements, design decisions, architecture, API contracts, and acceptance criteria.',
      seoKeywords: ['technical specification template', 'tech spec template', 'software design document'],
    },
    es: {
      title: 'Plantilla de Especificación Técnica',
      description: 'Usa esta plantilla de especificación técnica para documentar requisitos, decisiones de diseño, arquitectura, contratos de API y criterios de aceptación.',
      metaDescription: 'Usa esta plantilla de especificación técnica para documentar requisitos, decisiones de diseño, arquitectura, contratos de API y criterios de aceptación.',
      seoKeywords: ['especificacion tecnica', 'plantilla tech spec', 'documento diseno software'],
    },
  },
  {
    slug: 'grpc-api',
    en: {
      title: 'gRPC API with Protocol Buffers',
      description: 'Implement a gRPC API with Protocol Buffers. Covers service definition, code generation, client/server examples in Python, Java, and Go.',
      metaDescription: 'Implement a gRPC API with Protocol Buffers. Covers service definition, code generation, client/server examples in Python, Java, and Go.',
      seoKeywords: ['grpc api', 'protocol buffers', 'grpc tutorial'],
    },
    es: {
      title: 'API gRPC con Protocol Buffers',
      description: 'Implementa una API gRPC con Protocol Buffers. Cubre definición de servicios, generación de código y ejemplos cliente/servidor en Python, Java y Go.',
      metaDescription: 'Implementa una API gRPC con Protocol Buffers. Cubre definición de servicios, generación de código y ejemplos cliente/servidor en Python, Java y Go.',
      seoKeywords: ['api grpc', 'protocol buffers', 'tutorial grpc'],
    },
  },
];

const baseDir = 'src/content';
const files = fs.readdirSync(baseDir, { recursive: true })
  .map(f => path.join(baseDir, f))
  .filter(f => fs.statSync(f).isFile());

function baseName(file) {
  const bn = path.basename(file);
  return bn.replace(/\.es\.md$|\.md$/, '');
}

for (const item of updates) {
  const slug = item.slug;
  const enFile = files.find(f => baseName(f) === slug && f.endsWith('.md') && !f.endsWith('.es.md'));
  const esFile = files.find(f => baseName(f) === slug && f.endsWith('.es.md'));

  for (const [locale, file] of [['en', enFile], ['es', esFile]]) {
    if (!file) {
      console.warn(`Missing ${locale} file for ${slug}`);
      continue;
    }
    const data = item[locale];
    const content = fs.readFileSync(file, 'utf8');
    const parsed = fm(content);

    parsed.attributes.title = data.title;
    parsed.attributes.description = data.description;
    parsed.attributes.metaDescription = data.metaDescription;
    parsed.attributes.lastUpdated = today;

    if (!parsed.attributes.seo) {
      parsed.attributes.seo = { metaDescription: data.metaDescription, keywords: data.seoKeywords };
    } else {
      parsed.attributes.seo.metaDescription = data.metaDescription;
      if (data.seoKeywords) {
        parsed.attributes.seo.keywords = data.seoKeywords;
      }
    }

    const frontmatter = yaml.dump(parsed.attributes, { lineWidth: 300, noCompatMode: true, quotingType: '"' });
    const newContent = `---\n${frontmatter}---\n${parsed.body}`;
    fs.writeFileSync(file, newContent, 'utf8');
    console.log(`Updated ${file}`);
  }
}
