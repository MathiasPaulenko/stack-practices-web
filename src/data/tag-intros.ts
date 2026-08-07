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
  python: {
    en: {
      heading: 'Python for Production Engineering',
      paragraphs: [
        'Python powers a huge share of backend services, data pipelines, automation scripts, and machine learning workloads. Writing production-grade Python means going beyond syntax: you need type hints, robust error handling, dependency management, packaging, testing, and observability that match the expectations of a running service.',
        'The resources in this collection cover practical recipes for API development, data processing, concurrency, testing, security, and deployment. Each example focuses on code you can run, adapt, and ship with confidence.',
      ],
    },
    es: {
      heading: 'Python para Ingenieria de Produccion',
      paragraphs: [
        'Python impulsa una gran parte de los servicios backend, pipelines de datos, scripts de automatizacion y cargas de trabajo de machine learning. Escribir Python de grado productivo va mas alla de la sintaxis: necesitas type hints, manejo robusto de errores, gestion de dependencias, empaquetado, testing y observabilidad a la altura de un servicio en ejecucion.',
        'Los recursos de esta coleccion cubren recetas practicas para desarrollo de APIs, procesamiento de datos, concurrencia, testing, seguridad y despliegue. Cada ejemplo se enfoca en codigo que puedes ejecutar, adaptar y entregar con confianza.',
      ],
    },
  },
  devops: {
    en: {
      heading: 'DevOps Practices and Culture',
      paragraphs: [
        'DevOps is the practice of bridging development and operations so that teams can deliver software faster, safer, and more reliably. It combines automation, infrastructure as code, continuous integration and delivery, monitoring, and a culture of shared ownership.',
        'The guides and recipes below cover CI/CD pipelines, containerization, cloud provisioning, observability, incident management, and security automation. Use them to build systems that are repeatable, auditable, and resilient under real-world load.',
      ],
    },
    es: {
      heading: 'Practicas y Cultura DevOps',
      paragraphs: [
        'DevOps es la practica de acercar desarrollo y operaciones para que los equipos entreguen software mas rapido, seguro y confiable. Combina automatizacion, infraestructura como codigo, integracion y entrega continuas, monitoreo y una cultura de responsabilidad compartida.',
        'Las guias y recetas a continuacion cubren pipelines de CI/CD, contenerizacion, aprovisionamiento en la nube, observabilidad, gestion de incidentes y automatizacion de seguridad. Usalas para construir sistemas repetibles, auditables y resilientes bajo carga real.',
      ],
    },
  },
  java: {
    en: {
      heading: 'Java Backend Engineering',
      paragraphs: [
        'Java remains a dominant choice for large-scale backend systems because of its mature ecosystem, strong typing, and excellent runtime performance. Building production services in Java means mastering the JVM, dependency injection, concurrency, testing, and deployment patterns.',
        'The resources here cover Spring Boot, REST and gRPC APIs, database integration, messaging, observability, and performance tuning. Each recipe is designed to be directly applicable to enterprise and cloud-native applications.',
      ],
    },
    es: {
      heading: 'Ingenieria Backend con Java',
      paragraphs: [
        'Java sigue siendo una eleccion dominante para sistemas backend a gran escala gracias a su ecosistema maduro, tipado fuerte y excelente rendimiento en runtime. Construir servicios de produccion en Java significa dominar la JVM, inyeccion de dependencias, concurrencia, testing y patrones de despliegue.',
        'Los recursos aqui cubren Spring Boot, APIs REST y gRPC, integracion con bases de datos, mensajeria, observabilidad y ajuste de rendimiento. Cada receta esta disenada para aplicarse directamente en aplicaciones empresariales y cloud-native.',
      ],
    },
  },
  security: {
    en: {
      heading: 'Application and Infrastructure Security',
      paragraphs: [
        'Security is not a checklist; it is a continuous practice that must be embedded in every layer of the stack. From input validation and secrets management to network hardening and compliance, defensive design reduces risk before it becomes an incident.',
        'The resources below provide practical recipes for authentication, authorization, encryption, secure coding, vulnerability scanning, and incident response. Each guide explains what to do, why it matters, and how to implement it in real code.',
      ],
    },
    es: {
      heading: 'Seguridad de Aplicaciones e Infraestructura',
      paragraphs: [
        'La seguridad no es un checklist; es una practica continua que debe integrarse en cada capa del stack. Desde la validacion de input y la gestion de secretos hasta el endurecimiento de redes y el cumplimiento, el diseno defensivo reduce el riesgo antes de que se convierta en un incidente.',
        'Los recursos a continuacion ofrecen recetas practicas para autenticacion, autorizacion, cifrado, codigo seguro, escaneo de vulnerabilidades y respuesta a incidentes. Cada guia explica que hacer, por que importa y como implementarlo en codigo real.',
      ],
    },
  },
  javascript: {
    en: {
      heading: 'JavaScript in the Modern Web',
      paragraphs: [
        'JavaScript runs in browsers, servers, mobile runtimes, and edge workers. Writing maintainable JavaScript requires discipline: modular code, async patterns, type safety, testing, and performance awareness.',
        'The recipes and guides in this collection cover Node.js, modern frameworks, DOM manipulation, event-driven code, error handling, and build tooling. Each resource is focused on practical patterns that hold up in production.',
      ],
    },
    es: {
      heading: 'JavaScript en la Web Moderna',
      paragraphs: [
        'JavaScript se ejecuta en navegadores, servidores, runtimes moviles y edge workers. Escribir JavaScript mantenible requiere disciplina: codigo modular, patrones asincronos, seguridad de tipos, testing y conciencia de rendimiento.',
        'Las recetas y guias de esta coleccion cubren Node.js, frameworks modernos, manipulacion del DOM, codigo orientado a eventos, manejo de errores y herramientas de build. Cada recurso se enfoca en patrones practicos que se sostienen en produccion.',
      ],
    },
  },
  performance: {
    en: {
      heading: 'Performance Engineering',
      paragraphs: [
        'Performance is the result of deliberate design decisions across the stack. It includes efficient algorithms, caching, database indexing, network optimization, and runtime tuning. Without measurement, optimization becomes guesswork.',
        'The resources below show how to identify bottlenecks, profile code, optimize queries, implement caching layers, and tune web delivery. Each recipe connects theory to measurable outcomes.',
      ],
    },
    es: {
      heading: 'Ingenieria de Rendimiento',
      paragraphs: [
        'El rendimiento es el resultado de decisiones de diseno deliberadas en todo el stack. Incluye algoritmos eficientes, cacheo, indexacion de bases de datos, optimizacion de red y ajuste de runtime. Sin medicion, la optimizacion se convierte en conjetura.',
        'Los recursos a continuacion muestran como identificar cuellos de botella, perfilar codigo, optimizar consultas, implementar capas de cache y ajustar la entrega web. Cada receta conecta la teoria con resultados medibles.',
      ],
    },
  },
  architecture: {
    en: {
      heading: 'Software Architecture Patterns',
      paragraphs: [
        'Good architecture makes systems easier to understand, change, and scale. It is the deliberate set of decisions that shape structure, communication, failure modes, and growth over time.',
        'The patterns and guides below cover microservices, event-driven design, domain-driven design, resilience patterns, and trade-off analysis. Use them as a foundation for making informed architectural decisions.',
      ],
    },
    es: {
      heading: 'Patrones de Arquitectura de Software',
      paragraphs: [
        'Una buena arquitectura hace que los sistemas sean mas faciles de entender, cambiar y escalar. Es el conjunto deliberado de decisiones que moldean la estructura, la comunicacion, los modos de falla y el crecimiento con el tiempo.',
        'Los patrones y guias a continuacion cubren microservicios, diseno orientado a eventos, diseno dirigido por dominio, patrones de resiliencia y analisis de trade-offs. Usalos como base para tomar decisiones arquitectonicas informadas.',
      ],
    },
  },
  api: {
    en: {
      heading: 'API Design and Operations',
      paragraphs: [
        'APIs are the contracts that connect services, clients, and teams. A well-designed API is consistent, versioned, documented, secure, and observable. The work does not end at design; it continues through deployment, monitoring, and deprecation.',
        'The recipes and guides in this collection cover REST, GraphQL, gRPC, OpenAPI, authentication, rate limiting, error handling, and testing. Each resource is built around patterns that survive real traffic.',
      ],
    },
    es: {
      heading: 'Diseno y Operacion de APIs',
      paragraphs: [
        'Las APIs son los contratos que conectan servicios, clientes y equipos. Una API bien disenada es consistente, versionada, documentada, segura y observable. El trabajo no termina en el diseno; continua a traves del despliegue, monitoreo y deprecacion.',
        'Las recetas y guias de esta coleccion cubren REST, GraphQL, gRPC, OpenAPI, autenticacion, rate limiting, manejo de errores y testing. Cada recurso se construye en torno a patrones que sobreviven al trafico real.',
      ],
    },
  },
  database: {
    en: {
      heading: 'Database Engineering',
      paragraphs: [
        'Databases are the persistence layer behind most production systems. Engineering them well requires understanding data modeling, indexing, transactions, replication, query optimization, and operational trade-offs.',
        'The resources below cover relational and NoSQL databases, migrations, connection pooling, caching, full-text search, and scaling strategies. Each recipe translates database theory into working code and operational practice.',
      ],
    },
    es: {
      heading: 'Ingenieria de Bases de Datos',
      paragraphs: [
        'Las bases de datos son la capa de persistencia detras de la mayoria de los sistemas de produccion. Ingeniarlas bien requiere comprender modelado de datos, indexacion, transacciones, replicacion, optimizacion de consultas y trade-offs operativos.',
        'Los recursos a continuacion cubren bases de datos relacionales y NoSQL, migraciones, connection pooling, cacheo, busqueda de texto completo y estrategias de escalado. Cada receta traduce la teoria de bases de datos en codigo funcional y practica operativa.',
      ],
    },
  },
  'design-pattern': {
    en: {
      heading: 'Design Patterns for Reusable Software',
      paragraphs: [
        'Design patterns are battle-tested solutions to recurring design problems. They provide a shared vocabulary for structuring code that is flexible, testable, and easier to maintain as requirements change.',
        'The patterns in this collection cover creational, structural, and behavioral categories with language-specific examples. Use them to recognize familiar problems and apply proven solutions instead of reinventing structure.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno para Software Reutilizable',
      paragraphs: [
        'Los patrones de diseno son soluciones probadas para problemas de diseno recurrentes. Proporcionan un vocabulario compartido para estructurar codigo flexible, testeable y mas facil de mantener a medida que cambian los requisitos.',
        'Los patrones de esta coleccion cubren categorias creacionales, estructurales y de comportamiento con ejemplos especificos por lenguaje. Usalos para reconocer problemas familiares y aplicar soluciones probadas en lugar de reinventar la estructura.',
      ],
    },
  },
  testing: {
    en: {
      heading: 'Software Testing Practices',
      paragraphs: [
        'Testing is the practice of proving that code behaves as intended under realistic conditions. A solid testing strategy combines unit, integration, end-to-end, and property-based tests with clear ownership and fast feedback loops.',
        'The resources below cover test frameworks, mocking, testcontainers, mutation testing, contract testing, and CI integration. Each recipe shows how to write tests that are reliable, maintainable, and aligned with production risks.',
      ],
    },
    es: {
      heading: 'Practicas de Testing de Software',
      paragraphs: [
        'El testing es la practica de demostrar que el codigo se comporta como se espera bajo condiciones realistas. Una estrategia solida combina tests unitarios, de integracion, end-to-end y property-based con ownership claro y ciclos de retroalimentacion rapidos.',
        'Los recursos a continuacion cubren frameworks de testing, mocking, testcontainers, mutation testing, contract testing e integracion con CI. Cada receta muestra como escribir tests confiables, mantenibles y alineados con los riesgos de produccion.',
      ],
    },
  },
  'ci-cd': {
    en: {
      heading: 'CI/CD Pipelines and Delivery Automation',
      paragraphs: [
        'Continuous Integration and Continuous Delivery shorten the feedback cycle between writing code and shipping it. Good pipelines are fast, deterministic, secure, and treat failures as data rather than surprises.',
        'The recipes and guides in this collection cover GitHub Actions, GitLab CI, deployment strategies, artifact management, security gates, and rollback procedures. Use them to build pipelines that teams can trust with every merge.',
      ],
    },
    es: {
      heading: 'Pipelines de CI/CD y Automatizacion de Entrega',
      paragraphs: [
        'La Integracion Continua y la Entrega Continua acortan el ciclo de retroalimentacion entre escribir codigo y entregarlo. Buenos pipelines son rapidos, deterministas, seguros y tratan los fallos como datos, no como sorpresas.',
        'Las recetas y guias de esta coleccion cubren GitHub Actions, GitLab CI, estrategias de despliegue, gestion de artefactos, controles de seguridad y procedimientos de rollback. Usalos para construir pipelines en los que los equipos puedan confiar con cada merge.',
      ],
    },
  },
  automation: {
    en: {
      heading: 'Automation in Software Engineering',
      paragraphs: [
        'Automation removes repetitive work and reduces human error in deployments, testing, provisioning, and operations. The best automations are reliable, observable, and easy to modify when requirements change.',
        'The resources below cover scripting, infrastructure automation, scheduled jobs, workflow orchestration, and self-healing systems. Each guide focuses on practical patterns that save time and increase consistency.',
      ],
    },
    es: {
      heading: 'Automatizacion en Ingenieria de Software',
      paragraphs: [
        'La automatizacion elimina el trabajo repetitivo y reduce el error humano en despliegues, testing, aprovisionamiento y operaciones. Las mejores automatizaciones son confiables, observables y faciles de modificar cuando cambian los requisitos.',
        'Los recursos a continuacion cubren scripting, automatizacion de infraestructura, jobs programados, orquestacion de workflows y sistemas auto-recuperables. Cada guia se enfoca en patrones practicos que ahorran tiempo y aumentan la consistencia.',
      ],
    },
  },
  frontend: {
    en: {
      heading: 'Frontend Engineering',
      paragraphs: [
        'Frontend engineering is the discipline of building fast, accessible, and maintainable user interfaces. It requires fluency in the DOM, component architecture, state management, performance, and design systems.',
        'The resources in this collection cover React, Vue, Svelte, TypeScript, CSS, accessibility, and modern build tools. Each recipe is focused on patterns that hold up in real browsers and real teams.',
      ],
    },
    es: {
      heading: 'Ingenieria Frontend',
      paragraphs: [
        'La ingenieria frontend es la disciplina de construir interfaces de usuario rapidas, accesibles y mantenibles. Requiere fluidez en el DOM, arquitectura de componentes, gestion de estado, rendimiento y design systems.',
        'Los recursos de esta coleccion cubren React, Vue, Svelte, TypeScript, CSS, accesibilidad y herramientas modernas de build. Cada receta se enfoca en patrones que se sostienen en navegadores y equipos reales.',
      ],
    },
  },
  observability: {
    en: {
      heading: 'Observability and Monitoring',
      paragraphs: [
        'Observability is the ability to understand a system from its outputs: logs, metrics, and traces. It shifts debugging from guessing to answering concrete questions about behavior, performance, and failures.',
        'The guides and recipes below cover Prometheus, Grafana, OpenTelemetry, structured logging, alerting, and incident correlation. Use them to build systems that reveal their own state when things go wrong.',
      ],
    },
    es: {
      heading: 'Observabilidad y Monitoreo',
      paragraphs: [
        'La observabilidad es la capacidad de comprender un sistema a partir de sus salidas: logs, metricas y trazas. Transforma la depuracion de conjeturas a respuestas concretas sobre comportamiento, rendimiento y fallas.',
        'Las guias y recetas a continuacion cubren Prometheus, Grafana, OpenTelemetry, logging estructurado, alertas y correlacion de incidentes. Usalos para construir sistemas que revelen su propio estado cuando las cosas salen mal.',
      ],
    },
  },
  caching: {
    en: {
      heading: 'Caching Strategies and In-Memory Data',
      paragraphs: [
        'Caching is one of the most effective ways to improve performance and reduce load on backends. The challenge is choosing the right strategy, invalidation policy, and consistency model for each use case.',
        'The resources below cover Redis, CDN caching, browser caches, cache-aside, write-through, write-behind, and invalidation patterns. Each recipe explains when and how to cache without introducing subtle bugs.',
      ],
    },
    es: {
      heading: 'Estrategias de Cacheo y Datos en Memoria',
      paragraphs: [
        'El cacheo es una de las formas mas efectivas de mejorar el rendimiento y reducir la carga en backends. El desafio es elegir la estrategia correcta, la politica de invalidacion y el modelo de consistencia para cada caso de uso.',
        'Los recursos a continuacion cubren Redis, caching en CDN, caches de navegador, cache-aside, write-through, write-behind y patrones de invalidacion. Cada receta explica cuando y como cachear sin introducir errores sutiles.',
      ],
    },
  },
  typescript: {
    en: {
      heading: 'TypeScript for Scalable Applications',
      paragraphs: [
        'TypeScript adds a static type system to JavaScript, making large codebases easier to refactor, test, and reason about. The real value comes from strict configuration, disciplined types, and tooling integration.',
        'The recipes in this collection cover generics, utility types, strict mode, discriminated unions, exhaustive checks, and type-safe integrations. Each example shows how to use types as a design tool, not just documentation.',
      ],
    },
    es: {
      heading: 'TypeScript para Aplicaciones Escalables',
      paragraphs: [
        'TypeScript anade un sistema de tipos estatico a JavaScript, haciendo que las bases de codigo grandes sean mas faciles de refactorizar, testear y razonar. El valor real proviene de la configuracion estricta, tipos disciplinados e integracion con herramientas.',
        'Las recetas de esta coleccion cubren generics, utility types, modo estricto, uniones discriminadas, checks exhaustivos e integraciones type-safe. Cada ejemplo muestra como usar los tipos como herramienta de diseno, no solo como documentacion.',
      ],
    },
  },
  sql: {
    en: {
      heading: 'SQL and Relational Data Access',
      paragraphs: [
        'SQL remains the universal language for structured data. Writing production SQL means going beyond basic queries: indexes, transactions, window functions, CTEs, and query plans determine whether an application scales.',
        'The resources below cover query optimization, schema design, migrations, common table expressions, full-text search, and safe access patterns. Each recipe translates database theory into performant, maintainable queries.',
      ],
    },
    es: {
      heading: 'SQL y Acceso a Datos Relacionales',
      paragraphs: [
        'SQL sigue siendo el lenguaje universal para datos estructurados. Escribir SQL de produccion va mas alla de consultas basicas: indices, transacciones, window functions, CTEs y planes de ejecucion determinan si una aplicacion escala.',
        'Los recursos a continuacion cubren optimizacion de consultas, diseno de esquemas, migraciones, expresiones de tabla comunes, busqueda de texto completo y patrones de acceso seguro. Cada receta traduce la teoria de bases de datos en consultas performantes y mantenibles.',
      ],
    },
  },
  microservices: {
    en: {
      heading: 'Microservices Architecture',
      paragraphs: [
        'Microservices decompose a system into independently deployable services that communicate over the network. The pattern increases autonomy but introduces challenges in consistency, observability, deployment, and failure isolation.',
        'The guides and patterns below cover service boundaries, inter-service communication, saga patterns, API gateways, service discovery, and resilience. Use them to make deliberate architectural decisions rather than defaulting to microservices by hype.',
      ],
    },
    es: {
      heading: 'Arquitectura de Microservicios',
      paragraphs: [
        'Los microservicios descomponen un sistema en servicios desplegables de forma independiente que se comunican por la red. El patron aumenta la autonomia pero introduce desafios en consistencia, observabilidad, despliegue y aislamiento de fallas.',
        'Las guias y patrones a continuacion cubren limites de servicio, comunicacion entre servicios, patrones saga, API gateways, service discovery y resiliencia. Usalos para tomar decisiones arquitectonicas deliberadas en lugar de adoptar microservicios por moda.',
      ],
    },
  },
  authentication: {
    en: {
      heading: 'Authentication and Identity',
      paragraphs: [
        'Authentication is the process of verifying who a user is before they access protected resources. Modern systems use tokens, sessions, OAuth, OIDC, and multi-factor authentication, each with different trade-offs.',
        'The recipes below cover JWT, refresh tokens, OAuth2 with PKCE, password hashing, session management, and API key patterns. Each resource explains how to implement identity correctly and securely in production code.',
      ],
    },
    es: {
      heading: 'Autenticacion e Identidad',
      paragraphs: [
        'La autenticacion es el proceso de verificar quien es un usuario antes de que acceda a recursos protegidos. Los sistemas modernos usan tokens, sesiones, OAuth, OIDC y autenticacion multifactor, cada uno con diferentes trade-offs.',
        'Las recetas a continuacion cubren JWT, refresh tokens, OAuth2 con PKCE, hashing de contrasenas, gestion de sesiones y patrones de API keys. Cada recurso explica como implementar identidad correcta y seguramente en codigo de produccion.',
      ],
    },
  },
  nodejs: {
    en: {
      heading: 'Node.js Server-Side Development',
      paragraphs: [
        'Node.js brings JavaScript to the server, enabling event-driven, non-blocking I/O that is well suited for APIs, real-time systems, and microservices. Production Node.js requires attention to memory, event loops, streams, and module design.',
        'The resources below cover Express, Fastify, WebSockets, file handling, concurrency, testing, security, and deployment. Each recipe is built around code that runs efficiently under real traffic.',
      ],
    },
    es: {
      heading: 'Desarrollo Server-Side con Node.js',
      paragraphs: [
        'Node.js lleva JavaScript al servidor, habilitando E/S no bloqueante orientada a eventos, ideal para APIs, sistemas en tiempo real y microservicios. Node.js de produccion requiere atencion a la memoria, event loops, streams y diseno de modulos.',
        'Los recursos a continuacion cubren Express, Fastify, WebSockets, manejo de archivos, concurrencia, testing, seguridad y despliegue. Cada receta se construye en torno a codigo que corre eficientemente bajo trafico real.',
      ],
    },
  },
  postgresql: {
    en: {
      heading: 'PostgreSQL in Production',
      paragraphs: [
        'PostgreSQL is a powerful open-source relational database known for reliability, extensibility, and standards compliance. Running it in production means mastering indexing, query planning, replication, transactions, and backup strategies.',
        'The recipes in this collection cover schema design, query optimization, partitioning, replication, connection pooling, and migration patterns. Each guide connects database theory to operational practice.',
      ],
    },
    es: {
      heading: 'PostgreSQL en Produccion',
      paragraphs: [
        'PostgreSQL es una base de datos relacional open-source potente, conocida por su confiabilidad, extensibilidad y cumplimiento de estandares. Ejecutarla en produccion significa dominar indexacion, planificacion de consultas, replicacion, transacciones y estrategias de backup.',
        'Las recetas de esta coleccion cubren diseno de esquemas, optimizacion de consultas, particionamiento, replicacion, connection pooling y patrones de migracion. Cada guia conecta la teoria de bases de datos con la practica operativa.',
      ],
    },
  },
  serverless: {
    en: {
      heading: 'Serverless Computing',
      paragraphs: [
        'Serverless computing lets teams run code without managing servers, paying only for execution time. Functions, event sources, and managed services shift operational work to the cloud provider, but introduce new limits in state, latency, and debugging.',
        'The resources below cover AWS Lambda, Azure Functions, Google Cloud Functions, event-driven orchestration, cold starts, and serverless databases. Each recipe shows how to design functions that fit the serverless execution model.',
      ],
    },
    es: {
      heading: 'Computacion Serverless',
      paragraphs: [
        'La computacion serverless permite ejecutar codigo sin administrar servidores, pagando solo por el tiempo de ejecucion. Funciones, fuentes de eventos y servicios gestionados trasladan el trabajo operativo al proveedor de nube, pero introducen nuevos limites en estado, latencia y depuracion.',
        'Los recursos a continuacion cubren AWS Lambda, Azure Functions, Google Cloud Functions, orquestacion orientada a eventos, cold starts y bases de datos serverless. Cada receta muestra como disenar funciones que encajen en el modelo de ejecucion serverless.',
      ],
    },
  },
  rest: {
    en: {
      heading: 'REST API Design',
      paragraphs: [
        'REST is the most widely adopted architectural style for web APIs. Good REST design is resource-oriented, uses HTTP semantics correctly, and maintains consistency in naming, status codes, and error formats.',
        'The recipes and guides below cover resource modeling, HTTP methods, pagination, versioning, OpenAPI, authentication, and error handling. Each resource helps you build APIs that are predictable and easy to consume.',
      ],
    },
    es: {
      heading: 'Diseno de APIs REST',
      paragraphs: [
        'REST es el estilo arquitectonico mas ampliamente adoptado para APIs web. Un buen diseno REST es orientado a recursos, usa correctamente la semantica de HTTP y mantiene consistencia en nombres, codigos de estado y formatos de error.',
        'Las recetas y guias a continuacion cubren modelado de recursos, metodos HTTP, paginacion, versionado, OpenAPI, autenticacion y manejo de errores. Cada recurso te ayuda a construir APIs predecibles y faciles de consumir.',
      ],
    },
  },
  concurrency: {
    en: {
      heading: 'Concurrency and Parallelism',
      paragraphs: [
        'Concurrency is about structuring programs to handle multiple tasks making progress, while parallelism is about executing them simultaneously. Both are essential for modern, multi-core, distributed systems.',
        'The resources below cover threads, async/await, actors, locks, queues, race conditions, and backpressure. Each guide explains how to write concurrent code that is correct, observable, and free from common pitfalls.',
      ],
    },
    es: {
      heading: 'Concurrencia y Paralelismo',
      paragraphs: [
        'La concurrencia se trata de estructurar programas para que multiples tareas progresen, mientras que el paralelismo se trata de ejecutarlas simultaneamente. Ambos son esenciales para sistemas modernos multi-core y distribuidos.',
        'Los recursos a continuacion cubren threads, async/await, actores, locks, colas, race conditions y backpressure. Cada guia explica como escribir codigo concurrente correcto, observable y libre de errores comunes.',
      ],
    },
  },
  deployment: {
    en: {
      heading: 'Software Deployment Practices',
      paragraphs: [
        'Deployment is the process of moving code from a development environment into production safely and repeatably. Good deployment practices include blue-green releases, canary deployments, feature flags, and rollback plans.',
        'The resources below cover deployment strategies, container orchestration, GitOps, release automation, and zero-downtime patterns. Each recipe helps you ship changes with confidence and recover quickly when needed.',
      ],
    },
    es: {
      heading: 'Practicas de Despliegue de Software',
      paragraphs: [
        'El despliegue es el proceso de mover codigo desde un entorno de desarrollo a produccion de forma segura y repetible. Las buenas practicas incluyen releases blue-green, canary deployments, feature flags y planes de rollback.',
        'Los recursos a continuacion cubren estrategias de despliegue, orquestacion de contenedores, GitOps, automatizacion de releases y patrones de zero-downtime. Cada receta te ayuda a entregar cambios con confianza y recuperarte rapidamente cuando sea necesario.',
      ],
    },
  },
  http: {
    en: {
      heading: 'HTTP and Web Protocols',
      paragraphs: [
        'HTTP is the foundation of the web. Understanding methods, headers, status codes, caching, connection management, and security headers is essential for building reliable APIs and web applications.',
        'The recipes below cover HTTP clients, server configuration, status code usage, header security, compression, keep-alive, and protocol semantics. Each resource focuses on practical HTTP behavior that affects production systems.',
      ],
    },
    es: {
      heading: 'HTTP y Protocolos Web',
      paragraphs: [
        'HTTP es la fundacion de la web. Comprender metodos, headers, codigos de estado, cacheo, gestion de conexiones y headers de seguridad es esencial para construir APIs y aplicaciones web confiables.',
        'Las recetas a continuacion cubren clientes HTTP, configuracion de servidores, uso de codigos de estado, seguridad de headers, compresion, keep-alive y semantica del protocolo. Cada recurso se enfoca en comportamientos HTTP practicos que afectan a sistemas de produccion.',
      ],
    },
  },
  llm: {
    en: {
      heading: 'Large Language Models in Applications',
      paragraphs: [
        'Large language models enable applications that understand, generate, and transform text. Production LLM systems require prompt engineering, context management, evaluation, cost tracking, and safeguards against hallucinations.',
        'The resources below cover prompt design, retrieval-augmented generation, function calling, evaluation metrics, local models, and cost optimization. Each recipe shows how to integrate LLMs into real products responsibly.',
      ],
    },
    es: {
      heading: 'Grandes Modelos de Lenguaje en Aplicaciones',
      paragraphs: [
        'Los grandes modelos de lenguaje habilitan aplicaciones que entienden, generan y transforman texto. Los sistemas LLM de produccion requieren prompt engineering, gestion de contexto, evaluacion, seguimiento de costos y salvaguardas contra alucinaciones.',
        'Los recursos a continuacion cubren diseno de prompts, retrieval-augmented generation, function calling, metricas de evaluacion, modelos locales y optimizacion de costos. Cada receta muestra como integrar LLMs en productos reales de forma responsable.',
      ],
    },
  },
  monitoring: {
    en: {
      heading: 'Monitoring and Alerting',
      paragraphs: [
        'Monitoring is the practice of collecting metrics, logs, and traces to understand system health. Good alerting tells you when something is wrong without flooding you with noise.',
        'The resources in this collection cover metric collection, dashboards, SLOs, error budgets, alert thresholds, and on-call workflows. Each guide focuses on building signal-rich, noise-poor observability for production services.',
      ],
    },
    es: {
      heading: 'Monitoreo y Alertas',
      paragraphs: [
        'El monitoreo es la practica de recolectar metricas, logs y trazas para comprender la salud del sistema. Una buena alerta te dice cuando algo esta mal sin inundarte de ruido.',
        'Los recursos de esta coleccion cubren recoleccion de metricas, dashboards, SLOs, presupuestos de error, umbrales de alerta y flujos de on-call. Cada guia se enfoca en construir observabilidad rica en senales y pobre en ruido para servicios de produccion.',
      ],
    },
  },
  kubernetes: {
    en: {
      heading: 'Kubernetes and Container Orchestration',
      paragraphs: [
        'Kubernetes has become the standard platform for deploying, scaling, and operating containerized applications. Production use requires understanding pods, services, deployments, networking, storage, and the operator pattern.',
        'The resources below cover manifests, Helm, scaling strategies, rolling updates, observability, security contexts, and resource limits. Each recipe focuses on making clusters reliable and teams productive.',
      ],
    },
    es: {
      heading: 'Kubernetes y Orquestacion de Contenedores',
      paragraphs: [
        'Kubernetes se ha convertido en la plataforma estandar para desplegar, escalar y operar aplicaciones contenerizadas. El uso en produccion requiere comprender pods, servicios, deployments, redes, almacenamiento y el patron operator.',
        'Los recursos a continuacion cubren manifests, Helm, estrategias de escalado, rolling updates, observabilidad, contextos de seguridad y limites de recursos. Cada receta se enfoca en hacer clusters confiables y equipos productivos.',
      ],
    },
  },
  kafka: {
    en: {
      heading: 'Apache Kafka for Event Streaming',
      paragraphs: [
        'Apache Kafka is a distributed event streaming platform used for building real-time data pipelines and event-driven applications. It excels at high throughput, fault tolerance, and decoupling producers from consumers.',
        'The recipes below cover producers, consumers, topics, partitions, consumer groups, schemas, exactly-once semantics, and operational concerns. Each guide helps you build streaming systems that are observable and resilient.',
      ],
    },
    es: {
      heading: 'Apache Kafka para Event Streaming',
      paragraphs: [
        'Apache Kafka es una plataforma de event streaming distribuida usada para construir pipelines de datos en tiempo real y aplicaciones orientadas a eventos. Destaca por alto throughput, tolerancia a fallas y desacoplamiento entre productores y consumidores.',
        'Las recetas a continuacion cubren productores, consumidores, topics, particiones, consumer groups, schemas, exactly-once semantics y preocupaciones operativas. Cada guia te ayuda a construir sistemas de streaming observables y resilientes.',
      ],
    },
  },
  messaging: {
    en: {
      heading: 'Messaging and Queues',
      paragraphs: [
        'Messaging decouples services in time and space, enabling asynchronous workflows and resilient communication. Choosing between queues, pub/sub, and event streams depends on ordering, delivery, and durability requirements.',
        'The resources in this collection cover RabbitMQ, Kafka, SQS, NATS, message patterns, idempotency, dead-letter queues, and delivery semantics. Each recipe shows how to design messaging that survives failures and retries.',
      ],
    },
    es: {
      heading: 'Mensajeria y Colas',
      paragraphs: [
        'La mensajeria desacopla servicios en tiempo y espacio, permitiendo workflows asincronos y comunicacion resiliente. Elegir entre colas, pub/sub y event streams depende de los requisitos de orden, entrega y durabilidad.',
        'Los recursos de esta coleccion cubren RabbitMQ, Kafka, SQS, NATS, patrones de mensajeria, idempotencia, dead-letter queues y semanticas de entrega. Cada receta muestra como disenar mensajeria que sobreviva a fallas y reintentos.',
      ],
    },
  },
  bash: {
    en: {
      heading: 'Bash Scripting for Operations',
      paragraphs: [
        'Bash remains the universal glue for automating servers, containers, and developer workflows. Solid bash scripts handle errors, quote variables, validate inputs, and fail predictably.',
        'The recipes below cover file processing, loops, conditionals, text manipulation, command substitution, traps, and portable scripting. Each example is focused on automation you can run in CI/CD and production environments.',
      ],
    },
    es: {
      heading: 'Scripting en Bash para Operaciones',
      paragraphs: [
        'Bash sigue siendo el pegamento universal para automatizar servidores, contenedores y flujos de desarrollo. Scripts solidos de Bash manejan errores, entrecomillan variables, validan inputs y fallan de forma predecible.',
        'Las recetas a continuacion cubren procesamiento de archivos, loops, condicionales, manipulacion de texto, command substitution, traps y scripting portable. Cada ejemplo se enfoca en automatizacion que puedes ejecutar en CI/CD y entornos de produccion.',
      ],
    },
  },
  react: {
    en: {
      heading: 'React for Modern Frontend',
      paragraphs: [
        'React popularized component-based UI development with a declarative, function-first model. Production React requires careful state management, rendering optimization, hooks discipline, and testing.',
        'The resources below cover hooks, context, state libraries, performance patterns, server components, forms, routing, and testing. Each recipe is built around patterns that keep React applications fast and maintainable.',
      ],
    },
    es: {
      heading: 'React para Frontend Moderno',
      paragraphs: [
        'React popularizo el desarrollo de UI basado en componentes con un modelo declarativo y orientado a funciones. React de produccion requiere gestion cuidadosa de estado, optimizacion de renderizado, disciplina con hooks y testing.',
        'Los recursos a continuacion cubren hooks, context, librerias de estado, patrones de rendimiento, server components, formularios, routing y testing. Cada receta se construye en torno a patrones que mantienen las aplicaciones React rapidas y mantenibles.',
      ],
    },
  },
  encryption: {
    en: {
      heading: 'Encryption and Cryptography',
      paragraphs: [
        'Encryption protects data at rest and in transit. Applying it correctly means choosing the right algorithms, managing keys, avoiding deprecated ciphers, and understanding when encryption does not provide authentication.',
        'The recipes below cover TLS, AES, RSA, hashing, HMAC, secrets management, and secure defaults. Each guide explains how to use cryptography as a defensive layer without introducing subtle vulnerabilities.',
      ],
    },
    es: {
      heading: 'Cifrado y Criptografia',
      paragraphs: [
        'El cifrado protege datos en reposo y en transito. Aplicarlo correctamente significa elegir los algoritmos adecuados, gestionar claves, evitar cifras obsoletas y entender cuando el cifrado no provee autenticacion.',
        'Las recetas a continuacion cubren TLS, AES, RSA, hashing, HMAC, gestion de secretos y defaults seguros. Cada guia explica como usar criptografia como capa defensiva sin introducir vulnerabilidades sutiles.',
      ],
    },
  },
  resilience: {
    en: {
      heading: 'Resilience Patterns',
      paragraphs: [
        'Resilience is the ability of a system to recover from failures and continue operating. It is built from retries, circuit breakers, bulkheads, fallbacks, and graceful degradation rather than a single technique.',
        'The patterns and recipes below cover circuit breakers, timeouts, retries with backoff, bulkheads, load shedding, and failover. Each resource shows how to limit blast radius and protect users from cascading failures.',
      ],
    },
    es: {
      heading: 'Patrones de Resiliencia',
      paragraphs: [
        'La resiliencia es la capacidad de un sistema de recuperarse de fallas y seguir operando. Se construye con reintentos, circuit breakers, bulkheads, fallbacks y degradacion gradual en lugar de una tecnica unica.',
        'Los patrones y recetas a continuacion cubren circuit breakers, timeouts, reintentos con backoff, bulkheads, load shedding y failover. Cada recurso muestra como limitar el radio de explosion y proteger a los usuarios de fallas en cascada.',
      ],
    },
  },
  json: {
    en: {
      heading: 'Working with JSON',
      paragraphs: [
        'JSON is the de facto interchange format for web APIs and configuration. Working with JSON safely means validating schemas, handling large documents, escaping special characters, and choosing the right parsing strategy.',
        'The resources below cover parsing, serialization, schema validation, JSONPath, streaming, and manipulation across languages. Each recipe helps you transform JSON reliably without losing data or corrupting structure.',
      ],
    },
    es: {
      heading: 'Trabajando con JSON',
      paragraphs: [
        'JSON es el formato de intercambio de facto para APIs web y configuracion. Trabajar con JSON de forma segura significa validar esquemas, manejar documentos grandes, escapar caracteres especiales y elegir la estrategia de parseo correcta.',
        'Los recursos a continuacion cubren parseo, serializacion, validacion de esquemas, JSONPath, streaming y manipulacion en varios lenguajes. Cada receta te ayuda a transformar JSON de forma confiable sin perder datos ni corromper la estructura.',
      ],
    },
  },
  'rate-limiting': {
    en: {
      heading: 'Rate Limiting and Throttling',
      paragraphs: [
        'Rate limiting protects services from abuse, bursts, and cascading overload. The right strategy depends on the client, the resource, and the desired user experience during high traffic.',
        'The recipes below cover token bucket, sliding window, fixed window, distributed rate limiting with Redis, and client-friendly headers. Each guide explains how to enforce limits without breaking legitimate traffic.',
      ],
    },
    es: {
      heading: 'Rate Limiting y Throttling',
      paragraphs: [
        'El rate limiting protege los servicios contra abuso, rafagas y sobrecarga en cascada. La estrategia correcta depende del cliente, el recurso y la experiencia de usuario deseada durante trafico alto.',
        'Las recetas a continuacion cubren token bucket, sliding window, fixed window, rate limiting distribuido con Redis y headers amigables para el cliente. Cada guia explica como aplicar limites sin romper el trafico legitimo.',
      ],
    },
  },
  'event-driven': {
    en: {
      heading: 'Event-Driven Architecture',
      paragraphs: [
        'Event-driven architecture decouples components by having them react to events instead of calling each other directly. This improves scalability and resilience, but requires careful design around ordering, idempotency, and schema evolution.',
        'The resources below cover event sourcing, CQRS, stream processing, sagas, choreography, and orchestration. Each pattern explains how to build systems that respond to change without creating hidden dependencies.',
      ],
    },
    es: {
      heading: 'Arquitectura Orientada a Eventos',
      paragraphs: [
        'La arquitectura orientada a eventos desacopla componentes haciendo que reaccionen a eventos en lugar de llamarse directamente. Esto mejora la escalabilidad y resiliencia, pero requiere un diseno cuidadoso de orden, idempotencia y evolucion de esquemas.',
        'Los recursos a continuacion cubren event sourcing, CQRS, procesamiento de streams, sagas, coreografia y orquestacion. Cada patron explica como construir sistemas que responden al cambio sin crear dependencias ocultas.',
      ],
    },
  },
  prometheus: {
    en: {
      heading: 'Metrics and Monitoring with Prometheus',
      paragraphs: [
        'Prometheus is the dominant open-source metrics and monitoring toolkit in the cloud-native ecosystem. It scrapes time-series data, supports powerful queries with PromQL, and integrates with Grafana for dashboards and Alertmanager for notifications.',
        'The recipes below cover instrumentation, exporters, service discovery, recording rules, alerting rules, and scaling storage. Each guide focuses on collecting the right metrics and turning them into actionable insight.',
      ],
    },
    es: {
      heading: 'Metricas y Monitoreo con Prometheus',
      paragraphs: [
        'Prometheus es el toolkit open-source dominante de metricas y monitoreo en el ecosistema cloud-native. Recolecta datos de series temporales, soporta queries potentes con PromQL y se integra con Grafana para dashboards y Alertmanager para notificaciones.',
        'Las recetas a continuacion cubren instrumentacion, exporters, service discovery, recording rules, alerting rules y escalado de almacenamiento. Cada guia se enfoca en recolectar las metricas correctas y convertirlas en informacion accionable.',
      ],
    },
  },
  jwt: {
    en: {
      heading: 'JSON Web Tokens',
      paragraphs: [
        'JSON Web Tokens are a compact, self-contained way to transmit claims between parties. They are widely used for stateless authentication, but they must be handled carefully to avoid signature bypasses, token leakage, and revocation issues.',
        'The resources below cover token structure, signing algorithms, refresh tokens, token storage, revocation, and common vulnerabilities. Each recipe explains how to use JWTs securely in APIs and SPAs.',
      ],
    },
    es: {
      heading: 'JSON Web Tokens',
      paragraphs: [
        'Los JSON Web Tokens son una forma compacta y autocontenida de transmitir claims entre partes. Son ampliamente usados para autenticacion stateless, pero deben manejarse con cuidado para evitar bypass de firma, filtrado de tokens y problemas de revocacion.',
        'Los recursos a continuacion cubren estructura de tokens, algoritmos de firma, refresh tokens, almacenamiento de tokens, revocacion y vulnerabilidades comunes. Cada receta explica como usar JWTs de forma segura en APIs y SPAs.',
      ],
    },
  },
  logging: {
    en: {
      heading: 'Logging Practices and Tools',
      paragraphs: [
        'Logging is the foundation of observability. Good logs are structured, contextual, and searchable. They explain what happened, when, and in which part of the system, without drowning operators in noise.',
        'The recipes below cover structured logging, log levels, correlation IDs, log aggregation, retention, and cost management. Each guide helps you build logs that answer real questions during incidents and debugging.',
      ],
    },
    es: {
      heading: 'Practicas y Herramientas de Logging',
      paragraphs: [
        'El logging es la fundacion de la observabilidad. Buenos logs son estructurados, contextuales y buscables. Explican que paso, cuando y en que parte del sistema, sin ahogar a los operadores con ruido.',
        'Las recetas a continuacion cubren logging estructurado, niveles de log, correlation IDs, agregacion de logs, retencion y gestion de costos. Cada guia te ayuda a construir logs que respondan preguntas reales durante incidentes y depuracion.',
      ],
    },
  },
  cqrs: {
    en: {
      heading: 'CQRS Pattern',
      paragraphs: [
        'Command Query Responsibility Segregation separates read and write models so each can be optimized independently. It is a powerful pattern for complex domains, but it adds complexity in consistency, synchronization, and mental overhead.',
        'The resources below cover when to use CQRS, event sourcing pairs, read model projections, consistency trade-offs, and implementation patterns. Each guide explains how to apply the pattern without overengineering the solution.',
      ],
    },
    es: {
      heading: 'Patron CQRS',
      paragraphs: [
        'Command Query Responsibility Segregation separa los modelos de lectura y escritura para que cada uno pueda optimizarse de forma independiente. Es un patron poderoso para dominios complejos, pero anade complejidad en consistencia, sincronizacion y carga cognitiva.',
        'Los recursos a continuacion cubren cuando usar CQRS, parejas con event sourcing, proyecciones de modelos de lectura, trade-offs de consistencia y patrones de implementacion. Cada guia explica como aplicar el patron sin overengineering la solucion.',
      ],
    },
  },
  'distributed-systems': {
    en: {
      heading: 'Distributed Systems Engineering',
      paragraphs: [
        'Distributed systems connect independent components over a network. They enable scale and resilience but introduce failures in communication, consensus, time, and consistency that do not exist in single-node programs.',
        'The resources below cover CAP theorem, consensus, leader election, idempotency, distributed transactions, failure modes, and observability. Each guide helps you reason about trade-offs and build systems that fail gracefully.',
      ],
    },
    es: {
      heading: 'Ingenieria de Sistemas Distribuidos',
      paragraphs: [
        'Los sistemas distribuidos conectan componentes independientes a traves de una red. Permiten escalar y ser resilientes, pero introducen fallas en comunicacion, consenso, tiempo y consistencia que no existen en programas de un solo nodo.',
        'Los recursos a continuacion cubren el teorema CAP, consenso, eleccion de lider, idempotencia, transacciones distribuidas, modos de falla y observabilidad. Cada guia te ayuda a razonar sobre trade-offs y construir sistemas que fallen de forma elegante.',
      ],
    },
  },
  'api-gateway': {
    en: {
      heading: 'API Gateways',
      paragraphs: [
        'An API gateway sits between clients and backend services, handling routing, authentication, rate limiting, caching, and protocol translation. It simplifies the client experience and centralizes cross-cutting concerns.',
        'The recipes below cover gateway patterns with Kong, NGINX, Envoy, AWS API Gateway, and custom implementations. Each resource explains how to build a gateway that is secure, observable, and easy to evolve.',
      ],
    },
    es: {
      heading: 'API Gateways',
      paragraphs: [
        'Un API gateway se situa entre clientes y servicios backend, manejando routing, autenticacion, rate limiting, cacheo y traduccion de protocolos. Simplifica la experiencia del cliente y centraliza preocupaciones transversales.',
        'Las recetas a continuacion cubren patrones de gateway con Kong, NGINX, Envoy, AWS API Gateway e implementaciones personalizadas. Cada recurso explica como construir un gateway seguro, observable y facil de evolucionar.',
      ],
    },
  },
  lambda: {
    en: {
      heading: 'AWS Lambda and Function-as-a-Service',
      paragraphs: [
        'AWS Lambda lets you run code in response to events without managing servers. It is ideal for event-driven processing, but production use requires managing cold starts, concurrency limits, packaging, observability, and IAM permissions.',
        'The resources below cover Lambda triggers, deployment, environment variables, layers, provisioned concurrency, and integration with API Gateway and SQS. Each recipe focuses on functions that are cost-effective and reliable.',
      ],
    },
    es: {
      heading: 'AWS Lambda y Function-as-a-Service',
      paragraphs: [
        'AWS Lambda te permite ejecutar codigo en respuesta a eventos sin administrar servidores. Es ideal para procesamiento orientado a eventos, pero el uso en produccion requiere gestionar cold starts, limites de concurrencia, empaquetado, observabilidad y permisos de IAM.',
        'Los recursos a continuacion cubren triggers de Lambda, despliegue, variables de entorno, layers, provisioned concurrency e integracion con API Gateway y SQS. Cada receta se enfoca en funciones rentables y confiables.',
      ],
    },
  },
  owasp: {
    en: {
      heading: 'OWASP and Application Security',
      paragraphs: [
        'OWASP provides community-driven standards, tools, and documentation to improve application security. Its Top 10 and cheat sheets are practical references for identifying and mitigating common vulnerabilities.',
        'The resources below cover OWASP Top 10 risks, secure coding practices, dependency scanning, input validation, and security testing. Each guide maps security theory to code-level defenses you can implement today.',
      ],
    },
    es: {
      heading: 'OWASP y Seguridad de Aplicaciones',
      paragraphs: [
        'OWASP proporciona estandares, herramientas y documentacion impulsados por la comunidad para mejorar la seguridad de aplicaciones. Su Top 10 y cheat sheets son referencias practicas para identificar y mitigar vulnerabilidades comunes.',
        'Los recursos a continuacion cubren los riesgos del OWASP Top 10, practicas de codigo seguro, escaneo de dependencias, validacion de input y testing de seguridad. Cada guia mapea la teoria de seguridad a defensas a nivel de codigo que puedes implementar hoy.',
      ],
    },
  },
  sre: {
    en: {
      heading: 'Site Reliability Engineering',
      paragraphs: [
        'Site Reliability Engineering applies software engineering practices to operations. SREs use error budgets, SLOs, automation, and observability to balance reliability with the pace of feature delivery.',
        'The resources below cover reliability principles, on-call practices, incident management, capacity planning, and blameless postmortems. Each guide helps teams build systems that are reliable without slowing down development.',
      ],
    },
    es: {
      heading: 'Site Reliability Engineering',
      paragraphs: [
        'Site Reliability Engineering aplica practicas de ingenieria de software a las operaciones. Los SREs usan presupuestos de error, SLOs, automatizacion y observabilidad para equilibrar confiabilidad con el ritmo de entrega de features.',
        'Los recursos a continuacion cubren principios de confiabilidad, practicas de on-call, gestion de incidentes, planificacion de capacidad y postmortems sin culpa. Cada guia ayuda a los equipos a construir sistemas confiables sin frenar el desarrollo.',
      ],
    },
  },
  'incident-response': {
    en: {
      heading: 'Incident Response',
      paragraphs: [
        'Incident response is the practice of detecting, managing, and learning from production failures. A mature process includes on-call rotation, escalation paths, communication plans, and blameless postmortems.',
        'The resources below cover incident detection, triage, mitigation, communication, root-cause analysis, and runbooks. Each recipe focuses on reducing mean time to recovery and building organizational resilience.',
      ],
    },
    es: {
      heading: 'Respuesta a Incidentes',
      paragraphs: [
        'La respuesta a incidentes es la practica de detectar, gestionar y aprender de fallas en produccion. Un proceso maduro incluye rotacion de on-call, rutas de escalamiento, planes de comunicacion y postmortems sin culpa.',
        'Los recursos a continuacion cubren deteccion de incidentes, triage, mitigacion, comunicacion, analisis de causa raiz y runbooks. Cada receta se enfoca en reducir el tiempo medio de recuperacion y construir resiliencia organizacional.',
      ],
    },
  },
  ai: {
    en: {
      heading: 'Artificial Intelligence in Software',
      paragraphs: [
        'Artificial Intelligence is reshaping how software understands, recommends, and automates. Production AI systems require more than model selection; they need robust data pipelines, evaluation, monitoring, cost control, and safeguards.',
        'The resources below cover LLMs, embeddings, retrieval-augmented generation, agents, prompt engineering, and MLOps basics. Each guide connects AI capabilities to practical engineering decisions.',
      ],
    },
    es: {
      heading: 'Inteligencia Artificial en Software',
      paragraphs: [
        'La Inteligencia Artificial esta transformando como el software entiende, recomienda y automatiza. Los sistemas de IA de produccion requieren mas que seleccion de modelos; necesitan pipelines de datos robustos, evaluacion, monitoreo, control de costos y salvaguardas.',
        'Los recursos a continuacion cubren LLMs, embeddings, retrieval-augmented generation, agentes, prompt engineering y fundamentos de MLOps. Cada guia conecta las capacidades de IA con decisiones practicas de ingenieria.',
      ],
    },
  },
  async: {
    en: {
      heading: 'Asynchronous Programming',
      paragraphs: [
        'Asynchronous programming lets a program handle multiple tasks without blocking execution. It is essential for I/O-bound workloads, responsive UIs, and high-throughput services, but it introduces complexity in error handling, ordering, and cancellation.',
        'The recipes below cover async/await, promises, futures, callbacks, event loops, backpressure, and concurrency patterns. Each guide explains how to write async code that is readable, correct, and easy to debug.',
      ],
    },
    es: {
      heading: 'Programacion Asincrona',
      paragraphs: [
        'La programacion asincrona permite que un programa maneje multiples tareas sin bloquear la ejecucion. Es esencial para cargas de trabajo con I/O, UIs responsivas y servicios de alto throughput, pero introduce complejidad en manejo de errores, orden y cancelacion.',
        'Las recetas a continuacion cubren async/await, promises, futures, callbacks, event loops, backpressure y patrones de concurrencia. Cada guia explica como escribir codigo asincrono legible, correcto y facil de depurar.',
      ],
    },
  },
  validation: {
    en: {
      heading: 'Input Validation and Sanitization',
      paragraphs: [
        'Input validation is the first line of defense against malformed data, injection attacks, and application errors. Good validation is explicit, rejects bad data early, and separates validation from business logic.',
        'The resources below cover schema validation, regex, sanitization, whitelisting, custom validators, and error messages. Each recipe shows how to validate and sanitize input safely across forms, APIs, and databases.',
      ],
    },
    es: {
      heading: 'Validacion y Limpieza de Inputs',
      paragraphs: [
        'La validacion de input es la primera linea de defensa contra datos malformados, ataques de inyeccion y errores de aplicacion. Una buena validacion es explicita, rechaza datos malos temprano y separa la validacion de la logica de negocio.',
        'Los recursos a continuacion cubren validacion de esquemas, regex, sanitizacion, whitelisting, validadores personalizados y mensajes de error. Cada receta muestra como validar y limpiar inputs de forma segura en formularios, APIs y bases de datos.',
      ],
    },
  },
  pipeline: {
    en: {
      heading: 'CI/CD and Data Pipelines',
      paragraphs: [
        'Pipelines automate sequences of tasks that move code or data from source to destination. A reliable pipeline is versioned, testable, observable, and easy to debug when a stage fails.',
        'The recipes below cover CI/CD pipelines, ETL and data pipelines, DAGs, scheduling, artifact management, and pipeline testing. Each guide focuses on building automation that is repeatable and safe to change.',
      ],
    },
    es: {
      heading: 'Pipelines de CI/CD y Datos',
      paragraphs: [
        'Los pipelines automatizan secuencias de tareas que mueven codigo o datos desde el origen al destino. Un pipeline confiable es versionado, testeable, observable y facil de depurar cuando una etapa falla.',
        'Las recetas a continuacion cubren pipelines de CI/CD, ETL y data pipelines, DAGs, scheduling, gestion de artefactos y testing de pipelines. Cada guia se enfoca en construir automatizacion repetible y segura de cambiar.',
      ],
    },
  },
  'error-handling': {
    en: {
      heading: 'Error Handling in Production',
      paragraphs: [
        'Error handling determines how gracefully a system fails. Production code must distinguish between recoverable and fatal errors, provide useful context, log appropriately, and avoid exposing internal details to users.',
        'The resources below cover exceptions, result types, retries, circuit breakers, error boundaries, and user-friendly messages. Each recipe helps you build error paths that are predictable and easy to operate.',
      ],
    },
    es: {
      heading: 'Manejo de Errores en Produccion',
      paragraphs: [
        'El manejo de errores determina que tan elegantemente falla un sistema. El codigo de produccion debe distinguir entre errores recuperables y fatales, proveer contexto util, loguear adecuadamente y evitar exponer detalles internos a los usuarios.',
        'Los recursos a continuacion cubren excepciones, tipos de resultado, reintentos, circuit breakers, error boundaries y mensajes amigables. Cada receta te ayuda a construir caminos de error predecibles y faciles de operar.',
      ],
    },
  },
  metrics: {
    en: {
      heading: 'Metrics and SLIs',
      paragraphs: [
        'Metrics are quantitative measurements that describe the behavior and health of a system. The right metrics become Service Level Indicators, inform SLOs, and drive alerting without drowning operators in noise.',
        'The resources below cover counter, gauge, histogram, and summary types, cardinality, instrumentation, dashboards, and metric-driven alerting. Each guide helps you collect signals that are meaningful and actionable.',
      ],
    },
    es: {
      heading: 'Metricas y SLIs',
      paragraphs: [
        'Las metricas son mediciones cuantitativas que describen el comportamiento y la salud de un sistema. Las metricas adecuadas se convierten en Service Level Indicators, informan SLOs y impulsan alertas sin ahogar a los operadores con ruido.',
        'Los recursos a continuacion cubren tipos counter, gauge, histogram y summary, cardinalidad, instrumentacion, dashboards y alertas basadas en metricas. Cada guia te ayuda a recolectar senales significativas y accionables.',
      ],
    },
  },
  'unit-tests': {
    en: {
      heading: 'Unit Testing',
      paragraphs: [
        'Unit tests verify the smallest pieces of code in isolation. They are the fastest feedback loop for developers and the foundation of a reliable test pyramid.',
        'The resources below cover test frameworks, mocking, assertions, parameterized tests, test isolation, and TDD. Each recipe shows how to write unit tests that are deterministic, fast, and closely aligned with the behavior being tested.',
      ],
    },
    es: {
      heading: 'Testing Unitario',
      paragraphs: [
        'Los tests unitarios verifican las piezas mas pequenas de codigo de forma aislada. Son el ciclo de retroalimentacion mas rapido para desarrolladores y la base de una piramide de tests confiable.',
        'Los recursos a continuacion cubren frameworks de testing, mocking, assertions, tests parametrizados, aislamiento de tests y TDD. Cada receta muestra como escribir tests unitarios deterministas, rapidos y alineados con el comportamiento bajo prueba.',
      ],
    },
  },
  integration: {
    en: {
      heading: 'Integration Testing',
      paragraphs: [
        'Integration testing verifies that multiple components work together correctly. It sits between unit and end-to-end tests, catching issues in interfaces, serialization, and configuration that unit tests miss.',
        'The resources below cover test databases, testcontainers, service integration, contract testing, and CI strategies. Each guide explains how to build integration tests that are stable enough to trust but focused enough to run frequently.',
      ],
    },
    es: {
      heading: 'Testing de Integracion',
      paragraphs: [
        'El testing de integracion verifica que multiples componentes funcionen correctamente juntos. Se situa entre los tests unitarios y end-to-end, detectando problemas en interfaces, serializacion y configuracion que los tests unitarios no captan.',
        'Los recursos a continuacion cubren bases de datos de test, testcontainers, integracion de servicios, contract testing y estrategias de CI. Cada guia explica como construir tests de integracion lo suficientemente estables para confiar pero enfocados para ejecutarse frecuentemente.',
      ],
    },
  },
  backend: {
    en: {
      heading: 'Backend Engineering',
      paragraphs: [
        'Backend engineering is the discipline of building the services, APIs, and data layers that power applications. It spans architecture, databases, networking, security, and operational concerns that users never see but always feel.',
        'The resources below cover API design, persistence, caching, authentication, error handling, and scaling. Each recipe focuses on building backends that are reliable, observable, and maintainable under real load.',
      ],
    },
    es: {
      heading: 'Ingenieria Backend',
      paragraphs: [
        'La ingenieria backend es la disciplina de construir los servicios, APIs y capas de datos que impulsan las aplicaciones. Abarca arquitectura, bases de datos, redes, seguridad y preocupaciones operativas que los usuarios no ven pero si sienten.',
        'Los recursos a continuacion cubren diseno de APIs, persistencia, cacheo, autenticacion, manejo de errores y escalado. Cada receta se enfoca en construir backends confiables, observables y mantenibles bajo carga real.',
      ],
    },
  },
  express: {
    en: {
      heading: 'Express.js for Web APIs',
      paragraphs: [
        'Express.js is the minimal, flexible Node.js framework behind many production APIs and web applications. Its middleware model makes it easy to extend, but it requires discipline to keep routing, error handling, and structure maintainable.',
        'The resources below cover routing, middleware, error handling, security, validation, and deployment. Each recipe shows how to build Express applications that are clean, secure, and ready for production traffic.',
      ],
    },
    es: {
      heading: 'Express.js para APIs Web',
      paragraphs: [
        'Express.js es el framework minimal y flexible de Node.js detras de muchas APIs y aplicaciones web de produccion. Su modelo de middleware lo hace facil de extender, pero requiere disciplina para mantener routing, manejo de errores y estructura.',
        'Los recursos a continuacion cubren routing, middleware, manejo de errores, seguridad, validacion y despliegue. Cada receta muestra como construir aplicaciones Express limpias, seguras y listas para trafico de produccion.',
      ],
    },
  },
  data: {
    en: {
      heading: 'Data Engineering and Management',
      paragraphs: [
        'Data is at the heart of most modern applications. Working with data effectively requires understanding storage, processing, modeling, transformation, quality, and governance across the lifecycle.',
        'The resources below cover databases, ETL, data pipelines, validation, serialization, cleaning, and analysis. Each recipe connects data operations to practical engineering outcomes.',
      ],
    },
    es: {
      heading: 'Ingenieria y Gestion de Datos',
      paragraphs: [
        'Los datos estan en el corazon de la mayoria de las aplicaciones modernas. Trabajar con datos de forma efectiva requiere comprender almacenamiento, procesamiento, modelado, transformacion, calidad y gobernanza a lo largo del ciclo de vida.',
        'Los recursos a continuacion cubren bases de datos, ETL, data pipelines, validacion, serializacion, limpieza y analisis. Cada receta conecta las operaciones de datos con resultados practicos de ingenieria.',
      ],
    },
  },
  infrastructure: {
    en: {
      heading: 'Cloud and Infrastructure Engineering',
      paragraphs: [
        'Infrastructure engineering is the practice of building and operating the platforms that run applications. It includes compute, networking, storage, identity, and automation, all managed with reliability, cost, and security in mind.',
        'The resources below cover cloud providers, infrastructure as code, containers, Kubernetes, networking, secrets, and cost optimization. Each guide focuses on infrastructure that is reproducible, observable, and secure.',
      ],
    },
    es: {
      heading: 'Ingenieria de Nube e Infraestructura',
      paragraphs: [
        'La ingenieria de infraestructura es la practica de construir y operar las plataformas que ejecutan aplicaciones. Incluye computacion, redes, almacenamiento, identidad y automatizacion, todo gestionado con confiabilidad, costo y seguridad en mente.',
        'Los recursos a continuacion cubren proveedores de nube, infraestructura como codigo, contenedores, Kubernetes, redes, secretos y optimizacion de costos. Cada guia se enfoca en infraestructura reproducible, observable y segura.',
      ],
    },
  },
  parsing: {
    en: {
      heading: 'Parsing and Text Processing',
      paragraphs: [
        'Parsing turns raw text into structured data that programs can use. It is the foundation of working with logs, configuration files, markup languages, query languages, and data interchange formats.',
        'The resources below cover recursive descent, parser combinators, regular expressions, tokenization, ASTs, and validation. Each recipe shows how to parse text safely and maintainably in production code.',
      ],
    },
    es: {
      heading: 'Parsing y Procesamiento de Texto',
      paragraphs: [
        'El parsing convierte texto crudo en datos estructurados que los programas pueden usar. Es la base para trabajar con logs, archivos de configuracion, lenguajes de markup, lenguajes de consulta y formatos de intercambio de datos.',
        'Los recursos a continuacion cubren recursive descent, parser combinators, expresiones regulares, tokenizacion, ASTs y validacion. Cada receta muestra como parsear texto de forma segura y mantenible en codigo de produccion.',
      ],
    },
  },
  streaming: {
    en: {
      heading: 'Stream Processing',
      paragraphs: [
        'Stream processing handles data as it arrives rather than in batches. It enables real-time analytics, event-driven reactions, and low-latency pipelines, but requires careful handling of time, state, and ordering.',
        'The resources below cover Kafka, Flink, ksqlDB, windowing, watermarks, stateful processing, and exactly-once semantics. Each guide explains how to build stream processing systems that are correct and scalable.',
      ],
    },
    es: {
      heading: 'Procesamiento de Streams',
      paragraphs: [
        'El procesamiento de streams maneja datos a medida que llegan en lugar de hacerlo por lotes. Habilita analitica en tiempo real, reacciones orientadas a eventos y pipelines de baja latencia, pero requiere manejar cuidadosamente el tiempo, estado y orden.',
        'Los recursos a continuacion cubren Kafka, Flink, ksqlDB, windowing, watermarks, procesamiento con estado y exactly-once semantics. Cada guia explica como construir sistemas de procesamiento de streams correctos y escalables.',
      ],
    },
  },
  vulnerabilities: {
    en: {
      heading: 'Vulnerability Management',
      paragraphs: [
        'Vulnerability management is the continuous process of identifying, assessing, prioritizing, and remediating security weaknesses. It bridges development, operations, and security teams to reduce real risk.',
        'The resources below cover scanning, dependency audits, CVSS, patch management, secure coding, and incident response. Each recipe shows how to find and fix vulnerabilities before they become incidents.',
      ],
    },
    es: {
      heading: 'Gestion de Vulnerabilidades',
      paragraphs: [
        'La gestion de vulnerabilidades es el proceso continuo de identificar, evaluar, priorizar y remediar debilidades de seguridad. Une a los equipos de desarrollo, operaciones y seguridad para reducir el riesgo real.',
        'Los recursos a continuacion cubren escaneo, auditorias de dependencias, CVSS, gestion de parches, codigo seguro y respuesta a incidentes. Cada receta muestra como encontrar y corregir vulnerabilidades antes de que se conviertan en incidentes.',
      ],
    },
  },
  optimization: {
    en: {
      heading: 'Performance Optimization',
      paragraphs: [
        'Optimization is the disciplined process of making a system faster, cheaper, or more efficient. It must be driven by measurement; otherwise it becomes guesswork and premature complexity.',
        'The resources below cover profiling, query optimization, algorithmic improvements, caching, compression, and runtime tuning. Each recipe connects a bottleneck to a measurable improvement.',
      ],
    },
    es: {
      heading: 'Optimizacion de Rendimiento',
      paragraphs: [
        'La optimizacion es el proceso disciplinado de hacer un sistema mas rapido, barato o eficiente. Debe estar impulsada por medicion; de lo contrario se convierte en conjetura y complejidad prematura.',
        'Los recursos a continuacion cubren profiling, optimizacion de consultas, mejoras algoritmicas, cacheo, compresion y ajuste de runtime. Cada receta conecta un cuello de botella con una mejora medible.',
      ],
    },
  },
  'code-quality': {
    en: {
      heading: 'Code Quality and Maintainability',
      paragraphs: [
        'Code quality is the sum of practices that make software easy to read, test, change, and operate. It includes style, structure, naming, documentation, and automated checks that catch issues before they reach production.',
        'The resources below cover linting, formatting, static analysis, refactoring, testing, code review, and clean code principles. Each guide helps teams write code that ages well under real maintenance.',
      ],
    },
    es: {
      heading: 'Calidad y Mantenibilidad del Codigo',
      paragraphs: [
        'La calidad del codigo es la suma de practicas que hacen que el software sea facil de leer, testear, cambiar y operar. Incluye estilo, estructura, nombres, documentacion y controles automatizados que detectan problemas antes de llegar a produccion.',
        'Los recursos a continuacion cubren linting, formateo, analisis estatico, refactorizacion, testing, code review y principios de clean code. Cada guia ayuda a los equipos a escribir codigo que envejece bien bajo mantenimiento real.',
      ],
    },
  },
  cdn: {
    en: {
      heading: 'Content Delivery Networks',
      paragraphs: [
        'A Content Delivery Network distributes content closer to users, reducing latency and offloading origin servers. Effective CDN use requires cache policies, purging, SSL, and understanding how content changes propagate.',
        'The resources below cover caching strategies, cache invalidation, edge computing, origin shield, geo-routing, and security headers. Each recipe explains how to use CDNs to improve speed and availability.',
      ],
    },
    es: {
      heading: 'Content Delivery Networks',
      paragraphs: [
        'Una Content Delivery Network distribuye contenido mas cerca de los usuarios, reduciendo la latencia y descargando los servidores de origen. El uso efectivo de CDN requiere politicas de cache, purgado, SSL y comprender como se propagan los cambios de contenido.',
        'Los recursos a continuacion cubren estrategias de cache, invalidacion de cache, edge computing, origin shield, geo-routing y headers de seguridad. Cada receta explica como usar CDNs para mejorar velocidad y disponibilidad.',
      ],
    },
  },
  mysql: {
    en: {
      heading: 'MySQL in Production',
      paragraphs: [
        'MySQL is one of the most widely used open-source relational databases. Production MySQL requires attention to indexing, replication, backups, connection management, and query optimization.',
        'The resources below cover schema design, transactions, replication, partitioning, performance tuning, and high availability. Each guide helps you run MySQL reliably for real-world workloads.',
      ],
    },
    es: {
      heading: 'MySQL en Produccion',
      paragraphs: [
        'MySQL es una de las bases de datos relacionales open-source mas usadas. MySQL de produccion requiere atencion a indexacion, replicacion, backups, gestion de conexiones y optimizacion de consultas.',
        'Los recursos a continuacion cubren diseno de esquemas, transacciones, replicacion, particionamiento, ajuste de rendimiento y alta disponibilidad. Cada guia te ayuda a ejecutar MySQL de forma confiable para cargas de trabajo reales.',
      ],
    },
  },
  'event-sourcing': {
    en: {
      heading: 'Event Sourcing',
      paragraphs: [
        'Event sourcing stores the state of a system as a sequence of events rather than the current state. It enables auditability, temporal queries, and flexible projections, but introduces complexity in event versioning, schema evolution, and snapshots.',
        'The resources below cover event stores, projections, snapshots, CQRS pairs, idempotency, and replay strategies. Each guide explains how to implement event sourcing without overengineering the domain.',
      ],
    },
    es: {
      heading: 'Event Sourcing',
      paragraphs: [
        'Event sourcing almacena el estado de un sistema como una secuencia de eventos en lugar del estado actual. Habilita auditabilidad, consultas temporales y proyecciones flexibles, pero introduce complejidad en versionado de eventos, evolucion de esquemas y snapshots.',
        'Los recursos a continuacion cubren event stores, proyecciones, snapshots, parejas CQRS, idempotencia y estrategias de replay. Cada guia explica como implementar event sourcing sin overengineering el dominio.',
      ],
    },
  },
  compliance: {
    en: {
      heading: 'Compliance and Regulatory Security',
      paragraphs: [
        'Compliance ensures that systems meet legal, industry, and organizational requirements. It is not just about checklists; it requires traceability, evidence, access controls, and continuous validation.',
        'The resources below cover GDPR, SOC 2, ISO 27001, data retention, audit trails, and security policies. Each guide helps you build systems that satisfy both security and regulatory expectations.',
      ],
    },
    es: {
      heading: 'Cumplimiento y Seguridad Regulatoria',
      paragraphs: [
        'El cumplimiento asegura que los sistemas cumplan con requisitos legales, industriales y organizacionales. No se trata solo de checklists; requiere trazabilidad, evidencia, controles de acceso y validacion continua.',
        'Los recursos a continuacion cubren GDPR, SOC 2, ISO 27001, retencion de datos, audit trails y politicas de seguridad. Cada guia te ayuda a construir sistemas que satisfacen tanto expectativas de seguridad como regulatorias.',
      ],
    },
  },
  'file-handling': {
    en: {
      heading: 'File Handling and Processing',
      paragraphs: [
        'File handling is the practice of reading, writing, transforming, and managing files in applications. It involves understanding encoding, streaming, permissions, and safe I/O patterns.',
        'The resources below cover reading and writing files, CSV, JSON, XML, compression, validation, and batch processing. Each recipe shows how to handle files reliably and efficiently in production.',
      ],
    },
    es: {
      heading: 'Manejo y Procesamiento de Archivos',
      paragraphs: [
        'El manejo de archivos es la practica de leer, escribir, transformar y gestionar archivos en aplicaciones. Implica comprender codificacion, streaming, permisos y patrones de E/S seguros.',
        'Los recursos a continuacion cubren lectura y escritura de archivos, CSV, JSON, XML, compresion, validacion y procesamiento por lotes. Cada receta muestra como manejar archivos de forma confiable y eficiente en produccion.',
      ],
    },
  },
  operations: {
    en: {
      heading: 'Operations and Platform Engineering',
      paragraphs: [
        'Operations is the practice of keeping production systems running reliably. Platform engineering brings product thinking to operations by building internal platforms, self-service tools, and paved roads for developers.',
        'The resources below cover on-call, incident management, automation, monitoring, capacity planning, and developer experience. Each guide helps you build operational practices that scale with the organization.',
      ],
    },
    es: {
      heading: 'Operaciones e Ingenieria de Plataforma',
      paragraphs: [
        'Las operaciones son la practica de mantener los sistemas de produccion ejecutandose de forma confiable. La ingenieria de plataforma aplica pensamiento de producto a las operaciones construyendo plataformas internas, herramientas self-service y caminos pavimentados para desarrolladores.',
        'Los recursos a continuacion cubren on-call, gestion de incidentes, automatizacion, monitoreo, planificacion de capacidad y experiencia del desarrollador. Cada guia te ayuda a construir practicas operativas que escalan con la organizacion.',
      ],
    },
  },
  rollback: {
    en: {
      heading: 'Rollback and Recovery',
      paragraphs: [
        'Rollback is the process of reverting a system to a previous known-good state. It is a critical safety net for deployments, schema changes, and configuration updates.',
        'The resources below cover rollback strategies, blue-green deployments, database migrations, feature flags, and disaster recovery. Each recipe shows how to recover quickly and safely when changes go wrong.',
      ],
    },
    es: {
      heading: 'Rollback y Recuperacion',
      paragraphs: [
        'El rollback es el proceso de revertir un sistema a un estado anterior conocido como bueno. Es una red de seguridad critica para despliegues, cambios de esquema y actualizaciones de configuracion.',
        'Los recursos a continuacion cubren estrategias de rollback, despliegues blue-green, migraciones de bases de datos, feature flags y recuperacion ante desastres. Cada receta muestra como recuperarse rapidamente y con seguridad cuando los cambios salen mal.',
      ],
    },
  },
  embeddings: {
    en: {
      heading: 'Vector Embeddings for AI',
      paragraphs: [
        'Embeddings are dense numerical representations of text, images, or other data that capture semantic meaning. They are the foundation of search, recommendation, and retrieval-augmented generation in AI systems.',
        'The resources below cover embedding models, vector databases, similarity search, chunking, and indexing. Each recipe explains how to build practical AI features using embeddings in production.',
      ],
    },
    es: {
      heading: 'Embeddings Vectoriales para IA',
      paragraphs: [
        'Los embeddings son representaciones numericas densas de texto, imagenes u otros datos que capturan significado semantico. Son la base de la busqueda, recomendacion y retrieval-augmented generation en sistemas de IA.',
        'Los recursos a continuacion cubren modelos de embeddings, bases de datos vectoriales, busqueda por similitud, chunking e indexacion. Cada receta explica como construir funciones practicas de IA usando embeddings en produccion.',
      ],
    },
  },
  csv: {
    en: {
      heading: 'CSV and Tabular Data',
      paragraphs: [
        'CSV is the universal format for tabular data exchange. Despite its simplicity, it is full of edge cases around quoting, delimiters, encoding, headers, and malformed rows.',
        'The resources below cover parsing, writing, validating, transforming, and importing CSV data. Each recipe shows how to work with CSV reliably across languages and tools.',
      ],
    },
    es: {
      heading: 'CSV y Datos Tabulares',
      paragraphs: [
        'CSV es el formato universal para el intercambio de datos tabulares. A pesar de su simplicidad, esta lleno de casos especiales con comillas, delimitadores, codificacion, headers y filas malformadas.',
        'Los recursos a continuacion cubren parseo, escritura, validacion, transformacion e importacion de datos CSV. Cada receta muestra como trabajar con CSV de forma confiable en diferentes lenguajes y herramientas.',
      ],
    },
  },
  io: {
    en: {
      heading: 'Input/Output and File Systems',
      paragraphs: [
        'Input and output operations connect programs to files, networks, and users. Efficient I/O requires understanding streams, buffers, blocking vs non-blocking calls, and resource cleanup.',
        'The resources below cover file I/O, network I/O, async I/O, memory mapping, and serialization. Each recipe explains how to read and write data efficiently without leaking resources or blocking threads.',
      ],
    },
    es: {
      heading: 'Entrada/Salida y Sistemas de Archivos',
      paragraphs: [
        'Las operaciones de entrada y salida conectan programas con archivos, redes y usuarios. Una E/S eficiente requiere comprender streams, buffers, llamadas bloqueantes vs no bloqueantes y liberacion de recursos.',
        'Los recursos a continuacion cubren E/S de archivos, E/S de red, E/S asincrona, memory mapping y serializacion. Cada receta explica como leer y escribir datos eficientemente sin fugas de recursos ni bloquear threads.',
      ],
    },
  },
  functions: {
    en: {
      heading: 'Functions and Serverless Functions',
      paragraphs: [
        'Functions are the building blocks of clean code. In serverless contexts, they become independently deployable units triggered by events. Both require attention to scope, side effects, testing, and reuse.',
        'The resources below cover function design, pure functions, closures, higher-order functions, serverless function patterns, and testing. Each recipe helps you write functions that are predictable and composable.',
      ],
    },
    es: {
      heading: 'Funciones y Funciones Serverless',
      paragraphs: [
        'Las funciones son los bloques de construccion del codigo limpio. En contextos serverless, se convierten en unidades desplegables de forma independiente activadas por eventos. Ambas requieren atencion al alcance, efectos secundarios, testing y reutilizacion.',
        'Los recursos a continuacion cubren diseno de funciones, funciones puras, closures, higher-order functions, patrones de funciones serverless y testing. Cada receta te ayuda a escribir funciones predecibles y componibles.',
      ],
    },
  },
  scalability: {
    en: {
      heading: 'Scalability and Capacity Planning',
      paragraphs: [
        'Scalability is the ability of a system to handle growth without degrading. It requires horizontal and vertical scaling strategies, load balancing, caching, database partitioning, and capacity planning.',
        'The resources below cover scaling patterns, bottlenecks, load testing, auto-scaling, and cost trade-offs. Each guide explains how to design systems that grow with demand without unnecessary complexity.',
      ],
    },
    es: {
      heading: 'Escalabilidad y Planificacion de Capacidad',
      paragraphs: [
        'La escalabilidad es la capacidad de un sistema de manejar crecimiento sin degradarse. Requiere estrategias de escalado horizontal y vertical, load balancing, cacheo, particionamiento de bases de datos y planificacion de capacidad.',
        'Los recursos a continuacion cubren patrones de escalado, cuellos de botella, load testing, auto-scaling y trade-offs de costo. Cada guia explica como disenar sistemas que crecen con la demanda sin complejidad innecesaria.',
      ],
    },
  },
  'machine-learning': {
    en: {
      heading: 'Machine Learning Engineering',
      paragraphs: [
        'Machine learning engineering is the discipline of building systems that train, deploy, and operate ML models. It combines data pipelines, model versioning, feature stores, evaluation, and monitoring.',
        'The resources below cover model training, deployment, feature engineering, MLOps, and production monitoring. Each recipe connects ML theory to working systems that improve over time.',
      ],
    },
    es: {
      heading: 'Ingenieria de Machine Learning',
      paragraphs: [
        'La ingenieria de machine learning es la disciplina de construir sistemas que entrenan, despliegan y operan modelos de ML. Combina data pipelines, versionado de modelos, feature stores, evaluacion y monitoreo.',
        'Los recursos a continuacion cubren entrenamiento de modelos, despliegue, feature engineering, MLOps y monitoreo en produccion. Cada receta conecta la teoria de ML con sistemas funcionales que mejoran con el tiempo.',
      ],
    },
  },
  'data-processing': {
    en: {
      heading: 'Data Processing Pipelines',
      paragraphs: [
        'Data processing turns raw data into useful information. Production pipelines must handle volume, schema changes, failures, and monitoring while keeping output accurate and timely.',
        'The resources below cover batch processing, stream processing, ETL, transformations, validation, and orchestration. Each recipe shows how to build data pipelines that are reliable and observable.',
      ],
    },
    es: {
      heading: 'Pipelines de Procesamiento de Datos',
      paragraphs: [
        'El procesamiento de datos convierte datos crudos en informacion util. Los pipelines de produccion deben manejar volumen, cambios de esquema, fallas y monitoreo manteniendo la salida precisa y oportuna.',
        'Los recursos a continuacion cubren procesamiento por lotes, procesamiento de streams, ETL, transformaciones, validacion y orquestacion. Cada receta muestra como construir data pipelines confiables y observables.',
      ],
    },
  },
  etl: {
    en: {
      heading: 'Extract, Transform, Load',
      paragraphs: [
        'ETL is the process of moving data from sources to a target data store through extraction, transformation, and loading. It remains the backbone of data warehouses, reporting, and analytics.',
        'The resources below cover ETL patterns, batch vs streaming, schema mapping, data quality, incremental loads, and error handling. Each guide explains how to build ETL pipelines that are maintainable and auditable.',
      ],
    },
    es: {
      heading: 'Extract, Transform, Load',
      paragraphs: [
        'ETL es el proceso de mover datos desde fuentes hacia un almacen de datos destino a traves de extraccion, transformacion y carga. Sigue siendo la columna vertebral de data warehouses, reporting y analitica.',
        'Los recursos a continuacion cubren patrones ETL, batch vs streaming, mapeo de esquemas, calidad de datos, cargas incrementales y manejo de errores. Cada guia explica como construir pipelines ETL mantenibles y auditables.',
      ],
    },
  },
  containers: {
    en: {
      heading: 'Containers and Containerization',
      paragraphs: [
        'Containers package applications with their dependencies into isolated, portable units. They simplify deployment, improve consistency, and enable scalable platforms like Kubernetes.',
        'The resources below cover Docker, container images, multi-stage builds, registries, networking, security contexts, and runtime concerns. Each recipe helps you containerize applications correctly.',
      ],
    },
    es: {
      heading: 'Contenedores y Contenerizacion',
      paragraphs: [
        'Los contenedores empaquetan aplicaciones con sus dependencias en unidades aisladas y portables. Simplifican el despliegue, mejoran la consistencia y habilitan plataformas escalables como Kubernetes.',
        'Los recursos a continuacion cubren Docker, imagenes de contenedor, multi-stage builds, registries, redes, contextos de seguridad y preocupaciones de runtime. Cada receta te ayuda a contenerizar aplicaciones correctamente.',
      ],
    },
  },
  streams: {
    en: {
      heading: 'Streams and Real-Time Data',
      paragraphs: [
        'Streams are unbounded sequences of data that flow continuously. Stream processing enables real-time reactions, analytics, and event-driven behavior with low latency.',
        'The resources below cover stream APIs, reactive streams, backpressure, windowing, and stream processing platforms. Each guide explains how to work with streams without losing data or overwhelming consumers.',
      ],
    },
    es: {
      heading: 'Streams y Datos en Tiempo Real',
      paragraphs: [
        'Los streams son secuencias de datos ilimitadas que fluyen continuamente. El procesamiento de streams habilita reacciones en tiempo real, analitica y comportamiento orientado a eventos con baja latencia.',
        'Los recursos a continuacion cubren APIs de streams, reactive streams, backpressure, windowing y plataformas de procesamiento de streams. Cada guia explica como trabajar con streams sin perder datos ni saturar consumidores.',
      ],
    },
  },
  css: {
    en: {
      heading: 'CSS and Modern Styling',
      paragraphs: [
        'CSS is the language that controls the visual presentation of the web. Modern CSS includes variables, flexbox, grid, custom properties, container queries, and utility-first frameworks.',
        'The resources below cover layout, responsive design, animations, performance, preprocessors, and design systems. Each recipe helps you write CSS that is maintainable, accessible, and performant.',
      ],
    },
    es: {
      heading: 'CSS y Estilos Modernos',
      paragraphs: [
        'CSS es el lenguaje que controla la presentacion visual de la web. El CSS moderno incluye variables, flexbox, grid, custom properties, container queries y frameworks utility-first.',
        'Los recursos a continuacion cubren layout, diseno responsivo, animaciones, rendimiento, preprocesadores y design systems. Cada receta te ayuda a escribir CSS mantenible, accesible y performante.',
      ],
    },
  },
  rabbitmq: {
    en: {
      heading: 'RabbitMQ for Message Queuing',
      paragraphs: [
        'RabbitMQ is a mature message broker that supports queues, exchanges, and routing patterns for reliable asynchronous communication. It is widely used for task queues, RPC, and event distribution.',
        'The resources below cover exchanges, queues, bindings, routing keys, dead-letter queues, acknowledgments, and clustering. Each recipe shows how to build messaging patterns with RabbitMQ that are reliable and observable.',
      ],
    },
    es: {
      heading: 'RabbitMQ para Colas de Mensajes',
      paragraphs: [
        'RabbitMQ es un broker de mensajes maduro que soporta colas, exchanges y patrones de routing para comunicacion asincrona confiable. Es ampliamente usado para task queues, RPC y distribucion de eventos.',
        'Los recursos a continuacion cubren exchanges, colas, bindings, routing keys, dead-letter queues, acknowledgments y clustering. Cada receta muestra como construir patrones de mensajeria con RabbitMQ confiables y observables.',
      ],
    },
  },
  authorization: {
    en: {
      heading: 'Authorization and Access Control',
      paragraphs: [
        'Authorization determines what an authenticated user or service is allowed to do. It is implemented through roles, permissions, policies, attribute-based access control, and resource-level checks.',
        'The resources below cover RBAC, ABAC, OAuth scopes, JWT claims, permission models, and policy enforcement. Each guide explains how to design authorization that is secure, flexible, and easy to audit.',
      ],
    },
    es: {
      heading: 'Autorizacion y Control de Acceso',
      paragraphs: [
        'La autorizacion determina que puede hacer un usuario o servicio autenticado. Se implementa a traves de roles, permisos, politicas, control de acceso basado en atributos y verificaciones a nivel de recurso.',
        'Los recursos a continuacion cubren RBAC, ABAC, scopes de OAuth, claims de JWT, modelos de permisos y enforcement de politicas. Cada guia explica como disenar autorizacion segura, flexible y facil de auditar.',
      ],
    },
  },
  audit: {
    en: {
      heading: 'Audit and Compliance Logging',
      paragraphs: [
        'Audit logging captures evidence of who did what, when, and where. It is essential for security forensics, compliance, and accountability in regulated environments.',
        'The resources below cover audit trails, tamper-evident logs, retention, access patterns, and integration with compliance frameworks. Each recipe helps you build audit systems that are trustworthy and complete.',
      ],
    },
    es: {
      heading: 'Auditoria y Logging de Cumplimiento',
      paragraphs: [
        'El logging de auditoria captura evidencia de quien hizo que, cuando y donde. Es esencial para forense de seguridad, cumplimiento y responsabilidad en entornos regulados.',
        'Los recursos a continuacion cubren audit trails, logs a prueba de manipulacion, retencion, patrones de acceso e integracion con frameworks de cumplimiento. Cada receta te ayuda a construir sistemas de auditoria confiables y completos.',
      ],
    },
  },
  alerting: {
    en: {
      heading: 'Alerting for Production Systems',
      paragraphs: [
        'Alerting notifies operators when a metric, log, or trace indicates a problem. Good alerts are actionable, specific, and rare enough to be taken seriously.',
        'The resources below cover alert thresholds, SLO-based alerting, multi-window alerts, routing, paging, and alert fatigue. Each guide helps you build an alerting culture that responds to real signals.',
      ],
    },
    es: {
      heading: 'Alertas para Sistemas de Produccion',
      paragraphs: [
        'Las alertas notifican a los operadores cuando una metrica, log o traza indica un problema. Buenas alertas son accionables, especificas y lo suficientemente raras como para ser tomadas en serio.',
        'Los recursos a continuacion cubren umbrales de alerta, alerting basado en SLO, alertas de multi-ventana, routing, paging y fatiga de alertas. Cada guia te ayuda a construir una cultura de alertas que responda a senales reales.',
      ],
    },
  },
  'on-call': {
    en: {
      heading: 'On-Call and Incident Readiness',
      paragraphs: [
        'On-call is the practice of having engineers available to respond to production incidents. Effective on-call requires runbooks, escalation paths, alert triage, and a healthy balance with sustainable schedules.',
        'The resources below cover on-call rotations, incident response, alert fatigue, runbooks, and postmortems. Each guide helps you build on-call practices that protect the service and the team.',
      ],
    },
    es: {
      heading: 'On-Call y Preparacion para Incidentes',
      paragraphs: [
        'El on-call es la practica de tener ingenieros disponibles para responder a incidentes de produccion. Un on-call efectivo requiere runbooks, rutas de escalamiento, triage de alertas y un equilibrio saludable con cronogramas sostenibles.',
        'Los recursos a continuacion cubren rotaciones de on-call, respuesta a incidentes, fatiga de alertas, runbooks y postmortems. Cada guia te ayuda a construir practicas de on-call que protegen el servicio y el equipo.',
      ],
    },
  },
  design: {
    en: {
      heading: 'Software Design',
      paragraphs: [
        'Software design is the discipline of structuring code to meet functional and non-functional requirements. Good design balances clarity, flexibility, and maintainability without overcomplicating the solution.',
        'The resources below cover design principles, patterns, trade-offs, abstraction, and coupling. Each guide helps you make design decisions that hold up under real change and scale.',
      ],
    },
    es: {
      heading: 'Diseno de Software',
      paragraphs: [
        'El diseno de software es la disciplina de estructurar codigo para cumplir requisitos funcionales y no funcionales. Un buen diseno equilibra claridad, flexibilidad y mantenibilidad sin complicar en exceso la solucion.',
        'Los recursos a continuacion cubren principios de diseno, patrones, trade-offs, abstraccion y acoplamiento. Cada guia te ayuda a tomar decisiones de diseno que resisten el cambio y la escala reales.',
      ],
    },
  },
  documentation: {
    en: {
      heading: 'Technical Documentation',
      paragraphs: [
        'Technical documentation turns implicit knowledge into reusable guidance. It includes runbooks, API docs, READMEs, decision records, and onboarding guides that keep teams aligned and systems operable.',
        'The resources below cover writing, structuring, versioning, and maintaining docs. Each recipe focuses on documentation that is accurate, discoverable, and easy to keep up to date.',
      ],
    },
    es: {
      heading: 'Documentacion Tecnica',
      paragraphs: [
        'La documentacion tecnica convierte el conocimiento implicito en guia reutilizable. Incluye runbooks, docs de APIs, READMEs, decision records y guias de onboarding que mantienen a los equipos alineados y los sistemas operables.',
        'Los recursos a continuacion cubren escritura, estructuracion, versionado y mantenimiento de documentacion. Cada receta se enfoca en documentacion precisa, descubrible y facil de mantener actualizada.',
      ],
    },
  },
  policy: {
    en: {
      heading: 'Policies and Standards',
      paragraphs: [
        'Policies are explicit rules that govern how teams build, operate, and secure systems. Good policies are enforceable, measurable, and reviewed regularly rather than buried in a wiki.',
        'The resources below cover security policies, coding standards, deployment policies, and compliance rules. Each guide shows how to write and operationalize policies that actually shape behavior.',
      ],
    },
    es: {
      heading: 'Politicas y Estandares',
      paragraphs: [
        'Las politicas son reglas explicitas que gobiernan como los equipos construyen, operan y aseguran sistemas. Buenas politicas son aplicables, medibles y revisadas regularmente en lugar de enterradas en una wiki.',
        'Los recursos a continuacion cubren politicas de seguridad, estandares de codigo, politicas de despliegue y reglas de cumplimiento. Cada guia muestra como escribir y operacionalizar politicas que realmente moldeen el comportamiento.',
      ],
    },
  },
  communication: {
    en: {
      heading: 'Communication Patterns',
      paragraphs: [
        'Communication is how components, services, and teams exchange information. It can be synchronous or asynchronous, direct or mediated by queues, and each choice affects coupling, latency, and reliability.',
        'The resources below cover REST, messaging, gRPC, WebSockets, event-driven communication, and team communication. Each guide helps you choose and implement the right communication model.',
      ],
    },
    es: {
      heading: 'Patrones de Comunicacion',
      paragraphs: [
        'La comunicacion es como los componentes, servicios y equipos intercambian informacion. Puede ser sincrona o asincrona, directa o mediada por colas, y cada eleccion afecta el acoplamiento, latencia y confiabilidad.',
        'Los recursos a continuacion cubren REST, mensajeria, gRPC, WebSockets, comunicacion orientada a eventos y comunicacion de equipos. Cada guia te ayuda a elegir e implementar el modelo de comunicacion adecuado.',
      ],
    },
  },
  'real-time': {
    en: {
      heading: 'Real-Time Systems',
      paragraphs: [
        'Real-time systems process and deliver data with low latency. They are used for live dashboards, notifications, gaming, chat, and stream processing, but require careful handling of state, connections, and backpressure.',
        'The resources below cover WebSockets, SSE, stream processing, pub/sub, and operational concerns. Each recipe explains how to build real-time features that are responsive and reliable.',
      ],
    },
    es: {
      heading: 'Sistemas en Tiempo Real',
      paragraphs: [
        'Los sistemas en tiempo real procesan y entregan datos con baja latencia. Se usan en dashboards en vivo, notificaciones, juegos, chat y procesamiento de streams, pero requieren manejo cuidadoso de estado, conexiones y backpressure.',
        'Los recursos a continuacion cubren WebSockets, SSE, procesamiento de streams, pub/sub y preocupaciones operativas. Cada receta explica como construir funciones en tiempo real responsivas y confiables.',
      ],
    },
  },
  cloud: {
    en: {
      heading: 'Cloud Computing',
      paragraphs: [
        'Cloud computing provides on-demand compute, storage, and networking without owning physical infrastructure. It enables elasticity, global reach, and managed services, but requires cost, security, and architecture discipline.',
        'The resources below cover cloud providers, compute, storage, networking, serverless, cost optimization, and security. Each guide helps you build cloud-native systems that are efficient and secure.',
      ],
    },
    es: {
      heading: 'Computacion en la Nube',
      paragraphs: [
        'La computacion en la nube provee computacion, almacenamiento y redes bajo demanda sin poseer infraestructura fisica. Habilita elasticidad, alcance global y servicios administrados, pero requiere disciplina de costos, seguridad y arquitectura.',
        'Los recursos a continuacion cubren proveedores de nube, computacion, almacenamiento, redes, serverless, optimizacion de costos y seguridad. Cada guia te ayuda a construir sistemas cloud-native eficientes y seguros.',
      ],
    },
  },
  'input-validation': {
    en: {
      heading: 'Input Validation',
      paragraphs: [
        'Input validation ensures that data entering the system is correct, safe, and expected. It is the first line of defense against injection, corruption, and malformed requests.',
        'The resources below cover schema validation, sanitization, custom validators, and error messages. Each recipe shows how to validate input at boundaries without leaking internal details.',
      ],
    },
    es: {
      heading: 'Validacion de Input',
      paragraphs: [
        'La validacion de input asegura que los datos que entran al sistema sean correctos, seguros y esperados. Es la primera linea de defensa contra inyeccion, corrupcion y solicitudes malformadas.',
        'Los recursos a continuacion cubren validacion de esquemas, sanitizacion, validadores personalizados y mensajes de error. Cada receta muestra como validar input en los limites sin filtrar detalles internos.',
      ],
    },
  },
  migration: {
    en: {
      heading: 'Database and System Migrations',
      paragraphs: [
        'Migrations move data, code, or infrastructure from one state to another with minimal disruption. They require planning, rollback paths, validation, and clear success criteria.',
        'The resources below cover database migrations, schema evolution, zero-downtime deployments, data backfills, and monolith-to-microservices transitions. Each guide helps you execute migrations safely.',
      ],
    },
    es: {
      heading: 'Migraciones de Base de Datos y Sistemas',
      paragraphs: [
        'Las migraciones mueven datos, codigo o infraestructura de un estado a otro con minima disruption. Requieren planificacion, caminos de rollback, validacion y criterios claros de exito.',
        'Los recursos a continuacion cubren migraciones de bases de datos, evolucion de esquemas, despliegues sin downtime, backfills de datos y transiciones de monolito a microservicios. Cada guia te ayuda a ejecutar migraciones de forma segura.',
      ],
    },
  },
  'zero-downtime': {
    en: {
      heading: 'Zero-Downtime Deployments',
      paragraphs: [
        'Zero-downtime deployments release software without interrupting users. Techniques include blue-green, canary, rolling, and feature flags, all backed by health checks and rollback plans.',
        'The resources below cover deployment patterns, traffic shifting, validation gates, and rollback. Each recipe explains how to ship changes continuously without taking the service down.',
      ],
    },
    es: {
      heading: 'Despliegues sin Downtime',
      paragraphs: [
        'Los despliegues sin downtime liberan software sin interrumpir a los usuarios. Las tecnicas incluyen blue-green, canary, rolling y feature flags, respaldadas por health checks y planes de rollback.',
        'Los recursos a continuacion cubren patrones de despliegue, traslado de trafico, gates de validacion y rollback. Cada receta explica como enviar cambios continuamente sin bajar el servicio.',
      ],
    },
  },
  'cost-optimization': {
    en: {
      heading: 'Cost Optimization in the Cloud',
      paragraphs: [
        'Cost optimization makes cloud spending predictable and aligned with value. It requires measuring usage, right-sizing resources, choosing pricing models, and avoiding waste.',
        'The resources below cover reserved instances, spot instances, autoscaling, right-sizing, and FinOps practices. Each guide helps you reduce cloud costs without sacrificing reliability.',
      ],
    },
    es: {
      heading: 'Optimizacion de Costos en la Nube',
      paragraphs: [
        'La optimizacion de costos hace que el gasto en nube sea predecible y alineado con el valor. Requiere medir uso, dimensionar recursos correctamente, elegir modelos de precios y evitar desperdicio.',
        'Los recursos a continuacion cubren instancias reservadas, instancias spot, auto-scaling, right-sizing y practicas FinOps. Cada guia te ayuda a reducir costos en la nube sin sacrificar confiabilidad.',
      ],
    },
  },
  databases: {
    en: {
      heading: 'Database Engineering',
      paragraphs: [
        'Databases are the persistent heart of most applications. Choosing the right model, schema, indexing strategy, and consistency guarantees has outsized impact on reliability and cost.',
        'The resources below cover SQL, NoSQL, indexing, sharding, replication, transactions, migrations, and query optimization. Each recipe helps you design and operate databases that scale with your workload.',
      ],
    },
    es: {
      heading: 'Ingenieria de Bases de Datos',
      paragraphs: [
        'Las bases de datos son el corazon persistente de la mayoria de aplicaciones. Elegir el modelo, esquema, estrategia de indexacion y garantias de consistencia correctas tiene un impacto desproporcionado en la confiabilidad y el costo.',
        'Los recursos a continuacion cubren SQL, NoSQL, indexacion, sharding, replicacion, transacciones, migraciones y optimizacion de consultas. Cada receta te ayuda a disenar y operar bases de datos que escalan con tu carga.',
      ],
    },
  },
  gcp: {
    en: {
      heading: 'Google Cloud Platform',
      paragraphs: [
        'GCP offers a strong data, ML, and Kubernetes ecosystem. Production GCP requires understanding identity, networking, managed services, and pricing.',
        'The resources below cover BigQuery, Cloud Run, Cloud Storage, Pub/Sub, GKE, and cost optimization. Each recipe helps you build reliable and cost-effective workloads on GCP.',
      ],
    },
    es: {
      heading: 'Google Cloud Platform',
      paragraphs: [
        'GCP ofrece un ecosistema solido de datos, ML y Kubernetes. GCP en produccion requiere entender identidad, redes, servicios administrados y precios.',
        'Los recursos a continuacion cubren BigQuery, Cloud Run, Cloud Storage, Pub/Sub, GKE y optimizacion de costos. Cada receta te ayuda a construir cargas de trabajo confiables y rentables en GCP.',
      ],
    },
  },
  azure: {
    en: {
      heading: 'Microsoft Azure',
      paragraphs: [
        'Azure is the cloud platform of choice for many enterprises. Production Azure requires understanding Active Directory, networking, compute, storage, and managed databases.',
        'The resources below cover Azure Functions, Blob Storage, Azure SQL, AKS, and security best practices. Each recipe focuses on building reliable workloads on Azure.',
      ],
    },
    es: {
      heading: 'Microsoft Azure',
      paragraphs: [
        'Azure es la plataforma de nube preferida por muchas empresas. Azure en produccion requiere entender Active Directory, redes, computo, almacenamiento y bases de datos administradas.',
        'Los recursos a continuacion cubren Azure Functions, Blob Storage, Azure SQL, AKS y mejores practicas de seguridad. Cada receta se enfoca en construir cargas de trabajo confiables en Azure.',
      ],
    },
  },
  linux: {
    en: {
      heading: 'Linux System Administration',
      paragraphs: [
        'Linux is the foundation of most servers, containers, and cloud workloads. Proficiency requires understanding the shell, process management, networking, and security.',
        'The resources below cover shell scripting, systemd, cron, file permissions, text processing, and troubleshooting. Each recipe is practical for daily operations.',
      ],
    },
    es: {
      heading: 'Administracion de Sistemas Linux',
      paragraphs: [
        'Linux es la base de la mayoria de servidores, contenedores y cargas de trabajo en la nube. La competencia requiere entender la shell, gestion de procesos, redes y seguridad.',
        'Los recursos a continuacion cubren shell scripting, systemd, cron, permisos de archivos, procesamiento de texto y troubleshooting. Cada receta es practica para operaciones diarias.',
      ],
    },
  },
  networking: {
    en: {
      heading: 'Computer Networking',
      paragraphs: [
        'Networking connects applications, services, and users. It requires understanding protocols, DNS, load balancing, proxies, firewalls, and TLS.',
        'The resources below cover TCP/IP, DNS, CDN, reverse proxies, VPCs, mTLS, and troubleshooting. Each guide focuses on patterns that are secure and scalable.',
      ],
    },
    es: {
      heading: 'Redes de Computadoras',
      paragraphs: [
        'Las redes conectan aplicaciones, servicios y usuarios. Requieren entender protocolos, DNS, balanceo de carga, proxies, firewalls y TLS.',
        'Los recursos a continuacion cubren TCP/IP, DNS, CDN, reverse proxies, VPCs, mTLS y troubleshooting. Cada guia se enfoca en patrones seguros y escalables.',
      ],
    },
  },
  git: {
    en: {
      heading: 'Version Control with Git',
      paragraphs: [
        'Git is the standard for source control. Effective use requires branching strategies, clean history, code review, and release workflows.',
        'The resources below cover branching, rebasing, commits, tags, hooks, and collaboration. Each recipe helps you use Git without fear.',
      ],
    },
    es: {
      heading: 'Control de Versiones con Git',
      paragraphs: [
        'Git es el estandar para control de fuentes. El uso efectivo requiere estrategias de ramas, historial limpio, revision de codigo y flujos de release.',
        'Los recursos a continuacion cubren branching, rebasing, commits, tags, hooks y colaboracion. Cada receta te ayuda a usar Git sin miedo.',
      ],
    },
  },
  pattern: {
    en: {
      heading: 'Software Design Patterns',
      paragraphs: [
        'Design patterns are reusable solutions to recurring problems in software design. They provide a shared vocabulary and proven templates for building maintainable, scalable, and robust systems.',
        'The resources below cover creational, structural, and behavioral patterns across different languages and paradigms. Each guide explains the problem, the solution, and when to apply it.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno de Software',
      paragraphs: [
        'Los patrones de diseno son soluciones reutilizables para problemas recurrentes en el diseno de software. Proporcionan un vocabulario compartido y plantillas probadas para construir sistemas mantenibles, escalables y robustos.',
        'Los recursos a continuacion cubren patrones creacionales, estructurales y de comportamiento en diferentes lenguajes y paradigmas. Cada guia explica el problema, la solucion y cuando aplicarla.',
      ],
    },
  },
  guide: {
    en: {
      heading: 'Practical Engineering Guides',
      paragraphs: [
        'Long-form guides explore topics in depth, connecting theory with hands-on implementation. They are designed to take you from understanding concepts to applying them in production.',
        'The resources below cover architecture, design, tooling, and workflows. Each guide includes examples, best practices, and common pitfalls to avoid.',
      ],
    },
    es: {
      heading: 'Guias Practicas de Ingenieria',
      paragraphs: [
        'Las guias largas exploran temas en profundidad, conectando teoria con implementacion practica. Estan disenadas para llevar desde la comprension de conceptos hasta su aplicacion en produccion.',
        'Los recursos a continuacion cubren arquitectura, diseno, herramientas y flujos de trabajo. Cada guia incluye ejemplos, mejores practicas y errores comunes a evitar.',
      ],
    },
  },
  template: {
    en: {
      heading: 'Reusable Documentation Templates',
      paragraphs: [
        'Templates provide a starting point for consistent documentation, runbooks, checklists, and process guides. They reduce friction and help teams capture important details.',
        'The resources below include templates for incident management, architecture decisions, API documentation, security reviews, and operations. Each template is ready to adapt to your organization.',
      ],
    },
    es: {
      heading: 'Plantillas de Documentacion Reutilizables',
      paragraphs: [
        'Las plantillas proporcionan un punto de partida para documentacion consistente, runbooks, checklists y guias de proceso. Reducen la friccion y ayudan a los equipos a capturar detalles importantes.',
        'Los recursos a continuacion incluyen plantillas para gestion de incidentes, decisiones de arquitectura, documentacion de APIs, revisiones de seguridad y operaciones. Cada plantilla esta lista para adaptar a tu organizacion.',
      ],
    },
  },
  recipe: {
    en: {
      heading: 'Code Recipes and Copy-Paste Solutions',
      paragraphs: [
        'Recipes are short, practical solutions to specific programming problems. Each recipe includes runnable code, a brief explanation, and practical advice.',
        'The resources below cover a wide range of languages, tools, and domains. Use them as starting points or drop-in solutions for common engineering tasks.',
      ],
    },
    es: {
      heading: 'Recetas de Codigo y Soluciones Copiar-Pegar',
      paragraphs: [
        'Las recetas son soluciones cortas y practicas para problemas de programacion especificos. Cada receta incluye codigo ejecutable, una breve explicacion y consejos practicos.',
        'Los recursos a continuacion cubren una amplia gama de lenguajes, herramientas y dominios. Usalas como puntos de partida o soluciones listas para tareas comunes de ingenieria.',
      ],
    },
  },
  structural: {
    en: {
      heading: 'Structural Design Patterns',
      paragraphs: [
        'Structural patterns focus on how classes and objects are composed to form larger structures. They help keep systems flexible and efficient by simplifying relationships between entities.',
        'The resources below cover adapter, bridge, composite, decorator, facade, flyweight, and proxy patterns. Each guide shows how to simplify complex object relationships.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno Estructurales',
      paragraphs: [
        'Los patrones estructurales se enfocan en como se componen clases y objetos para formar estructuras mas grandes. Ayudan a mantener sistemas flexibles y eficientes simplificando relaciones entre entidades.',
        'Los recursos a continuacion cubren los patrones adapter, bridge, composite, decorator, facade, flyweight y proxy. Cada guia muestra como simplificar relaciones complejas entre objetos.',
      ],
    },
  },
  behavioral: {
    en: {
      heading: 'Behavioral Design Patterns',
      paragraphs: [
        'Behavioral patterns manage communication and responsibility between objects. They define how objects interact, delegate work, and respond to events in maintainable ways.',
        'The resources below cover observer, strategy, command, iterator, state, template method, and visitor patterns. Each guide explains how to make object collaboration clear and flexible.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno de Comportamiento',
      paragraphs: [
        'Los patrones de comportamiento gestionan la comunicacion y la responsabilidad entre objetos. Definen como interactuan, delegan trabajo y responden a eventos de forma mantenible.',
        'Los recursos a continuacion cubren observer, strategy, command, iterator, state, template method y visitor. Cada guia explica como hacer la colaboracion entre objetos clara y flexible.',
      ],
    },
  },
  runbook: {
    en: {
      heading: 'Operational Runbooks',
      paragraphs: [
        'Runbooks are step-by-step guides for operating systems, responding to incidents, and performing routine tasks. They reduce cognitive load and help teams act consistently under pressure.',
        'The resources below cover incident response, deployment procedures, maintenance tasks, and troubleshooting. Each runbook is designed to be followed during real operations.',
      ],
    },
    es: {
      heading: 'Runbooks Operacionales',
      paragraphs: [
        'Los runbooks son guias paso a paso para operar sistemas, responder a incidentes y realizar tareas rutinarias. Reducen la carga cognitiva y ayudan a los equipos a actuar con consistencia bajo presion.',
        'Los recursos a continuacion cubren respuesta a incidentes, procedimientos de despliegue, tareas de mantenimiento y troubleshooting. Cada runbook esta disenado para seguirse durante operaciones reales.',
      ],
    },
  },
  'aws-lambda': {
    en: {
      heading: 'AWS Lambda and Serverless Functions',
      paragraphs: [
        'AWS Lambda lets you run code without provisioning servers. Serverless functions scale automatically and are ideal for event-driven, bursty, or short-lived workloads.',
        'The resources below cover Lambda architecture, cold starts, triggers, IAM, testing, deployment, and best practices. Each recipe shows how to build reliable serverless applications on AWS.',
      ],
    },
    es: {
      heading: 'AWS Lambda y Funciones Serverless',
      paragraphs: [
        'AWS Lambda permite ejecutar codigo sin aprovisionar servidores. Las funciones serverless escalan automaticamente y son ideales para cargas de trabajo event-driven, irregulares o de corta duracion.',
        'Los recursos a continuacion cubren arquitectura Lambda, cold starts, triggers, IAM, testing, despliegue y mejores practicas. Cada receta muestra como construir aplicaciones serverless confiables en AWS.',
      ],
    },
  },
  checklist: {
    en: {
      heading: 'Checklists for Engineering Teams',
      paragraphs: [
        'Checklists reduce mistakes and ensure consistency in complex tasks. They are useful for code reviews, deployments, security audits, and incident response.',
        'The resources below cover production readiness, security reviews, release checklists, and operational procedures. Each checklist is designed to be used before, during, or after critical activities.',
      ],
    },
    es: {
      heading: 'Checklists para Equipos de Ingenieria',
      paragraphs: [
        'Las checklists reducen errores y aseguran consistencia en tareas complejas. Son utiles para code reviews, despliegues, auditorias de seguridad y respuesta a incidentes.',
        'Los recursos a continuacion cubren preparacion para produccion, revisiones de seguridad, checklists de release y procedimientos operacionales. Cada checklist esta disenada para usarse antes, durante o despues de actividades criticas.',
      ],
    },
  },
  decoupling: {
    en: {
      heading: 'Decoupling and Modularity',
      paragraphs: [
        'Decoupling reduces dependencies between components, making systems easier to change, test, and scale. It is a key principle of maintainable architecture.',
        'The resources below cover dependency injection, interfaces, events, message queues, and modular design. Each guide shows how to reduce coupling without over-engineering.',
      ],
    },
    es: {
      heading: 'Desacoplamiento y Modularidad',
      paragraphs: [
        'El desacoplamiento reduce las dependencias entre componentes, haciendo los sistemas mas faciles de cambiar, probar y escalar. Es un principio clave de la arquitectura mantenible.',
        'Los recursos a continuacion cubren inyeccion de dependencias, interfaces, eventos, colas de mensajes y diseno modular. Cada guia muestra como reducir el acoplamiento sin sobre-ingenieria.',
      ],
    },
  },
  management: {
    en: {
      heading: 'Engineering Management',
      paragraphs: [
        'Engineering management covers the practices, processes, and tools that help teams deliver reliable software at scale. It bridges technical execution with organizational goals.',
        'The resources below cover on-call, incident management, project planning, team processes, runbooks, and operational excellence. Each guide is aimed at engineers and managers working in production environments.',
      ],
    },
    es: {
      heading: 'Gestion de Ingenieria',
      paragraphs: [
        'La gestion de ingenieria abarca las practicas, procesos y herramientas que ayudan a los equipos a entregar software confiable a escala. Conecta la ejecucion tecnica con los objetivos organizacionales.',
        'Los recursos a continuacion cubren on-call, gestion de incidentes, planificacion de proyectos, procesos de equipo, runbooks y excelencia operacional. Cada guia esta dirigida a ingenieros y gestores en entornos de produccion.',
      ],
    },
  },
  parallel: {
    en: {
      heading: 'Parallel and Concurrent Processing',
      paragraphs: [
        'Parallel processing performs multiple computations simultaneously to improve throughput and reduce latency. It is essential for CPU-bound and data-intensive workloads.',
        'The resources below cover threads, processes, thread pools, parallel streams, map-reduce, and parallel testing. Each recipe shows how to speed up workloads without introducing races or deadlocks.',
      ],
    },
    es: {
      heading: 'Procesamiento Paralelo y Concurrente',
      paragraphs: [
        'El procesamiento paralelo realiza multiples computaciones simultaneamente para mejorar throughput y reducir latencia. Es esencial para cargas intensivas en CPU y datos.',
        'Los recursos a continuacion cubren threads, procesos, thread pools, streams paralelos, map-reduce y testing paralelo. Cada receta muestra como acelerar cargas sin introducir carreras o deadlocks.',
      ],
    },
  },
  versioning: {
    en: {
      heading: 'Versioning and Change Management',
      paragraphs: [
        'Versioning is how you communicate and control change in APIs, schemas, dependencies, and releases. Good versioning reduces breaking changes and integration friction.',
        'The resources below cover semantic versioning, API versioning, schema evolution, dependency updates, and release management. Each guide shows how to evolve systems without surprising consumers.',
      ],
    },
    es: {
      heading: 'Versionado y Gestion de Cambios',
      paragraphs: [
        'El versionado es como se comunica y controla el cambio en APIs, esquemas, dependencias y releases. Un buen versionado reduce breaking changes y friccion de integracion.',
        'Los recursos a continuacion cubren semantic versioning, versionado de APIs, evolucion de esquemas, actualizacion de dependencias y gestion de releases. Cada guia muestra como evolucionar sistemas sin sorprender a los consumidores.',
      ],
    },
  },
  composition: {
    en: {
      heading: 'Object Composition',
      paragraphs: [
        'Composition is a design principle where objects are built by combining simpler objects rather than inheriting from a base class. It favors flexibility and avoids the rigidity of deep inheritance hierarchies.',
        'The resources below cover object composition, mixins, dependency injection, decorator patterns, and composable components. Each guide shows how to build systems that are easier to change and test.',
      ],
    },
    es: {
      heading: 'Composicion de Objetos',
      paragraphs: [
        'La composicion es un principio de diseno donde los objetos se construyen combinando objetos mas simples en lugar de heredar de una clase base. Favorece la flexibilidad y evita la rigidez de las jerarquias de herencia profundas.',
        'Los recursos a continuacion cubren composicion de objetos, mixins, inyeccion de dependencias, patrones decorator y componentes componibles. Cada guia muestra como construir sistemas mas faciles de cambiar y probar.',
      ],
    },
  },
  schema: {
    en: {
      heading: 'Schema Design and Management',
      paragraphs: [
        'Schemas define the structure of data, APIs, databases, and messages. Good schema design balances flexibility, validation, and evolution over time.',
        'The resources below cover database schemas, JSON Schema, Protocol Buffers, Avro, OpenAPI, and schema migration. Each guide helps you design schemas that can evolve without breaking consumers.',
      ],
    },
    es: {
      heading: 'Diseno y Gestion de Esquemas',
      paragraphs: [
        'Los esquemas definen la estructura de datos, APIs, bases de datos y mensajes. Un buen diseno de esquemas equilibra flexibilidad, validacion y evolucion a lo largo del tiempo.',
        'Los recursos a continuacion cubren esquemas de bases de datos, JSON Schema, Protocol Buffers, Avro, OpenAPI y migracion de esquemas. Cada guia te ayuda a disenar esquemas que evolucionan sin romper consumidores.',
      ],
    },
  },
  routing: {
    en: {
      heading: 'Routing and Navigation',
      paragraphs: [
        'Routing maps incoming requests or UI states to the right handler. It is a fundamental part of web frameworks, APIs, and network infrastructure.',
        'The resources below cover HTTP routing, dynamic routes, nested routing, API gateways, reverse proxies, and frontend routers. Each guide explains how to design routing that is clear and scalable.',
      ],
    },
    es: {
      heading: 'Routing y Navegacion',
      paragraphs: [
        'El routing mapea solicitudes entrantes o estados de UI al handler correcto. Es una parte fundamental de frameworks web, APIs e infraestructura de red.',
        'Los recursos a continuacion cubren routing HTTP, rutas dinamicas, routing anidado, API gateways, reverse proxies y routers frontend. Cada guia explica como disenar routing claro y escalable.',
      ],
    },
  },
  creational: {
    en: {
      heading: 'Creational Design Patterns',
      paragraphs: [
        'Creational patterns deal with object creation mechanisms. They help make a system independent of how its objects are created, composed, and represented.',
        'The resources below cover singleton, factory, builder, prototype, and abstract factory patterns. Each guide shows how to create objects in a way that is flexible and reusable.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno Creacionales',
      paragraphs: [
        'Los patrones creacionales tratan los mecanismos de creacion de objetos. Ayudan a hacer un sistema independiente de como se crean, componen y representan sus objetos.',
        'Los recursos a continuacion cubren singleton, factory, builder, prototype y abstract factory. Cada guia muestra como crear objetos de forma flexible y reutilizable.',
      ],
    },
  },
  cache: {
    en: {
      heading: 'Caching for Performance',
      paragraphs: [
        'Caching stores copies of data closer to where it is needed to reduce latency and load. It is one of the most effective performance optimizations but requires careful invalidation.',
        'The resources below cover in-memory caches, distributed caches, CDNs, TTL, cache invalidation, and eviction policies. Each recipe shows how to speed up access while keeping data consistent.',
      ],
    },
    es: {
      heading: 'Caching para Rendimiento',
      paragraphs: [
        'El caching almacena copias de datos mas cerca de donde se necesitan para reducir latencia y carga. Es una de las optimizaciones de rendimiento mas efectivas, pero requiere invalidacion cuidadosa.',
        'Los recursos a continuacion cubren caches en memoria, caches distribuidos, CDNs, TTL, invalidacion de cache y politicas de eviction. Cada receta muestra como acelerar el acceso manteniendo datos consistentes.',
      ],
    },
  },
  threads: {
    en: {
      heading: 'Multithreading and Threading Models',
      paragraphs: [
        'Threads allow a program to run multiple tasks concurrently within the same process. They are the foundation of parallelism but introduce synchronization and safety challenges.',
        'The resources below cover thread pools, locks, mutexes, semaphores, thread-local storage, and virtual threads. Each guide helps you write multithreaded code that is safe and efficient.',
      ],
    },
    es: {
      heading: 'Multithreading y Modelos de Threads',
      paragraphs: [
        'Los threads permiten que un programa ejecute multiples tareas concurrentemente dentro del mismo proceso. Son la base del paralelismo, pero introducen desafios de sincronizacion y seguridad.',
        'Los recursos a continuacion cubren thread pools, locks, mutexes, semaforos, almacenamiento local de threads y virtual threads. Cada guia te ayuda a escribir codigo multithread seguro y eficiente.',
      ],
    },
  },
  reliability: {
    en: {
      heading: 'Reliability Engineering',
      paragraphs: [
        'Reliability engineering ensures that systems operate correctly under expected and unexpected conditions. It combines design, testing, monitoring, and operational practices.',
        'The resources below cover fault tolerance, redundancy, graceful degradation, SLOs, error budgets, and chaos engineering. Each guide helps you build systems that users can trust.',
      ],
    },
    es: {
      heading: 'Ingenieria de Confiabilidad',
      paragraphs: [
        'La ingenieria de confiabilidad asegura que los sistemas operen correctamente bajo condiciones esperadas e inesperadas. Combina diseno, testing, monitoreo y practicas operacionales.',
        'Los recursos a continuacion cubren tolerancia a fallas, redundancia, degradacion elegante, SLOs, presupuestos de error y chaos engineering. Cada guia te ayuda a construir sistemas en los que los usuarios puedan confiar.',
      ],
    },
  },
  backpressure: {
    en: {
      heading: 'Backpressure and Flow Control',
      paragraphs: [
        'Backpressure is a mechanism that lets a slow consumer signal to a fast producer to slow down. Without it, systems can overflow queues, run out of memory, or drop data.',
        'The resources below cover reactive streams, bounded queues, load shedding, and throttling. Each guide shows how to keep data flows stable under varying load.',
      ],
    },
    es: {
      heading: 'Backpressure y Control de Flujo',
      paragraphs: [
        'El backpressure es un mecanismo que permite a un consumidor lento senalar a un productor rapido que reduzca la velocidad. Sin el, los sistemas pueden desbordar colas, quedarse sin memoria o perder datos.',
        'Los recursos a continuacion cubren reactive streams, colas acotadas, load shedding y throttling. Cada guia muestra como mantener flujos de datos estables bajo carga variable.',
      ],
    },
  },
  apollo: {
    en: {
      heading: 'Apollo and GraphQL Tools',
      paragraphs: [
        'Apollo provides a suite of tools for building and operating GraphQL APIs, including the Apollo Client, Apollo Server, and federation. It is widely used for unified graphs and type-safe APIs.',
        'The resources below cover Apollo Client, Apollo Server, federation, schema stitching, and caching. Each recipe shows how to build, query, and scale GraphQL services with Apollo.',
      ],
    },
    es: {
      heading: 'Apollo y Herramientas GraphQL',
      paragraphs: [
        'Apollo proporciona un conjunto de herramientas para construir y operar APIs GraphQL, incluyendo Apollo Client, Apollo Server y federation. Es ampliamente usado para grafos unificados y APIs type-safe.',
        'Los recursos a continuacion cubren Apollo Client, Apollo Server, federation, schema stitching y caching. Cada receta muestra como construir, consultar y escalar servicios GraphQL con Apollo.',
      ],
    },
  },
  mocking: {
    en: {
      heading: 'Mocking and Test Doubles',
      paragraphs: [
        'Mocking replaces real dependencies with controlled substitutes during tests. It helps isolate units, simulate failures, and speed up test execution.',
        'The resources below cover mocks, stubs, fakes, spies, dependency injection, and mock servers. Each guide shows how to test components in isolation without hitting real services.',
      ],
    },
    es: {
      heading: 'Mocking y Test Doubles',
      paragraphs: [
        'El mocking reemplaza dependencias reales con sustitutos controlados durante las pruebas. Ayuda a aislar unidades, simular fallas y acelerar la ejecucion de tests.',
        'Los recursos a continuacion cubren mocks, stubs, fakes, spies, inyeccion de dependencias y mock servers. Cada guia muestra como probar componentes de forma aislada sin tocar servicios reales.',
      ],
    },
  },
  queue: {
    en: {
      heading: 'Queues and Job Processing',
      paragraphs: [
        'Queues decouple producers and consumers, allowing work to be processed asynchronously. They are essential for background jobs, retries, and load leveling.',
        'The resources below cover message queues, task queues, job workers, retries, priority queues, and dead-letter queues. Each recipe shows how to build reliable asynchronous processing.',
      ],
    },
    es: {
      heading: 'Colas y Procesamiento de Trabajos',
      paragraphs: [
        'Las colas desacoplan productores y consumidores, permitiendo que el trabajo se procese de forma asincrona. Son esenciales para background jobs, reintentos y balanceo de carga.',
        'Los recursos a continuacion cubren message queues, task queues, workers de jobs, reintentos, colas de prioridad y dead-letter queues. Cada receta muestra como construir procesamiento asincrono confiable.',
      ],
    },
  },
  'message-queue': {
    en: {
      heading: 'Message Queue Patterns',
      paragraphs: [
        'Message queues enable asynchronous communication between services. They improve reliability, scalability, and decoupling in distributed systems.',
        'The resources below cover RabbitMQ, SQS, Kafka, pub-sub, point-to-point, and message durability. Each guide shows how to choose and implement the right queue pattern.',
      ],
    },
    es: {
      heading: 'Patrones de Colas de Mensajes',
      paragraphs: [
        'Las colas de mensajes permiten comunicacion asincrona entre servicios. Mejoran la confiabilidad, escalabilidad y desacoplamiento en sistemas distribuidos.',
        'Los recursos a continuacion cubren RabbitMQ, SQS, Kafka, pub-sub, point-to-point y durabilidad de mensajes. Cada guia muestra como elegir e implementar el patron de cola correcto.',
      ],
    },
  },
  profiling: {
    en: {
      heading: 'Performance Profiling',
      paragraphs: [
        'Profiling identifies where a program spends time and resources. It is the first step in performance optimization, turning assumptions into data.',
        'The resources below cover CPU profiling, memory profiling, flame graphs, heap analysis, and profiling tools. Each recipe shows how to find and fix bottlenecks in different languages.',
      ],
    },
    es: {
      heading: 'Profiling de Rendimiento',
      paragraphs: [
        'El profiling identifica donde un programa gasta tiempo y recursos. Es el primer paso en la optimizacion de rendimiento, convirtiendo suposiciones en datos.',
        'Los recursos a continuacion cubren profiling de CPU, profiling de memoria, flame graphs, analisis de heap y herramientas de profiling. Cada receta muestra como encontrar y solucionar cuellos de botella en diferentes lenguajes.',
      ],
    },
  },
  indexing: {
    en: {
      heading: 'Database Indexing',
      paragraphs: [
        'Indexes are data structures that speed up queries at the cost of write performance and storage. Choosing the right indexes is one of the highest-impact database optimizations.',
        'The resources below cover B-tree, hash, composite, partial, covering, and full-text indexes. Each guide explains how to design indexes for read-heavy and write-heavy workloads.',
      ],
    },
    es: {
      heading: 'Indexacion de Bases de Datos',
      paragraphs: [
        'Los indices son estructuras de datos que aceleran consultas a costa del rendimiento de escritura y almacenamiento. Elegir los indices correctos es una de las optimizaciones de mayor impacto.',
        'Los recursos a continuacion cubren B-tree, hash, compuestos, parciales, covering y full-text. Cada guia explica como disenar indices para cargas con muchas lecturas o escrituras.',
      ],
    },
  },
  'ai-pattern': {
    en: {
      heading: 'AI and LLM Patterns',
      paragraphs: [
        'AI patterns capture proven approaches to building systems with language models, embeddings, and agents. They help manage cost, latency, reliability, and user experience.',
        'The resources below cover RAG, prompt chaining, agents, function calling, guardrails, and model routing. Each guide shows how to build AI systems that are reliable and cost-effective.',
      ],
    },
    es: {
      heading: 'Patrones de IA y LLM',
      paragraphs: [
        'Los patrones de IA capturan enfoques probados para construir sistemas con modelos de lenguaje, embeddings y agentes. Ayudan a gestionar costo, latencia, confiabilidad y experiencia de usuario.',
        'Los recursos a continuacion cubren RAG, prompt chaining, agentes, function calling, guardrails y model routing. Cada guia muestra como construir sistemas de IA confiables y rentables.',
      ],
    },
  },
  governance: {
    en: {
      heading: 'Data and API Governance',
      paragraphs: [
        'Governance defines policies, standards, and processes for managing data, APIs, and technology. It ensures consistency, compliance, and accountability across teams.',
        'The resources below cover data governance, API governance, schema standards, access policies, and compliance. Each guide helps you establish controls without slowing delivery.',
      ],
    },
    es: {
      heading: 'Gobernanza de Datos y APIs',
      paragraphs: [
        'La gobernanza define politicas, estandares y procesos para gestionar datos, APIs y tecnologia. Asegura consistencia, cumplimiento y responsabilidad entre equipos.',
        'Los recursos a continuacion cubren gobernanza de datos, gobernanza de APIs, estandares de esquemas, politicas de acceso y cumplimiento. Cada guia ayuda a establecer controles sin frenar la entrega.',
      ],
    },
  },
  failover: {
    en: {
      heading: 'Failover and High Availability',
      paragraphs: [
        'Failover is the process of switching to a redundant or standby system when the primary fails. It is a key component of high-availability architectures.',
        'The resources below cover active-passive, active-active, load balancer failover, database replicas, and disaster recovery. Each guide shows how to design systems that recover quickly.',
      ],
    },
    es: {
      heading: 'Failover y Alta Disponibilidad',
      paragraphs: [
        'El failover es el proceso de cambiar a un sistema redundante o en espera cuando el primario falla. Es un componente clave de las arquitecturas de alta disponibilidad.',
        'Los recursos a continuacion cubren activo-pasivo, activo-activo, failover de load balancers, replicas de bases de datos y recuperacion ante desastres. Cada guia muestra como disenar sistemas que se recuperan rapidamente.',
      ],
    },
  },
  'data-engineering': {
    en: {
      heading: 'Data Engineering',
      paragraphs: [
        'Data engineering builds the pipelines and infrastructure that transform raw data into usable products. It requires skills in storage, processing, orchestration, and quality.',
        'The resources below cover ETL, data lakes, pipelines, orchestration, data quality, and streaming. Each guide helps you build data systems that are reliable and scalable.',
      ],
    },
    es: {
      heading: 'Ingenieria de Datos',
      paragraphs: [
        'La ingenieria de datos construye los pipelines e infraestructura que transforman datos crudos en productos usables. Requiere habilidades en almacenamiento, procesamiento, orquestacion y calidad.',
        'Los recursos a continuacion cubren ETL, data lakes, pipelines, orquestacion, calidad de datos y streaming. Cada guia te ayuda a construir sistemas de datos confiables y escalables.',
      ],
    },
  },
  'best-practices': {
    en: {
      heading: 'Engineering Best Practices',
      paragraphs: [
        'Best practices are proven conventions and guidelines that help teams write better software. They cover code style, testing, security, operations, and collaboration.',
        'The resources below cover coding standards, review processes, documentation, incident handling, and continuous improvement. Each guide helps you establish practices that reduce risk and speed.',
      ],
    },
    es: {
      heading: 'Mejores Practicas de Ingenieria',
      paragraphs: [
        'Las mejores practicas son convenciones y guias probadas que ayudan a los equipos a escribir mejor software. Cubren estilo de codigo, testing, seguridad, operaciones y colaboracion.',
        'Los recursos a continuacion cubren estandares de codigo, procesos de revision, documentacion, manejo de incidentes y mejora continua. Cada guia ayuda a establecer practicas que reducen riesgo y aceleran.',
      ],
    },
  },
  openai: {
    en: {
      heading: 'OpenAI and LLM APIs',
      paragraphs: [
        'OpenAI provides large language models and APIs that power chat, completion, embedding, and vision workloads. Production use requires prompt design, cost management, and safety.',
        'The resources below cover GPT models, the OpenAI API, fine-tuning, embeddings, function calling, and guardrails. Each recipe shows how to integrate OpenAI safely and efficiently.',
      ],
    },
    es: {
      heading: 'OpenAI y APIs de LLM',
      paragraphs: [
        'OpenAI proporciona modelos de lenguaje grandes y APIs que impulsan cargas de chat, completion, embedding y vision. El uso en produccion requiere diseno de prompts, gestion de costos y seguridad.',
        'Los recursos a continuacion cubren modelos GPT, la API de OpenAI, fine-tuning, embeddings, function calling y guardrails. Cada receta muestra como integrar OpenAI de forma segura y eficiente.',
      ],
    },
  },
  rag: {
    en: {
      heading: 'Retrieval-Augmented Generation',
      paragraphs: [
        'RAG combines language models with external knowledge retrieval to improve accuracy, reduce hallucinations, and ground responses in real data.',
        'The resources below cover vector databases, embeddings, chunking strategies, retrieval pipelines, and evaluation. Each guide helps you build RAG systems that produce trustworthy answers.',
      ],
    },
    es: {
      heading: 'Generacion Aumentada por Recuperacion',
      paragraphs: [
        'RAG combina modelos de lenguaje con recuperacion de conocimiento externo para mejorar precision, reducir alucinaciones y fundamentar respuestas en datos reales.',
        'Los recursos a continuacion cubren bases de datos vectoriales, embeddings, estrategias de chunking, pipelines de recuperacion y evaluacion. Cada guia te ayuda a construir sistemas RAG que generan respuestas confiables.',
      ],
    },
  },
  oauth: {
    en: {
      heading: 'OAuth and Authorization Delegation',
      paragraphs: [
        'OAuth is a standard for delegated authorization. It lets users grant limited access to their resources without sharing passwords.',
        'The resources below cover OAuth 2.0 flows, scopes, tokens, PKCE, and secure implementation. Each guide explains how to add third-party authorization without introducing vulnerabilities.',
      ],
    },
    es: {
      heading: 'OAuth y Delegacion de Autorizacion',
      paragraphs: [
        'OAuth es un estandar para la autorizacion delegada. Permite a los usuarios otorgar acceso limitado a sus recursos sin compartir contrasenas.',
        'Los recursos a continuacion cubren flujos de OAuth 2.0, scopes, tokens, PKCE e implementacion segura. Cada guia explica como agregar autorizacion de terceros sin introducir vulnerabilidades.',
      ],
    },
  },
  identity: {
    en: {
      heading: 'Identity and Access Management',
      paragraphs: [
        'Identity management is the practice of authenticating and authorizing users and services. It is the foundation of application and cloud security.',
        'The resources below cover authentication, federation, single sign-on, identity providers, and zero-trust access. Each guide helps you design identity systems that are secure and user-friendly.',
      ],
    },
    es: {
      heading: 'Gestion de Identidad y Acceso',
      paragraphs: [
        'La gestion de identidad es la practica de autenticar y autorizar usuarios y servicios. Es la base de la seguridad de aplicaciones y nube.',
        'Los recursos a continuacion cubren autenticacion, federacion, single sign-on, proveedores de identidad y acceso de confianza cero. Cada guia te ayuda a disenar sistemas de identidad seguros y faciles de usar.',
      ],
    },
  },
  'query-optimization': {
    en: {
      heading: 'Query Optimization',
      paragraphs: [
        'Query optimization improves the performance and resource usage of database queries. It is essential for scalable applications that read or write large datasets.',
        'The resources below cover query plans, indexes, joins, subqueries, and database-specific optimizers. Each recipe shows how to write queries that run fast and scale well.',
      ],
    },
    es: {
      heading: 'Optimizacion de Consultas',
      paragraphs: [
        'La optimizacion de consultas mejora el rendimiento y uso de recursos de las consultas a bases de datos. Es esencial para aplicaciones escalables que leen o escriben grandes conjuntos de datos.',
        'Los recursos a continuacion cubren planes de consulta, indices, joins, subconsultas y optimizadores especificos de bases de datos. Cada receta muestra como escribir consultas rapidas y escalables.',
      ],
    },
  },
  ttl: {
    en: {
      heading: 'Time-To-Live and Expiration',
      paragraphs: [
        'TTL defines how long data remains valid before it expires. It is widely used in caching, session management, DNS, and data retention policies.',
        'The resources below cover cache TTL, DNS TTL, session expiration, and data retention. Each guide helps you choose TTL values that balance freshness and cost.',
      ],
    },
    es: {
      heading: 'Time-To-Live y Expiracion',
      paragraphs: [
        'TTL define cuanto tiempo los datos permanecen validos antes de expirar. Se usa ampliamente en caching, gestion de sesiones, DNS y politicas de retencion de datos.',
        'Los recursos a continuacion cubren TTL de cache, TTL de DNS, expiracion de sesiones y retencion de datos. Cada guia te ayuda a elegir valores de TTL que equilibren frescura y costo.',
      ],
    },
  },
  'behavioral-patterns': {
    en: {
      heading: 'Behavioral Design Patterns',
      paragraphs: [
        'Behavioral patterns define how objects communicate and distribute responsibility. They help make complex interactions easier to understand, maintain, and extend.',
        'The resources below cover observer, state, strategy, command, iterator, mediator, memento, and visitor. Each guide shows how to model behavior that is flexible and reusable.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno de Comportamiento',
      paragraphs: [
        'Los patrones de comportamiento definen como los objetos se comunican y distribuyen responsabilidades. Ayudan a hacer interacciones complejas mas faciles de entender, mantener y extender.',
        'Los recursos a continuacion cubren observer, state, strategy, command, iterator, mediator, memento y visitor. Cada guia muestra como modelar comportamiento flexible y reutilizable.',
      ],
    },
  },
  oauth2: {
    en: {
      heading: 'OAuth 2.0',
      paragraphs: [
        'OAuth 2.0 is the industry standard for delegated authorization. It enables users to grant third-party applications limited access to their resources without sharing credentials.',
        'The resources below cover authorization code, client credentials, implicit, device code, PKCE, and scopes. Each guide explains how to implement OAuth 2.0 securely for web and mobile apps.',
      ],
    },
    es: {
      heading: 'OAuth 2.0',
      paragraphs: [
        'OAuth 2.0 es el estandar de la industria para autorizacion delegada. Permite a los usuarios otorgar a aplicaciones de terceros acceso limitado a sus recursos sin compartir credenciales.',
        'Los recursos a continuacion cubren authorization code, client credentials, implicit, device code, PKCE y scopes. Cada guia explica como implementar OAuth 2.0 de forma segura para web y mobile.',
      ],
    },
  },
  partitioning: {
    en: {
      heading: 'Data Partitioning and Sharding',
      paragraphs: [
        'Partitioning splits large datasets into smaller pieces to improve performance, availability, and manageability. Sharding is a common form of horizontal partitioning used in distributed databases.',
        'The resources below cover range, hash, and list partitioning, sharding strategies, rebalancing, and partition pruning. Each guide shows how to scale data layers without hitting single-node limits.',
      ],
    },
    es: {
      heading: 'Particionamiento y Sharding de Datos',
      paragraphs: [
        'El particionamiento divide conjuntos grandes de datos en partes mas pequenas para mejorar rendimiento, disponibilidad y manejabilidad. El sharding es una forma comun de particionamiento horizontal en bases de datos distribuidas.',
        'Los recursos a continuacion cubren particionamiento por rango, hash y lista, estrategias de sharding, rebalancing y partition pruning. Cada guia muestra como escalar capas de datos sin alcanzar limites de un solo nodo.',
      ],
    },
  },
  rotation: {
    en: {
      heading: 'Secret and Credential Rotation',
      paragraphs: [
        'Rotation is the practice of regularly replacing secrets, credentials, and keys to reduce the blast radius of compromise. It is a foundational security practice.',
        'The resources below cover API key rotation, certificate rotation, token refresh, database credential rotation, and zero-downtime secrets updates. Each guide shows how to rotate secrets without breaking services.',
      ],
    },
    es: {
      heading: 'Rotacion de Secretos y Credenciales',
      paragraphs: [
        'La rotacion es la practica de reemplazar regularmente secretos, credenciales y claves para reducir el radio de impacto de una compromiso. Es una practica de seguridad fundamental.',
        'Los recursos a continuacion cubren rotacion de API keys, certificados, token refresh, credenciales de bases de datos y actualizacion de secretos sin downtime. Cada guia muestra como rotar secretos sin romper servicios.',
      ],
    },
  },
  'github-actions': {
    en: {
      heading: 'GitHub Actions',
      paragraphs: [
        'GitHub Actions is a CI/CD and automation platform built into GitHub. It lets you define workflows as YAML files triggered by Git events.',
        'The resources below cover workflow syntax, reusable workflows, matrix builds, secrets, caching, and deployment patterns. Each guide helps you automate testing, building, and releasing.',
      ],
    },
    es: {
      heading: 'GitHub Actions',
      paragraphs: [
        'GitHub Actions es una plataforma de CI/CD y automatizacion integrada en GitHub. Permite definir workflows como archivos YAML activados por eventos de Git.',
        'Los recursos a continuacion cubren sintaxis de workflow, reusable workflows, matrix builds, secrets, caching y patrones de despliegue. Cada guia te ayuda a automatizar testing, build y release.',
      ],
    },
  },
  configuration: {
    en: {
      heading: 'Configuration Management',
      paragraphs: [
        'Configuration management defines how an application is set up, tuned, and deployed across environments. Good practices keep configuration separate from code and version-controlled.',
        'The resources below cover environment variables, config files, feature flags, secrets management, and validation. Each guide shows how to manage configuration safely and consistently.',
      ],
    },
    es: {
      heading: 'Gestion de Configuracion',
      paragraphs: [
        'La gestion de configuracion define como se configura, ajusta y despliega una aplicacion en diferentes entornos. Las buenas practicas mantienen la configuracion separada del codigo y bajo control de versiones.',
        'Los recursos a continuacion cubren variables de entorno, archivos de configuracion, feature flags, gestion de secretos y validacion. Cada guia muestra como gestionar configuracion de forma segura y consistente.',
      ],
    },
  },
  secrets: {
    en: {
      heading: 'Secrets Management',
      paragraphs: [
        'Secrets such as API keys, tokens, and passwords must be stored and accessed securely. Hardcoded secrets are a common and serious source of breaches.',
        'The resources below cover secret managers, environment variables, encrypted vaults, rotation, and least-privilege access. Each guide explains how to protect credentials throughout the development lifecycle.',
      ],
    },
    es: {
      heading: 'Gestion de Secretos',
      paragraphs: [
        'Los secretos como API keys, tokens y contrasenas deben almacenarse y accederse de forma segura. Los secretos hardcodeados son una fuente comun y grave de brechas.',
        'Los recursos a continuacion cubren secret managers, variables de entorno, vaults cifrados, rotacion y acceso de minimo privilegio. Cada guia explica como proteger credenciales a lo largo del ciclo de desarrollo.',
      ],
    },
  },
  latency: {
    en: {
      heading: 'Latency and Response Time',
      paragraphs: [
        'Latency is the time it takes for a system to respond. Reducing latency improves user experience and allows systems to handle more load within the same time window.',
        'The resources below cover network latency, database query latency, caching, CDN, connection pooling, and profiling. Each guide helps you measure and reduce latency across the stack.',
      ],
    },
    es: {
      heading: 'Latencia y Tiempo de Respuesta',
      paragraphs: [
        'La latencia es el tiempo que tarda un sistema en responder. Reducir la latencia mejora la experiencia de usuario y permite manejar mas carga en la misma ventana de tiempo.',
        'Los recursos a continuacion cubren latencia de red, latencia de consultas, caching, CDN, connection pooling y profiling. Cada guia te ayuda a medir y reducir latencia en toda la pila.',
      ],
    },
  },
  faas: {
    en: {
      heading: 'Functions as a Service',
      paragraphs: [
        'FaaS lets developers run functions without managing servers. Providers handle scaling, patching, and availability, while you pay for execution time.',
        'The resources below cover AWS Lambda, Azure Functions, Google Cloud Functions, triggers, cold starts, and FaaS patterns. Each guide shows how to build event-driven functions at scale.',
      ],
    },
    es: {
      heading: 'Functions as a Service',
      paragraphs: [
        'FaaS permite a los desarrolladores ejecutar funciones sin gestionar servidores. Los proveedores se encargan del escalado, parches y disponibilidad, mientras tu pagas por tiempo de ejecucion.',
        'Los recursos a continuacion cubren AWS Lambda, Azure Functions, Google Cloud Functions, triggers, cold starts y patrones FaaS. Cada guia muestra como construir funciones event-driven a escala.',
      ],
    },
  },
  pytest: {
    en: {
      heading: 'pytest for Python Testing',
      paragraphs: [
        'pytest is the most popular testing framework for Python. It offers fixtures, parametrization, plugins, and a simple assert style that scales from unit tests to integration suites.',
        'The resources below cover fixtures, marks, parametrization, plugins, coverage, and test organization. Each recipe helps you write clean and maintainable Python tests.',
      ],
    },
    es: {
      heading: 'pytest para Testing en Python',
      paragraphs: [
        'pytest es el framework de testing mas popular para Python. Ofrece fixtures, parametrizacion, plugins y un estilo de assert simple que escala desde pruebas unitarias hasta suites de integracion.',
        'Los recursos a continuacion cubren fixtures, marks, parametrizacion, plugins, cobertura y organizacion de tests. Cada receta te ayuda a escribir pruebas Python limpias y mantenibles.',
      ],
    },
  },
  ddd: {
    en: {
      heading: 'Domain-Driven Design',
      paragraphs: [
        'Domain-Driven Design aligns software design with business domains. It emphasizes bounded contexts, ubiquitous language, aggregates, and entities.',
        'The resources below cover strategic and tactical DDD, bounded contexts, aggregates, value objects, repositories, and anti-corruption layers. Each guide helps you model software around real business concepts.',
      ],
    },
    es: {
      heading: 'Domain-Driven Design',
      paragraphs: [
        'Domain-Driven Design alinea el diseno del software con los dominios de negocio. Enfatiza bounded contexts, lenguaje ubicuo, agregados y entidades.',
        'Los recursos a continuacion cubren DDD estrategico y tactico, bounded contexts, agregados, value objects, repositories y anti-corruption layers. Cada guia te ayuda a modelar software alrededor de conceptos reales de negocio.',
      ],
    },
  },
  'domain-driven-design': {
    en: {
      heading: 'Domain-Driven Design Patterns',
      paragraphs: [
        'Domain-driven design patterns help model complex business logic in code. They separate core domains from supporting domains and keep business rules close to the data they govern.',
        'The resources below cover entities, value objects, aggregates, domain services, repositories, and domain events. Each guide shows how to build a domain model that reflects real-world business behavior.',
      ],
    },
    es: {
      heading: 'Patrones de Domain-Driven Design',
      paragraphs: [
        'Los patrones de domain-driven design ayudan a modelar logica de negocio compleja en codigo. Separan dominios centrales de dominios de soporte y mantienen las reglas de negocio cerca de los datos que rigen.',
        'Los recursos a continuacion cubren entities, value objects, agregados, domain services, repositories y domain events. Cada guia muestra como construir un modelo de dominio que refleje el comportamiento real del negocio.',
      ],
    },
  },
  'neural-networks': {
    en: {
      heading: 'Neural Networks and Deep Learning',
      paragraphs: [
        'Neural networks are the foundation of modern deep learning. They power image recognition, natural language processing, recommendation systems, and generative models.',
        'The resources below cover feedforward networks, CNNs, RNNs, transformers, training, and inference. Each guide explains how to build and deploy neural networks in production.',
      ],
    },
    es: {
      heading: 'Redes Neuronales y Deep Learning',
      paragraphs: [
        'Las redes neuronales son la base del deep learning moderno. Potencian reconocimiento de imagenes, procesamiento de lenguaje natural, sistemas de recomendacion y modelos generativos.',
        'Los recursos a continuacion cubren feedforward networks, CNNs, RNNs, transformers, entrenamiento e inferencia. Cada guia explica como construir y desplegar redes neuronales en produccion.',
      ],
    },
  },
  throttling: {
    en: {
      heading: 'Throttling and Rate Control',
      paragraphs: [
        'Throttling limits the rate at which operations are executed. It protects downstream services, controls cost, and improves fairness in shared systems.',
        'The resources below cover request throttling, token bucket, leaky bucket, concurrency limits, and adaptive throttling. Each guide shows how to slow down traffic without breaking clients.',
      ],
    },
    es: {
      heading: 'Throttling y Control de Tasa',
      paragraphs: [
        'El throttling limita la tasa a la que se ejecutan operaciones. Protege servicios downstream, controla costos y mejora la equidad en sistemas compartidos.',
        'Los recursos a continuacion cubren request throttling, token bucket, leaky bucket, limites de concurrencia y throttling adaptativo. Cada guia muestra como reducir trafico sin romper clientes.',
      ],
    },
  },
  'token-bucket': {
    en: {
      heading: 'Token Bucket Rate Limiting',
      paragraphs: [
        'The token bucket algorithm is a classic rate-limiting approach. It allows bursts up to a bucket size while enforcing an average rate over time.',
        'The resources below cover token bucket implementation, Redis-based buckets, distributed rate limiting, and burst handling. Each recipe shows how to implement fair and scalable throttling.',
      ],
    },
    es: {
      heading: 'Rate Limiting con Token Bucket',
      paragraphs: [
        'El algoritmo de token bucket es un enfoque clasico de rate limiting. Permite rafagas hasta el tamano del bucket mientras impone una tasa promedio en el tiempo.',
        'Los recursos a continuacion cubren implementacion de token bucket, buckets basados en Redis, rate limiting distribuido y manejo de rafagas. Cada receta muestra como implementar throttling justo y escalable.',
      ],
    },
  },
  middleware: {
    en: {
      heading: 'Middleware Patterns',
      paragraphs: [
        'Middleware sits between a request and the application logic, handling cross-cutting concerns such as logging, authentication, error handling, and compression.',
        'The resources below cover Express, Koa, ASP.NET, HTTP middleware, and pipeline patterns. Each guide shows how to compose middleware that is reusable and testable.',
      ],
    },
    es: {
      heading: 'Patrones de Middleware',
      paragraphs: [
        'El middleware se situa entre una solicitud y la logica de la aplicacion, gestionando preocupaciones transversales como logging, autenticacion, manejo de errores y compresion.',
        'Los recursos a continuacion cubren Express, Koa, ASP.NET, middleware HTTP y patrones de pipeline. Cada guia muestra como componer middleware reutilizable y testeable.',
      ],
    },
  },
  'circuit-breaker': {
    en: {
      heading: 'Circuit Breaker Pattern',
      paragraphs: [
        'The circuit breaker pattern prevents cascading failures by stopping requests to a failing service. It gives the service time to recover while avoiding unnecessary load.',
        'The resources below cover closed, open, and half-open states, failure thresholds, recovery, and integration with retries. Each guide shows how to add resilience to service calls.',
      ],
    },
    es: {
      heading: 'Patron Circuit Breaker',
      paragraphs: [
        'El patron circuit breaker previene fallas en cascada deteniendo solicitudes a un servicio que esta fallando. Da tiempo al servicio para recuperarse evitando carga innecesaria.',
        'Los recursos a continuacion cubren estados closed, open y half-open, umbrales de falla, recuperacion e integracion con reintentos. Cada guia muestra como agregar resiliencia a llamadas entre servicios.',
      ],
    },
  },
  cryptography: {
    en: {
      heading: 'Cryptography for Developers',
      paragraphs: [
        'Cryptography protects data and communications. Applied correctly, it provides confidentiality, integrity, and authenticity. Applied incorrectly, it creates a false sense of security.',
        'The resources below cover hashing, encryption, digital signatures, TLS, key management, and common mistakes. Each guide helps you use cryptographic primitives safely.',
      ],
    },
    es: {
      heading: 'Criptografia para Desarrolladores',
      paragraphs: [
        'La criptografia protege datos y comunicaciones. Aplicada correctamente, proporciona confidencialidad, integridad y autenticidad. Aplicada incorrectamente, crea una falsa sensacion de seguridad.',
        'Los recursos a continuacion cubren hashing, cifrado, firmas digitales, TLS, gestion de claves y errores comunes. Cada guia te ayuda a usar primitivas criptograficas de forma segura.',
      ],
    },
  },
  'cache-aside': {
    en: {
      heading: 'Cache-Aside Pattern',
      paragraphs: [
        'Cache-aside, or lazy loading, means the application is responsible for loading data into the cache and keeping it up to date. It gives full control over cache population and invalidation.',
        'The resources below cover cache-aside implementation, read-through and write-through alternatives, TTL, and invalidation. Each recipe shows how to reduce database load while avoiding stale data.',
      ],
    },
    es: {
      heading: 'Patron Cache-Aside',
      paragraphs: [
        'Cache-aside, o lazy loading, significa que la aplicacion es responsable de cargar datos en el cache y mantenerlos actualizados. Otorga control total sobre la poblacion e invalidacion del cache.',
        'Los recursos a continuacion cubren implementacion de cache-aside, alternativas read-through y write-through, TTL e invalidacion. Cada receta muestra como reducir carga de base de datos evitando datos obsoletos.',
      ],
    },
  },
  asyncio: {
    en: {
      heading: 'Python asyncio',
      paragraphs: [
        'asyncio is Python standard library for writing concurrent code using the async/await syntax. It is well suited for I/O-bound workloads such as network requests and database calls.',
        'The resources below cover coroutines, tasks, event loops, gather, queues, and common pitfalls. Each guide helps you write fast and correct asynchronous Python code.',
      ],
    },
    es: {
      heading: 'Python asyncio',
      paragraphs: [
        'asyncio es la biblioteca estandar de Python para escribir codigo concurrente con sintaxis async/await. Es adecuada para cargas I/O-bound como solicitudes de red y llamadas a bases de datos.',
        'Los recursos a continuacion cubren coroutines, tareas, event loops, gather, colas y errores comunes. Cada guia te ayuda a escribir codigo asincrono Python rapido y correcto.',
      ],
    },
  },
  scheduling: {
    en: {
      heading: 'Task Scheduling',
      paragraphs: [
        'Scheduling decides when and how tasks run. It is used for cron jobs, batch processing, distributed scheduling, and job queues.',
        'The resources below cover cron, at, systemd timers, schedulers, and job orchestration. Each guide shows how to run recurring and one-off tasks reliably.',
      ],
    },
    es: {
      heading: 'Programacion de Tareas',
      paragraphs: [
        'La programacion de tareas decide cuando y como se ejecutan las tareas. Se usa para cron jobs, procesamiento por lotes, programacion distribuida y colas de trabajo.',
        'Los recursos a continuacion cubren cron, at, timers de systemd, schedulers y orquestacion de trabajos. Cada guia muestra como ejecutar tareas recurrentes y puntuales de forma confiable.',
      ],
    },
  },
  logs: {
    en: {
      heading: 'Logging and Log Management',
      paragraphs: [
        'Logging captures runtime events that help debug, audit, and monitor systems. Good logging is structured, leveled, and actionable.',
        'The resources below cover structured logging, log aggregation, retention, parsing, and tools like ELK, Loki, and Splunk. Each guide helps you build logs that are useful at scale.',
      ],
    },
    es: {
      heading: 'Logging y Gestion de Logs',
      paragraphs: [
        'El logging captura eventos de tiempo de ejecucion que ayudan a depurar, auditar y monitorear sistemas. Un buen logging es estructurado, con niveles y accionable.',
        'Los recursos a continuacion cubren logging estructurado, agregacion de logs, retencion, parsing y herramientas como ELK, Loki y Splunk. Cada guia te ayuda a construir logs utiles a escala.',
      ],
    },
  },
  orchestration: {
    en: {
      heading: 'Workflow and Pipeline Orchestration',
      paragraphs: [
        'Orchestration coordinates multiple tasks, services, and dependencies into a coherent workflow. It ensures that steps execute in the right order and handle failures gracefully.',
        'The resources below cover workflow engines, DAGs, Airflow, Temporal, Camunda, and CI/CD orchestration. Each guide shows how to design reliable multi-step processes.',
      ],
    },
    es: {
      heading: 'Orquestacion de Workflows y Pipelines',
      paragraphs: [
        'La orquestacion coordina multiples tareas, servicios y dependencias en un workflow coherente. Asegura que los pasos se ejecuten en el orden correcto y manejen fallas con elegancia.',
        'Los recursos a continuacion cubren motores de workflow, DAGs, Airflow, Temporal, Camunda y orquestacion de CI/CD. Cada guia muestra como disenar procesos multi-paso confiables.',
      ],
    },
  },
};
