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
};
