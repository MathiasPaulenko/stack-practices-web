export interface TagIntro {
  en: { heading: string; paragraphs: string[] };
  es: { heading: string; paragraphs: string[] };
}

export const tagIntros: Record<string, TagIntro> = {
  chatbot: {
    en: {
      heading: 'Conversational AI and Chatbot Engineering',
      paragraphs: [
        'Building a production-ready chatbot requires more than connecting to a language model API. You need to manage conversation state, handle function calling, implement retrieval-augmented context, and design graceful fallback flows when the model hallucinates or user intent is unclear.',
        'The resources below cover practical patterns for building AI assistants that maintain context across multi-turn conversations, integrate with external tools and APIs, and deliver reliable user experiences in real-world deployments.',
      ],
    },
    es: {
      heading: 'IA Conversacional e Ingenieria de Chatbots',
      paragraphs: [
        'Construir un chatbot listo para produccion requiere mas que conectarse a una API de modelos de lenguaje. Necesitas gestionar el estado de la conversacion, manejar llamadas a funciones, implementar contexto con recuperacion aumentada y disenar flujos de respaldo elegantes cuando el modelo alucina o la intencion del usuario no esta clara.',
        'Los recursos a continuacion cubren patrones practicos para construir asistentes de IA que mantienen el contexto a traves de conversaciones de multiples turnos, se integran con herramientas y APIs externas, y ofrecen experiencias de usuario confiables en despliegues del mundo real.',
      ],
    },
  },
  terraform: {
    en: {
      heading: 'Infrastructure as Code with Terraform',
      paragraphs: [
        'Terraform has become the de facto standard for declarative infrastructure provisioning across cloud providers. It enables teams to version-control their infrastructure, review changes through code review workflows, and reproduce environments with consistency from development to production.',
        'The guides and recipes below demonstrate practical patterns for organizing Terraform modules, managing state securely, handling multi-environment deployments, and integrating infrastructure changes into CI/CD pipelines for automated, auditable provisioning.',
      ],
    },
    es: {
      heading: 'Infraestructura como Codigo con Terraform',
      paragraphs: [
        'Terraform se ha convertido en el estandar de facto para el aprovisionamiento declarativo de infraestructura entre proveedores de nube. Permite a los equipos controlar versiones de su infraestructura, revisar cambios a traves de flujos de revision de codigo y reproducir entornos con consistencia desde desarrollo hasta produccion.',
        'Las guias y recetas a continuacion demuestran patrones practicos para organizar modulos de Terraform, gestionar el estado de forma segura, manejar despliegues multi-entorno e integrar cambios de infraestructura en pipelines de CI/CD para un aprovisionamiento automatizado y auditado.',
      ],
    },
  },
  mongodb: {
    en: {
      heading: 'MongoDB and Document Database Patterns',
      paragraphs: [
        'MongoDB offers a flexible schema that maps naturally to object-oriented code, but this flexibility can lead to performance pitfalls if you do not understand indexing strategies, aggregation pipelines, and data modeling patterns for document databases.',
        'The resources below cover practical techniques for designing effective document schemas, optimizing queries with compound indexes, handling transactions, and scaling MongoDB clusters for production workloads.',
      ],
    },
    es: {
      heading: 'MongoDB y Patrones de Bases de Datos Documentales',
      paragraphs: [
        'MongoDB ofrece un esquema flexible que se mapea naturalmente al codigo orientado a objetos, pero esta flexibilidad puede llevar a problemas de rendimiento si no comprendes las estrategias de indexacion, pipelines de agregacion y patrones de modelado de datos para bases de datos documentales.',
        'Los recursos a continuacion cubren tecnicas practicas para disenar esquemas de documentos efectivos, optimizar consultas con indices compuestos, manejar transacciones y escalar clusters de MongoDB para cargas de trabajo en produccion.',
      ],
    },
  },
  graphql: {
    en: {
      heading: 'GraphQL API Design and Implementation',
      paragraphs: [
        'GraphQL shifts the contract between client and server by allowing clients to request exactly the data they need, reducing over-fetching and under-fetching common in REST APIs. However, it introduces new challenges around query complexity analysis, N+1 resolver issues, and schema evolution.',
        'The practical resources below demonstrate how to build performant GraphQL APIs, design schemas that evolve gracefully, implement DataLoader patterns for efficient data fetching, and secure endpoints against malicious queries.',
      ],
    },
    es: {
      heading: 'Diseno e Implementacion de APIs GraphQL',
      paragraphs: [
        'GraphQL cambia el contrato entre cliente y servidor al permitir que los clientes soliciten exactamente los datos que necesitan, reduciendo la sobre-recuperacion y sub-recuperacion comunes en APIs REST. Sin embargo, introduce nuevos desafios en torno al analisis de complejidad de consultas, problemas N+1 en resolvers y evolucion del esquema.',
        'Los recursos practicos a continuacion demuestran como construir APIs GraphQL performantes, disenar esquemas que evolucionan elegantemente, implementar patrones DataLoader para recuperacion eficiente de datos y asegurar endpoints contra consultas maliciosas.',
      ],
    },
  },
  aws: {
    en: {
      heading: 'AWS Cloud Architecture and Services',
      paragraphs: [
        'Amazon Web Services provides over 200 cloud services, but building cost-effective, secure, and scalable architectures requires understanding core primitives like IAM, VPC networking, compute options, and managed data stores.',
        'The resources below cover practical patterns for serverless deployments, container orchestration on ECS and EKS, infrastructure security with IAM and KMS, and cost optimization strategies for production AWS workloads.',
      ],
    },
    es: {
      heading: 'Arquitectura en la Nube de AWS y Servicios',
      paragraphs: [
        'Amazon Web Services proporciona mas de 200 servicios en la nube, pero construir arquitecturas rentables, seguras y escalables requiere comprender primitivas centrales como IAM, redes VPC, opciones de computacion y almacenes de datos gestionados.',
        'Los recursos a continuacion cubren patrones practicos para despliegues serverless, orquestacion de contenedores en ECS y EKS, seguridad de infraestructura con IAM y KMS, y estrategias de optimizacion de costos para cargas de trabajo de produccion en AWS.',
      ],
    },
  },
  jest: {
    en: {
      heading: 'JavaScript Testing with Jest',
      paragraphs: [
        'Jest has become the dominant testing framework in the JavaScript ecosystem, offering built-in mocking, snapshot testing, and parallel test execution out of the box. Writing effective tests requires understanding matchers, async patterns, and when to use mocks versus real dependencies.',
        'The resources below demonstrate practical patterns for unit testing with Jest, mocking external APIs and modules, using snapshot tests for UI components, and structuring test suites for maintainability as your codebase grows.',
      ],
    },
    es: {
      heading: 'Testing en JavaScript con Jest',
      paragraphs: [
        'Jest se ha convertido en el framework de testing dominante en el ecosistema JavaScript, ofreciendo mocking integrado, snapshot testing y ejecucion paralela de tests de forma nativa. Escribir tests efectivos requiere comprender matchers, patrones asincronos y cuando usar mocks versus dependencias reales.',
        'Los recursos a continuacion demuestran patrones practicos para testing unitario con Jest, mocking de APIs externas y modulos, uso de snapshot tests para componentes de UI, y estructuracion de suites de test para mantenibilidad a medida que crece tu base de codigo.',
      ],
    },
  },
  playwright: {
    en: {
      heading: 'End-to-End Testing with Playwright',
      paragraphs: [
        'Playwright represents the next generation of browser automation, offering cross-browser testing, automatic waiting mechanisms, and built-in trace viewer for debugging flaky tests. Unlike earlier tools, Playwright is designed for the modern web with single-page applications and complex async interactions.',
        'The practical guides below show how to write resilient end-to-end tests, handle authentication flows, test responsive layouts, and integrate Playwright into CI/CD pipelines for reliable regression detection.',
      ],
    },
    es: {
      heading: 'Testing End-to-End con Playwright',
      paragraphs: [
        'Playwright representa la proxima generacion de automatizacion de navegadores, ofreciendo testing multi-navegador, mecanismos de espera automatica y visor de trazas integrado para depurar tests intermitentes. A diferencia de herramientas anteriores, Playwright esta disenado para la web moderna con aplicaciones de pagina unica e interacciones asincronas complejas.',
        'Las guias practicas a continuacion muestran como escribir tests end-to-end resilientes, manejar flujos de autenticacion, testear layouts responsivos e integrar Playwright en pipelines de CI/CD para deteccion confiable de regresiones.',
      ],
    },
  },
  solid: {
    en: {
      heading: 'SOLID Principles for Maintainable Code',
      paragraphs: [
        'The SOLID principles provide a foundation for writing object-oriented code that is easy to understand, extend, and maintain. While originally conceived for class-based languages, these principles apply equally to modern JavaScript, TypeScript, Python, and Java codebases.',
        'The resources below explain each principle with concrete before-and-after examples, common misconceptions, and practical guidance for incrementally refactoring legacy code toward SOLID compliance.',
      ],
    },
    es: {
      heading: 'Principios SOLID para Codigo Mantenible',
      paragraphs: [
        'Los principios SOLID proporcionan una base para escribir codigo orientado a objetos que sea facil de entender, extender y mantener. Aunque originalmente concebidos para lenguajes basados en clases, estos principios se aplican igualmente a bases de codigo modernas de JavaScript, TypeScript, Python y Java.',
        'Los recursos a continuacion explican cada principio con ejemplos concretos de antes y despues, conceptos erroneos comunes y guia practica para refactorizar incrementalmente codigo legacy hacia el cumplimiento de SOLID.',
      ],
    },
  },
  redis: {
    en: {
      heading: 'Caching and In-Memory Data with Redis',
      paragraphs: [
        'Redis is more than a cache: it is a versatile in-memory data structure store that supports strings, hashes, lists, sets, sorted sets, streams, and even search indexes. Understanding when to use each data structure is key to production deployments.',
        'The practical resources below cover Redis caching patterns, distributed locking, rate limiting implementations, Pub/Sub messaging, and strategies for scaling Redis with clustering and sentinel configurations.',
      ],
    },
    es: {
      heading: 'Caching y Datos en Memoria con Redis',
      paragraphs: [
        'Redis es mas que un cache: es un versatil almacen de estructuras de datos en memoria que soporta strings, hashes, listas, sets, sorted sets, streams e incluso indices de busqueda. Comprender cuando usar cada estructura de datos es clave para despliegues en produccion.',
        'Los recursos practicos a continuacion cubren patrones de caching con Redis, bloqueos distribuidos, implementaciones de rate limiting, mensajeria Pub/Sub y estrategias para escalar Redis con clustering y configuraciones de sentinel.',
      ],
    },
  },
  docker: {
    en: {
      heading: 'Containerization with Docker',
      paragraphs: [
        'Docker containers have fundamentally changed how applications are packaged, shipped, and deployed. Building efficient images requires understanding multi-stage builds, layer caching, security scanning, and the difference between development and production image configurations.',
        'The resources below demonstrate practical patterns for writing optimized Dockerfiles, orchestrating multi-container applications with Docker Compose, debugging running containers, and integrating container builds into CI/CD workflows.',
      ],
    },
    es: {
      heading: 'Contenerizacion con Docker',
      paragraphs: [
        'Los contenedores de Docker han cambiado fundamentalmente como se empaquetan, envian y despliegan las aplicaciones. Construir imagenes eficientes requiere comprender multi-stage builds, cacheo de capas, escaneo de seguridad y la diferencia entre configuraciones de imagenes de desarrollo y produccion.',
        'Los recursos a continuacion demuestran patrones practicos para escribir Dockerfiles optimizados, orquestar aplicaciones multi-contenedor con Docker Compose, depurar contenedores en ejecucion e integrar builds de contenedores en flujos de trabajo de CI/CD.',
      ],
    },
  },
};
