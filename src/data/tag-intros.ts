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
  elasticsearch: {
    en: {
      heading: 'Elasticsearch and Search',
      paragraphs: [
        'Elasticsearch is a distributed search and analytics engine. It is commonly used for full-text search, log aggregation, and real-time analytics.',
        'The resources below cover indexing, querying, mappings, aggregations, cluster operations, and performance tuning. Each guide helps you build fast and relevant search experiences.',
      ],
    },
    es: {
      heading: 'Elasticsearch y Busqueda',
      paragraphs: [
        'Elasticsearch es un motor de busqueda y analitica distribuido. Se usa comunmente para busqueda full-text, agregacion de logs y analitica en tiempo real.',
        'Los recursos a continuacion cubren indexacion, consultas, mappings, agregaciones, operaciones de cluster y ajuste de rendimiento. Cada guia te ayuda a construir experiencias de busqueda rapidas y relevantes.',
      ],
    },
  },
  orm: {
    en: {
      heading: 'Object-Relational Mapping',
      paragraphs: [
        'ORMs bridge object-oriented code and relational databases. They reduce boilerplate but introduce abstraction costs and performance trade-offs.',
        'The resources below cover SQLAlchemy, Hibernate, Prisma, TypeORM, and Entity Framework. Each guide explains how to use ORMs effectively while avoiding common pitfalls.',
      ],
    },
    es: {
      heading: 'Object-Relational Mapping',
      paragraphs: [
        'Los ORMs conectan codigo orientado a objetos y bases de datos relacionales. Reducen codigo repetitivo pero introducen costos de abstraccion y trade-offs de rendimiento.',
        'Los recursos a continuacion cubren SQLAlchemy, Hibernate, Prisma, TypeORM y Entity Framework. Cada guia explica como usar ORMs de forma efectiva evitando errores comunes.',
      ],
    },
  },
  compression: {
    en: {
      heading: 'Data Compression',
      paragraphs: [
        'Compression reduces the size of data for storage or transmission. It improves bandwidth, latency, and cost but adds CPU overhead.',
        'The resources below cover gzip, brotli, zstd, Snappy, image compression, and protocol-level compression. Each guide shows how to compress efficiently without hurting performance.',
      ],
    },
    es: {
      heading: 'Compresion de Datos',
      paragraphs: [
        'La compresion reduce el tamano de los datos para almacenamiento o transmision. Mejora ancho de banda, latencia y costo pero agrega overhead de CPU.',
        'Los recursos a continuacion cubren gzip, brotli, zstd, Snappy, compresion de imagenes y compresion a nivel de protocolo. Cada guia muestra como comprimir eficientemente sin afectar rendimiento.',
      ],
    },
  },
  'health-check': {
    en: {
      heading: 'Health Checks and Liveness',
      paragraphs: [
        'Health checks tell load balancers and orchestrators whether a service is healthy. They are essential for zero-downtime deployments and automatic recovery.',
        'The resources below cover HTTP health endpoints, readiness vs liveness, dependencies, and Kubernetes probes. Each guide shows how to design probes that reflect real service health.',
      ],
    },
    es: {
      heading: 'Health Checks y Liveness',
      paragraphs: [
        'Los health checks indican a load balancers y orquestadores si un servicio esta sano. Son esenciales para despliegues sin downtime y recuperacion automatica.',
        'Los recursos a continuacion cubren endpoints de salud HTTP, readiness vs liveness, dependencias y probes de Kubernetes. Cada guia muestra como disenar probes que reflejen la salud real.',
      ],
    },
  },
  isolation: {
    en: {
      heading: 'Isolation Levels and Concurrency Control',
      paragraphs: [
        'Isolation defines how concurrent transactions interact. Stronger isolation prevents anomalies but can reduce throughput.',
        'The resources below cover read uncommitted, read committed, repeatable read, serializable, MVCC, and locking. Each guide explains how to choose the right isolation level for your workload.',
      ],
    },
    es: {
      heading: 'Niveles de Aislamiento y Control de Concurrencia',
      paragraphs: [
        'El aislamiento define como interactuan las transacciones concurrentes. Un aislamiento mas fuerte previene anomalias pero puede reducir throughput.',
        'Los recursos a continuacion cubren read uncommitted, read committed, repeatable read, serializable, MVCC y bloqueos. Cada guia explica como elegir el nivel de aislamiento correcto para tu carga.',
      ],
    },
  },
  workflow: {
    en: {
      heading: 'Workflow Automation',
      paragraphs: [
        'Workflows coordinate steps, decisions, and people across a process. Automating them reduces manual work and improves consistency.',
        'The resources below cover workflow engines, state machines, approval flows, DAGs, and BPMN. Each guide helps you design workflows that are reliable and observable.',
      ],
    },
    es: {
      heading: 'Automatizacion de Workflows',
      paragraphs: [
        'Los workflows coordinan pasos, decisiones y personas a lo largo de un proceso. Automatizarlos reduce trabajo manual y mejora consistencia.',
        'Los recursos a continuacion cubren motores de workflow, maquinas de estado, flujos de aprobacion, DAGs y BPMN. Cada guia te ayuda a disenar workflows confiables y observables.',
      ],
    },
  },
  helm: {
    en: {
      heading: 'Helm for Kubernetes',
      paragraphs: [
        'Helm is the package manager for Kubernetes. It lets you define, install, and upgrade complex applications using charts.',
        'The resources below cover Helm charts, templates, values, releases, rollbacks, and best practices. Each guide helps you manage Kubernetes applications as versioned packages.',
      ],
    },
    es: {
      heading: 'Helm para Kubernetes',
      paragraphs: [
        'Helm es el gestor de paquetes de Kubernetes. Permite definir, instalar y actualizar aplicaciones complejas usando charts.',
        'Los recursos a continuacion cubren charts, templates, values, releases, rollbacks y mejores practicas de Helm. Cada guia te ayuda a gestionar aplicaciones Kubernetes como paquetes versionados.',
      ],
    },
  },
  iac: {
    en: {
      heading: 'Infrastructure as Code',
      paragraphs: [
        'Infrastructure as Code lets you provision and manage infrastructure through code. It enables version control, review, testing, and reproducibility.',
        'The resources below cover Terraform, Pulumi, Ansible, CloudFormation, and Azure Bicep. Each guide shows how to automate infrastructure safely and consistently.',
      ],
    },
    es: {
      heading: 'Infraestructura como Codigo',
      paragraphs: [
        'La Infraestructura como Codigo permite aprovisionar y gestionar infraestructura a traves de codigo. Habilita control de versiones, revision, testing y reproducibilidad.',
        'Los recursos a continuacion cubren Terraform, Pulumi, Ansible, CloudFormation y Azure Bicep. Cada guia muestra como automatizar infraestructura de forma segura y consistente.',
      ],
    },
  },
  'state-management': {
    en: {
      heading: 'Application State Management',
      paragraphs: [
        'State management defines how an application stores, updates, and shares data across components. Good state management makes UI predictable and testable.',
        'The resources below cover React state, Redux, Vuex, Zustand, signals, and server state. Each guide helps you choose the right state pattern for your application.',
      ],
    },
    es: {
      heading: 'Gestion de Estado de Aplicaciones',
      paragraphs: [
        'La gestion de estado define como una aplicacion almacena, actualiza y comparte datos entre componentes. Una buena gestion hace la UI predecible y testeable.',
        'Los recursos a continuacion cubren estado de React, Redux, Vuex, Zustand, signals y estado de servidor. Cada guia te ayuda a elegir el patron de estado correcto para tu aplicacion.',
      ],
    },
  },
  browser: {
    en: {
      heading: 'Browser APIs and Frontend',
      paragraphs: [
        'The browser is the runtime for most user-facing web applications. Modern frontend development relies on browser APIs, performance, accessibility, and security.',
        'The resources below cover DOM, fetch, storage, service workers, events, and browser performance. Each guide helps you build applications that work well across browsers.',
      ],
    },
    es: {
      heading: 'APIs del Navegador y Frontend',
      paragraphs: [
        'El navegador es el runtime de la mayoria de aplicaciones web orientadas a usuarios. El desarrollo frontend moderno depende de APIs del navegador, rendimiento, accesibilidad y seguridad.',
        'Los recursos a continuacion cubren DOM, fetch, almacenamiento, service workers, eventos y rendimiento del navegador. Cada guia te ayuda a construir aplicaciones que funcionen bien en todos los navegadores.',
      ],
    },
  },
  ui: {
    en: {
      heading: 'User Interface Design and Engineering',
      paragraphs: [
        'UI is the layer where users interact with software. Good UI is clear, accessible, responsive, and consistent with the design system.',
        'The resources below cover components, design tokens, forms, validation, responsive design, and accessibility. Each guide helps you build interfaces that are usable and inclusive.',
      ],
    },
    es: {
      heading: 'Diseno e Ingenieria de Interfaces de Usuario',
      paragraphs: [
        'La UI es la capa donde los usuarios interactuan con el software. Una buena UI es clara, accesible, responsive y consistente con el sistema de diseno.',
        'Los recursos a continuacion cubren componentes, design tokens, formularios, validacion, diseno responsive y accesibilidad. Cada guia te ayuda a construir interfaces usables e inclusivas.',
      ],
    },
  },
  'api-design': {
    en: {
      heading: 'API Design',
      paragraphs: [
        'API design is the practice of defining interfaces that are clear, consistent, and easy to consume. Good design reduces integration friction and improves long-term maintainability.',
        'The resources below cover REST, GraphQL, versioning, pagination, error responses, and OpenAPI. Each guide helps you design APIs that developers enjoy using.',
      ],
    },
    es: {
      heading: 'Diseno de APIs',
      paragraphs: [
        'El diseno de APIs es la practica de definir interfaces claras, consistentes y faciles de consumir. Un buen diseno reduce la friccion de integracion y mejora la mantenibilidad a largo plazo.',
        'Los recursos a continuacion cubren REST, GraphQL, versionado, paginacion, respuestas de error y OpenAPI. Cada guia te ayuda a disenar APIs que los desarrolladores disfruten usar.',
      ],
    },
  },
  federation: {
    en: {
      heading: 'GraphQL Federation',
      paragraphs: [
        'GraphQL federation lets multiple services contribute to a single unified graph. It enables independent teams to own domain-specific schemas while presenting one API.',
        'The resources below cover Apollo Federation, schema stitching, entity ownership, gateways, and subgraphs. Each guide shows how to build distributed GraphQL architectures.',
      ],
    },
    es: {
      heading: 'Federacion de GraphQL',
      paragraphs: [
        'La federacion de GraphQL permite que multiples servicios contribuyan a un grafo unificado. Habilita a equipos independientes a poseer esquemas de dominio especifico mientras presentan una sola API.',
        'Los recursos a continuacion cubren Apollo Federation, schema stitching, ownership de entidades, gateways y subgraphs. Cada guia muestra como construir arquitecturas GraphQL distribuidas.',
      ],
    },
  },
  opentelemetry: {
    en: {
      heading: 'OpenTelemetry',
      paragraphs: [
        'OpenTelemetry is the open standard for observability. It provides a unified API for traces, metrics, and logs across languages and platforms.',
        'The resources below cover instrumentation, collectors, exporters, context propagation, and OTLP. Each guide helps you add observability without vendor lock-in.',
      ],
    },
    es: {
      heading: 'OpenTelemetry',
      paragraphs: [
        'OpenTelemetry es el estandar abierto para observabilidad. Proporciona una API unificada para trazas, metricas y logs entre lenguajes y plataformas.',
        'Los recursos a continuacion cubren instrumentacion, collectors, exporters, propagacion de contexto y OTLP. Cada guia te ayuda a agregar observabilidad sin vendor lock-in.',
      ],
    },
  },
  'core-web-vitals': {
    en: {
      heading: 'Core Web Vitals',
      paragraphs: [
        'Core Web Vitals are the key metrics Google uses to measure user experience: LCP, INP, and CLS. They directly impact SEO, conversions, and perceived performance.',
        'The resources below cover measurement, optimization, lazy loading, image handling, and interaction responsiveness. Each guide helps you improve real-world page performance.',
      ],
    },
    es: {
      heading: 'Core Web Vitals',
      paragraphs: [
        'Core Web Vitals son las metricas clave que Google usa para medir la experiencia de usuario: LCP, INP y CLS. Impactan directamente en SEO, conversiones y rendimiento percibido.',
        'Los recursos a continuacion cubren medicion, optimizacion, lazy loading, manejo de imagenes y respuesta de interaccion. Cada guia te ayuda a mejorar el rendimiento real de las paginas.',
      ],
    },
  },
  'secrets-management': {
    en: {
      heading: 'Secrets Management',
      paragraphs: [
        'Secrets management is the secure storage, access, and rotation of sensitive credentials. It is a foundational practice for cloud, CI/CD, and application security.',
        'The resources below cover secret managers, vaults, dynamic credentials, zero-trust, and rotation. Each guide helps you keep secrets out of code and under control.',
      ],
    },
    es: {
      heading: 'Gestion de Secretos',
      paragraphs: [
        'La gestion de secretos es el almacenamiento, acceso y rotacion seguros de credenciales sensibles. Es una practica fundamental para la seguridad en la nube, CI/CD y aplicaciones.',
        'Los recursos a continuacion cubren secret managers, vaults, credenciales dinamicas, confianza cero y rotacion. Cada guia te ayuda a mantener secretos fuera del codigo y bajo control.',
      ],
    },
  },
  'cold-start': {
    en: {
      heading: 'Cold Start Optimization',
      paragraphs: [
        'Cold starts are the latency of initializing a function or container from scratch. They are a common challenge in serverless and scale-to-zero platforms.',
        'The resources below cover provisioned concurrency, lazy loading, container optimization, and function design. Each guide helps you reduce or eliminate cold start latency.',
      ],
    },
    es: {
      heading: 'Optimizacion de Cold Start',
      paragraphs: [
        'Los cold starts son la latencia de inicializar una funcion o contenedor desde cero. Son un desafio comun en serverless y plataformas scale-to-zero.',
        'Los recursos a continuacion cubren provisioned concurrency, lazy loading, optimizacion de contenedores y diseno de funciones. Cada guia te ayuda a reducir o eliminar la latencia de cold start.',
      ],
    },
  },
  refactoring: {
    en: {
      heading: 'Code Refactoring',
      paragraphs: [
        'Refactoring changes code without changing behavior. It improves readability, reduces complexity, and prepares the codebase for new features.',
        'The resources below cover refactoring techniques, test-driven refactoring, removing duplication, and breaking dependencies. Each guide helps you refactor safely and incrementally.',
      ],
    },
    es: {
      heading: 'Refactoring de Codigo',
      paragraphs: [
        'El refactoring cambia el codigo sin cambiar el comportamiento. Mejora la legibilidad, reduce la complejidad y prepara el codigo para nuevas caracteristicas.',
        'Los recursos a continuacion cubren tecnicas de refactoring, refactoring guiado por tests, eliminacion de duplicacion y ruptura de dependencias. Cada guia te ayuda a refactorizar de forma segura e incremental.',
      ],
    },
  },
  'disaster-recovery': {
    en: {
      heading: 'Disaster Recovery',
      paragraphs: [
        'Disaster recovery is the ability to restore systems after a major failure. It requires backups, runbooks, tested recovery procedures, and clear RTO/RPO objectives.',
        'The resources below cover backup strategies, region failover, data replication, and recovery testing. Each guide helps you prepare for failures that go beyond normal incident response.',
      ],
    },
    es: {
      heading: 'Recuperacion ante Desastres',
      paragraphs: [
        'La recuperacion ante desastres es la capacidad de restaurar sistemas despues de una falla mayor. Requiere backups, runbooks, procedimientos de recuperacion probados y objetivos claros de RTO/RPO.',
        'Los recursos a continuacion cubren estrategias de backup, failover entre regiones, replicacion de datos y testing de recuperacion. Cada guia te ayuda a prepararte para fallas que van mas alla de la respuesta normal a incidentes.',
      ],
    },
  },
  scaling: {
    en: {
      heading: 'Scaling Systems',
      paragraphs: [
        'Scaling is the ability to handle growing load without degrading performance. It requires understanding vertical and horizontal scaling, bottlenecks, and trade-offs.',
        'The resources below cover load balancing, auto-scaling, database sharding, caching, and stateless design. Each guide helps you scale systems predictably and cost-effectively.',
      ],
    },
    es: {
      heading: 'Escalado de Sistemas',
      paragraphs: [
        'El escalado es la capacidad de manejar carga creciente sin degradar el rendimiento. Requiere entender escalado vertical y horizontal, cuellos de botella y trade-offs.',
        'Los recursos a continuacion cubren load balancing, auto-scaling, sharding de bases de datos, caching y diseno stateless. Cada guia te ayuda a escalar sistemas de forma predecible y rentable.',
      ],
    },
  },
  incident: {
    en: {
      heading: 'Incident Management',
      paragraphs: [
        'Incident management is the process of responding to and recovering from production failures. Effective incident management reduces downtime and preserves customer trust.',
        'The resources below cover incident response, on-call, triage, communication, postmortems, and runbooks. Each guide helps you build a reliable incident practice.',
      ],
    },
    es: {
      heading: 'Gestion de Incidentes',
      paragraphs: [
        'La gestion de incidentes es el proceso de responder y recuperarse de fallas en produccion. Una gestion efectiva reduce el tiempo de inactividad y preserva la confianza del cliente.',
        'Los recursos a continuacion cubren respuesta a incidentes, on-call, triage, comunicacion, postmortems y runbooks. Cada guia te ayuda a construir una practica de incidentes confiable.',
      ],
    },
  },
  grafana: {
    en: {
      heading: 'Grafana and Visualization',
      paragraphs: [
        'Grafana is a leading visualization tool for metrics, logs, and traces. It helps teams build dashboards that reveal system health and trends.',
        'The resources below cover dashboards, panels, queries, alerts, Loki, and Prometheus integration. Each guide helps you create observability dashboards that are actionable.',
      ],
    },
    es: {
      heading: 'Grafana y Visualizacion',
      paragraphs: [
        'Grafana es una herramienta lider de visualizacion para metricas, logs y trazas. Ayuda a los equipos a construir dashboards que revelan la salud y tendencias del sistema.',
        'Los recursos a continuacion cubren dashboards, paneles, consultas, alertas, Loki e integracion con Prometheus. Cada guia te ayuda a crear dashboards de observabilidad accionables.',
      ],
    },
  },
  'batch-processing': {
    en: {
      heading: 'Batch Processing',
      paragraphs: [
        'Batch processing handles large volumes of data in scheduled jobs. It is efficient for analytics, ETL, and workloads that do not require real-time results.',
        'The resources below cover batch architecture, job schedulers, idempotency, retries, and data partitioning. Each guide helps you build reliable and scalable batch pipelines.',
      ],
    },
    es: {
      heading: 'Procesamiento por Lotes',
      paragraphs: [
        'El procesamiento por lotes maneja grandes volumenes de datos en trabajos programados. Es eficiente para analitica, ETL y cargas que no requieren resultados en tiempo real.',
        'Los recursos a continuacion cubren arquitectura batch, job schedulers, idempotencia, reintentos y particion de datos. Cada guia te ayuda a construir pipelines batch confiables y escalables.',
      ],
    },
  },
  pagination: {
    en: {
      heading: 'Pagination Strategies',
      paragraphs: [
        'Pagination breaks large datasets into smaller chunks for clients. It improves performance, usability, and resource usage in APIs and UIs.',
        'The resources below cover offset, cursor, and keyset pagination, as well as infinite scroll and page numbers. Each guide helps you choose the right pagination strategy for your use case.',
      ],
    },
    es: {
      heading: 'Estrategias de Paginacion',
      paragraphs: [
        'La paginacion divide grandes conjuntos de datos en fragmentos mas pequenos para los clientes. Mejora rendimiento, usabilidad y uso de recursos en APIs y UIs.',
        'Los recursos a continuacion cubren paginacion por offset, cursor y keyset, ademas de infinite scroll y numeros de pagina. Cada guia te ayuda a elegir la estrategia de paginacion correcta para tu caso.',
      ],
    },
  },
  cors: {
    en: {
      heading: 'Cross-Origin Resource Sharing',
      paragraphs: [
        'CORS controls how web pages can request resources from a different domain. Misconfigured CORS can block legitimate users or expose APIs to unauthorized sites.',
        'The resources below cover CORS headers, preflight requests, credentials, and security best practices. Each guide helps you configure CORS correctly for web applications.',
      ],
    },
    es: {
      heading: 'Cross-Origin Resource Sharing',
      paragraphs: [
        'CORS controla como las paginas web pueden solicitar recursos de un dominio diferente. Un CORS mal configurado puede bloquear usuarios legitimos o exponer APIs a sitios no autorizados.',
        'Los recursos a continuacion cubren headers de CORS, preflight requests, credenciales y mejores practicas de seguridad. Cada guia te ayuda a configurar CORS correctamente para aplicaciones web.',
      ],
    },
  },
  'database-sharding': {
    en: {
      heading: 'Database Sharding',
      paragraphs: [
        'Sharding splits a database horizontally across multiple nodes. It enables massive scale but introduces complexity in routing, rebalancing, and transactions.',
        'The resources below cover shard keys, range and hash sharding, cross-shard queries, rebalancing, and sharding strategies. Each guide helps you scale databases beyond single-node limits.',
      ],
    },
    es: {
      heading: 'Sharding de Bases de Datos',
      paragraphs: [
        'El sharding divide una base de datos horizontalmente entre multiples nodos. Permite escala masiva pero introduce complejidad en routing, rebalancing y transacciones.',
        'Los recursos a continuacion cubren shard keys, sharding por rango y hash, consultas cross-shard, rebalancing y estrategias de sharding. Cada guia te ayuda a escalar bases de datos mas alla de los limites de un solo nodo.',
      ],
    },
  },
  deprecation: {
    en: {
      heading: 'Deprecation and End-of-Life',
      paragraphs: [
        'Deprecation is the process of phasing out old APIs, features, or dependencies without breaking consumers. It requires clear communication, timelines, and migration paths.',
        'The resources below cover deprecation notices, version policies, migration guides, sunset processes, and breaking change management. Each guide helps you retire technology safely.',
      ],
    },
    es: {
      heading: 'Deprecacion y Fin de Vida',
      paragraphs: [
        'La deprecacion es el proceso de eliminar gradualmente APIs, features o dependencias antiguas sin romper consumidores. Requiere comunicacion clara, timelines y caminos de migracion.',
        'Los recursos a continuacion cubren avisos de deprecacion, politicas de versionado, guias de migracion, procesos de sunset y gestion de breaking changes. Cada guia te ayuda a retirar tecnologia de forma segura.',
      ],
    },
  },
  evaluation: {
    en: {
      heading: 'Evaluation and Metrics',
      paragraphs: [
        'Evaluation measures whether a system, model, or process meets its goals. It requires defining clear metrics, collecting data, and interpreting results honestly.',
        'The resources below cover model evaluation, A/B testing, system benchmarking, validation, and error analysis. Each guide helps you measure the right things and act on the findings.',
      ],
    },
    es: {
      heading: 'Evaluacion y Metricas',
      paragraphs: [
        'La evaluacion mide si un sistema, modelo o proceso cumple sus objetivos. Requiere definir metricas claras, recolectar datos e interpretar resultados honestamente.',
        'Los recursos a continuacion cubren evaluacion de modelos, A/B testing, benchmarking de sistemas, validacion y analisis de errores. Cada guia te ayuda a medir lo correcto y actuar segun los hallazgos.',
      ],
    },
  },
  websockets: {
    en: {
      heading: 'WebSockets and Real-Time Communication',
      paragraphs: [
        'WebSockets provide a persistent, low-latency, bidirectional channel between client and server. They are ideal for real-time features like chat, live updates, and gaming.',
        'The resources below cover Socket.io, WS, connection management, reconnection, scaling, and fallback strategies. Each guide helps you build reliable real-time systems.',
      ],
    },
    es: {
      heading: 'WebSockets y Comunicacion en Tiempo Real',
      paragraphs: [
        'WebSockets proporcionan un canal persistente, de baja latencia y bidireccional entre cliente y servidor. Son ideales para features en tiempo real como chat, actualizaciones en vivo y gaming.',
        'Los recursos a continuacion cubren Socket.io, WS, gestion de conexiones, reconexion, escalado y estrategias de fallback. Cada guia te ayuda a construir sistemas en tiempo real confiables.',
      ],
    },
  },
  'spring-boot': {
    en: {
      heading: 'Spring Boot',
      paragraphs: [
        'Spring Boot simplifies Java application development with auto-configuration, embedded servers, and a vast ecosystem. It is the most common way to build production Java services.',
        'The resources below cover starters, configuration, testing, data access, security, and deployment. Each guide helps you build and operate Spring Boot applications efficiently.',
      ],
    },
    es: {
      heading: 'Spring Boot',
      paragraphs: [
        'Spring Boot simplifica el desarrollo de aplicaciones Java con auto-configuracion, servidores embebidos y un vasto ecosistema. Es la forma mas comun de construir servicios Java en produccion.',
        'Los recursos a continuacion cubren starters, configuracion, testing, acceso a datos, seguridad y despliegue. Cada guia te ayuda a construir y operar aplicaciones Spring Boot eficientemente.',
      ],
    },
  },
  proxy: {
    en: {
      heading: 'Proxies and Reverse Proxies',
      paragraphs: [
        'A proxy acts as an intermediary between clients and servers. Reverse proxies provide load balancing, SSL termination, caching, and security at the edge.',
        'The resources below cover Nginx, Envoy, HAProxy, API gateways, and forward vs reverse proxies. Each guide shows how to route and protect traffic with proxies.',
      ],
    },
    es: {
      heading: 'Proxies y Reverse Proxies',
      paragraphs: [
        'Un proxy actua como intermediario entre clientes y servidores. Los reverse proxies proporcionan balanceo de carga, terminacion SSL, caching y seguridad en el edge.',
        'Los recursos a continuacion cubren Nginx, Envoy, HAProxy, API gateways y proxies forward vs reverse. Cada guia muestra como enrutar y proteger trafico con proxies.',
      ],
    },
  },
  'pub-sub': {
    en: {
      heading: 'Publish-Subscribe Messaging',
      paragraphs: [
        'Pub-sub decouples senders and receivers through topics. Multiple consumers can receive the same message, making it ideal for broadcasting and event-driven systems.',
        'The resources below cover Redis Pub/Sub, Google Pub/Sub, SNS, Kafka, and fan-out patterns. Each guide helps you implement scalable pub-sub messaging.',
      ],
    },
    es: {
      heading: 'Mensajeria Publish-Subscribe',
      paragraphs: [
        'Pub-sub desacopla emisores y receptores a traves de topics. Multiples consumidores pueden recibir el mismo mensaje, lo que lo hace ideal para broadcasting y sistemas event-driven.',
        'Los recursos a continuacion cubren Redis Pub/Sub, Google Pub/Sub, SNS, Kafka y patrones fan-out. Cada guia te ayuda a implementar mensajeria pub-sub escalable.',
      ],
    },
  },
  report: {
    en: {
      heading: 'Reports and Documentation',
      paragraphs: [
        'Reports capture findings, status, and recommendations for teams and stakeholders. Good reports are clear, actionable, and tailored to the audience.',
        'The resources below cover incident reports, security reports, status updates, and documentation templates. Each guide helps you communicate complex information effectively.',
      ],
    },
    es: {
      heading: 'Reportes y Documentacion',
      paragraphs: [
        'Los reportes capturan hallazgos, estado y recomendaciones para equipos y partes interesadas. Buenos reportes son claros, accionables y adaptados a la audiencia.',
        'Los recursos a continuacion cubren reportes de incidentes, reportes de seguridad, actualizaciones de estado y plantillas de documentacion. Cada guia te ayuda a comunicar informacion compleja de forma efectiva.',
      ],
    },
  },
  html: {
    en: {
      heading: 'HTML Fundamentals',
      paragraphs: [
        'HTML is the foundation of the web. Semantic, accessible, and well-structured HTML improves SEO, screen reader support, and maintainability.',
        'The resources below cover semantic elements, forms, accessibility, templates, and email HTML. Each guide helps you write HTML that works for users and machines.',
      ],
    },
    es: {
      heading: 'Fundamentos de HTML',
      paragraphs: [
        'HTML es la base de la web. HTML semantico, accesible y bien estructurado mejora SEO, soporte de lectores de pantalla y mantenibilidad.',
        'Los recursos a continuacion cubren elementos semanticos, formularios, accesibilidad, templates y HTML para email. Cada guia te ayuda a escribir HTML que funcione para usuarios y maquinas.',
      ],
    },
  },
  images: {
    en: {
      heading: 'Image Optimization',
      paragraphs: [
        'Images are often the largest assets on a page. Optimizing them improves load times, bandwidth, and user experience without sacrificing quality.',
        'The resources below cover compression, lazy loading, responsive images, WebP, AVIF, and CDNs. Each guide helps you deliver images faster and smarter.',
      ],
    },
    es: {
      heading: 'Optimizacion de Imagenes',
      paragraphs: [
        'Las imagenes suelen ser los activos mas grandes de una pagina. Optimizarlas mejora tiempos de carga, ancho de banda y experiencia de usuario sin sacrificar calidad.',
        'Los recursos a continuacion cubren compresion, lazy loading, imagenes responsive, WebP, AVIF y CDNs. Cada guia te ayuda a entregar imagenes mas rapido e inteligentemente.',
      ],
    },
  },
  'event-store': {
    en: {
      heading: 'Event Sourcing and Event Stores',
      paragraphs: [
        'Event sourcing persists the state of an application as a sequence of events. The event store becomes the source of truth and enables auditability, replay, and projections.',
        'The resources below cover event sourcing patterns, event stores, snapshots, projections, and CQRS. Each guide helps you build systems that capture every state change.',
      ],
    },
    es: {
      heading: 'Event Sourcing y Event Stores',
      paragraphs: [
        'Event sourcing persiste el estado de una aplicacion como una secuencia de eventos. El event store se convierte en la fuente de verdad y habilita auditabilidad, replay y proyecciones.',
        'Los recursos a continuacion cubren patrones de event sourcing, event stores, snapshots, proyecciones y CQRS. Cada guia te ayuda a construir sistemas que capturan cada cambio de estado.',
      ],
    },
  },
  'structural-patterns': {
    en: {
      heading: 'Structural Design Patterns',
      paragraphs: [
        'Structural patterns focus on how classes and objects are composed to form larger structures. They help simplify relationships and make systems more flexible.',
        'The resources below cover adapter, bridge, composite, decorator, facade, flyweight, and proxy patterns. Each guide shows how to organize objects and classes for clarity and reuse.',
      ],
    },
    es: {
      heading: 'Patrones de Diseno Estructurales',
      paragraphs: [
        'Los patrones estructurales se enfocan en como se componen clases y objetos para formar estructuras mas grandes. Ayudan a simplificar relaciones y hacer sistemas mas flexibles.',
        'Los recursos a continuacion cubren adapter, bridge, composite, decorator, facade, flyweight y proxy. Cada guia muestra como organizar objetos y clases para claridad y reutilizacion.',
      ],
    },
  },
  'infrastructure-as-code': {
    en: {
      heading: 'Infrastructure as Code',
      paragraphs: [
        'Infrastructure as Code lets you manage infrastructure through versioned, tested, and reusable code. It brings software engineering practices to operations.',
        'The resources below cover Terraform, CloudFormation, Pulumi, Ansible, and GitOps. Each guide helps you provision, update, and destroy infrastructure reliably.',
      ],
    },
    es: {
      heading: 'Infraestructura como Codigo',
      paragraphs: [
        'La Infraestructura como Codigo permite gestionar infraestructura a traves de codigo versionado, probado y reusable. Aporta practicas de ingenieria de software a las operaciones.',
        'Los recursos a continuacion cubren Terraform, CloudFormation, Pulumi, Ansible y GitOps. Cada guia te ayuda a aprovisionar, actualizar y destruir infraestructura de forma confiable.',
      ],
    },
  },
  backup: {
    en: {
      heading: 'Backups and Recovery',
      paragraphs: [
        'Backups protect data against accidental deletion, corruption, and disasters. A good backup strategy covers frequency, retention, testing, and recovery procedures.',
        'The resources below cover database backups, filesystem backups, cloud snapshots, point-in-time recovery, and restore testing. Each guide helps you recover data when it matters.',
      ],
    },
    es: {
      heading: 'Backups y Recuperacion',
      paragraphs: [
        'Los backups protegen los datos contra eliminacion accidental, corrupcion y desastres. Una buena estrategia de backup cubre frecuencia, retencion, testing y procedimientos de recuperacion.',
        'Los recursos a continuacion cubren backups de bases de datos, backups de filesystem, snapshots en la nube, point-in-time recovery y testing de restauracion. Cada guia te ayuda a recuperar datos cuando importa.',
      ],
    },
  },
  environments: {
    en: {
      heading: 'Deployment Environments',
      paragraphs: [
        'Environments isolate stages of the software lifecycle, such as development, staging, and production. They help teams test changes safely before releasing.',
        'The resources below cover environment parity, configuration, promotion pipelines, and multi-tenant setups. Each guide helps you manage environments consistently and securely.',
      ],
    },
    es: {
      heading: 'Entornos de Despliegue',
      paragraphs: [
        'Los entornos aisan etapas del ciclo de vida del software, como desarrollo, staging y produccion. Ayudan a los equipos a probar cambios de forma segura antes de liberarlos.',
        'Los recursos a continuacion cubren paridad de entornos, configuracion, pipelines de promocion y configuraciones multi-tenant. Cada guia te ayuda a gestionar entornos de forma consistente y segura.',
      ],
    },
  },
  dataloader: {
    en: {
      heading: 'DataLoader and Batching',
      paragraphs: [
        'DataLoader is a pattern for batching and deduplicating data requests. It solves the N+1 query problem in GraphQL and other data-fetching layers.',
        'The resources below cover DataLoader in Node.js, Java, Python, caching, batching, and key design. Each guide helps you load data efficiently across service boundaries.',
      ],
    },
    es: {
      heading: 'DataLoader y Batching',
      paragraphs: [
        'DataLoader es un patron para batching y deduplicacion de solicitudes de datos. Resuelve el problema de consultas N+1 en GraphQL y otras capas de obtencion de datos.',
        'Los recursos a continuacion cubren DataLoader en Node.js, Java, Python, caching, batching y diseno de keys. Cada guia te ayuda a cargar datos eficientemente entre limites de servicios.',
      ],
    },
  },
  debugging: {
    en: {
      heading: 'Debugging Techniques',
      paragraphs: [
        'Debugging is the process of finding and fixing defects. It requires observation, hypothesis testing, and the right tools.',
        'The resources below cover logs, stack traces, breakpoints, profilers, distributed tracing, and post-mortem debugging. Each guide helps you diagnose issues faster and with less guesswork.',
      ],
    },
    es: {
      heading: 'Tecnicas de Debugging',
      paragraphs: [
        'El debugging es el proceso de encontrar y corregir defectos. Requiere observacion, prueba de hipotesis y las herramientas correctas.',
        'Los recursos a continuacion cubren logs, stack traces, breakpoints, profilers, trazas distribuidas y debugging post-mortem. Cada guia te ayuda a diagnosticar problemas mas rapido y con menos conjeturas.',
      ],
    },
  },
  'distributed-tracing': {
    en: {
      heading: 'Distributed Tracing',
      paragraphs: [
        'Distributed tracing follows requests across services and components. It is essential for understanding latency and failures in microservices architectures.',
        'The resources below cover trace context, spans, sampling, OpenTelemetry, Jaeger, and Zipkin. Each guide helps you implement tracing that reveals how requests flow through your system.',
      ],
    },
    es: {
      heading: 'Trazas Distribuidas',
      paragraphs: [
        'Las trazas distribuidas siguen solicitudes a traves de servicios y componentes. Son esenciales para entender latencia y fallas en arquitecturas de microservicios.',
        'Los recursos a continuacion cubren contexto de traza, spans, sampling, OpenTelemetry, Jaeger y Zipkin. Cada guia te ayuda a implementar trazas que revelan como fluyen las solicitudes en tu sistema.',
      ],
    },
  },
  tracing: {
    en: {
      heading: 'Tracing and Observability',
      paragraphs: [
        'Tracing records the path of a request through a system. It provides visibility into timing, dependencies, and errors that logs and metrics alone cannot reveal.',
        'The resources below cover request tracing, distributed tracing, sampling, and correlation IDs. Each guide helps you add traces that make complex systems understandable.',
      ],
    },
    es: {
      heading: 'Tracing y Observabilidad',
      paragraphs: [
        'El tracing registra el camino de una solicitud a traves de un sistema. Proporciona visibilidad de tiempos, dependencias y errores que logs y metricas solos no pueden revelar.',
        'Los recursos a continuacion cubren request tracing, trazas distribuidas, sampling y correlation IDs. Cada guia te ayuda a agregar trazas que hacen sistemas complejos comprensibles.',
      ],
    },
  },
  jaeger: {
    en: {
      heading: 'Jaeger and Tracing',
      paragraphs: [
        'Jaeger is an open-source distributed tracing system. It helps monitor and troubleshoot microservices by visualizing request flows and latency.',
        'The resources below cover Jaeger deployment, instrumentation, sampling, and integration with OpenTelemetry. Each guide helps you set up tracing for cloud-native applications.',
      ],
    },
    es: {
      heading: 'Jaeger y Tracing',
      paragraphs: [
        'Jaeger es un sistema de trazas distribuidas de codigo abierto. Ayuda a monitorear y solucionar problemas en microservicios visualizando flujos de solicitudes y latencia.',
        'Los recursos a continuacion cubren despliegue de Jaeger, instrumentacion, sampling e integracion con OpenTelemetry. Cada guia te ayuda a configurar trazas para aplicaciones cloud-native.',
      ],
    },
  },
  'api-security': {
    en: {
      heading: 'API Security',
      paragraphs: [
        'API security protects interfaces from unauthorized access, data leakage, and abuse. It requires authentication, authorization, input validation, rate limiting, and monitoring.',
        'The resources below cover OAuth, API keys, JWT, TLS, OWASP API Top 10, and attack prevention. Each guide helps you secure APIs against common threats.',
      ],
    },
    es: {
      heading: 'Seguridad de APIs',
      paragraphs: [
        'La seguridad de APIs protege las interfaces contra accesos no autorizados, fugas de datos y abuso. Requiere autenticacion, autorizacion, validacion de entrada, rate limiting y monitoreo.',
        'Los recursos a continuacion cubren OAuth, API keys, JWT, TLS, OWASP API Top 10 y prevencion de ataques. Cada guia te ayuda a asegurar APIs contra amenazas comunes.',
      ],
    },
  },
  privacy: {
    en: {
      heading: 'Privacy and Data Protection',
      paragraphs: [
        'Privacy is the responsible handling of personal and sensitive data. It overlaps with security but also requires transparency, consent, and compliance.',
        'The resources below cover GDPR, data minimization, PII handling, encryption, and privacy by design. Each guide helps you build systems that respect user privacy.',
      ],
    },
    es: {
      heading: 'Privacidad y Proteccion de Datos',
      paragraphs: [
        'La privacidad es el manejo responsable de datos personales y sensibles. Se superpone con la seguridad pero tambien requiere transparencia, consentimiento y cumplimiento.',
        'Los recursos a continuacion cubren GDPR, minimizacion de datos, manejo de PII, cifrado y privacy by design. Cada guia te ayuda a construir sistemas que respeten la privacidad del usuario.',
      ],
    },
  },
  'web-security': {
    en: {
      heading: 'Web Security',
      paragraphs: [
        'Web security protects users, applications, and data from threats that come through browsers and HTTP. It covers a broad set of defenses against common attacks.',
        'The resources below cover HTTPS, CSP, XSS, CSRF, clickjacking, HSTS, and secure cookies. Each guide helps you harden web applications against real-world threats.',
      ],
    },
    es: {
      heading: 'Seguridad Web',
      paragraphs: [
        'La seguridad web protege a usuarios, aplicaciones y datos de amenazas que provienen de navegadores y HTTP. Cubre un amplio conjunto de defensas contra ataques comunes.',
        'Los recursos a continuacion cubren HTTPS, CSP, XSS, CSRF, clickjacking, HSTS y cookies seguras. Cada guia te ayuda a endurecer aplicaciones web contra amenazas del mundo real.',
      ],
    },
  },
  dynamodb: {
    en: {
      heading: 'Amazon DynamoDB',
      paragraphs: [
        'DynamoDB is a fully managed NoSQL database from AWS. It offers fast, predictable performance at any scale but requires careful data modeling and partition design.',
        'The resources below cover table design, partition keys, GSIs, LSIs, streams, and best practices. Each guide helps you use DynamoDB effectively in serverless and microservices.',
      ],
    },
    es: {
      heading: 'Amazon DynamoDB',
      paragraphs: [
        'DynamoDB es una base de datos NoSQL totalmente administrada de AWS. Ofrece rendimiento rapido y predecible a cualquier escala, pero requiere modelado de datos y diseno de particiones cuidadoso.',
        'Los recursos a continuacion cubren diseno de tablas, partition keys, GSIs, LSIs, streams y mejores practicas. Cada guia te ayuda a usar DynamoDB eficientemente en serverless y microservicios.',
      ],
    },
  },
  review: {
    en: {
      heading: 'Code and Design Reviews',
      paragraphs: [
        'Reviews are a quality gate where peers examine code, designs, and plans. They catch defects, spread knowledge, and align the team on standards.',
        'The resources below cover code review checklists, design review processes, async reviews, and constructive feedback. Each guide helps you run reviews that improve code without slowing the team.',
      ],
    },
    es: {
      heading: 'Revisiones de Codigo y Diseno',
      paragraphs: [
        'Las revisiones son una puerta de calidad donde companeros examinan codigo, disenos y planes. Detectan defectos, difunden conocimiento y alinean al equipo en estandares.',
        'Los recursos a continuacion cubren checklists de code review, procesos de design review, revisiones asincronas y feedback constructivo. Cada guia te ayuda a realizar revisiones que mejoren el codigo sin frenar al equipo.',
      ],
    },
  },
  legacy: {
    en: {
      heading: 'Legacy Systems',
      paragraphs: [
        'Legacy systems are existing applications that continue to operate but are hard to change. They require careful modernization, testing, and incremental migration strategies.',
        'The resources below cover strangler fig pattern, refactoring, wrapping, API facades, and risk management. Each guide helps you evolve legacy systems without big-bang rewrites.',
      ],
    },
    es: {
      heading: 'Sistemas Legacy',
      paragraphs: [
        'Los sistemas legacy son aplicaciones existentes que siguen operando pero son dificiles de cambiar. Requieren modernizacion cuidadosa, testing y estrategias de migracion incremental.',
        'Los recursos a continuacion cubren strangler fig pattern, refactoring, wrapping, API facades y gestion de riesgos. Cada guia te ayuda a evolucionar sistemas legacy sin reescrituras big-bang.',
      ],
    },
  },
  monolith: {
    en: {
      heading: 'Monolithic Architectures',
      paragraphs: [
        'A monolith is a single deployable unit that contains all application logic. Monoliths are simple to develop and deploy but can become hard to scale and maintain as they grow.',
        'The resources below cover modular monoliths, migration to microservices, boundaries, and when to keep a monolith. Each guide helps you make informed architectural decisions.',
      ],
    },
    es: {
      heading: 'Arquitecturas Monoliticas',
      paragraphs: [
        'Un monolito es una unidad desplegable unica que contiene toda la logica de la aplicacion. Los monolitos son simples de desarrollar y desplegar pero pueden volverse dificiles de escalar y mantener a medida que crecen.',
        'Los recursos a continuacion cubren monolitos modulares, migracion a microservicios, limites y cuando mantener un monolito. Cada guia te ayuda a tomar decisiones arquitectonicas informadas.',
      ],
    },
  },
  persistence: {
    en: {
      heading: 'Data Persistence',
      paragraphs: [
        'Persistence is how data survives beyond the lifetime of a process. Choosing the right persistence layer affects performance, reliability, and consistency.',
        'The resources below cover databases, ORMs, transactions, caching, event sourcing, and storage patterns. Each guide helps you persist data in a way that matches your application needs.',
      ],
    },
    es: {
      heading: 'Persistencia de Datos',
      paragraphs: [
        'La persistencia es como los datos sobreviven mas alla de la vida de un proceso. Elegir la capa de persistencia correcta afecta rendimiento, confiabilidad y consistencia.',
        'Los recursos a continuacion cubren bases de datos, ORMs, transacciones, caching, event sourcing y patrones de almacenamiento. Cada guia te ayuda a persistir datos de forma adecuada a tus necesidades.',
      ],
    },
  },
  'eventual-consistency': {
    en: {
      heading: 'Eventual Consistency',
      paragraphs: [
        'Eventual consistency means that if no new updates are made, all replicas will converge to the same value. It is a common trade-off in distributed systems.',
        'The resources below cover CAP theorem, conflict resolution, read models, CQRS, and designing for eventual consistency. Each guide explains when and how to use this consistency model.',
      ],
    },
    es: {
      heading: 'Consistencia Eventual',
      paragraphs: [
        'La consistencia eventual significa que si no hay nuevas actualizaciones, todas las replicas convergeran al mismo valor. Es un trade-off comun en sistemas distribuidos.',
        'Los recursos a continuacion cubren teorema CAP, resolucion de conflictos, modelos de lectura, CQRS y diseno para consistencia eventual. Cada guia explica cuando y como usar este modelo de consistencia.',
      ],
    },
  },
  'access-control': {
    en: {
      heading: 'Access Control',
      paragraphs: [
        'Access control determines who can do what in a system. It combines authentication, authorization, roles, and policies to enforce least privilege.',
        'The resources below cover RBAC, ABAC, ACLs, permissions, and zero-trust access. Each guide helps you design access control that is secure and maintainable.',
      ],
    },
    es: {
      heading: 'Control de Acceso',
      paragraphs: [
        'El control de acceso determina quien puede hacer que en un sistema. Combina autenticacion, autorizacion, roles y politicas para imponer el minimo privilegio.',
        'Los recursos a continuacion cubren RBAC, ABAC, ACLs, permisos y acceso de confianza cero. Cada guia te ayuda a disenar control de acceso seguro y mantenible.',
      ],
    },
  },
  'code-review': {
    en: {
      heading: 'Code Review',
      paragraphs: [
        'Code review is a quality practice where peers examine changes before merging. It catches defects, shares knowledge, and maintains team standards.',
        'The resources below cover review checklists, async reviews, constructive feedback, and tooling. Each guide helps you run reviews that improve code quality without blocking the team.',
      ],
    },
    es: {
      heading: 'Revision de Codigo',
      paragraphs: [
        'La revision de codigo es una practica de calidad donde companeros examinan cambios antes de mergear. Detecta defectos, comparte conocimiento y mantiene estandares del equipo.',
        'Los recursos a continuacion cubren checklists de revision, revisiones asincronas, feedback constructivo y herramientas. Cada guia te ayuda a realizar revisiones que mejoran la calidad sin bloquear al equipo.',
      ],
    },
  },
  'pull-request': {
    en: {
      heading: 'Pull Requests',
      paragraphs: [
        'Pull requests are a collaboration mechanism for proposing, reviewing, and merging code changes. They are central to modern Git workflows.',
        'The resources below cover PR templates, review etiquette, CI gates, small PRs, and merge strategies. Each guide helps you use pull requests effectively.',
      ],
    },
    es: {
      heading: 'Pull Requests',
      paragraphs: [
        'Los pull requests son un mecanismo de colaboracion para proponer, revisar y mergear cambios de codigo. Son centrales en los flujos modernos de Git.',
        'Los recursos a continuacion cubren plantillas de PR, etiqueta de revision, gates de CI, PRs pequenos y estrategias de merge. Cada guia te ayuda a usar pull requests efectivamente.',
      ],
    },
  },
  postmortem: {
    en: {
      heading: 'Blameless Postmortems',
      paragraphs: [
        'Postmortems capture what happened during an incident, why it happened, and what to improve. Blameless postmortems focus on learning, not punishment.',
        'The resources below cover timeline reconstruction, root-cause analysis, action items, and blameless culture. Each guide helps you turn incidents into organizational learning.',
      ],
    },
    es: {
      heading: 'Postmortems sin Culpa',
      paragraphs: [
        'Los postmortems capturan que paso durante un incidente, por que paso y que mejorar. Los postmortems sin culpa se enfocan en aprender, no castigar.',
        'Los recursos a continuacion cubren reconstruccion de timeline, analisis de causa raiz, action items y cultura sin culpa. Cada guia te ayuda a convertir incidentes en aprendizaje organizacional.',
      ],
    },
  },
  onboarding: {
    en: {
      heading: 'Engineering Onboarding',
      paragraphs: [
        'Onboarding is the process of integrating new team members and getting them productive. Good onboarding reduces time-to-contribution and improves retention.',
        'The resources below cover onboarding checklists, documentation, mentorship, dev environment setup, and first tasks. Each guide helps you onboard engineers effectively.',
      ],
    },
    es: {
      heading: 'Onboarding de Ingenieria',
      paragraphs: [
        'El onboarding es el proceso de integrar nuevos miembros del equipo y hacerlos productivos. Un buen onboarding reduce el tiempo hasta la contribucion y mejora la retencion.',
        'Los recursos a continuacion cubren checklists de onboarding, documentacion, mentorship, setup de entorno de desarrollo y primeras tareas. Cada guia te ayuda a integrar ingenieros efectivamente.',
      ],
    },
  },
  slo: {
    en: {
      heading: 'Service Level Objectives',
      paragraphs: [
        'SLOs define the target reliability of a service. They connect user expectations to engineering decisions and help balance feature work with reliability.',
        'The resources below cover SLOs, SLIs, SLAs, error budgets, and alert policies. Each guide helps you set reliability targets that are meaningful and actionable.',
      ],
    },
    es: {
      heading: 'Objetivos de Nivel de Servicio',
      paragraphs: [
        'Los SLOs definen la confiabilidad objetivo de un servicio. Conectan las expectativas de los usuarios con decisiones de ingenieria y ayudan a equilibrar trabajo de features con confiabilidad.',
        'Los recursos a continuacion cubren SLOs, SLIs, SLAs, presupuestos de error y politicas de alerta. Cada guia te ayuda a establecer objetivos de confiabilidad significativos y accionables.',
      ],
    },
  },
  maintainability: {
    en: {
      heading: 'Code Maintainability',
      paragraphs: [
        'Maintainable code is easy to understand, change, and test. It reduces the cost of ownership and the risk of introducing bugs.',
        'The resources below cover clean code, refactoring, testing, documentation, and technical debt management. Each guide helps you keep a codebase healthy over time.',
      ],
    },
    es: {
      heading: 'Mantenibilidad del Codigo',
      paragraphs: [
        'El codigo mantenible es facil de entender, cambiar y probar. Reduce el costo de propiedad y el riesgo de introducir errores.',
        'Los recursos a continuacion cubren clean code, refactoring, testing, documentacion y gestion de deuda tecnica. Cada guia te ayuda a mantener un codebase saludable con el tiempo.',
      ],
    },
  },
  agents: {
    en: {
      heading: 'AI Agents',
      paragraphs: [
        'AI agents are systems that use language models to plan, act, and interact with tools or environments. They extend LLMs beyond simple text generation.',
        'The resources below cover agent architecture, tool use, planning, memory, multi-agent systems, and guardrails. Each guide helps you build agents that are useful and safe.',
      ],
    },
    es: {
      heading: 'Agentes de IA',
      paragraphs: [
        'Los agentes de IA son sistemas que usan modelos de lenguaje para planificar, actuar e interactuar con herramientas o entornos. Extienden los LLMs mas alla de la simple generacion de texto.',
        'Los recursos a continuacion cubren arquitectura de agentes, uso de herramientas, planificacion, memoria, sistemas multi-agente y guardrails. Cada guia te ayuda a construir agentes utiles y seguros.',
      ],
    },
  },
  'open-source': {
    en: {
      heading: 'Open Source Software',
      paragraphs: [
        'Open source software is released with a license that allows others to use, modify, and distribute it. Contributing to and consuming open source requires understanding licenses, governance, and communities.',
        'The resources below cover licenses, contribution guidelines, maintainership, security, and dependency management. Each guide helps you work with open source responsibly.',
      ],
    },
    es: {
      heading: 'Software Open Source',
      paragraphs: [
        'El software open source se publica con una licencia que permite a otros usar, modificar y distribuir. Contribuir y consumir open source requiere entender licencias, gobernanza y comunidades.',
        'Los recursos a continuacion cubren licencias, guias de contribucion, mantenimiento, seguridad y gestion de dependencias. Cada guia te ayuda a trabajar con open source de forma responsable.',
      ],
    },
  },
  golang: {
    en: {
      heading: 'Go Programming',
      paragraphs: [
        'Go is a statically typed language designed for concurrency, simplicity, and fast builds. It is widely used for cloud-native tools, microservices, and CLI applications.',
        'The resources below cover Go concurrency, modules, testing, error handling, and standard library patterns. Each recipe helps you write idiomatic Go code.',
      ],
    },
    es: {
      heading: 'Programacion en Go',
      paragraphs: [
        'Go es un lenguaje estaticamente tipado disenado para concurrencia, simplicidad y builds rapidos. Es ampliamente usado para herramientas cloud-native, microservicios y aplicaciones CLI.',
        'Los recursos a continuacion cubren concurrencia en Go, modulos, testing, manejo de errores y patrones de la biblioteca estandar. Cada receta te ayuda a escribir codigo Go idiomatico.',
      ],
    },
  },
  retry: {
    en: {
      heading: 'Retry Strategies',
      paragraphs: [
        'Retry is the practice of re-attempting failed operations. It is essential for transient failures but can make things worse if not bounded.',
        'The resources below cover exponential backoff, jitter, circuit breakers, idempotency, and retry limits. Each guide helps you implement retries that are safe and effective.',
      ],
    },
    es: {
      heading: 'Estrategias de Reintento',
      paragraphs: [
        'El reintento es la practica de volver a intentar operaciones fallidas. Es esencial para fallas transitorias pero puede empeorar las cosas si no esta acotado.',
        'Los recursos a continuacion cubren backoff exponencial, jitter, circuit breakers, idempotencia y limites de reintento. Cada guia te ayuda a implementar reintentos seguros y efectivos.',
      ],
    },
  },
  nginx: {
    en: {
      heading: 'Nginx',
      paragraphs: [
        'Nginx is a high-performance web server, reverse proxy, and load balancer. It is one of the most popular tools for serving and routing HTTP traffic.',
        'The resources below cover configuration, reverse proxy, caching, SSL termination, and load balancing. Each guide helps you use Nginx effectively in production.',
      ],
    },
    es: {
      heading: 'Nginx',
      paragraphs: [
        'Nginx es un servidor web de alto rendimiento, reverse proxy y load balancer. Es una de las herramientas mas populares para servir y enrutar trafico HTTP.',
        'Los recursos a continuacion cubren configuracion, reverse proxy, caching, terminacion SSL y balanceo de carga. Cada guia te ayuda a usar Nginx efectivamente en produccion.',
      ],
    },
  },
  rbac: {
    en: {
      heading: 'Role-Based Access Control',
      paragraphs: [
        'RBAC assigns permissions to roles, and roles to users. It simplifies access management in organizations by grouping privileges by responsibility.',
        'The resources below cover role design, permission hierarchies, groups, and RBAC implementation. Each guide helps you build access control that scales with your team.',
      ],
    },
    es: {
      heading: 'Control de Acceso Basado en Roles',
      paragraphs: [
        'RBAC asigna permisos a roles y roles a usuarios. Simplifica la gestion de acceso en organizaciones agrupando privilegios por responsabilidad.',
        'Los recursos a continuacion cubren diseno de roles, jerarquias de permisos, grupos e implementacion de RBAC. Cada guia te ayuda a construir control de acceso que escala con tu equipo.',
      ],
    },
  },
  tokens: {
    en: {
      heading: 'Security Tokens',
      paragraphs: [
        'Tokens are short-lived credentials used for authentication and authorization. They are central to session management, API access, and single sign-on.',
        'The resources below cover JWT, access tokens, refresh tokens, opaque tokens, and token storage. Each guide helps you use tokens securely.',
      ],
    },
    es: {
      heading: 'Tokens de Seguridad',
      paragraphs: [
        'Los tokens son credenciales de corta duracion usadas para autenticacion y autorizacion. Son centrales en gestion de sesiones, acceso a APIs y single sign-on.',
        'Los recursos a continuacion cubren JWT, access tokens, refresh tokens, tokens opacos y almacenamiento de tokens. Cada guia te ayuda a usar tokens de forma segura.',
      ],
    },
  },
  'cache-invalidation': {
    en: {
      heading: 'Cache Invalidation',
      paragraphs: [
        'Cache invalidation is the process of removing or refreshing stale data. It is one of the hardest problems in caching because it affects consistency.',
        'The resources below cover TTL, write-through, write-around, explicit invalidation, and cache-aside. Each guide helps you keep caches consistent with the source of truth.',
      ],
    },
    es: {
      heading: 'Invalidacion de Cache',
      paragraphs: [
        'La invalidacion de cache es el proceso de eliminar o refrescar datos obsoletos. Es uno de los problemas mas dificiles del caching porque afecta la consistencia.',
        'Los recursos a continuacion cubren TTL, write-through, write-around, invalidacion explicita y cache-aside. Cada guia te ayuda a mantener caches consistentes con la fuente de verdad.',
      ],
    },
  },
  eviction: {
    en: {
      heading: 'Cache Eviction Policies',
      paragraphs: [
        'Eviction policies decide which items to remove when a cache is full. Choosing the right policy affects hit rate and performance.',
        'The resources below cover LRU, LFU, FIFO, TTL, and size-based eviction. Each guide helps you design caches that keep the most valuable data.',
      ],
    },
    es: {
      heading: 'Politicas de Eviction de Cache',
      paragraphs: [
        'Las politicas de eviction deciden que elementos eliminar cuando un cache esta lleno. Elegir la politica correcta afecta la tasa de aciertos y el rendimiento.',
        'Los recursos a continuacion cubren LRU, LFU, FIFO, TTL y eviction basado en tamano. Cada guia te ayuda a disenar caches que mantengan los datos mas valiosos.',
      ],
    },
  },
  'event-loop': {
    en: {
      heading: 'Event Loop',
      paragraphs: [
        'The event loop is the concurrency model behind JavaScript, Node.js, and many asynchronous runtimes. It allows non-blocking I/O by processing events in cycles.',
        'The resources below cover the JavaScript event loop, promises, async/await, timers, and microtasks. Each guide helps you write async code that is correct and efficient.',
      ],
    },
    es: {
      heading: 'Event Loop',
      paragraphs: [
        'El event loop es el modelo de concurrencia detras de JavaScript, Node.js y muchos runtimes asincronos. Permite I/O no bloqueante procesando eventos en ciclos.',
        'Los recursos a continuacion cubren el event loop de JavaScript, promises, async/await, timers y microtasks. Cada guia te ayuda a escribir codigo asincrono correcto y eficiente.',
      ],
    },
  },
  locks: {
    en: {
      heading: 'Locking and Synchronization',
      paragraphs: [
        'Locks protect shared resources in concurrent programs. They prevent races but can introduce deadlocks and contention if used incorrectly.',
        'The resources below cover mutexes, semaphores, read-write locks, optimistic locking, and lock-free structures. Each guide helps you synchronize concurrent access safely.',
      ],
    },
    es: {
      heading: 'Bloqueos y Sincronizacion',
      paragraphs: [
        'Los bloqueos protegen recursos compartidos en programas concurrentes. Previenen carreras pero pueden introducir deadlocks y contencion si se usan incorrectamente.',
        'Los recursos a continuacion cubren mutexes, semaforos, locks de lectura-escritura, locking optimista y estructuras libres de bloqueos. Cada guia te ayuda a sincronizar acceso concurrente de forma segura.',
      ],
    },
  },
  acid: {
    en: {
      heading: 'ACID Transactions',
      paragraphs: [
        'ACID stands for Atomicity, Consistency, Isolation, and Durability. It defines the guarantees of reliable database transactions.',
        'The resources below cover transaction boundaries, isolation levels, commit, rollback, and distributed transactions. Each guide helps you use transactions to maintain data integrity.',
      ],
    },
    es: {
      heading: 'Transacciones ACID',
      paragraphs: [
        'ACID significa Atomicity, Consistency, Isolation y Durability. Define las garantias de las transacciones de bases de datos confiables.',
        'Los recursos a continuacion cubren limites de transaccion, niveles de aislamiento, commit, rollback y transacciones distribuidas. Cada guia te ayuda a usar transacciones para mantener la integridad de datos.',
      ],
    },
  },
  transactions: {
    en: {
      heading: 'Database Transactions',
      paragraphs: [
        'Transactions group database operations into atomic units. They ensure that a set of changes either completes together or rolls back as a unit.',
        'The resources below cover transaction design, isolation, distributed transactions, saga patterns, and compensation. Each guide helps you implement reliable data changes.',
      ],
    },
    es: {
      heading: 'Transacciones de Base de Datos',
      paragraphs: [
        'Las transacciones agrupan operaciones de base de datos en unidades atomicas. Aseguran que un conjunto de cambios se complete junto o se revierta como unidad.',
        'Los recursos a continuacion cubren diseno de transacciones, aislamiento, transacciones distribuidas, patrones saga y compensacion. Cada guia te ayuda a implementar cambios de datos confiables.',
      ],
    },
  },
  'connection-pooling': {
    en: {
      heading: 'Connection Pooling',
      paragraphs: [
        'Connection pooling reuses database connections to reduce the overhead of opening and closing them. It improves performance and resource usage in high-traffic applications.',
        'The resources below cover pool sizing, timeouts, health checks, and implementation in different languages. Each guide helps you configure connection pools for your workload.',
      ],
    },
    es: {
      heading: 'Connection Pooling',
      paragraphs: [
        'El connection pooling reutiliza conexiones de base de datos para reducir el overhead de abrir y cerrarlas. Mejora rendimiento y uso de recursos en aplicaciones de alto trafico.',
        'Los recursos a continuacion cubren tamano de pool, timeouts, health checks e implementacion en diferentes lenguajes. Cada guia te ayuda a configurar pools de conexion para tu carga.',
      ],
    },
  },
  oop: {
    en: {
      heading: 'Object-Oriented Programming',
      paragraphs: [
        'Object-oriented programming organizes code around objects that combine data and behavior. It provides abstractions like encapsulation, inheritance, and polymorphism.',
        'The resources below cover classes, objects, inheritance, composition, polymorphism, and design principles. Each guide helps you use OOP effectively without over-engineering.',
      ],
    },
    es: {
      heading: 'Programacion Orientada a Objetos',
      paragraphs: [
        'La programacion orientada a objetos organiza el codigo alrededor de objetos que combinan datos y comportamiento. Proporciona abstracciones como encapsulamiento, herencia y polimorfismo.',
        'Los recursos a continuacion cubren clases, objetos, herencia, composicion, polimorfismo y principios de diseno. Cada guia te ayuda a usar POO efectivamente sin over-engineering.',
      ],
    },
  },
  'creational-patterns': {
    en: {
      heading: 'Creational Design Patterns',
      paragraphs: [
        'Creational patterns handle object creation mechanisms. They make a system independent of how its objects are created, composed, and represented.',
        'The resources below cover factory, abstract factory, builder, prototype, and singleton. Each guide shows how to create objects in a flexible and reusable way.',
      ],
    },
    es: {
      heading: 'Patrones Creacionales',
      paragraphs: [
        'Los patrones creacionales manejan los mecanismos de creacion de objetos. Hacen un sistema independiente de como se crean, componen y representan sus objetos.',
        'Los recursos a continuacion cubren factory, abstract factory, builder, prototype y singleton. Cada guia muestra como crear objetos de forma flexible y reutilizable.',
      ],
    },
  },
  observer: {
    en: {
      heading: 'Observer Pattern',
      paragraphs: [
        'The observer pattern defines a one-to-many dependency between objects. When one object changes state, all its dependents are notified automatically.',
        'The resources below cover push and pull models, event listeners, publish-subscribe, and reactive patterns. Each guide helps you implement loose coupling between components.',
      ],
    },
    es: {
      heading: 'Patron Observer',
      paragraphs: [
        'El patron observer define una dependencia uno a muchos entre objetos. Cuando un objeto cambia de estado, todos sus dependientes se notifican automaticamente.',
        'Los recursos a continuacion cubren modelos push y pull, event listeners, publish-subscribe y patrones reactivos. Cada guia te ayuda a implementar bajo acoplamiento entre componentes.',
      ],
    },
  },
  singleton: {
    en: {
      heading: 'Singleton Pattern',
      paragraphs: [
        'The singleton pattern ensures a class has only one instance and provides a global point of access. It is useful for shared resources but easy to misuse.',
        'The resources below cover thread-safe singletons, lazy initialization, alternatives, and when to avoid singletons. Each guide helps you decide if a singleton is the right choice.',
      ],
    },
    es: {
      heading: 'Patron Singleton',
      paragraphs: [
        'El patron singleton asegura que una clase tenga solo una instancia y proporciona un punto de acceso global. Es util para recursos compartidos pero facil de malusar.',
        'Los recursos a continuacion cubren singletons thread-safe, lazy initialization, alternativas y cuando evitar singletons. Cada guia te ayuda a decidir si singleton es la eleccion correcta.',
      ],
    },
  },
  alerts: {
    en: {
      heading: 'Alerting and Notifications',
      paragraphs: [
        'Alerting turns observability data into action. Good alerts are actionable, specific, and routed to the right people without creating noise.',
        'The resources below cover alert thresholds, SLO-based alerts, routing, escalation, and runbooks. Each guide helps you build an alerting strategy that people trust.',
      ],
    },
    es: {
      heading: 'Alerting y Notificaciones',
      paragraphs: [
        'El alerting convierte datos de observabilidad en accion. Buenas alertas son accionables, especificas y dirigidas a las personas correctas sin crear ruido.',
        'Los recursos a continuacion cubren umbrales de alerta, alertas basadas en SLO, routing, escalamiento y runbooks. Cada guia te ayuda a construir una estrategia de alertas en la que la gente confie.',
      ],
    },
  },
  'log-aggregation': {
    en: {
      heading: 'Log Aggregation',
      paragraphs: [
        'Log aggregation collects logs from many sources into a central system for searching, analysis, and alerting. It is essential for operating distributed systems.',
        'The resources below cover ELK, Loki, Fluentd, Splunk, and cloud logging services. Each guide helps you centralize logs without losing context.',
      ],
    },
    es: {
      heading: 'Agregacion de Logs',
      paragraphs: [
        'La agregacion de logs recolecta logs de muchas fuentes en un sistema central para busqueda, analisis y alertas. Es esencial para operar sistemas distribuidos.',
        'Los recursos a continuacion cubren ELK, Loki, Fluentd, Splunk y servicios de logging en la nube. Cada guia te ayuda a centralizar logs sin perder contexto.',
      ],
    },
  },
  'feature-flags': {
    en: {
      heading: 'Feature Flags',
      paragraphs: [
        'Feature flags let you change behavior at runtime without deploying code. They enable gradual rollouts, A/B testing, and kill switches.',
        'The resources below cover flag design, lifecycle management, cleanup, and security. Each guide helps you use feature flags safely and avoid technical debt.',
      ],
    },
    es: {
      heading: 'Feature Flags',
      paragraphs: [
        'Los feature flags permiten cambiar comportamiento en runtime sin desplegar codigo. Habilitan rollouts graduales, A/B testing y kill switches.',
        'Los recursos a continuacion cubren diseno de flags, gestion del ciclo de vida, limpieza y seguridad. Cada guia te ayuda a usar feature flags de forma segura y evitar deuda tecnica.',
      ],
    },
  },
  'version-control': {
    en: {
      heading: 'Version Control',
      paragraphs: [
        'Version control tracks changes to code and other files over time. It enables collaboration, history, branching, and safe experimentation.',
        'The resources below cover Git, branching strategies, merge workflows, commit hygiene, and repository organization. Each guide helps you use version control effectively.',
      ],
    },
    es: {
      heading: 'Control de Versiones',
      paragraphs: [
        'El control de versiones rastrea cambios en codigo y otros archivos a lo largo del tiempo. Habilita colaboracion, historial, ramas y experimentacion segura.',
        'Los recursos a continuacion cubren Git, estrategias de branching, flujos de merge, higiene de commits y organizacion de repositorios. Cada guia te ayuda a usar control de versiones efectivamente.',
      ],
    },
  },
  vault: {
    en: {
      heading: 'HashiCorp Vault',
      paragraphs: [
        'Vault is a tool for managing secrets and protecting sensitive data. It provides dynamic secrets, encryption as a service, and identity-based access.',
        'The resources below cover Vault setup, secret engines, policies, PKI, and integration patterns. Each guide helps you manage secrets with Vault in production.',
      ],
    },
    es: {
      heading: 'HashiCorp Vault',
      paragraphs: [
        'Vault es una herramienta para gestionar secretos y proteger datos sensibles. Proporciona secretos dinamicos, cifrado como servicio y acceso basado en identidad.',
        'Los recursos a continuacion cubren setup de Vault, secret engines, politicas, PKI y patrones de integracion. Cada guia te ayuda a gestionar secretos con Vault en produccion.',
      ],
    },
  },
  tls: {
    en: {
      heading: 'TLS and Transport Security',
      paragraphs: [
        'TLS encrypts data in transit between clients and servers. It provides confidentiality, integrity, and authentication for network communication.',
        'The resources below cover certificates, handshake, mTLS, certificate pinning, and TLS configuration. Each guide helps you secure transport layers correctly.',
      ],
    },
    es: {
      heading: 'TLS y Seguridad de Transporte',
      paragraphs: [
        'TLS cifra datos en transito entre clientes y servidores. Proporciona confidencialidad, integridad y autenticacion para comunicacion de red.',
        'Los recursos a continuacion cubren certificados, handshake, mTLS, certificate pinning y configuracion de TLS. Cada guia te ayuda a asegurar capas de transporte correctamente.',
      ],
    },
  },
  s3: {
    en: {
      heading: 'Amazon S3 and Object Storage',
      paragraphs: [
        'S3 is object storage from AWS. It is durable, scalable, and widely used for backups, media, logs, and static website hosting.',
        'The resources below cover buckets, objects, lifecycle policies, IAM, versioning, and performance. Each guide helps you use S3 and object storage effectively.',
      ],
    },
    es: {
      heading: 'Amazon S3 y Almacenamiento de Objetos',
      paragraphs: [
        'S3 es almacenamiento de objetos de AWS. Es durable, escalable y ampliamente usado para backups, media, logs y hosting de sitios estaticos.',
        'Los recursos a continuacion cubren buckets, objetos, politicas de ciclo de vida, IAM, versionado y rendimiento. Cada guia te ayuda a usar S3 y almacenamiento de objetos efectivamente.',
      ],
    },
  },
  firewall: {
    en: {
      heading: 'Firewalls and Network Security',
      paragraphs: [
        'Firewalls control network traffic based on rules. They are a foundational layer of defense against unauthorized access and network attacks.',
        'The resources below cover network firewalls, web application firewalls, cloud security groups, and rule design. Each guide helps you configure firewalls that block threats without blocking business.',
      ],
    },
    es: {
      heading: 'Firewalls y Seguridad de Red',
      paragraphs: [
        'Los firewalls controlan el trafico de red basado en reglas. Son una capa fundamental de defensa contra accesos no autorizados y ataques de red.',
        'Los recursos a continuacion cubren firewalls de red, web application firewalls, security groups en la nube y diseno de reglas. Cada guia te ayuda a configurar firewalls que bloqueen amenazas sin bloquear el negocio.',
      ],
    },
  },
  'container-queries': {
    en: {
      heading: 'CSS Container Queries',
      paragraphs: [
        'Container queries allow components to respond to the size of their container rather than the viewport. They enable truly reusable and responsive components.',
        'The resources below cover container query syntax, container types, use cases, and progressive enhancement. Each guide helps you build components that adapt to their context.',
      ],
    },
    es: {
      heading: 'Container Queries en CSS',
      paragraphs: [
        'Las container queries permiten que los componentes respondan al tamano de su contenedor en lugar del viewport. Habilitan componentes realmente reusables y responsive.',
        'Los recursos a continuacion cubren sintaxis de container queries, tipos de contenedor, casos de uso y mejora progresiva. Cada guia te ayuda a construir componentes que se adaptan a su contexto.',
      ],
    },
  },
  reactive: {
    en: {
      heading: 'Reactive Programming',
      paragraphs: [
        'Reactive programming models data and events as streams. It is the foundation of frameworks like RxJS, React, and many modern UI and backend systems.',
        'The resources below cover observables, operators, backpressure, and reactive streams. Each guide helps you build systems that respond to change predictably.',
      ],
    },
    es: {
      heading: 'Programacion Reactiva',
      paragraphs: [
        'La programacion reactiva modela datos y eventos como streams. Es la base de frameworks como RxJS, React y muchos sistemas UI y backend modernos.',
        'Los recursos a continuacion cubren observables, operadores, backpressure y reactive streams. Cada guia te ayuda a construir sistemas que responden al cambio de forma predecible.',
      ],
    },
  },
  'dead-letter-queue': {
    en: {
      heading: 'Dead Letter Queues',
      paragraphs: [
        'Dead letter queues store messages that cannot be processed successfully. They prevent poison messages from blocking the main queue and enable later inspection.',
        'The resources below cover DLQ design, retry policies, monitoring, and reprocessing. Each guide helps you build resilient messaging systems.',
      ],
    },
    es: {
      heading: 'Dead Letter Queues',
      paragraphs: [
        'Las dead letter queues almacenan mensajes que no pueden procesarse correctamente. Evitan que mensajes envenenados bloqueen la cola principal y permiten inspeccion posterior.',
        'Los recursos a continuacion cubren diseno de DLQ, politicas de reintento, monitoreo y reprocesamiento. Cada guia te ayuda a construir sistemas de mensajeria resilientes.',
      ],
    },
  },
  benchmarks: {
    en: {
      heading: 'Benchmarking',
      paragraphs: [
        'Benchmarking measures the performance of code or systems under controlled conditions. It provides objective data for optimization decisions.',
        'The resources below cover microbenchmarks, load testing, latency benchmarks, and statistical rigor. Each guide helps you measure performance accurately and avoid common pitfalls.',
      ],
    },
    es: {
      heading: 'Benchmarking',
      paragraphs: [
        'El benchmarking mide el rendimiento de codigo o sistemas bajo condiciones controladas. Proporciona datos objetivos para decisiones de optimizacion.',
        'Los recursos a continuacion cubren microbenchmarks, load testing, benchmarks de latencia y rigor estadistico. Cada guia te ayuda a medir rendimiento con precision y evitar errores comunes.',
      ],
    },
  },
  xss: {
    en: {
      heading: 'Cross-Site Scripting',
      paragraphs: [
        'XSS is a web security vulnerability that lets attackers inject malicious scripts into pages viewed by other users. It is one of the most common web attacks.',
        'The resources below cover stored, reflected, and DOM-based XSS, sanitization, CSP, and escaping. Each guide helps you prevent XSS in applications and templates.',
      ],
    },
    es: {
      heading: 'Cross-Site Scripting',
      paragraphs: [
        'XSS es una vulnerabilidad de seguridad web que permite a atacantes inyectar scripts maliciosos en paginas vistas por otros usuarios. Es uno de los ataques web mas comunes.',
        'Los recursos a continuacion cubren XSS almacenado, reflejado y basado en DOM, sanitizacion, CSP y escaping. Cada guia te ayuda a prevenir XSS en aplicaciones y templates.',
      ],
    },
  },
  nosql: {
    en: {
      heading: 'NoSQL Databases',
      paragraphs: [
        'NoSQL databases provide flexible data models and horizontal scalability. They include document, key-value, wide-column, and graph databases.',
        'The resources below cover MongoDB, DynamoDB, Cassandra, Redis, and Neo4j. Each guide helps you choose and use the right NoSQL database for your workload.',
      ],
    },
    es: {
      heading: 'Bases de Datos NoSQL',
      paragraphs: [
        'Las bases de datos NoSQL proporcionan modelos de datos flexibles y escalabilidad horizontal. Incluyen documentos, key-value, wide-column y grafos.',
        'Los recursos a continuacion cubren MongoDB, DynamoDB, Cassandra, Redis y Neo4j. Cada guia te ayuda a elegir y usar la base NoSQL correcta para tu carga.',
      ],
    },
  },
  sqs: {
    en: {
      heading: 'Amazon SQS',
      paragraphs: [
        'Amazon SQS is a managed message queue service. It decouples components and enables reliable asynchronous communication at scale.',
        'The resources below cover standard vs FIFO queues, visibility timeout, dead-letter queues, and integration with Lambda. Each guide helps you build reliable queues on AWS.',
      ],
    },
    es: {
      heading: 'Amazon SQS',
      paragraphs: [
        'Amazon SQS es un servicio de colas de mensajes administrado. Desacopla componentes y habilita comunicacion asincrona confiable a escala.',
        'Los recursos a continuacion cubren colas standard vs FIFO, visibility timeout, dead-letter queues e integracion con Lambda. Cada guia te ayuda a construir colas confiables en AWS.',
      ],
    },
  },
  hypothesis: {
    en: {
      heading: 'Property-Based Testing',
      paragraphs: [
        'Property-based testing generates many random inputs to check that properties hold. Hypothesis is the leading library for property-based testing in Python.',
        'The resources below cover strategies, invariants, shrinking, and stateful testing. Each guide helps you find edge cases that example-based tests miss.',
      ],
    },
    es: {
      heading: 'Property-Based Testing',
      paragraphs: [
        'El property-based testing genera muchas entradas aleatorias para verificar que propiedades se cumplen. Hypothesis es la biblioteca lider para testing basado en propiedades en Python.',
        'Los recursos a continuacion cubren estrategias, invariantes, shrinking y testing stateful. Cada guia te ayuda a encontrar casos limite que los tests basados en ejemplos omiten.',
      ],
    },
  },
  tdd: {
    en: {
      heading: 'Test-Driven Development',
      paragraphs: [
        'TDD is the practice of writing tests before code. It drives design, improves confidence, and creates a fast feedback loop for developers.',
        'The resources below cover red-green-refactor, unit testing, acceptance TDD, and common mistakes. Each guide helps you adopt TDD effectively.',
      ],
    },
    es: {
      heading: 'Test-Driven Development',
      paragraphs: [
        'TDD es la practica de escribir tests antes que codigo. Impulsa el diseno, mejora la confianza y crea un ciclo de feedback rapido para desarrolladores.',
        'Los recursos a continuacion cubren red-green-refactor, pruebas unitarias, acceptance TDD y errores comunes. Cada guia te ayuda a adoptar TDD efectivamente.',
      ],
    },
  },
  coverage: {
    en: {
      heading: 'Test Coverage',
      paragraphs: [
        'Test coverage measures how much code is exercised by tests. It is a useful signal but not a guarantee of quality.',
        'The resources below cover line, branch, and mutation coverage, coverage targets, and anti-patterns. Each guide helps you use coverage as a tool, not a goal.',
      ],
    },
    es: {
      heading: 'Cobertura de Tests',
      paragraphs: [
        'La cobertura de tests mide cuanto codigo es ejercido por las pruebas. Es una senal util pero no una garantia de calidad.',
        'Los recursos a continuacion cubren cobertura de linea, branch y mutation, objetivos de cobertura y anti-patrones. Cada guia te ayuda a usar la cobertura como herramienta, no como meta.',
      ],
    },
  },
  fixtures: {
    en: {
      heading: 'Test Fixtures',
      paragraphs: [
        'Fixtures provide consistent, reusable test data and environment setup. They reduce duplication and make tests more reliable.',
        'The resources below cover setup and teardown, dependency injection, factory fixtures, and mocking. Each guide helps you build test fixtures that are easy to maintain.',
      ],
    },
    es: {
      heading: 'Fixtures de Tests',
      paragraphs: [
        'Las fixtures proporcionan datos de prueba consistentes y configuracion reusable del entorno. Reducen duplicacion y hacen los tests mas confiables.',
        'Los recursos a continuacion cubren setup y teardown, inyeccion de dependencias, factory fixtures y mocking. Cada guia te ayuda a construir fixtures de test faciles de mantener.',
      ],
    },
  },
  'data-driven': {
    en: {
      heading: 'Data-Driven Testing',
      paragraphs: [
        'Data-driven testing separates test logic from test data. The same test runs against many input and expected-output pairs.',
        'The resources below cover parametrization, CSV-driven tests, property-based testing, and fixture combinations. Each guide helps you scale test suites without duplicating code.',
      ],
    },
    es: {
      heading: 'Testing Data-Driven',
      paragraphs: [
        'El testing data-driven separa la logica de test de los datos de prueba. El mismo test se ejecuta contra muchos pares de entrada y salida esperada.',
        'Los recursos a continuacion cubren parametrizacion, tests con CSV, property-based testing y combinaciones de fixtures. Cada guia te ayuda a escalar suites de test sin duplicar codigo.',
      ],
    },
  },
  idempotency: {
    en: {
      heading: 'Idempotency',
      paragraphs: [
        'Idempotency means that performing an operation multiple times has the same effect as performing it once. It is essential for retries, webhooks, and distributed systems.',
        'The resources below cover idempotent APIs, keys, retries, and state machines. Each guide helps you design operations that are safe to repeat.',
      ],
    },
    es: {
      heading: 'Idempotencia',
      paragraphs: [
        'La idempotencia significa que realizar una operacion multiples veces tiene el mismo efecto que realizarla una vez. Es esencial para reintentos, webhooks y sistemas distribuidos.',
        'Los recursos a continuacion cubren APIs idempotentes, keys, reintentos y maquinas de estado. Cada guia te ayuda a disenar operaciones seguras de repetir.',
      ],
    },
  },
  'data-quality': {
    en: {
      heading: 'Data Quality',
      paragraphs: [
        'Data quality ensures that data is accurate, complete, consistent, and fit for use. Poor data quality leads to bad decisions and unreliable systems.',
        'The resources below cover validation, profiling, cleansing, monitoring, and data quality frameworks. Each guide helps you build systems that trust their data.',
      ],
    },
    es: {
      heading: 'Calidad de Datos',
      paragraphs: [
        'La calidad de datos asegura que los datos sean precisos, completos, consistentes y adecuados para su uso. La mala calidad conduce a malas decisiones y sistemas poco confiables.',
        'Los recursos a continuacion cubren validacion, profiling, limpieza, monitoreo y frameworks de calidad de datos. Cada guia te ayuda a construir sistemas que confien en sus datos.',
      ],
    },
  },
  release: {
    en: {
      heading: 'Release Management',
      paragraphs: [
        'Release management is the process of planning, scheduling, and deploying software changes. It coordinates code, artifacts, approvals, and communication.',
        'The resources below cover release pipelines, versioning, release notes, rollback, and cadence. Each guide helps you ship changes predictably and safely.',
      ],
    },
    es: {
      heading: 'Gestion de Releases',
      paragraphs: [
        'La gestion de releases es el proceso de planificar, programar y desplegar cambios de software. Coordina codigo, artefactos, aprobaciones y comunicacion.',
        'Los recursos a continuacion cubren pipelines de release, versionado, release notes, rollback y cadencia. Cada guia te ayuda a entregar cambios de forma predecible y segura.',
      ],
    },
  },
  canary: {
    en: {
      heading: 'Canary Deployments',
      paragraphs: [
        'Canary deployments roll out changes to a small subset of users before full release. They reduce the blast radius of bad deployments and provide early feedback.',
        'The resources below cover canary analysis, traffic splitting, metrics, rollback, and feature flags. Each guide helps you release with confidence.',
      ],
    },
    es: {
      heading: 'Despliegues Canary',
      paragraphs: [
        'Los despliegues canary lanzan cambios a un pequeno subconjunto de usuarios antes del release completo. Reducen el radio de impacto de malos despliegues y proporcionan feedback temprano.',
        'Los recursos a continuacion cubren analisis canary, division de trafico, metricas, rollback y feature flags. Cada guia te ayuda a lanzar con confianza.',
      ],
    },
  },
  rollout: {
    en: {
      heading: 'Gradual Rollouts',
      paragraphs: [
        'Gradual rollouts release changes incrementally to larger audiences. They balance speed and safety by validating behavior at each stage.',
        'The resources below cover percentage rollouts, rings, feature flags, monitoring, and promotion. Each guide helps you expand releases without losing control.',
      ],
    },
    es: {
      heading: 'Rollouts Graduales',
      paragraphs: [
        'Los rollouts graduales liberan cambios incrementalmente a audiencias mas grandes. Equilibran velocidad y seguridad validando el comportamiento en cada etapa.',
        'Los recursos a continuacion cubren rollouts por porcentaje, anillos, feature flags, monitoreo y promocion. Cada guia te ayuda a expandir releases sin perder control.',
      ],
    },
  },
  saga: {
    en: {
      heading: 'Saga Pattern',
      paragraphs: [
        'The saga pattern manages long-running transactions by breaking them into a sequence of local transactions. If one step fails, compensating actions undo previous steps.',
        'The resources below cover choreography, orchestration, compensation, and saga implementation. Each guide helps you build reliable distributed transactions.',
      ],
    },
    es: {
      heading: 'Patron Saga',
      paragraphs: [
        'El patron saga gestiona transacciones de larga duracion dividiendolas en una secuencia de transacciones locales. Si un paso falla, acciones compensatorias deshacen pasos anteriores.',
        'Los recursos a continuacion cubren coreografia, orquestacion, compensacion e implementacion de sagas. Cada guia te ayuda a construir transacciones distribuidas confiables.',
      ],
    },
  },
  mvc: {
    en: {
      heading: 'Model-View-Controller',
      paragraphs: [
        'MVC separates an application into three components: model, view, and controller. It improves organization and testability by separating concerns.',
        'The resources below cover MVC implementation, routing, templates, and common variations. Each guide helps you use MVC to build maintainable applications.',
      ],
    },
    es: {
      heading: 'Modelo-Vista-Controlador',
      paragraphs: [
        'MVC separa una aplicacion en tres componentes: modelo, vista y controlador. Mejora la organizacion y testeabilidad separando responsabilidades.',
        'Los recursos a continuacion cubren implementacion de MVC, routing, templates y variaciones comunes. Cada guia te ayuda a usar MVC para construir aplicaciones mantenibles.',
      ],
    },
  },
  'load-balancing': {
    en: {
      heading: 'Load Balancing',
      paragraphs: [
        'Load balancing distributes traffic across multiple servers. It improves availability, scalability, and response times by preventing any single server from becoming a bottleneck.',
        'The resources below cover round-robin, least connections, health checks, global load balancing, and layer 4 vs layer 7. Each guide helps you design effective traffic distribution.',
      ],
    },
    es: {
      heading: 'Balanceo de Carga',
      paragraphs: [
        'El balanceo de carga distribuye trafico entre multiples servidores. Mejora disponibilidad, escalabilidad y tiempos de respuesta evitando que un solo servidor sea un cuello de botella.',
        'Los recursos a continuacion cubren round-robin, least connections, health checks, global load balancing y capa 4 vs capa 7. Cada guia te ayuda a disenar distribucion de trafico efectiva.',
      ],
    },
  },
  'clean-code': {
    en: {
      heading: 'Clean Code',
      paragraphs: [
        'Clean code is code that is easy to read, understand, and change. It emphasizes clarity, simplicity, and disciplined naming.',
        'The resources below cover naming, functions, comments, error handling, and refactoring. Each guide helps you write code that others can maintain with confidence.',
      ],
    },
    es: {
      heading: 'Codigo Limpio',
      paragraphs: [
        'El codigo limpio es codigo facil de leer, entender y cambiar. Enfatiza claridad, simplicidad y nomenclatura disciplinada.',
        'Los recursos a continuacion cubren nombres, funciones, comentarios, manejo de errores y refactoring. Cada guia te ayuda a escribir codigo que otros puedan mantener con confianza.',
      ],
    },
  },
  accessibility: {
    en: {
      heading: 'Web Accessibility',
      paragraphs: [
        'Accessibility ensures that websites and applications can be used by people with disabilities. It is a legal, ethical, and business imperative.',
        'The resources below cover WCAG, semantic HTML, ARIA, keyboard navigation, screen readers, and color contrast. Each guide helps you build inclusive experiences.',
      ],
    },
    es: {
      heading: 'Accesibilidad Web',
      paragraphs: [
        'La accesibilidad asegura que sitios y aplicaciones puedan ser usados por personas con discapacidades. Es un imperativo legal, etico y de negocio.',
        'Los recursos a continuacion cubren WCAG, HTML semantico, ARIA, navegacion por teclado, lectores de pantalla y contraste de color. Cada guia te ayuda a construir experiencias inclusivas.',
      ],
    },
  },
  subgraph: {
    en: {
      heading: 'GraphQL Subgraphs',
      paragraphs: [
        'A subgraph is a GraphQL service that contributes part of a federated graph. Federation lets teams own domain-specific schemas while exposing a unified API.',
        'The resources below cover Apollo Federation, subgraph design, entities, resolvers, and schema composition. Each guide helps you build modular GraphQL architectures.',
      ],
    },
    es: {
      heading: 'Subgrafos GraphQL',
      paragraphs: [
        'Un subgraph es un servicio GraphQL que contribuye con parte de un grafo federado. La federacion permite a equipos poseer esquemas de dominio especifico mientras exponen una API unificada.',
        'Los recursos a continuacion cubren Apollo Federation, diseno de subgraphs, entidades, resolvers y composicion de esquemas. Cada guia te ayuda a construir arquitecturas GraphQL modulares.',
      ],
    },
  },
  'read-model': {
    en: {
      heading: 'Read Models and Projections',
      paragraphs: [
        'Read models are optimized views of data built for specific query patterns. They separate read concerns from write concerns in CQRS and event sourcing.',
        'The resources below cover projections, denormalization, materialized views, and read model updates. Each guide helps you query data efficiently without hitting the write model.',
      ],
    },
    es: {
      heading: 'Modelos de Lectura y Proyecciones',
      paragraphs: [
        'Los modelos de lectura son vistas optimizadas de datos construidas para patrones de consulta especificos. Separan las preocupaciones de lectura de las de escritura en CQRS y event sourcing.',
        'Los recursos a continuacion cubren proyecciones, desnormalizacion, vistas materializadas y actualizacion de modelos de lectura. Cada guia te ayuda a consultar datos eficientemente sin tocar el modelo de escritura.',
      ],
    },
  },
  availability: {
    en: {
      heading: 'High Availability',
      paragraphs: [
        'Availability is the proportion of time a system is operational and accessible. High availability requires redundancy, failover, and fast recovery.',
        'The resources below cover SLAs, redundancy, health checks, failover, and disaster recovery. Each guide helps you build systems that stay up when things go wrong.',
      ],
    },
    es: {
      heading: 'Alta Disponibilidad',
      paragraphs: [
        'La disponibilidad es la proporcion de tiempo que un sistema esta operativo y accesible. La alta disponibilidad requiere redundancia, failover y recuperacion rapida.',
        'Los recursos a continuacion cubren SLAs, redundancia, health checks, failover y recuperacion ante desastres. Cada guia te ayuda a construir sistemas que permanecen activos cuando las cosas salen mal.',
      ],
    },
  },
  certificates: {
    en: {
      heading: 'Digital Certificates',
      paragraphs: [
        'Digital certificates bind a public key to an identity. They are the foundation of TLS, code signing, and many authentication protocols.',
        'The resources below cover X.509, certificate authorities, issuance, rotation, and validation. Each guide helps you manage certificates in your infrastructure.',
      ],
    },
    es: {
      heading: 'Certificados Digitales',
      paragraphs: [
        'Los certificados digitales vinculan una clave publica a una identidad. Son la base de TLS, firma de codigo y muchos protocolos de autenticacion.',
        'Los recursos a continuacion cubren X.509, autoridades de certificacion, emision, rotacion y validacion. Cada guia te ayuda a gestionar certificados en tu infraestructura.',
      ],
    },
  },
  replication: {
    en: {
      heading: 'Data Replication',
      paragraphs: [
        'Replication copies data across multiple nodes to improve availability, durability, and read performance. It introduces consistency and conflict challenges.',
        'The resources below cover leader-follower, multi-leader, synchronous, and asynchronous replication. Each guide helps you choose a replication strategy for your needs.',
      ],
    },
    es: {
      heading: 'Replicacion de Datos',
      paragraphs: [
        'La replicacion copia datos entre multiples nodos para mejorar disponibilidad, durabilidad y rendimiento de lectura. Introduce desafios de consistencia y conflictos.',
        'Los recursos a continuacion cubren leader-follower, multi-leader, replicacion sincrona y asincrona. Cada guia te ayuda a elegir una estrategia de replicacion para tus necesidades.',
      ],
    },
  },
  'error-budget': {
    en: {
      heading: 'Error Budgets',
      paragraphs: [
        'An error budget is the acceptable amount of unreliability before SLOs are violated. It helps balance innovation and reliability by giving teams room to take risks.',
        'The resources below cover budget calculation, burn rate alerts, freezing releases, and policy. Each guide helps you use error budgets to make better trade-offs.',
      ],
    },
    es: {
      heading: 'Presupuestos de Error',
      paragraphs: [
        'Un presupuesto de error es la cantidad aceptable de falta de confiabilidad antes de violar SLOs. Ayuda a equilibrar innovacion y confiabilidad dando a los equipos margen para asumir riesgos.',
        'Los recursos a continuacion cubren calculo de presupuestos, alertas de burn rate, congelamiento de releases y politicas. Cada guia te ayuda a usar presupuestos de error para mejores trade-offs.',
      ],
    },
  },
  remediation: {
    en: {
      heading: 'Security Remediation',
      paragraphs: [
        'Remediation is the process of fixing identified security issues. It requires prioritization, validation, and verification that the fix works.',
        'The resources below cover vulnerability patching, configuration hardening, code fixes, and validation. Each guide helps you close security gaps effectively.',
      ],
    },
    es: {
      heading: 'Remediacion de Seguridad',
      paragraphs: [
        'La remediacion es el proceso de corregir problemas de seguridad identificados. Requiere priorizacion, validacion y verificacion de que la solucion funciona.',
        'Los recursos a continuacion cubren parcheo de vulnerabilidades, endurecimiento de configuracion, correcciones de codigo y validacion. Cada guia te ayuda a cerrar brechas de seguridad efectivamente.',
      ],
    },
  },
  loki: {
    en: {
      heading: 'Grafana Loki',
      paragraphs: [
        'Loki is a log aggregation system designed to be cost-effective and easy to operate. It indexes labels rather than full log text, making it cheaper at scale.',
        'The resources below cover Loki setup, Promtail, LogQL, retention, and Grafana integration. Each guide helps you aggregate logs without the cost of traditional solutions.',
      ],
    },
    es: {
      heading: 'Grafana Loki',
      paragraphs: [
        'Loki es un sistema de agregacion de logs disenado para ser rentable y facil de operar. Indexa etiquetas en lugar de texto completo, haciendolo mas barato a escala.',
        'Los recursos a continuacion cubren setup de Loki, Promtail, LogQL, retencion e integracion con Grafana. Cada guia te ayuda a agregar logs sin el costo de soluciones tradicionales.',
      ],
    },
  },
  'load-testing': {
    en: {
      heading: 'Load Testing',
      paragraphs: [
        'Load testing evaluates how a system behaves under expected or extreme load. It identifies bottlenecks, capacity limits, and failure modes before production.',
        'The resources below cover tools, scenarios, metrics, ramp-up strategies, and result analysis. Each guide helps you validate that your system can handle real traffic.',
      ],
    },
    es: {
      heading: 'Pruebas de Carga',
      paragraphs: [
        'Las pruebas de carga evaluan como se comporta un sistema bajo carga esperada o extrema. Identifican cuellos de botella, limites de capacidad y modos de falla antes de produccion.',
        'Los recursos a continuacion cubren herramientas, escenarios, metricas, estrategias de ramp-up y analisis de resultados. Cada guia te ayuda a validar que tu sistema puede manejar trafico real.',
      ],
    },
  },
  hardening: {
    en: {
      heading: 'Security Hardening',
      paragraphs: [
        'Hardening reduces the attack surface of systems, applications, and configurations. It involves removing unnecessary features, applying patches, and enforcing secure defaults.',
        'The resources below cover OS hardening, container hardening, network hardening, and application hardening. Each guide helps you make systems more resistant to attacks.',
      ],
    },
    es: {
      heading: 'Endurecimiento de Seguridad',
      paragraphs: [
        'El endurecimiento reduce la superficie de ataque de sistemas, aplicaciones y configuraciones. Implica eliminar caracteristicas innecesarias, aplicar parches y hacer cumplir valores seguros por defecto.',
        'Los recursos a continuacion cubren endurecimiento de SO, contenedores, red y aplicaciones. Cada guia te ayuda a hacer sistemas mas resistentes a ataques.',
      ],
    },
  },
  'cloud-costs': {
    en: {
      heading: 'Cloud Cost Management',
      paragraphs: [
        'Cloud cost management optimizes spending on cloud resources. It requires visibility, budgeting, right-sizing, and continuous review.',
        'The resources below cover cost monitoring, reserved instances, spot, tagging, and FinOps. Each guide helps you control cloud costs without sacrificing performance.',
      ],
    },
    es: {
      heading: 'Gestion de Costos en la Nube',
      paragraphs: [
        'La gestion de costos en la nube optimiza el gasto en recursos cloud. Requiere visibilidad, presupuestos, right-sizing y revision continua.',
        'Los recursos a continuacion cubren monitoreo de costos, reserved instances, spot, tagging y FinOps. Cada guia te ayuda a controlar costos cloud sin sacrificar rendimiento.',
      ],
    },
  },
  'capacity-planning': {
    en: {
      heading: 'Capacity Planning',
      paragraphs: [
        'Capacity planning ensures that systems have enough resources to meet demand. It balances availability, performance, and cost by forecasting and scaling.',
        'The resources below cover demand forecasting, headroom, scaling strategies, and cost trade-offs. Each guide helps you plan capacity before growth becomes a problem.',
      ],
    },
    es: {
      heading: 'Planificacion de Capacidad',
      paragraphs: [
        'La planificacion de capacidad asegura que los sistemas tengan recursos suficientes para satisfacer la demanda. Equilibra disponibilidad, rendimiento y costo mediante pronostico y escalado.',
        'Los recursos a continuacion cubren pronostico de demanda, margen, estrategias de escalado y trade-offs de costo. Cada guia te ayuda a planificar capacidad antes de que el crecimiento sea un problema.',
      ],
    },
  },
  finops: {
    en: {
      heading: 'FinOps',
      paragraphs: [
        'FinOps is a practice that brings financial accountability to cloud spending. It connects engineering, finance, and business teams to optimize cloud value.',
        'The resources below cover cost allocation, showback, chargeback, unit economics, and cloud financial management. Each guide helps you build a FinOps culture.',
      ],
    },
    es: {
      heading: 'FinOps',
      paragraphs: [
        'FinOps es una practica que trae responsabilidad financiera al gasto en la nube. Conecta equipos de ingenieria, finanzas y negocio para optimizar el valor del cloud.',
        'Los recursos a continuacion cubren asignacion de costos, showback, chargeback, economia unitaria y gestion financiera de la nube. Cada guia te ayuda a construir una cultura FinOps.',
      ],
    },
  },
  sla: {
    en: {
      heading: 'Service Level Agreements',
      paragraphs: [
        'SLAs are formal commitments about service availability, performance, or support. They define consequences for non-compliance and set customer expectations.',
        'The resources below cover SLA design, SLOs, SLIs, penalties, and communication. Each guide helps you create agreements that are realistic and enforceable.',
      ],
    },
    es: {
      heading: 'Acuerdos de Nivel de Servicio',
      paragraphs: [
        'Los SLA son compromisos formales sobre disponibilidad, rendimiento o soporte de un servicio. Definen consecuencias por incumplimiento y establecen expectativas del cliente.',
        'Los recursos a continuacion cubren diseno de SLA, SLOs, SLIs, penalizaciones y comunicacion. Cada guia te ayuda a crear acuerdos realistas y exigibles.',
      ],
    },
  },
  'prompt-engineering': {
    en: {
      heading: 'Prompt Engineering',
      paragraphs: [
        'Prompt engineering is the practice of designing inputs to LLMs to get useful, accurate, and safe outputs. It is central to building applications with language models.',
        'The resources below cover zero-shot, few-shot, chain-of-thought, structured output, and prompt templates. Each guide helps you write prompts that produce reliable results.',
      ],
    },
    es: {
      heading: 'Prompt Engineering',
      paragraphs: [
        'El prompt engineering es la practica de disenar entradas para LLMs para obtener salidas utiles, precisas y seguras. Es central para construir aplicaciones con modelos de lenguaje.',
        'Los recursos a continuacion cubren zero-shot, few-shot, chain-of-thought, salida estructurada y plantillas de prompt. Cada guia te ayuda a escribir prompts que produzcan resultados confiables.',
      ],
    },
  },
  'state-machine': {
    en: {
      heading: 'State Machines',
      paragraphs: [
        'A state machine models behavior as a set of states, events, and transitions. It makes complex logic explicit and easier to reason about.',
        'The resources below cover finite state machines, statecharts, workflow design, and implementation patterns. Each guide helps you model behavior that is predictable and testable.',
      ],
    },
    es: {
      heading: 'Maquinas de Estado',
      paragraphs: [
        'Una maquina de estado modela el comportamiento como un conjunto de estados, eventos y transiciones. Hace que la logica compleja sea explicita y mas facil de razonar.',
        'Los recursos a continuacion cubren finite state machines, statecharts, diseno de workflows y patrones de implementacion. Cada guia te ayuda a modelar comportamiento predecible y testeable.',
      ],
    },
  },
  'ai-agents': {
    en: {
      heading: 'AI Agents and Agentic Systems',
      paragraphs: [
        'AI agents are systems that perceive, reason, and act autonomously. They extend language models with tools, planning, and memory.',
        'The resources below cover agent loops, tool use, planning, multi-agent systems, and guardrails. Each guide helps you build agents that are useful, safe, and reliable.',
      ],
    },
    es: {
      heading: 'Agentes de IA y Sistemas Agénticos',
      paragraphs: [
        'Los agentes de IA son sistemas que perciben, razonan y actuan de forma autonoma. Extienden modelos de lenguaje con herramientas, planificacion y memoria.',
        'Los recursos a continuacion cubren loops de agentes, uso de herramientas, planificacion, sistemas multi-agente y guardrails. Cada guia te ayuda a construir agentes utiles, seguros y confiables.',
      ],
    },
  },
  nlp: {
    en: {
      heading: 'Natural Language Processing',
      paragraphs: [
        'NLP enables computers to understand, interpret, and generate human language. It powers search, chatbots, translation, and many AI applications.',
        'The resources below cover tokenization, embeddings, named entity recognition, sentiment analysis, and transformers. Each guide helps you apply NLP to real problems.',
      ],
    },
    es: {
      heading: 'Procesamiento de Lenguaje Natural',
      paragraphs: [
        'El NLP permite a las computadoras entender, interpretar y generar lenguaje humano. Potencia busqueda, chatbots, traduccion y muchas aplicaciones de IA.',
        'Los recursos a continuacion cubren tokenizacion, embeddings, reconocimiento de entidades, analisis de sentimiento y transformers. Cada guia te ayuda a aplicar NLP a problemas reales.',
      ],
    },
  },
  langchain: {
    en: {
      heading: 'LangChain',
      paragraphs: [
        'LangChain is a framework for building applications with language models. It provides abstractions for chains, agents, tools, and memory.',
        'The resources below cover LangChain chains, agents, prompts, vector stores, and RAG. Each guide helps you build LLM applications faster.',
      ],
    },
    es: {
      heading: 'LangChain',
      paragraphs: [
        'LangChain es un framework para construir aplicaciones con modelos de lenguaje. Proporciona abstracciones para chains, agentes, herramientas y memoria.',
        'Los recursos a continuacion cubren chains de LangChain, agentes, prompts, vector stores y RAG. Cada guia te ayuda a construir aplicaciones de LLM mas rapido.',
      ],
    },
  },
  sse: {
    en: {
      heading: 'Server-Sent Events',
      paragraphs: [
        'SSE lets servers push real-time updates to clients over HTTP. It is simpler than WebSockets for one-way streams like feeds and notifications.',
        'The resources below cover SSE protocol, EventSource, reconnection, buffering, and use cases. Each guide helps you implement real-time updates with low complexity.',
      ],
    },
    es: {
      heading: 'Server-Sent Events',
      paragraphs: [
        'SSE permite a los servidores enviar actualizaciones en tiempo real a clientes sobre HTTP. Es mas simple que WebSockets para streams unidireccionales como feeds y notificaciones.',
        'Los recursos a continuacion cubren protocolo SSE, EventSource, reconexion, buffering y casos de uso. Cada guia te ayuda a implementar actualizaciones en tiempo real con baja complejidad.',
      ],
    },
  },
  fastapi: {
    en: {
      heading: 'FastAPI',
      paragraphs: [
        'FastAPI is a modern Python web framework for building APIs. It is fast, type-safe, and auto-generates OpenAPI documentation.',
        'The resources below cover routes, dependency injection, validation, async, and testing with FastAPI. Each guide helps you build Python APIs quickly and correctly.',
      ],
    },
    es: {
      heading: 'FastAPI',
      paragraphs: [
        'FastAPI es un framework web moderno de Python para construir APIs. Es rapido, type-safe y genera automaticamente documentacion OpenAPI.',
        'Los recursos a continuacion cubren rutas, inyeccion de dependencias, validacion, async y testing con FastAPI. Cada guia te ayuda a construir APIs Python rapidas y correctas.',
      ],
    },
  },
  'local-llm': {
    en: {
      heading: 'Local LLMs',
      paragraphs: [
        'Local LLMs run language models on your own hardware. They offer privacy, offline use, and cost control but require optimization for smaller machines.',
        'The resources below cover quantization, Ollama, llama.cpp, local inference, and model selection. Each guide helps you deploy and use local language models.',
      ],
    },
    es: {
      heading: 'LLMs Locales',
      paragraphs: [
        'Los LLMs locales ejecutan modelos de lenguaje en tu propio hardware. Ofrecen privacidad, uso offline y control de costos pero requieren optimizacion para maquinas mas pequenas.',
        'Los recursos a continuacion cubren cuantizacion, Ollama, llama.cpp, inferencia local y seleccion de modelos. Cada guia te ayuda a desplegar y usar modelos de lenguaje locales.',
      ],
    },
  },
  pinecone: {
    en: {
      heading: 'Pinecone and Vector Search',
      paragraphs: [
        'Pinecone is a managed vector database designed for similarity search. It is commonly used for RAG, recommendations, and semantic search.',
        'The resources below cover indexing, metadata, namespaces, hybrid search, and scaling. Each guide helps you build vector search applications with Pinecone.',
      ],
    },
    es: {
      heading: 'Pinecone y Busqueda Vectorial',
      paragraphs: [
        'Pinecone es una base de datos vectorial administrada disenada para busqueda por similitud. Se usa comummente para RAG, recomendaciones y busqueda semantica.',
        'Los recursos a continuacion cubren indexacion, metadata, namespaces, busqueda hibrida y escalado. Cada guia te ayuda a construir aplicaciones de busqueda vectorial con Pinecone.',
      ],
    },
  },
  'vector-database': {
    en: {
      heading: 'Vector Databases',
      paragraphs: [
        'Vector databases store embeddings and enable similarity search. They are essential for RAG, semantic search, and recommendation systems.',
        'The resources below cover Pinecone, Weaviate, Qdrant, Milvus, and pgvector. Each guide helps you choose and use a vector database for your use case.',
      ],
    },
    es: {
      heading: 'Bases de Datos Vectoriales',
      paragraphs: [
        'Las bases de datos vectoriales almacenan embeddings y habilitan busqueda por similitud. Son esenciales para RAG, busqueda semantica y sistemas de recomendacion.',
        'Los recursos a continuacion cubren Pinecone, Weaviate, Qdrant, Milvus y pgvector. Cada guia te ayuda a elegir y usar una base de datos vectorial para tu caso.',
      ],
    },
  },
  'exponential-backoff': {
    en: {
      heading: 'Exponential Backoff',
      paragraphs: [
        'Exponential backoff increases the wait time between retries after failures. It reduces load and gives transient issues time to recover.',
        'The resources below cover implementation, jitter, caps, and integration with retries. Each guide helps you retry failed operations safely.',
      ],
    },
    es: {
      heading: 'Backoff Exponencial',
      paragraphs: [
        'El backoff exponencial aumenta el tiempo de espera entre reintentos despues de fallas. Reduce carga y da tiempo a que problemas transitorios se recuperen.',
        'Los recursos a continuacion cubren implementacion, jitter, limites e integracion con reintentos. Cada guia te ayuda a reintentar operaciones fallidas de forma segura.',
      ],
    },
  },
  'load-balancer': {
    en: {
      heading: 'Load Balancers',
      paragraphs: [
        'Load balancers distribute traffic across multiple backend instances. They are critical for scalability, high availability, and zero-downtime deployments.',
        'The resources below cover Nginx, HAProxy, Envoy, ALBs, NLBs, and health checks. Each guide helps you choose and configure the right load balancer.',
      ],
    },
    es: {
      heading: 'Load Balancers',
      paragraphs: [
        'Los load balancers distribuyen trafico entre multiples instancias backend. Son criticos para escalabilidad, alta disponibilidad y despliegues sin downtime.',
        'Los recursos a continuacion cubren Nginx, HAProxy, Envoy, ALBs, NLBs y health checks. Cada guia te ayuda a elegir y configurar el load balancer correcto.',
      ],
    },
  },
  realtime: {
    en: {
      heading: 'Real-Time Systems',
      paragraphs: [
        'Real-time systems process and deliver data with low latency. They are used in chat, gaming, finance, and live dashboards.',
        'The resources below cover WebSockets, SSE, pub-sub, event streaming, and operational challenges. Each guide helps you build responsive and reliable real-time experiences.',
      ],
    },
    es: {
      heading: 'Sistemas en Tiempo Real',
      paragraphs: [
        'Los sistemas en tiempo real procesan y entregan datos con baja latencia. Se usan en chat, gaming, finanzas y dashboards en vivo.',
        'Los recursos a continuacion cubren WebSockets, SSE, pub-sub, event streaming y desafios operacionales. Cada guia te ayuda a construir experiencias en tiempo real responsivas y confiables.',
      ],
    },
  },
  'dependency-injection': {
    en: {
      heading: 'Dependency Injection',
      paragraphs: [
        'Dependency injection provides objects with the dependencies they need rather than letting them create their own. It improves testability and decoupling.',
        'The resources below cover constructor injection, containers, lifetimes, and frameworks like Spring and Angular. Each guide helps you use DI to build modular applications.',
      ],
    },
    es: {
      heading: 'Inyeccion de Dependencias',
      paragraphs: [
        'La inyeccion de dependencias proporciona a los objetos las dependencias que necesitan en lugar de dejar que las creen. Mejora la testeabilidad y el desacoplamiento.',
        'Los recursos a continuacion cubren constructor injection, containers, lifetimes y frameworks como Spring y Angular. Cada guia te ayuda a usar DI para construir aplicaciones modulares.',
      ],
    },
  },
  istio: {
    en: {
      heading: 'Istio Service Mesh',
      paragraphs: [
        'Istio is an open-source service mesh that adds observability, traffic management, and security to Kubernetes applications without changing code.',
        'The resources below cover sidecars, gateways, mTLS, virtual services, and traffic policies. Each guide helps you operate microservices with Istio.',
      ],
    },
    es: {
      heading: 'Istio Service Mesh',
      paragraphs: [
        'Istio es un service mesh de codigo abierto que agrega observabilidad, gestion de trafico y seguridad a aplicaciones Kubernetes sin cambiar codigo.',
        'Los recursos a continuacion cubren sidecars, gateways, mTLS, virtual services y politicas de trafico. Cada guia te ayuda a operar microservicios con Istio.',
      ],
    },
  },
  bcrypt: {
    en: {
      heading: 'Password Hashing with bcrypt',
      paragraphs: [
        'bcrypt is a password hashing function designed to be slow and resistant to brute force. It is a safe default for storing passwords.',
        'The resources below cover salt, work factor, comparison, and alternatives like Argon2. Each guide helps you hash passwords correctly.',
      ],
    },
    es: {
      heading: 'Hashing de Contrasenas con bcrypt',
      paragraphs: [
        'bcrypt es una funcion de hashing de contrasenas disenada para ser lenta y resistente a fuerza bruta. Es una opcion segura por defecto para almacenar contrasenas.',
        'Los recursos a continuacion cubren salt, work factor, comparacion y alternativas como Argon2. Cada guia te ayuda a hashear contrasenas correctamente.',
      ],
    },
  },
  sso: {
    en: {
      heading: 'Single Sign-On',
      paragraphs: [
        'Single sign-on lets users authenticate once and access multiple applications. It improves security and user experience in enterprise environments.',
        'The resources below cover SAML, OIDC, identity providers, and session management. Each guide helps you implement SSO securely.',
      ],
    },
    es: {
      heading: 'Single Sign-On',
      paragraphs: [
        'El single sign-on permite a los usuarios autenticarse una vez y acceder a multiples aplicaciones. Mejora la seguridad y la experiencia de usuario en entornos empresariales.',
        'Los recursos a continuacion cubren SAML, OIDC, proveedores de identidad y gestion de sesiones. Cada guia te ayuda a implementar SSO de forma segura.',
      ],
    },
  },
  cloudflare: {
    en: {
      heading: 'Cloudflare',
      paragraphs: [
        'Cloudflare provides CDN, DDoS protection, DNS, and edge computing. It sits between users and your infrastructure to improve security and performance.',
        'The resources below cover Cloudflare Workers, caching, WAF, Pages, and DNS. Each guide helps you use Cloudflare to protect and accelerate applications.',
      ],
    },
    es: {
      heading: 'Cloudflare',
      paragraphs: [
        'Cloudflare proporciona CDN, proteccion DDoS, DNS y edge computing. Se situa entre usuarios e infraestructura para mejorar seguridad y rendimiento.',
        'Los recursos a continuacion cubren Cloudflare Workers, caching, WAF, Pages y DNS. Cada guia te ayuda a usar Cloudflare para proteger y acelerar aplicaciones.',
      ],
    },
  },
  headers: {
    en: {
      heading: 'HTTP Headers and Security',
      paragraphs: [
        'HTTP headers control caching, security, content type, and client behavior. Correct header configuration is essential for performance and security.',
        'The resources below cover security headers, CORS, caching headers, HSTS, and CSP. Each guide helps you configure headers correctly.',
      ],
    },
    es: {
      heading: 'Headers HTTP y Seguridad',
      paragraphs: [
        'Los headers HTTP controlan caching, seguridad, tipo de contenido y comportamiento del cliente. La configuracion correcta de headers es esencial para rendimiento y seguridad.',
        'Los recursos a continuacion cubren headers de seguridad, CORS, headers de cache, HSTS y CSP. Cada guia te ayuda a configurar headers correctamente.',
      ],
    },
  },
  decorator: {
    en: {
      heading: 'Decorator Pattern',
      paragraphs: [
        'The decorator pattern adds behavior to objects dynamically without changing their class. It is a flexible alternative to subclassing.',
        'The resources below cover decorator implementation, composition, and use cases in Python, TypeScript, and Java. Each guide helps you extend behavior at runtime.',
      ],
    },
    es: {
      heading: 'Patron Decorator',
      paragraphs: [
        'El patron decorator agrega comportamiento a objetos dinamicamente sin cambiar su clase. Es una alternativa flexible a la subclase.',
        'Los recursos a continuacion cubren implementacion de decorator, composicion y casos de uso en Python, TypeScript y Java. Cada guia te ayuda a extender comportamiento en runtime.',
      ],
    },
  },
  'distributed-lock': {
    en: {
      heading: 'Distributed Locks',
      paragraphs: [
        'Distributed locks coordinate access to shared resources across multiple processes or nodes. They prevent race conditions in distributed systems.',
        'The resources below cover Redis Redlock, ZooKeeper, database locks, and lock timeouts. Each guide helps you implement locks that are safe and reliable.',
      ],
    },
    es: {
      heading: 'Locks Distribuidos',
      paragraphs: [
        'Los locks distribuidos coordinan el acceso a recursos compartidos entre multiples procesos o nodos. Previenen condiciones de carrera en sistemas distribuidos.',
        'Los recursos a continuacion cubren Redis Redlock, ZooKeeper, locks de base de datos y timeouts. Cada guia te ayuda a implementar locks seguros y confiables.',
      ],
    },
  },
  'atomic-operations': {
    en: {
      heading: 'Atomic Operations',
      paragraphs: [
        'Atomic operations complete as a single, indivisible unit. They are essential for safe concurrent updates without explicit locks.',
        'The resources below cover compare-and-swap, atomic integers, database atomic operations, and transactional updates. Each guide helps you write thread-safe and race-free code.',
      ],
    },
    es: {
      heading: 'Operaciones Atomicas',
      paragraphs: [
        'Las operaciones atomicas se completan como una unidad indivisible. Son esenciales para actualizaciones concurrentes seguras sin locks explicitos.',
        'Los recursos a continuacion cubren compare-and-swap, enteros atomicos, operaciones atomicas en bases de datos y actualizaciones transaccionales. Cada guia te ayuda a escribir codigo thread-safe y libre de carreras.',
      ],
    },
  },
  channels: {
    en: {
      heading: 'Channels and Communication',
      paragraphs: [
        'Channels are a concurrency primitive for communication and synchronization. They are central to Go and other message-passing systems.',
        'The resources below cover buffered and unbuffered channels, select, fan-in, fan-out, and patterns. Each guide helps you use channels for safe concurrent communication.',
      ],
    },
    es: {
      heading: 'Canales y Comunicacion',
      paragraphs: [
        'Los canales son una primitiva de concurrencia para comunicacion y sincronizacion. Son centrales en Go y otros sistemas de paso de mensajes.',
        'Los recursos a continuacion cubren canales buffered y unbuffered, select, fan-in, fan-out y patrones. Cada guia te ayuda a usar canales para comunicacion concurrente segura.',
      ],
    },
  },
  'race-condition': {
    en: {
      heading: 'Race Conditions',
      paragraphs: [
        'A race condition occurs when the outcome depends on the timing of concurrent operations. They are a common source of bugs in multi-threaded and distributed systems.',
        'The resources below cover detection, locks, atomics, message passing, and testing. Each guide helps you prevent and fix race conditions.',
      ],
    },
    es: {
      heading: 'Condiciones de Carrera',
      paragraphs: [
        'Una condicion de carrera ocurre cuando el resultado depende del tiempo de operaciones concurrentes. Son una fuente comun de errores en sistemas multihilo y distribuidos.',
        'Los recursos a continuacion cubren deteccion, locks, atomicos, paso de mensajes y testing. Cada guia te ayuda a prevenir y solucionar condiciones de carrera.',
      ],
    },
  },
  cron: {
    en: {
      heading: 'Cron and Job Scheduling',
      paragraphs: [
        'Cron schedules commands or scripts to run at fixed times. It is the simplest way to automate recurring tasks on Unix-like systems.',
        'The resources below cover cron syntax, cron jobs, alternatives, and scheduling best practices. Each guide helps you run tasks on time without surprises.',
      ],
    },
    es: {
      heading: 'Cron y Programacion de Tareas',
      paragraphs: [
        'Cron programa comandos o scripts para ejecutarse en horarios fijos. Es la forma mas simple de automatizar tareas recurrentes en sistemas tipo Unix.',
        'Los recursos a continuacion cubren sintaxis de cron, cron jobs, alternativas y mejores practicas de programacion. Cada guia te ayuda a ejecutar tareas a tiempo sin sorpresas.',
      ],
    },
  },
  'thread-pool': {
    en: {
      heading: 'Thread Pools',
      paragraphs: [
        'A thread pool reuses a fixed number of threads to execute tasks. It reduces the overhead of creating and destroying threads.',
        'The resources below cover pool sizing, task queues, rejection policies, and lifecycle. Each guide helps you use thread pools for efficient concurrency.',
      ],
    },
    es: {
      heading: 'Thread Pools',
      paragraphs: [
        'Un thread pool reutiliza un numero fijo de threads para ejecutar tareas. Reduce el overhead de crear y destruir threads.',
        'Los recursos a continuacion cubren tamano del pool, colas de tareas, politicas de rechazo y ciclo de vida. Cada guia te ayuda a usar thread pools para concurrencia eficiente.',
      ],
    },
  },
  sanitization: {
    en: {
      heading: 'Input Sanitization',
      paragraphs: [
        'Sanitization cleans user input to prevent injection, XSS, and other attacks. It is a critical defense layer for web applications.',
        'The resources below cover validation, escaping, encoding, allowlists, and library-based sanitization. Each guide helps you handle untrusted input safely.',
      ],
    },
    es: {
      heading: 'Sanitizacion de Entradas',
      paragraphs: [
        'La sanitizacion limpia entradas de usuarios para prevenir inyeccion, XSS y otros ataques. Es una capa de defensa critica para aplicaciones web.',
        'Los recursos a continuacion cubren validacion, escaping, encoding, listas permitidas y sanitizacion basada en librerias. Cada guia te ayuda a manejar entradas no confiables de forma segura.',
      ],
    },
  },
  analytics: {
    en: {
      heading: 'Data Analytics',
      paragraphs: [
        'Analytics transforms raw data into insights. It helps teams understand behavior, measure performance, and make data-driven decisions.',
        'The resources below cover dashboards, metrics, SQL analytics, event analytics, and visualization. Each guide helps you build analytics that answer real questions.',
      ],
    },
    es: {
      heading: 'Analitica de Datos',
      paragraphs: [
        'La analitica transforma datos crudos en conocimiento. Ayuda a los equipos a entender comportamiento, medir rendimiento y tomar decisiones basadas en datos.',
        'Los recursos a continuacion cubren dashboards, metricas, analitica SQL, analitica de eventos y visualizacion. Cada guia te ayuda a construir analitica que responda preguntas reales.',
      ],
    },
  },
  cli: {
    en: {
      heading: 'Command-Line Interfaces',
      paragraphs: [
        'CLI tools let users interact with software through text commands. Well-designed CLIs are fast, scriptable, and composable.',
        'The resources below cover CLI design, argument parsing, shell scripts, and tools like Click, Commander, and Clap. Each guide helps you build command-line tools that users love.',
      ],
    },
    es: {
      heading: 'Interfaces de Linea de Comandos',
      paragraphs: [
        'Las herramientas CLI permiten a los usuarios interactuar con software mediante comandos de texto. CLI bien disenados son rapidos, scripteables y componibles.',
        'Los recursos a continuacion cubren diseno de CLI, parseo de argumentos, shell scripts y herramientas como Click, Commander y Clap. Cada guia te ayuda a construir herramientas de linea de comandos que los usuarios amen.',
      ],
    },
  },
  pandas: {
    en: {
      heading: 'Pandas for Data Analysis',
      paragraphs: [
        'Pandas is the most popular Python library for data manipulation and analysis. It provides DataFrames for tabular data and powerful operations.',
        'The resources below cover data loading, cleaning, filtering, grouping, merging, and time series. Each recipe helps you work with data efficiently in Python.',
      ],
    },
    es: {
      heading: 'Pandas para Analisis de Datos',
      paragraphs: [
        'Pandas es la biblioteca de Python mas popular para manipulacion y analisis de datos. Proporciona DataFrames para datos tabulares y operaciones poderosas.',
        'Los recursos a continuacion cubren carga de datos, limpieza, filtrado, agrupacion, merge y series temporales. Cada receta te ayuda a trabajar con datos eficientemente en Python.',
      ],
    },
  },
  markdown: {
    en: {
      heading: 'Markdown',
      paragraphs: [
        'Markdown is a lightweight markup language for formatting text. It is widely used for documentation, READMEs, and content authoring.',
        'The resources below cover Markdown syntax, tables, code blocks, frontmatter, and conversion. Each guide helps you write clear and portable documents.',
      ],
    },
    es: {
      heading: 'Markdown',
      paragraphs: [
        'Markdown es un lenguaje de marcado ligero para formatear texto. Es ampliamente usado para documentacion, READMEs y creacion de contenido.',
        'Los recursos a continuacion cubren sintaxis de Markdown, tablas, bloques de codigo, frontmatter y conversion. Cada guia te ayuda a escribir documentos claros y portables.',
      ],
    },
  },
  extraction: {
    en: {
      heading: 'Data Extraction',
      paragraphs: [
        'Data extraction pulls data from sources like files, APIs, databases, and websites. It is the first step in ETL, analytics, and migration pipelines.',
        'The resources below cover scraping, API pagination, file parsing, change data capture, and extraction patterns. Each guide helps you extract data reliably.',
      ],
    },
    es: {
      heading: 'Extraccion de Datos',
      paragraphs: [
        'La extraccion de datos obtiene datos de fuentes como archivos, APIs, bases de datos y sitios web. Es el primer paso en pipelines de ETL, analitica y migracion.',
        'Los recursos a continuacion cubren scraping, paginacion de APIs, parseo de archivos, change data capture y patrones de extraccion. Cada guia te ayuda a extraer datos de forma confiable.',
      ],
    },
  },
  yaml: {
    en: {
      heading: 'YAML Configuration',
      paragraphs: [
        'YAML is a human-friendly data serialization format. It is commonly used for configuration files, CI/CD pipelines, and Kubernetes manifests.',
        'The resources below cover YAML syntax, anchors, multi-documents, validation, and parsing. Each guide helps you write and maintain YAML configuration safely.',
      ],
    },
    es: {
      heading: 'Configuracion YAML',
      paragraphs: [
        'YAML es un formato de serializacion de datos amigable para humanos. Se usa comummente para archivos de configuracion, pipelines de CI/CD y manifiestos de Kubernetes.',
        'Los recursos a continuacion cubren sintaxis YAML, anchors, multi-documentos, validacion y parseo. Cada guia te ayuda a escribir y mantener configuracion YAML de forma segura.',
      ],
    },
  },
  airflow: {
    en: {
      heading: 'Apache Airflow',
      paragraphs: [
        'Airflow is a platform for orchestrating complex workflows as directed acyclic graphs. It is widely used for data pipelines and ETL.',
        'The resources below cover DAGs, operators, sensors, scheduling, and deployment. Each guide helps you build and maintain data workflows with Airflow.',
      ],
    },
    es: {
      heading: 'Apache Airflow',
      paragraphs: [
        'Airflow es una plataforma para orquestar workflows complejos como grafos aciclicos dirigidos. Se usa ampliamente para pipelines de datos y ETL.',
        'Los recursos a continuacion cubren DAGs, operators, sensors, programacion y despliegue. Cada guia te ayuda a construir y mantener workflows de datos con Airflow.',
      ],
    },
  },
  dbt: {
    en: {
      heading: 'dbt',
      paragraphs: [
        'dbt is a transformation workflow for data analysts and engineers. It brings software engineering practices to SQL-based analytics.',
        'The resources below cover dbt models, tests, snapshots, packages, and documentation. Each guide helps you build reliable data transformations in SQL.',
      ],
    },
    es: {
      heading: 'dbt',
      paragraphs: [
        'dbt es un workflow de transformacion para analistas e ingenieros de datos. Aporta practicas de ingenieria de software a la analitica basada en SQL.',
        'Los recursos a continuacion cubren modelos dbt, tests, snapshots, packages y documentacion. Cada guia te ayuda a construir transformaciones de datos confiables en SQL.',
      ],
    },
  },
  'data-warehouse': {
    en: {
      heading: 'Data Warehousing',
      paragraphs: [
        'A data warehouse is a centralized repository for structured, historical data. It supports reporting, analytics, and business intelligence.',
        'The resources below cover warehouse design, ETL, modeling, Snowflake, BigQuery, and Redshift. Each guide helps you build a warehouse that scales with your data.',
      ],
    },
    es: {
      heading: 'Data Warehousing',
      paragraphs: [
        'Un data warehouse es un repositorio centralizado de datos estructurados e historicos. Soporta reportes, analitica e inteligencia de negocio.',
        'Los recursos a continuacion cubren diseno de warehouses, ETL, modelado, Snowflake, BigQuery y Redshift. Cada guia te ayuda a construir un warehouse que escale con tus datos.',
      ],
    },
  },
  cte: {
    en: {
      heading: 'Common Table Expressions',
      paragraphs: [
        'CTEs are temporary named result sets in SQL. They make complex queries more readable and easier to maintain.',
        'The resources below cover recursive CTEs, non-recursive CTEs, performance, and readability. Each guide helps you write cleaner SQL with CTEs.',
      ],
    },
    es: {
      heading: 'Expresiones de Tabla Comunes',
      paragraphs: [
        'Las CTE son conjuntos de resultados temporales con nombre en SQL. Hacen las consultas complejas mas legibles y faciles de mantener.',
        'Los recursos a continuacion cubren CTEs recursivas, CTEs no recursivas, rendimiento y legibilidad. Cada guia te ayuda a escribir SQL mas limpio con CTEs.',
      ],
    },
  },
  encoding: {
    en: {
      heading: 'Character Encoding',
      paragraphs: [
        'Character encoding defines how text is represented as bytes. Incorrect encoding causes garbled text and bugs.',
        'The resources below cover UTF-8, ASCII, Unicode, BOM, and encoding conversion. Each guide helps you handle text correctly across systems.',
      ],
    },
    es: {
      heading: 'Codificacion de Caracteres',
      paragraphs: [
        'La codificacion de caracteres define como se representa el texto en bytes. Una codificacion incorrecta causa texto corrupto y errores.',
        'Los recursos a continuacion cubren UTF-8, ASCII, Unicode, BOM y conversion de codificacion. Cada guia te ayuda a manejar texto correctamente entre sistemas.',
      ],
    },
  },
  postgres: {
    en: {
      heading: 'PostgreSQL',
      paragraphs: [
        'PostgreSQL is an advanced open-source relational database. It supports ACID transactions, extensions, JSON, and powerful querying.',
        'The resources below cover installation, indexing, JSONB, partitioning, and administration. Each guide helps you use PostgreSQL effectively.',
      ],
    },
    es: {
      heading: 'PostgreSQL',
      paragraphs: [
        'PostgreSQL es una base de datos relacional avanzada de codigo abierto. Soporta transacciones ACID, extensiones, JSON y consultas poderosas.',
        'Los recursos a continuacion cubren instalacion, indexacion, JSONB, particionamiento y administracion. Cada guia te ayuda a usar PostgreSQL efectivamente.',
      ],
    },
  },
  jdbc: {
    en: {
      heading: 'JDBC and Database Connectivity',
      paragraphs: [
        'JDBC is the Java API for connecting to relational databases. It provides a standard interface for queries, updates, and transactions.',
        'The resources below cover drivers, connection management, prepared statements, and connection pools. Each guide helps you use JDBC to access databases from Java.',
      ],
    },
    es: {
      heading: 'JDBC y Conectividad a Bases de Datos',
      paragraphs: [
        'JDBC es la API de Java para conectarse a bases de datos relacionales. Proporciona una interfaz estandar para consultas, actualizaciones y transacciones.',
        'Los recursos a continuacion cubren drivers, gestion de conexiones, prepared statements y pools de conexion. Cada guia te ayuda a usar JDBC para acceder a bases de datos desde Java.',
      ],
    },
  },
  'schema-evolution': {
    en: {
      heading: 'Schema Evolution',
      paragraphs: [
        'Schema evolution is the process of changing database or API schemas over time while maintaining compatibility. It is critical for long-lived systems.',
        'The resources below cover backward and forward compatibility, migration tools, versioning, and event schemas. Each guide helps you evolve schemas safely.',
      ],
    },
    es: {
      heading: 'Evolucion de Esquemas',
      paragraphs: [
        'La evolucion de esquemas es el proceso de cambiar esquemas de bases de datos o APIs con el tiempo manteniendo compatibilidad. Es critica para sistemas de larga vida.',
        'Los recursos a continuacion cubren compatibilidad hacia atras y hacia adelante, herramientas de migracion, versionado y esquemas de eventos. Cada guia te ayuda a evolucionar esquemas de forma segura.',
      ],
    },
  },
  deduplication: {
    en: {
      heading: 'Data Deduplication',
      paragraphs: [
        'Deduplication removes duplicate records from datasets. It is essential for data quality, storage efficiency, and accurate analytics.',
        'The resources below cover exact and fuzzy deduplication, deterministic and probabilistic matching, and tooling. Each guide helps you clean duplicates effectively.',
      ],
    },
    es: {
      heading: 'Deduplicacion de Datos',
      paragraphs: [
        'La deduplicacion elimina registros duplicados de conjuntos de datos. Es esencial para calidad de datos, eficiencia de almacenamiento y analitica precisa.',
        'Los recursos a continuacion cubren deduplicacion exacta y difusa, coincidencia deterministica y probabilistica y herramientas. Cada guia te ayuda a limpiar duplicados efectivamente.',
      ],
    },
  },
  adapter: {
    en: {
      heading: 'Adapter Pattern',
      paragraphs: [
        'The adapter pattern allows incompatible interfaces to work together. It wraps one interface to expose another, enabling integration without changing existing code.',
        'The resources below cover object adapters, class adapters, and real-world use cases. Each guide helps you integrate components with mismatched interfaces.',
      ],
    },
    es: {
      heading: 'Patron Adapter',
      paragraphs: [
        'El patron adapter permite que interfaces incompatibles trabajen juntas. Envuelve una interfaz para exponer otra, habilitando integracion sin cambiar codigo existente.',
        'Los recursos a continuacion cubren object adapters, class adapters y casos de uso reales. Cada guia te ayuda a integrar componentes con interfaces incompatibles.',
      ],
    },
  },
  'factory-pattern': {
    en: {
      heading: 'Factory Pattern',
      paragraphs: [
        'The factory pattern creates objects without specifying the exact class. It centralizes object creation and makes code more flexible.',
        'The resources below cover simple factories, factory method, abstract factory, and dependency injection. Each guide helps you create objects cleanly.',
      ],
    },
    es: {
      heading: 'Patron Factory',
      paragraphs: [
        'El patron factory crea objetos sin especificar la clase exacta. Centraliza la creacion de objetos y hace el codigo mas flexible.',
        'Los recursos a continuacion cubren simple factories, factory method, abstract factory e inyeccion de dependencias. Cada guia te ayuda a crear objetos limpiamente.',
      ],
    },
  },
  strategy: {
    en: {
      heading: 'Strategy Pattern',
      paragraphs: [
        'The strategy pattern defines a family of algorithms and makes them interchangeable. It lets behavior vary independently from clients.',
        'The resources below cover strategy interfaces, context, and selecting algorithms at runtime. Each guide helps you design flexible and extensible behavior.',
      ],
    },
    es: {
      heading: 'Patron Strategy',
      paragraphs: [
        'El patron strategy define una familia de algoritmos y los hace intercambiables. Permite que el comportamiento varie independientemente de los clientes.',
        'Los recursos a continuacion cubren interfaces de estrategia, contexto y seleccion de algoritmos en runtime. Cada guia te ayuda a disenar comportamiento flexible y extensible.',
      ],
    },
  },
  xargs: {
    en: {
      heading: 'xargs and Shell Pipelines',
      paragraphs: [
        'xargs builds and executes commands from standard input. It is a powerful tool for batch processing and chaining in shell pipelines.',
        'The resources below cover xargs options, parallel execution, find + xargs, and safety. Each guide helps you process large numbers of files and arguments.',
      ],
    },
    es: {
      heading: 'xargs y Pipelines de Shell',
      paragraphs: [
        'xargs construye y ejecuta comandos desde la entrada estandar. Es una herramienta poderosa para procesamiento por lotes y encadenamiento en pipelines de shell.',
        'Los recursos a continuacion cubren opciones de xargs, ejecucion paralela, find + xargs y seguridad. Cada guia te ayuda a procesar grandes cantidades de archivos y argumentos.',
      ],
    },
  },
  'blue-green': {
    en: {
      heading: 'Blue-Green Deployments',
      paragraphs: [
        'Blue-green deployment keeps two identical environments and switches traffic between them. It enables zero-downtime releases and instant rollback.',
        'The resources below cover environment parity, traffic switching, database changes, and rollback. Each guide helps you deploy without interrupting users.',
      ],
    },
    es: {
      heading: 'Despliegues Blue-Green',
      paragraphs: [
        'El despliegue blue-green mantiene dos entornos identicos y cambia el trafico entre ellos. Permite releases sin downtime y rollback instantaneo.',
        'Los recursos a continuacion cubren paridad de entornos, cambio de trafico, cambios de base de datos y rollback. Cada guia te ayuda a desplegar sin interrumpir usuarios.',
      ],
    },
  },
  'docker-compose': {
    en: {
      heading: 'Docker Compose',
      paragraphs: [
        'Docker Compose defines and runs multi-container applications. It is ideal for local development, testing, and simple deployments.',
        'The resources below cover compose files, networking, volumes, environment variables, and multi-service orchestration. Each guide helps you manage containerized applications locally.',
      ],
    },
    es: {
      heading: 'Docker Compose',
      paragraphs: [
        'Docker Compose define y ejecuta aplicaciones multi-contenedor. Es ideal para desarrollo local, testing y despliegues simples.',
        'Los recursos a continuacion cubren archivos compose, networking, volumenes, variables de entorno y orquestacion multi-servicio. Cada guia te ayuda a gestionar aplicaciones contenerizadas localmente.',
      ],
    },
  },
  cve: {
    en: {
      heading: 'CVE and Vulnerability Management',
      paragraphs: [
        'CVEs are standardized identifiers for publicly known cybersecurity vulnerabilities. They are the foundation of vulnerability databases and patch management.',
        'The resources below cover CVE lookup, severity scoring, patch management, and scanning. Each guide helps you track and remediate known vulnerabilities.',
      ],
    },
    es: {
      heading: 'CVE y Gestion de Vulnerabilidades',
      paragraphs: [
        'Los CVE son identificadores estandarizados para vulnerabilidades de ciberseguridad conocidas publicamente. Son la base de bases de datos de vulnerabilidades y gestion de parches.',
        'Los recursos a continuacion cubren busqueda de CVE, puntuacion de severidad, gestion de parches y escaneo. Cada guia te ayuda a rastrear y remediar vulnerabilidades conocidas.',
      ],
    },
  },
  bridge: {
    en: {
      heading: 'Bridge Pattern',
      paragraphs: [
        'The bridge pattern separates an abstraction from its implementation so that the two can vary independently. It is useful for complex class hierarchies.',
        'The resources below cover abstraction, implementation, decoupling, and bridge use cases. Each guide helps you reduce coupling between layers.',
      ],
    },
    es: {
      heading: 'Patron Bridge',
      paragraphs: [
        'El patron bridge separa una abstraccion de su implementacion para que ambas puedan variar independientemente. Es util para jerarquias de clases complejas.',
        'Los recursos a continuacion cubren abstraccion, implementacion, desacoplamiento y casos de uso de bridge. Cada guia te ayuda a reducir el acoplamiento entre capas.',
      ],
    },
  },
  'big-data': {
    en: {
      heading: 'Big Data',
      paragraphs: [
        'Big data refers to datasets that are too large or complex for traditional tools. It requires distributed storage and processing.',
        'The resources below cover Hadoop, Spark, data lakes, batch and stream processing, and storage formats. Each guide helps you work with large-scale data.',
      ],
    },
    es: {
      heading: 'Big Data',
      paragraphs: [
        'El big data se refiere a conjuntos de datos demasiado grandes o complejos para herramientas tradicionales. Requiere almacenamiento y procesamiento distribuido.',
        'Los recursos a continuacion cubren Hadoop, Spark, data lakes, procesamiento batch y streaming, y formatos de almacenamiento. Cada guia te ayuda a trabajar con datos a gran escala.',
      ],
    },
  },
  hierarchy: {
    en: {
      heading: 'Data and UI Hierarchies',
      paragraphs: [
        'Hierarchies organize data or components into parent-child relationships. They are common in org charts, file systems, taxonomies, and UI trees.',
        'The resources below cover tree structures, recursive queries, nested sets, and hierarchy design. Each guide helps you model and query hierarchical data.',
      ],
    },
    es: {
      heading: 'Jerarquias de Datos y UI',
      paragraphs: [
        'Las jerarquias organizan datos o componentes en relaciones padre-hijo. Son comunes en organigramas, sistemas de archivos, taxonomias y arboles de UI.',
        'Los recursos a continuacion cubren estructuras de arbol, consultas recursivas, conjuntos anidados y diseno de jerarquias. Cada guia te ayuda a modelar y consultar datos jerarquicos.',
      ],
    },
  },
  matrix: {
    en: {
      heading: 'Build and Test Matrices',
      paragraphs: [
        'A matrix runs a job or test across multiple combinations of parameters. It is essential for testing against multiple versions, platforms, and configurations.',
        'The resources below cover CI/CD matrices, parameter combinations, and matrix design. Each guide helps you run comprehensive cross-environment tests.',
      ],
    },
    es: {
      heading: 'Matrices de Build y Test',
      paragraphs: [
        'Una matrix ejecuta un trabajo o test a traves de multiples combinaciones de parametros. Es esencial para probar contra multiples versiones, plataformas y configuraciones.',
        'Los recursos a continuacion cubren matrices de CI/CD, combinaciones de parametros y diseno de matrices. Cada guia te ayuda a ejecutar tests completos en multiples entornos.',
      ],
    },
  },
  ssl: {
    en: {
      heading: 'SSL and TLS',
      paragraphs: [
        'SSL and TLS are protocols that encrypt communications over a network. TLS is the modern successor to SSL and is used by HTTPS, email, and many other protocols.',
        'The resources below cover certificates, handshakes, configuration, and certificate management. Each guide helps you secure connections correctly.',
      ],
    },
    es: {
      heading: 'SSL y TLS',
      paragraphs: [
        'SSL y TLS son protocolos que cifran comunicaciones sobre una red. TLS es el sucesor moderno de SSL y es usado por HTTPS, email y muchos otros protocolos.',
        'Los recursos a continuacion cubren certificados, handshakes, configuracion y gestion de certificados. Cada guia te ayuda a asegurar conexiones correctamente.',
      ],
    },
  },
  workspaces: {
    en: {
      heading: 'Monorepos and Workspaces',
      paragraphs: [
        'Workspaces let you manage multiple packages in a single repository. They share dependencies and simplify builds across related projects.',
        'The resources below cover npm, pnpm, Yarn, Lerna, and Nx workspaces. Each guide helps you set up and maintain monorepos effectively.',
      ],
    },
    es: {
      heading: 'Monorepos y Workspaces',
      paragraphs: [
        'Los workspaces permiten gestionar multiples paquetes en un solo repositorio. Comparten dependencias y simplifican builds entre proyectos relacionados.',
        'Los recursos a continuacion cubren workspaces de npm, pnpm, Yarn, Lerna y Nx. Cada guia te ayuda a configurar y mantener monorepos efectivamente.',
      ],
    },
  },
  keys: {
    en: {
      heading: 'API Keys and Credentials',
      paragraphs: [
        'API keys are simple tokens used to authenticate clients to APIs. They are easy to use but require careful management to avoid leaks.',
        'The resources below cover key generation, rotation, storage, scopes, and revocation. Each guide helps you use API keys securely.',
      ],
    },
    es: {
      heading: 'API Keys y Credenciales',
      paragraphs: [
        'Los API keys son tokens simples usados para autenticar clientes en APIs. Son faciles de usar pero requieren gestion cuidadosa para evitar filtraciones.',
        'Los recursos a continuacion cubren generacion, rotacion, almacenamiento, scopes y revocacion de keys. Cada guia te ayuda a usar API keys de forma segura.',
      ],
    },
  },
  'lazy-loading': {
    en: {
      heading: 'Lazy Loading',
      paragraphs: [
        'Lazy loading defers loading resources until they are needed. It reduces initial load time and improves performance for large applications.',
        'The resources below cover image lazy loading, component lazy loading, code splitting, and virtual scrolling. Each guide helps you load content only when required.',
      ],
    },
    es: {
      heading: 'Lazy Loading',
      paragraphs: [
        'El lazy loading retrasa la carga de recursos hasta que se necesitan. Reduce el tiempo de carga inicial y mejora el rendimiento para aplicaciones grandes.',
        'Los recursos a continuacion cubren lazy loading de imagenes, componentes, code splitting y virtual scrolling. Cada guia te ayuda a cargar contenido solo cuando se requiera.',
      ],
    },
  },
  storage: {
    en: {
      heading: 'Data Storage',
      paragraphs: [
        'Storage is the persistence layer of an application. Choosing the right storage technology depends on access patterns, scale, and consistency needs.',
        'The resources below cover object storage, block storage, file systems, databases, and caching. Each guide helps you choose storage that fits your workload.',
      ],
    },
    es: {
      heading: 'Almacenamiento de Datos',
      paragraphs: [
        'El almacenamiento es la capa de persistencia de una aplicacion. Elegir la tecnologia correcta depende de patrones de acceso, escala y necesidades de consistencia.',
        'Los recursos a continuacion cubren almacenamiento de objetos, bloques, sistemas de archivos, bases de datos y caching. Cada guia te ayuda a elegir almacenamiento adecuado para tu carga.',
      ],
    },
  },
  hooks: {
    en: {
      heading: 'Git Hooks',
      paragraphs: [
        'Git hooks are scripts that run at specific points in the Git lifecycle. They help enforce standards, run tests, and automate tasks before commits and pushes.',
        'The resources below cover pre-commit, pre-push, commit-msg hooks, and tools like Husky. Each guide helps you automate Git workflows.',
      ],
    },
    es: {
      heading: 'Git Hooks',
      paragraphs: [
        'Los hooks de Git son scripts que se ejecutan en puntos especificos del ciclo de vida de Git. Ayudan a hacer cumplir estandares, ejecutar tests y automatizar tareas antes de commits y pushes.',
        'Los recursos a continuacion cubren pre-commit, pre-push, commit-msg hooks y herramientas como Husky. Cada guia te ayuda a automatizar flujos de Git.',
      ],
    },
  },
  'n-plus-one': {
    en: {
      heading: 'N+1 Query Problem',
      paragraphs: [
        'The N+1 problem happens when code executes one query for the main data and then additional queries for each related item. It causes severe performance degradation.',
        'The resources below cover eager loading, joins, data loaders, and query optimization. Each guide helps you detect and fix N+1 issues.',
      ],
    },
    es: {
      heading: 'Problema N+1 de Consultas',
      paragraphs: [
        'El problema N+1 ocurre cuando el codigo ejecuta una consulta para los datos principales y luego consultas adicionales para cada elemento relacionado. Causa degradacion severa del rendimiento.',
        'Los recursos a continuacion cubren eager loading, joins, data loaders y optimizacion de consultas. Cada guia te ayuda a detectar y solucionar problemas N+1.',
      ],
    },
  },
  extensions: {
    en: {
      heading: 'File Extensions and Parsing',
      paragraphs: [
        'File extensions identify the format of files. Correct handling of extensions is important for parsing, validation, and content negotiation.',
        'The resources below cover common extensions, MIME types, file type detection, and parsing strategies. Each guide helps you work with files by type.',
      ],
    },
    es: {
      heading: 'Extensiones de Archivo y Parseo',
      paragraphs: [
        'Las extensiones de archivo identifican el formato de los archivos. El manejo correcto de extensiones es importante para parseo, validacion y negociacion de contenido.',
        'Los recursos a continuacion cubren extensiones comunes, tipos MIME, deteccion de tipo de archivo y estrategias de parseo. Cada guia te ayuda a trabajar con archivos por tipo.',
      ],
    },
  },
  gateway: {
    en: {
      heading: 'API Gateways',
      paragraphs: [
        'An API gateway sits between clients and backend services. It handles routing, authentication, rate limiting, and protocol translation.',
        'The resources below cover Kong, AWS API Gateway, Envoy, and gateway patterns. Each guide helps you design gateways that simplify client communication.',
      ],
    },
    es: {
      heading: 'API Gateways',
      paragraphs: [
        'Un API gateway se situa entre clientes y servicios backend. Maneja routing, autenticacion, rate limiting y traduccion de protocolos.',
        'Los recursos a continuacion cubren Kong, AWS API Gateway, Envoy y patrones de gateway. Cada guia te ayuda a disenar gateways que simplifiquen la comunicacion de clientes.',
      ],
    },
  },
  'web-performance': {
    en: {
      heading: 'Web Performance',
      paragraphs: [
        'Web performance is how quickly pages load and respond to user input. It affects user experience, conversion, and SEO.',
        'The resources below cover Core Web Vitals, rendering, resource loading, caching, and optimization. Each guide helps you make websites faster and smoother.',
      ],
    },
    es: {
      heading: 'Rendimiento Web',
      paragraphs: [
        'El rendimiento web es la rapidez con que las paginas se cargan y responden a la entrada del usuario. Afecta la experiencia de usuario, conversion y SEO.',
        'Los recursos a continuacion cubren Core Web Vitals, renderizado, carga de recursos, caching y optimizacion. Cada guia te ayuda a hacer sitios web mas rapidos y fluidos.',
      ],
    },
  },
  'container-security': {
    en: {
      heading: 'Container Security',
      paragraphs: [
        'Container security protects containerized applications from build time to runtime. It involves images, registries, orchestration, and runtime hardening.',
        'The resources below cover image scanning, non-root users, read-only filesystems, and runtime policies. Each guide helps you run containers securely.',
      ],
    },
    es: {
      heading: 'Seguridad de Contenedores',
      paragraphs: [
        'La seguridad de contenedores protege aplicaciones contenerizadas desde build time hasta runtime. Involucra imagenes, registros, orquestacion y endurecimiento de runtime.',
        'Los recursos a continuacion cubren escaneo de imagenes, usuarios no root, sistemas de archivos solo lectura y politicas de runtime. Cada guia te ayuda a ejecutar contenedores de forma segura.',
      ],
    },
  },
  gdpr: {
    en: {
      heading: 'GDPR and Data Privacy',
      paragraphs: [
        'The GDPR is a European regulation on data protection and privacy. It gives individuals rights over their personal data and imposes obligations on organizations.',
        'The resources below cover consent, data subject rights, breach notification, and compliance by design. Each guide helps you build systems that respect user privacy.',
      ],
    },
    es: {
      heading: 'GDPR y Privacidad de Datos',
      paragraphs: [
        'El GDPR es un reglamento europeo sobre proteccion de datos y privacidad. Otorga derechos a las personas sobre sus datos personales e impone obligaciones a las organizaciones.',
        'Los recursos a continuacion cubren consentimiento, derechos de los titulares de datos, notificacion de brechas y cumplimiento por diseno. Cada guia te ayuda a construir sistemas que respeten la privacidad del usuario.',
      ],
    },
  },
  'static-analysis': {
    en: {
      heading: 'Static Analysis',
      paragraphs: [
        'Static analysis examines code without running it. It finds bugs, style issues, and security problems early in development.',
        'The resources below cover linters, type checkers, SAST, and IDE integration. Each guide helps you catch issues before they reach production.',
      ],
    },
    es: {
      heading: 'Analisis Estatico',
      paragraphs: [
        'El analisis estatico examina codigo sin ejecutarlo. Encuentra errores, problemas de estilo y problemas de seguridad temprano en el desarrollo.',
        'Los recursos a continuacion cubren linters, type checkers, SAST e integracion con IDEs. Cada guia te ayuda a detectar problemas antes de que lleguen a produccion.',
      ],
    },
  },
  'security-headers': {
    en: {
      heading: 'HTTP Security Headers',
      paragraphs: [
        'Security headers instruct browsers on how to behave. Correct headers protect against XSS, clickjacking, and other common attacks.',
        'The resources below cover CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy. Each guide helps you harden web responses.',
      ],
    },
    es: {
      heading: 'Headers de Seguridad HTTP',
      paragraphs: [
        'Los headers de seguridad instruyen a los navegadores sobre como comportarse. Headers correctos protegen contra XSS, clickjacking y otros ataques comunes.',
        'Los recursos a continuacion cubren CSP, HSTS, X-Frame-Options, X-Content-Type-Options y Referrer-Policy. Cada guia te ayuda a endurecer respuestas web.',
      ],
    },
  },
  'cloud-functions': {
    en: {
      heading: 'Cloud Functions',
      paragraphs: [
        'Cloud functions are event-driven compute services. They run in response to triggers and scale automatically.',
        'The resources below cover AWS Lambda, Azure Functions, Google Cloud Functions, and triggers. Each guide helps you build serverless functions in the cloud.',
      ],
    },
    es: {
      heading: 'Cloud Functions',
      paragraphs: [
        'Las cloud functions son servicios de computo event-driven. Se ejecutan en respuesta a triggers y escalan automaticamente.',
        'Los recursos a continuacion cubren AWS Lambda, Azure Functions, Google Cloud Functions y triggers. Cada guia te ayuda a construir funciones serverless en la nube.',
      ],
    },
  },
  'api-testing': {
    en: {
      heading: 'API Testing',
      paragraphs: [
        'API testing validates that application interfaces work correctly. It covers functional, contract, performance, and security testing of APIs.',
        'The resources below cover tools like Postman, REST Assured, Karate, and contract testing. Each guide helps you build reliable API test suites.',
      ],
    },
    es: {
      heading: 'Testing de APIs',
      paragraphs: [
        'El testing de APIs valida que las interfaces de aplicacion funcionen correctamente. Cubre testing funcional, de contrato, de rendimiento y de seguridad de APIs.',
        'Los recursos a continuacion cubren herramientas como Postman, REST Assured, Karate y contract testing. Cada guia te ayuda a construir suites de test de APIs confiables.',
      ],
    },
  },
  junit5: {
    en: {
      heading: 'JUnit 5',
      paragraphs: [
        'JUnit 5 is the latest version of the popular Java testing framework. It introduces a new extension model and improved parameterization.',
        'The resources below cover JUnit Jupiter, extensions, parameterized tests, and assertions. Each guide helps you write modern Java tests.',
      ],
    },
    es: {
      heading: 'JUnit 5',
      paragraphs: [
        'JUnit 5 es la ultima version del popular framework de testing para Java. Introduce un nuevo modelo de extensiones y parametrizacion mejorada.',
        'Los recursos a continuacion cubren JUnit Jupiter, extensiones, tests parametrizados y assertions. Cada guia te ayuda a escribir tests Java modernos.',
      ],
    },
  },
  snapshot: {
    en: {
      heading: 'Snapshot Testing',
      paragraphs: [
        'Snapshot testing captures the output of a component or function and compares future runs to it. It is useful for detecting unintended changes in UI or serialization.',
        'The resources below cover Jest snapshots, approval tests, and best practices. Each guide helps you use snapshots without creating brittle tests.',
      ],
    },
    es: {
      heading: 'Snapshot Testing',
      paragraphs: [
        'El snapshot testing captura la salida de un componente o funcion y compara ejecuciones futuras contra ella. Es util para detectar cambios no intencionales en UI o serializacion.',
        'Los recursos a continuacion cubren snapshots de Jest, approval tests y mejores practicas. Cada guia te ayuda a usar snapshots sin crear tests fragiles.',
      ],
    },
  },
  'vector-search': {
    en: {
      heading: 'Vector Search',
      paragraphs: [
        'Vector search finds items based on semantic similarity. It uses embeddings and is the basis of modern RAG and recommendation systems.',
        'The resources below cover embeddings, vector databases, similarity metrics, and indexing. Each guide helps you implement semantic search.',
      ],
    },
    es: {
      heading: 'Busqueda Vectorial',
      paragraphs: [
        'La busqueda vectorial encuentra elementos basandose en similitud semantica. Usa embeddings y es la base de sistemas modernos de RAG y recomendacion.',
        'Los recursos a continuacion cubren embeddings, bases de datos vectoriales, metricas de similitud e indexacion. Cada guia te ayuda a implementar busqueda semantica.',
      ],
    },
  },
  guardrails: {
    en: {
      heading: 'AI Guardrails',
      paragraphs: [
        'Guardrails are safety controls for AI systems. They prevent harmful, biased, or off-topic outputs and enforce policy.',
        'The resources below cover prompt filtering, output validation, content moderation, and safety frameworks. Each guide helps you deploy LLMs responsibly.',
      ],
    },
    es: {
      heading: 'Guardrails para IA',
      paragraphs: [
        'Los guardrails son controles de seguridad para sistemas de IA. Previenen salidas daninas, sesgadas o fuera de tema y hacen cumplir politicas.',
        'Los recursos a continuacion cubren filtrado de prompts, validacion de salidas, moderacion de contenido y frameworks de seguridad. Cada guia te ayuda a desplegar LLMs de forma responsable.',
      ],
    },
  },
  recovery: {
    en: {
      heading: 'Disaster Recovery and Business Continuity',
      paragraphs: [
        'Recovery is the process of restoring systems and data after a failure. It requires planning, backups, and tested procedures.',
        'The resources below cover RTO, RPO, backup strategies, failover, and recovery testing. Each guide helps you prepare for and recover from outages.',
      ],
    },
    es: {
      heading: 'Recuperacion y Continuidad de Negocio',
      paragraphs: [
        'La recuperacion es el proceso de restaurar sistemas y datos despues de una falla. Requiere planificacion, backups y procedimientos probados.',
        'Los recursos a continuacion cubren RTO, RPO, estrategias de backup, failover y testing de recuperacion. Cada guia te ayuda a prepararte y recuperarte de interrupciones.',
      ],
    },
  },
  retrieval: {
    en: {
      heading: 'Information Retrieval',
      paragraphs: [
        'Retrieval is the process of finding relevant information from a collection. It underpins search, RAG, and recommendation systems.',
        'The resources below cover indexing, ranking, vector search, and retrieval metrics. Each guide helps you build systems that find the right information.',
      ],
    },
    es: {
      heading: 'Recuperacion de Informacion',
      paragraphs: [
        'La recuperacion es el proceso de encontrar informacion relevante de una coleccion. Sustenta busqueda, RAG y sistemas de recomendacion.',
        'Los recursos a continuacion cubren indexacion, ranking, busqueda vectorial y metricas de recuperacion. Cada guia te ayuda a construir sistemas que encuentren la informacion correcta.',
      ],
    },
  },
  'write-model': {
    en: {
      heading: 'Write Models and CQRS',
      paragraphs: [
        'The write model handles commands and updates in CQRS. It is optimized for consistency and business rule enforcement.',
        'The resources below cover CQRS, write models, aggregates, event sourcing, and consistency. Each guide helps you design systems that separate read and write concerns.',
      ],
    },
    es: {
      heading: 'Modelos de Escritura y CQRS',
      paragraphs: [
        'El modelo de escritura maneja comandos y actualizaciones en CQRS. Esta optimizado para consistencia y cumplimiento de reglas de negocio.',
        'Los recursos a continuacion cubren CQRS, modelos de escritura, agregados, event sourcing y consistencia. Cada guia te ayuda a disenar sistemas que separan preocupaciones de lectura y escritura.',
      ],
    },
  },
  'fault-tolerance': {
    en: {
      heading: 'Fault Tolerance',
      paragraphs: [
        'Fault tolerance is the ability of a system to continue operating when components fail. It is a cornerstone of reliable distributed systems.',
        'The resources below cover redundancy, retries, circuit breakers, graceful degradation, and isolation. Each guide helps you design systems that survive failures.',
      ],
    },
    es: {
      heading: 'Tolerancia a Fallas',
      paragraphs: [
        'La tolerancia a fallas es la capacidad de un sistema de seguir operando cuando los componentes fallan. Es una piedra angular de los sistemas distribuidos confiables.',
        'Los recursos a continuacion cubren redundancia, reintentos, circuit breakers, degradacion elegante y aislamiento. Cada guia te ayuda a disenar sistemas que sobrevivan a fallas.',
      ],
    },
  },
  'horizontal-scaling': {
    en: {
      heading: 'Horizontal Scaling',
      paragraphs: [
        'Horizontal scaling adds more nodes to handle load. It is the primary scaling strategy for distributed systems and cloud-native applications.',
        'The resources below cover load balancing, sharding, stateless services, and auto-scaling. Each guide helps you scale by adding capacity rather than growing existing nodes.',
      ],
    },
    es: {
      heading: 'Escalado Horizontal',
      paragraphs: [
        'El escalado horizontal agrega mas nodos para manejar carga. Es la estrategia principal de escalado para sistemas distribuidos y aplicaciones cloud-native.',
        'Los recursos a continuacion cubren load balancing, sharding, servicios stateless y auto-scaling. Cada guia te ayuda a escalar agregando capacidad en lugar de agrandar nodos existentes.',
      ],
    },
  },
  inheritance: {
    en: {
      heading: 'Inheritance in OOP',
      paragraphs: [
        'Inheritance lets a class acquire properties and methods from another class. It is a powerful reuse mechanism but should be used carefully to avoid fragile hierarchies.',
        'The resources below cover base classes, overrides, polymorphism, and composition over inheritance. Each guide helps you use inheritance effectively.',
      ],
    },
    es: {
      heading: 'Herencia en OOP',
      paragraphs: [
        'La herencia permite que una clase adquiera propiedades y metodos de otra clase. Es un poderoso mecanismo de reutilizacion pero debe usarse con cuidado para evitar jerarquias fragiles.',
        'Los recursos a continuacion cubren clases base, overrides, polimorfismo y composicion sobre herencia. Cada guia te ayuda a usar la herencia efectivamente.',
      ],
    },
  },
  'separation-of-concerns': {
    en: {
      heading: 'Separation of Concerns',
      paragraphs: [
        'Separation of concerns divides a system into distinct sections, each with a specific responsibility. It improves maintainability, testing, and team autonomy.',
        'The resources below cover layered architecture, modular design, MVC, and hexagonal architecture. Each guide helps you organize code by responsibility.',
      ],
    },
    es: {
      heading: 'Separacion de Preocupaciones',
      paragraphs: [
        'La separacion de preocupaciones divide un sistema en secciones distintas, cada una con una responsabilidad especifica. Mejora mantenibilidad, testing y autonomia del equipo.',
        'Los recursos a continuacion cubren arquitectura por capas, diseno modular, MVC y arquitectura hexagonal. Cada guia te ayuda a organizar el codigo por responsabilidad.',
      ],
    },
  },
  eventbridge: {
    en: {
      heading: 'Amazon EventBridge',
      paragraphs: [
        'Amazon EventBridge is a serverless event bus. It connects applications, SaaS, and AWS services through events.',
        'The resources below cover event rules, schemas, event buses, and event-driven patterns. Each guide helps you build event-driven architectures on AWS.',
      ],
    },
    es: {
      heading: 'Amazon EventBridge',
      paragraphs: [
        'Amazon EventBridge es un event bus serverless. Conecta aplicaciones, SaaS y servicios de AWS a traves de eventos.',
        'Los recursos a continuacion cubren reglas de eventos, esquemas, buses de eventos y patrones event-driven. Cada guia te ayuda a construir arquitecturas event-driven en AWS.',
      ],
    },
  },
  specification: {
    en: {
      heading: 'Specification Pattern',
      paragraphs: [
        'The specification pattern encapsulates business rules into reusable objects. It is useful for validation, querying, and combining rules.',
        'The resources below cover composite specifications, validation, and query filtering. Each guide helps you express business logic in a composable way.',
      ],
    },
    es: {
      heading: 'Patron Specification',
      paragraphs: [
        'El patron specification encapsula reglas de negocio en objetos reutilizables. Es util para validacion, consultas y combinacion de reglas.',
        'Los recursos a continuacion cubren especificaciones compuestas, validacion y filtrado de consultas. Cada guia te ayuda a expresar logica de negocio de forma componible.',
      ],
    },
  },
  'schema-design': {
    en: {
      heading: 'Schema Design',
      paragraphs: [
        'Schema design defines how data is structured and validated. Good schema design balances flexibility, performance, and evolution.',
        'The resources below cover database schemas, API schemas, normalization, and schema evolution. Each guide helps you design schemas that serve your application over time.',
      ],
    },
    es: {
      heading: 'Diseno de Esquemas',
      paragraphs: [
        'El diseno de esquemas define como se estructuran y validan los datos. Un buen diseno equilibra flexibilidad, rendimiento y evolucion.',
        'Los recursos a continuacion cubren esquemas de bases de datos, esquemas de APIs, normalizacion y evolucion de esquemas. Cada guia te ayuda a disenar esquemas que sirvan a tu aplicacion con el tiempo.',
      ],
    },
  },
  zipkin: {
    en: {
      heading: 'Zipkin and Distributed Tracing',
      paragraphs: [
        'Zipkin is a distributed tracing system. It collects and visualizes traces to help diagnose latency and dependencies.',
        'The resources below cover instrumentation, sampling, span creation, and integration. Each guide helps you trace requests across services with Zipkin.',
      ],
    },
    es: {
      heading: 'Zipkin y Trazas Distribuidas',
      paragraphs: [
        'Zipkin es un sistema de trazas distribuidas. Recopila y visualiza trazas para ayudar a diagnosticar latencia y dependencias.',
        'Los recursos a continuacion cubren instrumentacion, sampling, creacion de spans e integracion. Cada guia te ayuda a rastrear solicitudes entre servicios con Zipkin.',
      ],
    },
  },
  dashboard: {
    en: {
      heading: 'Dashboards and Visualization',
      paragraphs: [
        'Dashboards display key metrics and data in a visual format. Good dashboards are actionable, focused, and updated in near real time.',
        'The resources below cover Grafana, Tableau, Metabase, and dashboard design. Each guide helps you build dashboards that drive decisions.',
      ],
    },
    es: {
      heading: 'Dashboards y Visualizacion',
      paragraphs: [
        'Los dashboards muestran metricas y datos clave en formato visual. Buenos dashboards son accionables, enfocados y actualizados casi en tiempo real.',
        'Los recursos a continuacion cubren Grafana, Tableau, Metabase y diseno de dashboards. Cada guia te ayuda a construir dashboards que impulsen decisiones.',
      ],
    },
  },
  'structured-logging': {
    en: {
      heading: 'Structured Logging',
      paragraphs: [
        'Structured logging outputs logs as machine-readable data. It makes logs easier to search, aggregate, and analyze at scale.',
        'The resources below cover JSON logs, log levels, context, and parsing. Each guide helps you build logging that is useful for both humans and machines.',
      ],
    },
    es: {
      heading: 'Logging Estructurado',
      paragraphs: [
        'El logging estructurado genera logs como datos legibles por maquinas. Hace los logs mas faciles de buscar, agregar y analizar a escala.',
        'Los recursos a continuacion cubren logs JSON, niveles de log, contexto y parseo. Cada guia te ayuda a construir logging util tanto para humanos como para maquinas.',
      ],
    },
  },
  elk: {
    en: {
      heading: 'ELK Stack',
      paragraphs: [
        'The ELK Stack is Elasticsearch, Logstash, and Kibana. It is a popular solution for log aggregation, search, and visualization.',
        'The resources below cover log shipping, parsing, indexing, and dashboard creation. Each guide helps you set up and operate an ELK stack.',
      ],
    },
    es: {
      heading: 'ELK Stack',
      paragraphs: [
        'ELK Stack es Elasticsearch, Logstash y Kibana. Es una solucion popular para agregacion, busqueda y visualizacion de logs.',
        'Los recursos a continuacion cubren envio de logs, parseo, indexacion y creacion de dashboards. Cada guia te ayuda a configurar y operar un stack ELK.',
      ],
    },
  },
  contract: {
    en: {
      heading: 'Contract and API Contracts',
      paragraphs: [
        'A contract defines the expected inputs, outputs, and behavior of an interface. Contract testing verifies that services adhere to these agreements.',
        'The resources below cover OpenAPI, Pact, schema contracts, and consumer-driven contracts. Each guide helps you build and maintain reliable service interfaces.',
      ],
    },
    es: {
      heading: 'Contratos y Contratos de APIs',
      paragraphs: [
        'Un contrato define las entradas, salidas y comportamiento esperados de una interfaz. El contract testing verifica que los servicios cumplen estos acuerdos.',
        'Los recursos a continuacion cubren OpenAPI, Pact, contratos de esquema y consumer-driven contracts. Cada guia te ayuda a construir y mantener interfaces de servicio confiables.',
      ],
    },
  },
  'integration-tests': {
    en: {
      heading: 'Integration Testing',
      paragraphs: [
        'Integration testing verifies that multiple components work together. It catches issues that unit tests miss at the boundaries between systems.',
        'The resources below cover test containers, in-memory databases, service stubs, and CI integration. Each guide helps you write integration tests that are reliable and fast.',
      ],
    },
    es: {
      heading: 'Tests de Integracion',
      paragraphs: [
        'El testing de integracion verifica que multiples componentes trabajen juntos. Detecta problemas que los tests unitarios omiten en los limites entre sistemas.',
        'Los recursos a continuacion cubren test containers, bases de datos en memoria, stubs de servicios e integracion con CI. Cada guia te ayuda a escribir tests de integracion confiables y rapidos.',
      ],
    },
  },
  regression: {
    en: {
      heading: 'Regression Testing',
      paragraphs: [
        'Regression testing ensures that new changes do not break existing functionality. It is essential for maintaining quality in evolving systems.',
        'The resources below cover test selection, automation, smoke tests, and test suites. Each guide helps you prevent regressions from reaching production.',
      ],
    },
    es: {
      heading: 'Testing de Regresion',
      paragraphs: [
        'El testing de regresion asegura que los nuevos cambios no rompan funcionalidad existente. Es esencial para mantener calidad en sistemas en evolucion.',
        'Los recursos a continuacion cubren seleccion de tests, automatizacion, smoke tests y suites de test. Cada guia te ayuda a prevenir regresiones en produccion.',
      ],
    },
  },
  'test-pyramid': {
    en: {
      heading: 'Test Pyramid',
      paragraphs: [
        'The test pyramid recommends many unit tests, fewer integration tests, and even fewer end-to-end tests. It balances coverage, speed, and confidence.',
        'The resources below cover unit, integration, and E2E testing, and how to find the right balance. Each guide helps you build a sustainable test strategy.',
      ],
    },
    es: {
      heading: 'Piramide de Tests',
      paragraphs: [
        'La piramide de tests recomienda muchos tests unitarios, menos de integracion y aun menos end-to-end. Equilibra cobertura, velocidad y confianza.',
        'Los recursos a continuacion cubren testing unit, integracion y E2E, y como encontrar el equilibrio correcto. Cada guia te ayuda a construir una estrategia de testing sostenible.',
      ],
    },
  },
  changelog: {
    en: {
      heading: 'Changelogs and Release Notes',
      paragraphs: [
        'A changelog documents notable changes in a project. It helps users and contributors understand what changed and why.',
        'The resources below cover changelog formats, semantic versioning, release notes, and automation. Each guide helps you keep users informed.',
      ],
    },
    es: {
      heading: 'Changelogs y Notas de Release',
      paragraphs: [
        'Un changelog documenta cambios notables en un proyecto. Ayuda a usuarios y contribuidores a entender que cambio y por que.',
        'Los recursos a continuacion cubren formatos de changelog, semantic versioning, release notes y automatizacion. Cada guia te ayuda a mantener informados a los usuarios.',
      ],
    },
  },
  verification: {
    en: {
      heading: 'Verification and Validation',
      paragraphs: [
        'Verification checks that a system is built correctly, while validation checks that the right system is built. Both are essential for quality.',
        'The resources below cover testing, proofs, checklists, and review processes. Each guide helps you verify and validate systems effectively.',
      ],
    },
    es: {
      heading: 'Verificacion y Validacion',
      paragraphs: [
        'La verificacion comprueba que un sistema se construyo correctamente, mientras que la validacion comprueba que se construyo el sistema correcto. Ambas son esenciales para la calidad.',
        'Los recursos a continuacion cubren testing, pruebas, checklists y procesos de revision. Cada guia te ayuda a verificar y validar sistemas efectivamente.',
      ],
    },
  },
  'vulnerability-management': {
    en: {
      heading: 'Vulnerability Management',
      paragraphs: [
        'Vulnerability management is the continuous process of identifying, assessing, and remediating security weaknesses. It reduces risk over time.',
        'The resources below cover scanning, CVE tracking, patching, prioritization, and reporting. Each guide helps you manage vulnerabilities in your stack.',
      ],
    },
    es: {
      heading: 'Gestion de Vulnerabilidades',
      paragraphs: [
        'La gestion de vulnerabilidades es el proceso continuo de identificar, evaluar y remediar debilidades de seguridad. Reduce el riesgo con el tiempo.',
        'Los recursos a continuacion cubren escaneo, seguimiento de CVE, parches, priorizacion y reportes. Cada guia te ayuda a gestionar vulnerabilidades en tu stack.',
      ],
    },
  },
  argocd: {
    en: {
      heading: 'Argo CD',
      paragraphs: [
        'Argo CD is a declarative, GitOps continuous delivery tool for Kubernetes. It synchronizes application state from a Git repository.',
        'The resources below cover application definitions, sync policies, hooks, and rollbacks. Each guide helps you implement GitOps for Kubernetes with Argo CD.',
      ],
    },
    es: {
      heading: 'Argo CD',
      paragraphs: [
        'Argo CD es una herramienta declarativa de entrega continua GitOps para Kubernetes. Sincroniza el estado de aplicaciones desde un repositorio Git.',
        'Los recursos a continuacion cubren definiciones de aplicaciones, politicas de sync, hooks y rollbacks. Cada guia te ayuda a implementar GitOps para Kubernetes con Argo CD.',
      ],
    },
  },
  outage: {
    en: {
      heading: 'Outage Response',
      paragraphs: [
        'An outage is a period when a service is unavailable. Responding effectively requires detection, communication, and rapid recovery.',
        'The resources below cover incident response, status pages, war rooms, and postmortems. Each guide helps you handle outages with discipline and speed.',
      ],
    },
    es: {
      heading: 'Respuesta a Interrupciones',
      paragraphs: [
        'Un outage es un periodo en el que un servicio no esta disponible. Responder eficazmente requiere deteccion, comunicacion y recuperacion rapida.',
        'Los recursos a continuacion cubren respuesta a incidentes, paginas de estado, war rooms y postmortems. Cada guia te ayuda a manejar interrupciones con disciplina y velocidad.',
      ],
    },
  },
  kms: {
    en: {
      heading: 'Key Management Services',
      paragraphs: [
        'KMS services manage cryptographic keys for encryption, signing, and secret protection. They centralize key lifecycle and access control.',
        'The resources below cover AWS KMS, Google Cloud KMS, Azure Key Vault, and key rotation. Each guide helps you manage keys securely and at scale.',
      ],
    },
    es: {
      heading: 'Servicios de Gestion de Claves',
      paragraphs: [
        'Los servicios KMS gestionan claves criptograficas para cifrado, firma y proteccion de secretos. Centralizan el ciclo de vida de claves y control de acceso.',
        'Los recursos a continuacion cubren AWS KMS, Google Cloud KMS, Azure Key Vault y rotacion de claves. Cada guia te ayuda a gestionar claves de forma segura y a escala.',
      ],
    },
  },
  'incident-management': {
    en: {
      heading: 'Incident Management',
      paragraphs: [
        'Incident management is the process of responding to and resolving unplanned disruptions. It aims to restore service quickly and minimize impact.',
        'The resources below cover incident lifecycle, on-call, communication, runbooks, and postmortems. Each guide helps you manage incidents effectively.',
      ],
    },
    es: {
      heading: 'Gestion de Incidentes',
      paragraphs: [
        'La gestion de incidentes es el proceso de responder y resolver interrupciones no planificadas. Apunta a restaurar el servicio rapidamente y minimizar el impacto.',
        'Los recursos a continuacion cubren ciclo de vida de incidentes, on-call, comunicacion, runbooks y postmortems. Cada guia te ayuda a gestionar incidentes efectivamente.',
      ],
    },
  },
  'root-cause': {
    en: {
      heading: 'Root Cause Analysis',
      paragraphs: [
        'Root cause analysis identifies the underlying cause of a problem. It goes beyond symptoms to find what really needs to change.',
        'The resources below cover the 5 Whys, fault trees, timelines, and corrective actions. Each guide helps you solve problems at their source.',
      ],
    },
    es: {
      heading: 'Analisis de Causa Raiz',
      paragraphs: [
        'El analisis de causa raiz identifica la causa subyacente de un problema. Va mas alla de los sintomas para encontrar lo que realmente necesita cambiar.',
        'Los recursos a continuacion cubren los 5 Whys, arboles de fallas, timelines y acciones correctivas. Cada guia te ayuda a resolver problemas en su origen.',
      ],
    },
  },
  'secret-rotation': {
    en: {
      heading: 'Secret Rotation',
      paragraphs: [
        'Secret rotation replaces credentials and keys on a regular basis. It limits the impact of compromised secrets and is a key security practice.',
        'The resources below cover rotation strategies, automation, zero-downtime rotation, and AWS Secrets Manager. Each guide helps you rotate secrets safely.',
      ],
    },
    es: {
      heading: 'Rotacion de Secretos',
      paragraphs: [
        'La rotacion de secretos reemplaza credenciales y claves regularmente. Limita el impacto de secretos comprometidos y es una practica clave de seguridad.',
        'Los recursos a continuacion cubren estrategias de rotacion, automatizacion, rotacion sin downtime y AWS Secrets Manager. Cada guia te ayuda a rotar secretos de forma segura.',
      ],
    },
  },
  flyweight: {
    en: {
      heading: 'Flyweight Pattern',
      paragraphs: [
        'The flyweight pattern minimizes memory use by sharing data between similar objects. It is useful when many objects have common, extrinsic state.',
        'The resources below cover intrinsic and extrinsic state, object sharing, and memory optimization. Each guide helps you use the flyweight pattern to reduce memory consumption.',
      ],
    },
    es: {
      heading: 'Patron Flyweight',
      paragraphs: [
        'El patron flyweight minimiza el uso de memoria compartiendo datos entre objetos similares. Es util cuando muchos objetos tienen estado extrinseco comun.',
        'Los recursos a continuacion cubren estado intrinseco y extrinseco, comparticion de objetos y optimizacion de memoria. Cada guia te ayuda a usar el patron flyweight para reducir el consumo de memoria.',
      ],
    },
  },
  wcag: {
    en: {
      heading: 'WCAG Guidelines',
      paragraphs: [
        'The Web Content Accessibility Guidelines define how to make web content accessible. They are the global standard for web accessibility.',
        'The resources below cover WCAG levels, success criteria, testing, and implementation. Each guide helps you build sites that meet accessibility standards.',
      ],
    },
    es: {
      heading: 'Guia WCAG',
      paragraphs: [
        'Las Web Content Accessibility Guidelines definen como hacer contenido web accesible. Son el estandar global de accesibilidad web.',
        'Los recursos a continuacion cubren niveles WCAG, criterios de exito, testing e implementacion. Cada guia te ayuda a construir sitios que cumplen estandares de accesibilidad.',
      ],
    },
  },
  a11y: {
    en: {
      heading: 'A11y and Web Accessibility',
      paragraphs: [
        'A11y is the common abbreviation for accessibility. It covers practices, tools, and standards that make digital products usable for everyone.',
        'The resources below cover a11y testing, screen readers, focus management, and semantic HTML. Each guide helps you build inclusive interfaces.',
      ],
    },
    es: {
      heading: 'A11y y Accesibilidad Web',
      paragraphs: [
        'A11y es la abreviatura comun de accesibilidad. Cubre practicas, herramientas y estandares que hacen productos digitales usables para todos.',
        'Los recursos a continuacion cubren testing de a11y, lectores de pantalla, gestion de foco y HTML semantico. Cada guia te ayuda a construir interfaces inclusivas.',
      ],
    },
  },
  compatibility: {
    en: {
      heading: 'Browser and Platform Compatibility',
      paragraphs: [
        'Compatibility ensures software works across browsers, devices, and platforms. It is a key concern for frontend and API development.',
        'The resources below cover feature detection, polyfills, vendor prefixes, and cross-browser testing. Each guide helps you build reliable, widely compatible solutions.',
      ],
    },
    es: {
      heading: 'Compatibilidad de Navegador y Plataforma',
      paragraphs: [
        'La compatibilidad asegura que el software funcione en diferentes navegadores, dispositivos y plataformas. Es una preocupacion clave para frontend y desarrollo de APIs.',
        'Los recursos a continuacion cubren deteccion de caracteristicas, polyfills, prefijos de vendedor y testing cross-browser. Cada guia te ayuda a construir soluciones confiables y ampliamente compatibles.',
      ],
    },
  },
  assessment: {
    en: {
      heading: 'Security and Risk Assessment',
      paragraphs: [
        'Assessment is the process of evaluating security, architecture, or design. It identifies strengths, weaknesses, and areas for improvement.',
        'The resources below cover security assessments, architecture review, risk analysis, and checklists. Each guide helps you evaluate systems objectively.',
      ],
    },
    es: {
      heading: 'Evaluacion de Seguridad y Riesgo',
      paragraphs: [
        'La evaluacion es el proceso de valorar seguridad, arquitectura o diseno. Identifica fortalezas, debilidades y areas de mejora.',
        'Los recursos a continuacion cubren evaluaciones de seguridad, revision de arquitectura, analisis de riesgo y checklists. Cada guia te ayuda a evaluar sistemas objetivamente.',
      ],
    },
  },
  'explain-plan': {
    en: {
      heading: 'EXPLAIN and Query Plans',
      paragraphs: [
        'EXPLAIN is a SQL command that shows how a database executes a query. Query plans are essential for diagnosing slow queries.',
        'The resources below cover reading query plans, indexes, cost estimation, and optimization. Each guide helps you understand and improve query execution.',
      ],
    },
    es: {
      heading: 'EXPLAIN y Planes de Consulta',
      paragraphs: [
        'EXPLAIN es un comando SQL que muestra como una base de datos ejecuta una consulta. Los planes de consulta son esenciales para diagnosticar consultas lentas.',
        'Los recursos a continuacion cubren lectura de planes de consulta, indices, estimacion de costos y optimizacion. Cada guia te ayuda a entender y mejorar la ejecucion de consultas.',
      ],
    },
  },
  'aws-secrets-manager': {
    en: {
      heading: 'AWS Secrets Manager',
      paragraphs: [
        'AWS Secrets Manager helps you rotate, manage, and retrieve secrets. It integrates with many AWS services and supports automatic rotation.',
        'The resources below cover secret retrieval, rotation, IAM policies, and integration. Each guide helps you manage secrets safely in AWS.',
      ],
    },
    es: {
      heading: 'AWS Secrets Manager',
      paragraphs: [
        'AWS Secrets Manager ayuda a rotar, gestionar y recuperar secretos. Se integra con muchos servicios de AWS y soporta rotacion automatica.',
        'Los recursos a continuacion cubren recuperacion de secretos, rotacion, politicas IAM e integracion. Cada guia te ayuda a gestionar secretos de forma segura en AWS.',
      ],
    },
  },
  'clean-architecture': {
    en: {
      heading: 'Clean Architecture',
      paragraphs: [
        'Clean Architecture is a layered design by Robert C. Martin. It keeps business logic independent of frameworks, UI, and databases.',
        'The resources below cover entities, use cases, interfaces, dependency rule, and testing. Each guide helps you build systems with maintainable boundaries.',
      ],
    },
    es: {
      heading: 'Clean Architecture',
      paragraphs: [
        'Clean Architecture es un diseno en capas de Robert C. Martin. Mantiene la logica de negocio independiente de frameworks, UI y bases de datos.',
        'Los recursos a continuacion cubren entidades, casos de uso, interfaces, regla de dependencias y testing. Cada guia te ayuda a construir sistemas con limites mantenibles.',
      ],
    },
  },
  'layered-architecture': {
    en: {
      heading: 'Layered Architecture',
      paragraphs: [
        'Layered architecture organizes code into horizontal layers. Each layer has a responsibility and depends only on layers below it.',
        'The resources below cover presentation, business, persistence, and database layers. Each guide helps you structure applications with clear separation.',
      ],
    },
    es: {
      heading: 'Arquitectura por Capas',
      paragraphs: [
        'La arquitectura por capas organiza el codigo en capas horizontales. Cada capa tiene una responsabilidad y depende solo de las capas inferiores.',
        'Los recursos a continuacion cubren capas de presentacion, negocio, persistencia y base de datos. Cada guia te ayuda a estructurar aplicaciones con separacion clara.',
      ],
    },
  },
  'service-mesh': {
    en: {
      heading: 'Service Mesh',
      paragraphs: [
        'A service mesh manages service-to-service communication in microservices. It adds observability, security, and traffic control without changing application code.',
        'The resources below cover Istio, Linkerd, sidecars, mTLS, and canary deployments. Each guide helps you operate microservices at scale.',
      ],
    },
    es: {
      heading: 'Service Mesh',
      paragraphs: [
        'Un service mesh gestiona la comunicacion entre servicios en microservicios. Agrega observabilidad, seguridad y control de trafico sin cambiar codigo de aplicacion.',
        'Los recursos a continuacion cubren Istio, Linkerd, sidecars, mTLS y despliegues canary. Cada guia te ayuda a operar microservicios a escala.',
      ],
    },
  },
  'database-design': {
    en: {
      heading: 'Database Design',
      paragraphs: [
        'Database design defines schemas, relationships, constraints, and indexes. Good design balances normalization, performance, and flexibility.',
        'The resources below cover ER diagrams, normalization, keys, indexing, and design patterns. Each guide helps you design databases that meet your workload.',
      ],
    },
    es: {
      heading: 'Diseno de Bases de Datos',
      paragraphs: [
        'El diseno de bases de datos define esquemas, relaciones, restricciones e indices. Un buen diseno equilibra normalizacion, rendimiento y flexibilidad.',
        'Los recursos a continuacion cubren diagramas ER, normalizacion, claves, indexacion y patrones de diseno. Cada guia te ayuda a disenar bases de datos adecuadas a tu carga.',
      ],
    },
  },
  'cloud-computing': {
    en: {
      heading: 'Cloud Computing',
      paragraphs: [
        'Cloud computing delivers computing resources over the internet. It offers scalable compute, storage, and networking without owning hardware.',
        'The resources below cover IaaS, PaaS, SaaS, serverless, and cloud migration. Each guide helps you use cloud services effectively.',
      ],
    },
    es: {
      heading: 'Cloud Computing',
      paragraphs: [
        'El cloud computing entrega recursos de computo por internet. Ofrece computo, almacenamiento y redes escalables sin poseer hardware.',
        'Los recursos a continuacion cubren IaaS, PaaS, SaaS, serverless y migracion a la nube. Cada guia te ayuda a usar servicios cloud efectivamente.',
      ],
    },
  },
  injection: {
    en: {
      heading: 'Dependency Injection and Inversion',
      paragraphs: [
        'Dependency injection and inversion of control decouple components by supplying dependencies from outside. They improve testability and flexibility.',
        'The resources below cover constructor injection, containers, service locators, and IoC. Each guide helps you build loosely coupled systems.',
      ],
    },
    es: {
      heading: 'Inyeccion de Dependencias e Inversion de Control',
      paragraphs: [
        'La inyeccion de dependencias y la inversion de control desacoplan componentes suministrando dependencias desde fuera. Mejoran testeabilidad y flexibilidad.',
        'Los recursos a continuacion cubren constructor injection, containers, service locators e IoC. Cada guia te ayuda a construir sistemas poco acoplados.',
      ],
    },
  },
  'reserved-instances': {
    en: {
      heading: 'Reserved Instances and Savings Plans',
      paragraphs: [
        'Reserved instances are pre-purchased cloud compute capacity at a discount. They reduce costs for predictable workloads.',
        'The resources below cover AWS, Azure, and Google Cloud reservations, savings plans, and cost trade-offs. Each guide helps you optimize cloud spend.',
      ],
    },
    es: {
      heading: 'Reserved Instances y Savings Plans',
      paragraphs: [
        'Las instancias reservadas son capacidad de computo en la nube prepagada con descuento. Reducen costos para cargas predecibles.',
        'Los recursos a continuacion cubren reservas de AWS, Azure y Google Cloud, savings plans y trade-offs de costo. Cada guia te ayuda a optimizar gasto cloud.',
      ],
    },
  },
  flexbox: {
    en: {
      heading: 'CSS Flexbox',
      paragraphs: [
        'Flexbox is a one-dimensional CSS layout model. It is ideal for aligning items, building navigation bars, and responsive component layouts.',
        'The resources below cover flex direction, justify content, align items, and practical patterns. Each guide helps you build flexible and responsive layouts.',
      ],
    },
    es: {
      heading: 'CSS Flexbox',
      paragraphs: [
        'Flexbox es un modelo de layout CSS unidimensional. Es ideal para alinear elementos, construir barras de navegacion y layouts de componentes responsivos.',
        'Los recursos a continuacion cubren flex direction, justify content, align items y patrones practicos. Cada guia te ayuda a construir layouts flexibles y responsivos.',
      ],
    },
  },
  'responsive-design': {
    en: {
      heading: 'Responsive Design',
      paragraphs: [
        'Responsive design makes web pages work across screen sizes. It uses fluid grids, flexible images, and media queries.',
        'The resources below cover media queries, mobile-first design, breakpoints, and viewport handling. Each guide helps you build sites that look good on any device.',
      ],
    },
    es: {
      heading: 'Diseno Responsivo',
      paragraphs: [
        'El diseno responsivo hace que las paginas web funcionen en diferentes tamanos de pantalla. Usa grids fluidos, imagenes flexibles y media queries.',
        'Los recursos a continuacion cubren media queries, diseno mobile-first, breakpoints y manejo del viewport. Cada guia te ayuda a construir sitios que se vean bien en cualquier dispositivo.',
      ],
    },
  },
  'owasp-top-10': {
    en: {
      heading: 'OWASP Top 10',
      paragraphs: [
        'The OWASP Top 10 is a standard list of the most critical web application security risks. It is a starting point for building secure web applications.',
        'The resources below cover injection, broken access control, XSS, insecure design, and more. Each guide helps you address the most common web vulnerabilities.',
      ],
    },
    es: {
      heading: 'OWASP Top 10',
      paragraphs: [
        'El OWASP Top 10 es una lista estandar de los riesgos de seguridad de aplicaciones web mas criticos. Es un punto de partida para construir aplicaciones web seguras.',
        'Los recursos a continuacion cubren inyeccion, control de acceso roto, XSS, diseno inseguro y mas. Cada guia te ayuda a abordar las vulnerabilidades web mas comunes.',
      ],
    },
  },
  'fine-tuning': {
    en: {
      heading: 'Fine-Tuning Language Models',
      paragraphs: [
        'Fine-tuning adapts a pre-trained model to a specific task or domain. It can improve accuracy beyond prompt engineering alone.',
        'The resources below cover datasets, training, LoRA, evaluation, and deployment. Each guide helps you fine-tune models for your use case.',
      ],
    },
    es: {
      heading: 'Fine-Tuning de Modelos de Lenguaje',
      paragraphs: [
        'El fine-tuning adapta un modelo preentrenado a una tarea o dominio especifico. Puede mejorar la precision mas alla del prompt engineering.',
        'Los recursos a continuacion cubren datasets, entrenamiento, LoRA, evaluacion y despliegue. Cada guia te ayuda a ajustar modelos para tu caso de uso.',
      ],
    },
  },
  lcel: {
    en: {
      heading: 'LangChain Expression Language',
      paragraphs: [
        'LCEL is a declarative way to compose LangChain components. It makes chains easier to build, inspect, and stream.',
        'The resources below cover chain composition, streaming, parallel execution, and fallback chains. Each guide helps you use LCEL to build flexible LLM pipelines.',
      ],
    },
    es: {
      heading: 'LCEL de LangChain',
      paragraphs: [
        'LCEL es una forma declarativa de componer componentes de LangChain. Hace que las cadenas sean mas faciles de construir, inspeccionar y stremear.',
        'Los recursos a continuacion cubren composicion de cadenas, streaming, ejecucion paralela y cadenas de fallback. Cada guia te ayuda a usar LCEL para construir pipelines de LLM flexibles.',
      ],
    },
  },
  chains: {
    en: {
      heading: 'LangChain Chains',
      paragraphs: [
        'Chains in LangChain connect components like prompts, models, and parsers into a sequence. They are the basic building block of LLM applications.',
        'The resources below cover simple chains, sequential chains, routing, and custom chains. Each guide helps you build composable LLM workflows.',
      ],
    },
    es: {
      heading: 'Chains de LangChain',
      paragraphs: [
        'Las chains en LangChain conectan componentes como prompts, modelos y parsers en una secuencia. Son el bloque basico de construccion de aplicaciones de LLM.',
        'Los recursos a continuacion cubren chains simples, cadenas secuenciales, routing y chains personalizadas. Cada guia te ayuda a construir workflows de LLM componibles.',
      ],
    },
  },
  ragas: {
    en: {
      heading: 'RAG Evaluation with RAGAS',
      paragraphs: [
        'RAGAS is a framework for evaluating RAG pipelines. It provides metrics for context precision, recall, answer relevancy, and faithfulness.',
        'The resources below cover RAGAS setup, metrics, evaluation datasets, and interpretation. Each guide helps you measure and improve RAG quality.',
      ],
    },
    es: {
      heading: 'Evaluacion RAG con RAGAS',
      paragraphs: [
        'RAGAS es un framework para evaluar pipelines de RAG. Proporciona metricas para precision de contexto, recall, relevancia de respuesta y fidelidad.',
        'Los recursos a continuacion cubren setup de RAGAS, metricas, datasets de evaluacion e interpretacion. Cada guia te ayuda a medir y mejorar la calidad de RAG.',
      ],
    },
  },
  ollama: {
    en: {
      heading: 'Ollama',
      paragraphs: [
        'Ollama is a tool for running and managing local large language models. It simplifies downloading, configuring, and serving models.',
        'The resources below cover model pull, Modelfiles, REST API, and integration. Each guide helps you run local LLMs with Ollama.',
      ],
    },
    es: {
      heading: 'Ollama',
      paragraphs: [
        'Ollama es una herramienta para ejecutar y gestionar modelos grandes de lenguaje locales. Simplifica descargar, configurar y servir modelos.',
        'Los recursos a continuacion cubren pull de modelos, Modelfiles, API REST e integracion. Cada guia te ayuda a ejecutar LLMs locales con Ollama.',
      ],
    },
  },
  'semantic-search': {
    en: {
      heading: 'Semantic Search',
      paragraphs: [
        'Semantic search finds results based on meaning rather than exact keyword matches. It uses embeddings and vector search.',
        'The resources below cover dense retrieval, embedding models, reranking, and hybrid search. Each guide helps you build search that understands user intent.',
      ],
    },
    es: {
      heading: 'Busqueda Semantica',
      paragraphs: [
        'La busqueda semantica encuentra resultados basandose en significado en lugar de coincidencias exactas de palabras clave. Usa embeddings y busqueda vectorial.',
        'Los recursos a continuacion cubren recuperacion densa, modelos de embeddings, reranking y busqueda hibrida. Cada guia te ayuda a construir busqueda que entienda la intencion del usuario.',
      ],
    },
  },
  'function-calling': {
    en: {
      heading: 'Function Calling in LLMs',
      paragraphs: [
        'Function calling lets LLMs invoke external tools or APIs. It is the foundation of agents and tool-augmented applications.',
        'The resources below cover tool definitions, schema, parsing, and execution. Each guide helps you connect LLMs to real-world capabilities.',
      ],
    },
    es: {
      heading: 'Function Calling en LLMs',
      paragraphs: [
        'El function calling permite a los LLMs invocar herramientas o APIs externas. Es la base de agentes y aplicaciones aumentadas con herramientas.',
        'Los recursos a continuacion cubren definiciones de herramientas, esquemas, parseo y ejecucion. Cada guia te ayuda a conectar LLMs a capacidades del mundo real.',
      ],
    },
  },
  'text-processing': {
    en: {
      heading: 'Text Processing',
      paragraphs: [
        'Text processing transforms and analyzes text. It is used for parsing, cleaning, tokenization, and feature extraction.',
        'The resources below cover regex, string manipulation, tokenization, and libraries like spaCy and NLTK. Each guide helps you work with text data.',
      ],
    },
    es: {
      heading: 'Procesamiento de Texto',
      paragraphs: [
        'El procesamiento de texto transforma y analiza texto. Se usa para parseo, limpieza, tokenizacion y extraccion de caracteristicas.',
        'Los recursos a continuacion cubren regex, manipulacion de strings, tokenizacion y librerias como spaCy y NLTK. Cada guia te ayuda a trabajar con datos de texto.',
      ],
    },
  },
  'sliding-window': {
    en: {
      heading: 'Sliding Window Pattern',
      paragraphs: [
        'The sliding window pattern is an efficient algorithmic technique. It is used to solve problems over contiguous subarrays or substrings.',
        'The resources below cover fixed and dynamic windows, two pointers, and common interview problems. Each guide helps you recognize and apply sliding window solutions.',
      ],
    },
    es: {
      heading: 'Patron Sliding Window',
      paragraphs: [
        'El patron sliding window es una tecnica algoritmica eficiente. Se usa para resolver problemas sobre subarreglos o subcadenas contiguos.',
        'Los recursos a continuacion cubren ventanas fijas y dinamicas, two pointers y problemas comunes de entrevistas. Cada guia te ayuda a reconocer y aplicar soluciones de sliding window.',
      ],
    },
  },
  'web-services': {
    en: {
      heading: 'Web Services',
      paragraphs: [
        'Web services expose functionality over the web using standards like HTTP, XML, and JSON. They enable communication between distributed systems.',
        'The resources below cover REST, SOAP, WSDL, and service design. Each guide helps you build web services that are reliable and interoperable.',
      ],
    },
    es: {
      heading: 'Servicios Web',
      paragraphs: [
        'Los servicios web exponen funcionalidad a traves de la web usando estandares como HTTP, XML y JSON. Habilitan la comunicacion entre sistemas distribuidos.',
        'Los recursos a continuacion cubren REST, SOAP, WSDL y diseno de servicios. Cada guia te ayuda a construir servicios web confiables e interoperables.',
      ],
    },
  },
  flask: {
    en: {
      heading: 'Flask',
      paragraphs: [
        'Flask is a lightweight Python web framework. It is minimal and extensible, making it a popular choice for web APIs and microservices.',
        'The resources below cover routes, blueprints, Jinja, extensions, and testing. Each guide helps you build Python web apps with Flask.',
      ],
    },
    es: {
      heading: 'Flask',
      paragraphs: [
        'Flask es un framework web ligero de Python. Es minimal y extensible, lo que lo hace popular para APIs web y microservicios.',
        'Los recursos a continuacion cubren rutas, blueprints, Jinja, extensiones y testing. Cada guia te ayuda a construir aplicaciones web Python con Flask.',
      ],
    },
  },
  'rest-api': {
    en: {
      heading: 'REST API Design',
      paragraphs: [
        'REST is an architectural style for networked applications. REST APIs use HTTP methods and resource-based URLs to expose data and operations.',
        'The resources below cover resources, HTTP verbs, status codes, versioning, and statelessness. Each guide helps you design clean and predictable REST APIs.',
      ],
    },
    es: {
      heading: 'Diseno de APIs REST',
      paragraphs: [
        'REST es un estilo arquitectonico para aplicaciones en red. Las APIs REST usan metodos HTTP y URLs basadas en recursos para exponer datos y operaciones.',
        'Los recursos a continuacion cubren recursos, verbos HTTP, codigos de estado, versionado y statelessness. Cada guia te ayuda a disenar APIs REST limpias y predecibles.',
      ],
    },
  },
  email: {
    en: {
      heading: 'Email Integration and Sending',
      paragraphs: [
        'Email integration lets applications send notifications, newsletters, and transactional messages. It requires SMTP, templates, deliverability, and compliance.',
        'The resources below cover SMTP, DKIM, SPF, templates, and sending libraries. Each guide helps you send email reliably from applications.',
      ],
    },
    es: {
      heading: 'Integracion y Envio de Email',
      paragraphs: [
        'La integracion de email permite a las aplicaciones enviar notificaciones, newsletters y mensajes transaccionales. Requiere SMTP, plantillas, entregabilidad y cumplimiento.',
        'Los recursos a continuacion cubren SMTP, DKIM, SPF, plantillas y librerias de envio. Cada guia te ayuda a enviar email de forma confiable desde aplicaciones.',
      ],
    },
  },
  'server-sent-events': {
    en: {
      heading: 'Server-Sent Events',
      paragraphs: [
        'Server-Sent Events allow servers to push real-time updates to clients over an HTTP connection. They are simple and efficient for unidirectional streaming.',
        'The resources below cover EventSource, MIME types, reconnection, and use cases. Each guide helps you implement real-time server-to-client updates.',
      ],
    },
    es: {
      heading: 'Eventos Enviados por el Servidor',
      paragraphs: [
        'Server-Sent Events permiten a los servidores enviar actualizaciones en tiempo real a los clientes sobre una conexion HTTP. Son simples y eficientes para streaming unidireccional.',
        'Los recursos a continuacion cubren EventSource, tipos MIME, reconexion y casos de uso. Cada guia te ayuda a implementar actualizaciones en tiempo real de servidor a cliente.',
      ],
    },
  },
  bidirectional: {
    en: {
      heading: 'Bidirectional Communication',
      paragraphs: [
        'Bidirectional communication allows both client and server to send messages at any time. WebSockets and WebRTC are common protocols for this pattern.',
        'The resources below cover WebSockets, full-duplex protocols, and design patterns. Each guide helps you build interactive, real-time applications.',
      ],
    },
    es: {
      heading: 'Comunicacion Bidireccional',
      paragraphs: [
        'La comunicacion bidireccional permite que tanto cliente como servidor envien mensajes en cualquier momento. WebSockets y WebRTC son protocolos comunes para este patron.',
        'Los recursos a continuacion cubren WebSockets, protocolos full-duplex y patrones de diseno. Cada guia te ayuda a construir aplicaciones interactivas en tiempo real.',
      ],
    },
  },
  bulkhead: {
    en: {
      heading: 'Bulkhead Pattern',
      paragraphs: [
        'The bulkhead pattern isolates failures by partitioning resources. It prevents a failure in one part of a system from cascading to others.',
        'The resources below cover thread pools, resource pools, compartments, and fault isolation. Each guide helps you build resilient systems with bulkheads.',
      ],
    },
    es: {
      heading: 'Patron Bulkhead',
      paragraphs: [
        'El patron bulkhead aísla fallas mediante la particion de recursos. Evita que una falla en una parte del sistema se propague a otras.',
        'Los recursos a continuacion cubren thread pools, pools de recursos, compartimentos y aislamiento de fallas. Cada guia te ayuda a construir sistemas resilientes con bulkheads.',
      ],
    },
  },
  compensation: {
    en: {
      heading: 'Compensating Transactions',
      paragraphs: [
        'Compensating transactions undo the effects of completed operations. They are used in saga patterns to recover from failures in distributed systems.',
        'The resources below cover compensation logic, saga orchestration, and idempotency. Each guide helps you build distributed workflows that can be safely rolled back.',
      ],
    },
    es: {
      heading: 'Transacciones Compensatorias',
      paragraphs: [
        'Las transacciones compensatorias deshacen los efectos de operaciones completadas. Se usan en patrones saga para recuperarse de fallas en sistemas distribuidos.',
        'Los recursos a continuacion cubren logica de compensacion, orquestacion de sagas e idempotencia. Cada guia te ayuda a construir workflows distribuidos que pueden revertirse de forma segura.',
      ],
    },
  },
  hmac: {
    en: {
      heading: 'HMAC',
      paragraphs: [
        'HMAC is a message authentication code using a cryptographic hash function and a secret key. It verifies both integrity and authenticity.',
        'The resources below cover HMAC-SHA256, signing, verification, and common use cases. Each guide helps you use HMAC to protect messages.',
      ],
    },
    es: {
      heading: 'HMAC',
      paragraphs: [
        'HMAC es un codigo de autenticacion de mensajes que usa una funcion hash criptografica y una clave secreta. Verifica tanto integridad como autenticidad.',
        'Los recursos a continuacion cubren HMAC-SHA256, firma, verificacion y casos de uso comunes. Cada guia te ayuda a usar HMAC para proteger mensajes.',
      ],
    },
  },
  saml: {
    en: {
      heading: 'SAML Authentication',
      paragraphs: [
        'SAML is an XML-based standard for single sign-on and identity federation. It is widely used in enterprise identity management.',
        'The resources below cover identity providers, service providers, assertions, and flows. Each guide helps you implement SAML-based authentication.',
      ],
    },
    es: {
      heading: 'Autenticacion SAML',
      paragraphs: [
        'SAML es un estandar basado en XML para single sign-on y federacion de identidad. Se usa ampliamente en gestion de identidades empresarial.',
        'Los recursos a continuacion cubren proveedores de identidad, proveedores de servicio, assertions y flujos. Cada guia te ayuda a implementar autenticacion basada en SAML.',
      ],
    },
  },
  cookies: {
    en: {
      heading: 'HTTP Cookies',
      paragraphs: [
        'Cookies are small pieces of data stored by the browser. They are used for sessions, preferences, tracking, and authentication.',
        'The resources below cover secure, HttpOnly, SameSite, expiration, and cookie security. Each guide helps you use cookies safely and effectively.',
      ],
    },
    es: {
      heading: 'Cookies HTTP',
      paragraphs: [
        'Las cookies son pequenos datos almacenados por el navegador. Se usan para sesiones, preferencias, seguimiento y autenticacion.',
        'Los recursos a continuacion cubren secure, HttpOnly, SameSite, expiracion y seguridad de cookies. Cada guia te ayuda a usar cookies de forma segura y efectiva.',
      ],
    },
  },
  fastly: {
    en: {
      heading: 'Fastly Edge Cloud',
      paragraphs: [
        'Fastly is an edge cloud platform that provides CDN, compute, and security services. It allows logic to run at the edge for low latency.',
        'The resources below cover VCL, Compute, edge caching, and security services. Each guide helps you build fast and secure edge applications.',
      ],
    },
    es: {
      heading: 'Fastly Edge Cloud',
      paragraphs: [
        'Fastly es una plataforma de edge cloud que proporciona CDN, computo y servicios de seguridad. Permite ejecutar logica en el edge para baja latencia.',
        'Los recursos a continuacion cubren VCL, Compute, caching en el edge y servicios de seguridad. Cada guia te ayuda a construir aplicaciones rapidas y seguras en el edge.',
      ],
    },
  },
  'in-memory-cache': {
    en: {
      heading: 'In-Memory Caching',
      paragraphs: [
        'In-memory caching stores data in RAM for fast access. It is ideal for hot data, session stores, and reducing database load.',
        'The resources below cover Redis, Memcached, eviction, TTL, and cache patterns. Each guide helps you implement fast, low-latency caching.',
      ],
    },
    es: {
      heading: 'Cache en Memoria',
      paragraphs: [
        'El cache en memoria almacena datos en RAM para acceso rapido. Es ideal para datos calientes, almacenes de sesion y reducir carga de base de datos.',
        'Los recursos a continuacion cubren Redis, Memcached, eviction, TTL y patrones de cache. Cada guia te ayuda a implementar caching rapido y de baja latencia.',
      ],
    },
  },
  'http-cache': {
    en: {
      heading: 'HTTP Caching',
      paragraphs: [
        'HTTP caching uses headers to control how clients and intermediaries cache responses. It reduces bandwidth and improves load times.',
        'The resources below cover Cache-Control, ETag, Last-Modified, and validation. Each guide helps you optimize responses with HTTP caching.',
      ],
    },
    es: {
      heading: 'Cache HTTP',
      paragraphs: [
        'El cache HTTP usa headers para controlar como clientes e intermediarios almacenan respuestas. Reduce ancho de banda y mejora tiempos de carga.',
        'Los recursos a continuacion cubren Cache-Control, ETag, Last-Modified y validacion. Cada guia te ayuda a optimizar respuestas con cache HTTP.',
      ],
    },
  },
  'distributed-cache': {
    en: {
      heading: 'Distributed Caching',
      paragraphs: [
        'A distributed cache shares state across multiple nodes. It is used for session replication, rate limit counters, and fast lookups in scalable systems.',
        'The resources below cover Redis Cluster, Hazelcast, cache consistency, and eviction. Each guide helps you operate caches across nodes.',
      ],
    },
    es: {
      heading: 'Cache Distribuido',
      paragraphs: [
        'Un cache distribuido comparte estado entre multiples nodos. Se usa para replicacion de sesiones, contadores de rate limit y busquedas rapidas en sistemas escalables.',
        'Los recursos a continuacion cubren Redis Cluster, Hazelcast, consistencia de cache y eviction. Cada guia te ayuda a operar caches entre nodos.',
      ],
    },
  },
  pubsub: {
    en: {
      heading: 'Pub/Sub Messaging',
      paragraphs: [
        'Publish-subscribe is a messaging pattern where senders publish messages and receivers subscribe to topics. It decouples producers and consumers.',
        'The resources below cover topics, subscriptions, fan-out, and platforms like Google Pub/Sub and Redis Pub/Sub. Each guide helps you build scalable event distribution.',
      ],
    },
    es: {
      heading: 'Mensajeria Pub/Sub',
      paragraphs: [
        'Publish-subscribe es un patron de mensajeria donde los emisores publican mensajes y los receptores se suscriben a topicos. Desacopla productores y consumidores.',
        'Los recursos a continuacion cubren topicos, suscripciones, fan-out y plataformas como Google Pub/Sub y Redis Pub/Sub. Cada guia te ayuda a construir distribucion de eventos escalable.',
      ],
    },
  },
  csharp: {
    en: {
      heading: 'C# Development',
      paragraphs: [
        'C# is a modern, type-safe language for building applications on .NET. It is used for web, desktop, games, and cloud services.',
        'The resources below cover language features, ASP.NET Core, LINQ, async/await, and patterns. Each guide helps you write effective C# code.',
      ],
    },
    es: {
      heading: 'Desarrollo en C#',
      paragraphs: [
        'C# es un lenguaje moderno y type-safe para construir aplicaciones en .NET. Se usa para web, escritorio, juegos y servicios cloud.',
        'Los recursos a continuacion cubren caracteristicas del lenguaje, ASP.NET Core, LINQ, async/await y patrones. Cada guia te ayuda a escribir codigo C# efectivo.',
      ],
    },
  },
  goroutines: {
    en: {
      heading: 'Go Goroutines',
      paragraphs: [
        'Goroutines are lightweight, concurrent functions in Go. They make concurrent programming accessible and efficient.',
        'The resources below cover goroutine creation, channels, sync primitives, and patterns. Each guide helps you write concurrent Go programs.',
      ],
    },
    es: {
      heading: 'Goroutines en Go',
      paragraphs: [
        'Las goroutines son funciones concurrentes ligeras en Go. Hacen que la programacion concurrente sea accesible y eficiente.',
        'Los recursos a continuacion cubren creacion de goroutines, canales, primitivas de sincronizacion y patrones. Cada guia te ayuda a escribir programas Go concurrentes.',
      ],
    },
  },
  'virtual-threads': {
    en: {
      heading: 'Virtual Threads in Java',
      paragraphs: [
        'Virtual threads are lightweight threads in Java that simplify high-concurrency applications. They reduce the cost of creating and managing threads.',
        'The resources below cover Project Loom, structured concurrency, executors, and migration. Each guide helps you adopt virtual threads in Java.',
      ],
    },
    es: {
      heading: 'Virtual Threads en Java',
      paragraphs: [
        'Los virtual threads son threads ligeros en Java que simplifican aplicaciones de alta concurrencia. Reducen el costo de crear y gestionar threads.',
        'Los recursos a continuacion cubren Project Loom, concurrencia estructurada, executors y migracion. Cada guia te ayuda a adoptar virtual threads en Java.',
      ],
    },
  },
  aiohttp: {
    en: {
      heading: 'aiohttp',
      paragraphs: [
        'aiohttp is an asynchronous HTTP client and server framework for Python. It is built on asyncio and suitable for high-concurrency applications.',
        'The resources below cover client, server, routing, middleware, and websockets. Each guide helps you build async web services with aiohttp.',
      ],
    },
    es: {
      heading: 'aiohttp',
      paragraphs: [
        'aiohttp es un framework asincrono de cliente y servidor HTTP para Python. Esta construido sobre asyncio y es adecuado para aplicaciones de alta concurrencia.',
        'Los recursos a continuacion cubren cliente, servidor, routing, middleware y websockets. Cada guia te ayuda a construir servicios web async con aiohttp.',
      ],
    },
  },
  semaphore: {
    en: {
      heading: 'Semaphores',
      paragraphs: [
        'A semaphore controls access to a common resource by multiple threads. It is used to limit concurrency and coordinate execution.',
        'The resources below cover counting and binary semaphores, acquisition, release, and bounded resources. Each guide helps you use semaphores for concurrency control.',
      ],
    },
    es: {
      heading: 'Semaforos',
      paragraphs: [
        'Un semaforo controla el acceso a un recurso comun por multiples threads. Se usa para limitar concurrencia y coordinar ejecucion.',
        'Los recursos a continuacion cubren semaforos contadores y binarios, adquisicion, liberacion y recursos acotados. Cada guia te ayuda a usar semaforos para control de concurrencia.',
      ],
    },
  },
  'background-jobs': {
    en: {
      heading: 'Background Jobs',
      paragraphs: [
        'Background jobs run work outside the main request flow. They are used for processing, sending emails, and running scheduled tasks.',
        'The resources below cover job queues, workers, retries, scheduling, and monitoring. Each guide helps you build reliable background processing.',
      ],
    },
    es: {
      heading: 'Trabajos en Segundo Plano',
      paragraphs: [
        'Los trabajos en segundo plano ejecutan tareas fuera del flujo principal de la solicitud. Se usan para procesamiento, envio de emails y tareas programadas.',
        'Los recursos a continuacion cubren colas de trabajo, workers, reintentos, programacion y monitoreo. Cada guia te ayuda a construir procesamiento en segundo plano confiable.',
      ],
    },
  },
  parallelism: {
    en: {
      heading: 'Parallelism vs Concurrency',
      paragraphs: [
        'Parallelism executes multiple tasks at the same time. It requires multiple cores and is different from concurrency, which manages multiple tasks over time.',
        'The resources below cover parallel streams, multiprocessing, thread pools, and parallel algorithms. Each guide helps you write programs that execute work simultaneously.',
      ],
    },
    es: {
      heading: 'Paralelismo vs Concurrencia',
      paragraphs: [
        'El paralelismo ejecuta multiples tareas al mismo tiempo. Requiere multiples nucleos y es diferente de la concurrencia, que gestiona varias tareas a lo largo del tiempo.',
        'Los recursos a continuacion cubren parallel streams, multiprocesamiento, thread pools y algoritmos paralelos. Cada guia te ayuda a escribir programas que ejecuten trabajo simultaneamente.',
      ],
    },
  },
  'data-validation': {
    en: {
      heading: 'Data Validation',
      paragraphs: [
        'Data validation ensures that input and output meet expected rules. It is essential for security, correctness, and user experience.',
        'The resources below cover schema validation, type checking, libraries, and validation patterns. Each guide helps you validate data at boundaries.',
      ],
    },
    es: {
      heading: 'Validacion de Datos',
      paragraphs: [
        'La validacion de datos asegura que las entradas y salidas cumplen reglas esperadas. Es esencial para seguridad, correccion y experiencia de usuario.',
        'Los recursos a continuacion cubren validacion de esquemas, type checking, librerias y patrones de validacion. Cada guia te ayuda a validar datos en los limites.',
      ],
    },
  },
  'deep-clone': {
    en: {
      heading: 'Deep Cloning',
      paragraphs: [
        'Deep cloning creates an independent copy of an object and all objects it references. It is needed when shallow copies would share mutable state.',
        'The resources below cover deep copy techniques, serialization, and language-specific implementations. Each guide helps you copy objects without unintended side effects.',
      ],
    },
    es: {
      heading: 'Clonado Profundo',
      paragraphs: [
        'El clonado profundo crea una copia independiente de un objeto y todos los objetos a los que referencia. Es necesario cuando las copias superficiales compartirian estado mutable.',
        'Los recursos a continuacion cubren tecnicas de copia profunda, serializacion e implementaciones especificas por lenguaje. Cada guia te ayuda a copiar objetos sin efectos secundarios no deseados.',
      ],
    },
  },
  processing: {
    en: {
      heading: 'Data and Stream Processing',
      paragraphs: [
        'Processing transforms raw input into useful output. It covers batch, stream, and event-driven data processing patterns.',
        'The resources below cover pipelines, ETL, stream processing, and transformation patterns. Each guide helps you build systems that process data efficiently and reliably.',
      ],
    },
    es: {
      heading: 'Procesamiento de Datos y Streams',
      paragraphs: [
        'El procesamiento transforma entrada cruda en salida util. Cubre patrones de procesamiento batch, streaming y event-driven.',
        'Los recursos a continuacion cubren pipelines, ETL, stream processing y patrones de transformacion. Cada guia te ayuda a construir sistemas que procesan datos eficientemente y de forma confiable.',
      ],
    },
  },
  clone: {
    en: {
      heading: 'Object Cloning',
      paragraphs: [
        'Cloning creates a copy of an object. The depth and behavior of cloning affect whether the copy shares references with the original.',
        'The resources below cover shallow copy, deep copy, copy constructors, and serialization. Each guide helps you clone objects correctly in your language.',
      ],
    },
    es: {
      heading: 'Clonacion de Objetos',
      paragraphs: [
        'La clonacion crea una copia de un objeto. La profundidad y el comportamiento de la clonacion afectan si la copia comparte referencias con el original.',
        'Los recursos a continuacion cubren shallow copy, deep copy, copy constructors y serializacion. Cada guia te ayuda a clonar objetos correctamente en tu lenguaje.',
      ],
    },
  },
  duplication: {
    en: {
      heading: 'Code and Data Duplication',
      paragraphs: [
        'Duplication is the repetition of code or data. It increases maintenance burden and the risk of inconsistent updates.',
        'The resources below cover DRY, deduplication, refactoring, and normalization. Each guide helps you reduce duplication and keep systems consistent.',
      ],
    },
    es: {
      heading: 'Duplicacion de Codigo y Datos',
      paragraphs: [
        'La duplicacion es la repeticion de codigo o datos. Aumenta la carga de mantenimiento y el riesgo de actualizaciones inconsistentes.',
        'Los recursos a continuacion cubren DRY, deduplicacion, refactoring y normalizacion. Cada guia te ayuda a reducir duplicacion y mantener sistemas consistentes.',
      ],
    },
  },
  formatting: {
    en: {
      heading: 'Code and Text Formatting',
      paragraphs: [
        'Formatting ensures code and text follow consistent style. It improves readability and reduces noise in diffs.',
        'The resources below cover formatters, linters, style guides, and pre-commit hooks. Each guide helps you enforce consistent formatting.',
      ],
    },
    es: {
      heading: 'Formateo de Codigo y Texto',
      paragraphs: [
        'El formateo asegura que el codigo y el texto sigan un estilo consistente. Mejora la legibilidad y reduce ruido en los diffs.',
        'Los recursos a continuacion cubren formateadores, linters, guias de estilo y hooks pre-commit. Cada guia te ayuda a hacer cumplir un formateo consistente.',
      ],
    },
  },
  pdf: {
    en: {
      heading: 'PDF Handling',
      paragraphs: [
        'PDF is a portable document format used for reports, invoices, and forms. Working with PDFs requires special libraries and considerations.',
        'The resources below cover PDF generation, parsing, manipulation, and libraries. Each guide helps you work with PDF files in applications.',
      ],
    },
    es: {
      heading: 'Manejo de PDF',
      paragraphs: [
        'PDF es un formato de documento portatil usado para reportes, facturas y formularios. Trabajar con PDFs requiere librerias especiales y consideraciones.',
        'Los recursos a continuacion cubren generacion, parseo, manipulacion y librerias de PDF. Cada guia te ayuda a trabajar con archivos PDF en aplicaciones.',
      ],
    },
  },
  excel: {
    en: {
      heading: 'Excel and Spreadsheet Processing',
      paragraphs: [
        'Excel files store tabular data and are widely used for reporting. Programmatic processing requires libraries that understand XLSX and other formats.',
        'The resources below cover reading, writing, formatting, and formula handling. Each guide helps you process spreadsheets automatically.',
      ],
    },
    es: {
      heading: 'Procesamiento de Excel y Hojas de Calculo',
      paragraphs: [
        'Los archivos Excel almacenan datos tabulares y se usan ampliamente para reportes. El procesamiento programatico requiere librerias que entiendan XLSX y otros formatos.',
        'Los recursos a continuacion cubren lectura, escritura, formateo y manejo de formulas. Cada guia te ayuda a procesar hojas de calculo automaticamente.',
      ],
    },
  },
  config: {
    en: {
      heading: 'Application Configuration',
      paragraphs: [
        'Configuration controls how an application behaves without changing code. Good configuration management keeps secrets safe and supports different environments.',
        'The resources below cover config files, environment variables, feature flags, and secrets. Each guide helps you manage configuration safely and flexibly.',
      ],
    },
    es: {
      heading: 'Configuracion de Aplicaciones',
      paragraphs: [
        'La configuracion controla como se comporta una aplicacion sin cambiar codigo. Una buena gestion de configuracion mantiene secretos seguros y soporta diferentes entornos.',
        'Los recursos a continuacion cubren archivos de configuracion, variables de entorno, feature flags y secretos. Cada guia te ayuda a gestionar configuracion de forma segura y flexible.',
      ],
    },
  },
  xml: {
    en: {
      heading: 'XML Processing',
      paragraphs: [
        'XML is a markup language for structured data. It is used in configuration, SOAP, RSS, and document formats.',
        'The resources below cover parsing, validation, XPath, XSLT, and serialization. Each guide helps you work with XML correctly and safely.',
      ],
    },
    es: {
      heading: 'Procesamiento de XML',
      paragraphs: [
        'XML es un lenguaje de marcado para datos estructurados. Se usa en configuracion, SOAP, RSS y formatos de documentos.',
        'Los recursos a continuacion cubren parseo, validacion, XPath, XSLT y serializacion. Cada guia te ayuda a trabajar con XML correcta y seguramente.',
      ],
    },
  },
  dag: {
    en: {
      heading: 'Directed Acyclic Graphs',
      paragraphs: [
        'A DAG is a graph with directed edges and no cycles. It is used in workflow scheduling, build systems, and blockchain.',
        'The resources below cover topological sort, dependency resolution, and DAG-based tools. Each guide helps you model dependencies without cycles.',
      ],
    },
    es: {
      heading: 'Grafos Dirigidos Aciclicos',
      paragraphs: [
        'Un DAG es un grafo con aristas dirigidas y sin ciclos. Se usa en programacion de workflows, sistemas de build y blockchain.',
        'Los recursos a continuacion cubren orden topologico, resolucion de dependencias y herramientas basadas en DAG. Cada guia te ayuda a modelar dependencias sin ciclos.',
      ],
    },
  },
  dataframe: {
    en: {
      heading: 'DataFrames',
      paragraphs: [
        'A DataFrame is a two-dimensional, labeled data structure. It is the primary abstraction in Pandas, Spark, and many data tools.',
        'The resources below cover DataFrame operations, indexing, grouping, and transformations. Each guide helps you manipulate tabular data efficiently.',
      ],
    },
    es: {
      heading: 'DataFrames',
      paragraphs: [
        'Un DataFrame es una estructura de datos bidimensional etiquetada. Es la abstraccion principal en Pandas, Spark y muchas herramientas de datos.',
        'Los recursos a continuacion cubren operaciones con DataFrames, indexado, agrupacion y transformaciones. Cada guia te ayuda a manipular datos tabulares eficientemente.',
      ],
    },
  },
  pandera: {
    en: {
      heading: 'Pandera and Data Validation',
      paragraphs: [
        'Pandera is a data validation library for Pandas and other DataFrames. It lets you define schemas and validate data at runtime.',
        'The resources below cover schema definition, checks, validation, and integration. Each guide helps you add robust validation to data pipelines.',
      ],
    },
    es: {
      heading: 'Pandera y Validacion de Datos',
      paragraphs: [
        'Pandera es una libreria de validacion de datos para Pandas y otros DataFrames. Permite definir esquemas y validar datos en runtime.',
        'Los recursos a continuacion cubren definicion de esquemas, checks, validacion e integracion. Cada guia te ayuda a agregar validacion robusta a pipelines de datos.',
      ],
    },
  },
  requests: {
    en: {
      heading: 'HTTP Requests',
      paragraphs: [
        'HTTP requests are the foundation of web and API communication. Every request has a method, headers, body, and a response.',
        'The resources below cover clients, retries, timeouts, authentication, and status codes. Each guide helps you make reliable HTTP calls.',
      ],
    },
    es: {
      heading: 'Peticiones HTTP',
      paragraphs: [
        'Las peticiones HTTP son la base de la comunicacion web y de APIs. Cada peticion tiene un metodo, headers, cuerpo y una respuesta.',
        'Los recursos a continuacion cubren clientes, reintentos, timeouts, autenticacion y codigos de estado. Cada guia te ayuda a realizar llamadas HTTP confiables.',
      ],
    },
  },
  guid: {
    en: {
      heading: 'GUIDs and UUIDs',
      paragraphs: [
        'GUIDs and UUIDs are unique identifiers. They are useful for distributed systems where central coordination is impractical.',
        'The resources below cover UUID versions, generation, storage, and collision risks. Each guide helps you use identifiers that are unique without coordination.',
      ],
    },
    es: {
      heading: 'GUIDs y UUIDs',
      paragraphs: [
        'Los GUIDs y UUIDs son identificadores unicos. Son utiles en sistemas distribuidos donde la coordinacion central es impracticable.',
        'Los recursos a continuacion cubren versiones de UUID, generacion, almacenamiento y riesgos de colision. Cada guia te ayuda a usar identificadores unicos sin coordinacion.',
      ],
    },
  },
  deadlocks: {
    en: {
      heading: 'Deadlocks',
      paragraphs: [
        'A deadlock occurs when two or more threads block each other forever, waiting for resources. It is a common concurrency bug.',
        'The resources below cover lock ordering, timeouts, detection, and prevention. Each guide helps you write concurrent code that avoids deadlocks.',
      ],
    },
    es: {
      heading: 'Deadlocks',
      paragraphs: [
        'Un deadlock ocurre cuando dos o mas threads se bloquean mutuamente para siempre, esperando recursos. Es un error comun de concurrencia.',
        'Los recursos a continuacion cubren orden de locks, timeouts, deteccion y prevencion. Cada guia te ayuda a escribir codigo concurrente que evite deadlocks.',
      ],
    },
  },
  'isolation-levels': {
    en: {
      heading: 'Database Isolation Levels',
      paragraphs: [
        'Isolation levels define how transactions interact with each other. They balance consistency and concurrency in databases.',
        'The resources below cover read uncommitted, read committed, repeatable read, and serializable. Each guide helps you choose the right isolation for your workload.',
      ],
    },
    es: {
      heading: 'Niveles de Aislamiento de Base de Datos',
      paragraphs: [
        'Los niveles de aislamiento definen como las transacciones interactuan entre si. Equilibran consistencia y concurrencia en bases de datos.',
        'Los recursos a continuacion cubren read uncommitted, read committed, repeatable read y serializable. Cada guia te ayuda a elegir el aislamiento correcto para tu carga.',
      ],
    },
  },
  'database-replication': {
    en: {
      heading: 'Database Replication',
      paragraphs: [
        'Database replication copies data across multiple database nodes. It improves availability, read performance, and disaster recovery.',
        'The resources below cover primary-replica, multi-primary, synchronous, and asynchronous replication. Each guide helps you implement replication strategies.',
      ],
    },
    es: {
      heading: 'Replicacion de Bases de Datos',
      paragraphs: [
        'La replicacion de bases de datos copia datos entre multiples nodos. Mejora disponibilidad, rendimiento de lectura y recuperacion ante desastres.',
        'Los recursos a continuacion cubren primary-replica, multi-primary, replicacion sincrona y asincrona. Cada guia te ayuda a implementar estrategias de replicacion.',
      ],
    },
  },
  'full-text-search': {
    en: {
      heading: 'Full-Text Search',
      paragraphs: [
        'Full-text search finds text in documents based on relevance. It powers search engines and application search features.',
        'The resources below cover indexing, tokenization, stemming, ranking, and engines like Elasticsearch and PostgreSQL full-text search. Each guide helps you implement search that finds relevant content.',
      ],
    },
    es: {
      heading: 'Busqueda Full-Text',
      paragraphs: [
        'La busqueda full-text encuentra texto en documentos basandose en relevancia. Potencia motores de busqueda y funciones de busqueda de aplicaciones.',
        'Los recursos a continuacion cubren indexacion, tokenizacion, stemming, ranking y motores como Elasticsearch y busqueda full-text de PostgreSQL. Cada guia te ayuda a implementar busqueda que encuentre contenido relevante.',
      ],
    },
  },
  maintenance: {
    en: {
      heading: 'Software Maintenance',
      paragraphs: [
        'Maintenance is the ongoing work of keeping software operational. It includes bug fixes, updates, refactoring, and dependency management.',
        'The resources below cover technical debt, refactoring, upgrades, and monitoring. Each guide helps you keep systems healthy over time.',
      ],
    },
    es: {
      heading: 'Mantenimiento de Software',
      paragraphs: [
        'El mantenimiento es el trabajo continuo de mantener el software operativo. Incluye correccion de errores, actualizaciones, refactoring y gestion de dependencias.',
        'Los recursos a continuacion cubren deuda tecnica, refactoring, actualizaciones y monitoreo. Cada guia te ayuda a mantener sistemas saludables con el tiempo.',
      ],
    },
  },
  'recursive-cte': {
    en: {
      heading: 'Recursive CTEs',
      paragraphs: [
        'Recursive CTEs are common table expressions that reference themselves. They are used to query hierarchical and graph data.',
        'The resources below cover recursive query syntax, base case, recursive case, and termination. Each guide helps you traverse hierarchies with SQL.',
      ],
    },
    es: {
      heading: 'CTEs Recursivas',
      paragraphs: [
        'Las CTEs recursivas son expresiones de tabla comunes que se referencian a si mismas. Se usan para consultar datos jerarquicos y de grafos.',
        'Los recursos a continuacion cubren sintaxis de consulta recursiva, caso base, caso recursivo y terminacion. Cada guia te ayuda a recorrer jerarquias con SQL.',
      ],
    },
  },
  'window-functions': {
    en: {
      heading: 'SQL Window Functions',
      paragraphs: [
        'Window functions perform calculations across a set of rows related to the current row. They are useful for rankings, moving averages, and cumulative sums.',
        'The resources below cover OVER, PARTITION BY, ROW_NUMBER, RANK, and LAG. Each guide helps you write powerful SQL without self-joins.',
      ],
    },
    es: {
      heading: 'Funciones de Ventana SQL',
      paragraphs: [
        'Las funciones de ventana realizan calculos sobre un conjunto de filas relacionadas con la fila actual. Son utiles para rankings, promedios moviles y sumas acumuladas.',
        'Los recursos a continuacion cubren OVER, PARTITION BY, ROW_NUMBER, RANK y LAG. Cada guia te ayuda a escribir SQL poderoso sin self-joins.',
      ],
    },
  },
  'hexagonal-architecture': {
    en: {
      heading: 'Hexagonal Architecture',
      paragraphs: [
        'Hexagonal architecture, or ports and adapters, keeps the core application independent of external concerns. It improves testability and adaptability.',
        'The resources below cover ports, adapters, domain logic, and dependency inversion. Each guide helps you build systems with a clean, testable core.',
      ],
    },
    es: {
      heading: 'Arquitectura Hexagonal',
      paragraphs: [
        'La arquitectura hexagonal, o ports and adapters, mantiene el nucleo de la aplicacion independiente de preocupaciones externas. Mejora testeabilidad y adaptabilidad.',
        'Los recursos a continuacion cubren ports, adapters, logica de dominio e inversion de dependencias. Cada guia te ayuda a construir sistemas con un nucleo limpio y testeable.',
      ],
    },
  },
  'gnu-parallel': {
    en: {
      heading: 'GNU Parallel',
      paragraphs: [
        'GNU Parallel is a shell tool for executing commands in parallel. It simplifies running jobs across multiple cores or machines.',
        'The resources below cover command-line usage, xargs alternatives, and distributed execution. Each guide helps you speed up shell workflows with GNU Parallel.',
      ],
    },
    es: {
      heading: 'GNU Parallel',
      paragraphs: [
        'GNU Parallel es una herramienta de shell para ejecutar comandos en paralelo. Simplifica ejecutar trabajos en multiples nucleos o maquinas.',
        'Los recursos a continuacion cubren uso de linea de comandos, alternativas a xargs y ejecucion distribuida. Cada guia te ayuda a acelerar flujos de shell con GNU Parallel.',
      ],
    },
  },
  shell: {
    en: {
      heading: 'Shell Scripting',
      paragraphs: [
        'Shell scripting automates tasks using command-line interpreters. It is essential for system administration, CI/CD, and developer productivity.',
        'The resources below cover Bash, POSIX sh, scripting patterns, and best practices. Each guide helps you write reliable shell scripts.',
      ],
    },
    es: {
      heading: 'Scripting de Shell',
      paragraphs: [
        'El scripting de shell automatiza tareas usando interpretes de linea de comandos. Es esencial para administracion de sistemas, CI/CD y productividad del desarrollador.',
        'Los recursos a continuacion cubren Bash, POSIX sh, patrones de scripting y mejores practicas. Cada guia te ayuda a escribir scripts de shell confiables.',
      ],
    },
  },
  'chaos-engineering': {
    en: {
      heading: 'Chaos Engineering',
      paragraphs: [
        'Chaos engineering deliberately introduces failures to test system resilience. It helps find weaknesses before they cause real outages.',
        'The resources below cover fault injection, game days, chaos monkeys, and failure analysis. Each guide helps you build confidence in production systems.',
      ],
    },
    es: {
      heading: 'Ingenieria del Caos',
      paragraphs: [
        'La ingenieria del caos introduce fallas deliberadamente para probar la resiliencia del sistema. Ayuda a encontrar debilidades antes de que causen interrupciones reales.',
        'Los recursos a continuacion cubren inyeccion de fallas, game days, chaos monkeys y analisis de fallas. Cada guia te ayuda a generar confianza en sistemas de produccion.',
      ],
    },
  },
  dockerfile: {
    en: {
      heading: 'Dockerfile Best Practices',
      paragraphs: [
        'A Dockerfile defines how to build a Docker image. Good Dockerfiles are small, secure, fast to build, and easy to maintain.',
        'The resources below cover multi-stage builds, layer caching, base images, and security. Each guide helps you write Dockerfiles that produce efficient images.',
      ],
    },
    es: {
      heading: 'Mejores Practicas de Dockerfile',
      paragraphs: [
        'Un Dockerfile define como construir una imagen Docker. Buenos Dockerfiles son pequenos, seguros, rapidos de construir y faciles de mantener.',
        'Los recursos a continuacion cubren multi-stage builds, cache de capas, imagenes base y seguridad. Cada guia te ayuda a escribir Dockerfiles que produzcan imagenes eficientes.',
      ],
    },
  },
  distroless: {
    en: {
      heading: 'Distroless Containers',
      paragraphs: [
        'Distroless images contain only your application and its runtime dependencies. They reduce attack surface and image size by excluding package managers and shells.',
        'The resources below cover building distroless images, debugging, and use cases. Each guide helps you build more secure and minimal container images.',
      ],
    },
    es: {
      heading: 'Contenedores Distroless',
      paragraphs: [
        'Las imagenes distroless contienen solo tu aplicacion y sus dependencias de runtime. Reducen la superficie de ataque y el tamano de la imagen al excluir gestores de paquetes y shells.',
        'Los recursos a continuacion cubren construccion de imagenes distroless, debugging y casos de uso. Cada guia te ayuda a construir imagenes de contenedor mas seguras y minimas.',
      ],
    },
  },
  credentials: {
    en: {
      heading: 'Credential Management',
      paragraphs: [
        'Credentials are secrets used to authenticate users and systems. Managing them safely is critical for security.',
        'The resources below cover credential storage, rotation, vaults, and least privilege. Each guide helps you protect credentials in your applications.',
      ],
    },
    es: {
      heading: 'Gestion de Credenciales',
      paragraphs: [
        'Las credenciales son secretos usados para autenticar usuarios y sistemas. Gestionarlas de forma segura es critico para la seguridad.',
        'Los recursos a continuacion cubren almacenamiento de credenciales, rotacion, vaults y privilegio minimo. Cada guia te ayuda a proteger credenciales en tus aplicaciones.',
      ],
    },
  },
  configmap: {
    en: {
      heading: 'Kubernetes ConfigMaps',
      paragraphs: [
        'ConfigMaps store non-confidential configuration in Kubernetes. They decouple config from container images.',
        'The resources below cover creation, mounting, environment variables, and updates. Each guide helps you manage Kubernetes configuration.',
      ],
    },
    es: {
      heading: 'ConfigMaps de Kubernetes',
      paragraphs: [
        'Los ConfigMaps almacenan configuracion no confidencial en Kubernetes. Desacoplan la configuracion de las imagenes de contenedor.',
        'Los recursos a continuacion cubren creacion, montaje, variables de entorno y actualizaciones. Cada guia te ayuda a gestionar configuracion en Kubernetes.',
      ],
    },
  },
  templating: {
    en: {
      heading: 'Templating and Code Generation',
      paragraphs: [
        'Templating generates text or code by substituting values into a template. It is used for web pages, configuration, and reports.',
        'The resources below cover template engines, logic-less templates, and code generation. Each guide helps you use templating effectively.',
      ],
    },
    es: {
      heading: 'Templating y Generacion de Codigo',
      paragraphs: [
        'El templating genera texto o codigo sustituyendo valores en una plantilla. Se usa para paginas web, configuracion y reportes.',
        'Los recursos a continuacion cubren motores de plantillas, plantillas sin logica y generacion de codigo. Cada guia te ayuda a usar templating efectivamente.',
      ],
    },
  },
  packaging: {
    en: {
      heading: 'Software Packaging',
      paragraphs: [
        'Packaging bundles code, dependencies, and metadata for distribution. It includes libraries, containers, and application installers.',
        'The resources below cover package managers, wheels, jars, npm, and container images. Each guide helps you package software for reuse and deployment.',
      ],
    },
    es: {
      heading: 'Empaquetado de Software',
      paragraphs: [
        'El empaquetado agrupa codigo, dependencias y metadatos para distribucion. Incluye librerias, contenedores e instaladores de aplicaciones.',
        'Los recursos a continuacion cubren gestores de paquetes, wheels, jars, npm e imagenes de contenedor. Cada guia te ayuda a empaquetar software para reutilizacion y despliegue.',
      ],
    },
  },
  'secret-management': {
    en: {
      heading: 'Secret Management',
      paragraphs: [
        'Secret management is the practice of storing, accessing, and rotating sensitive data. It is essential for protecting API keys, passwords, and certificates.',
        'The resources below cover vaults, secret stores, rotation, and access control. Each guide helps you manage secrets securely.',
      ],
    },
    es: {
      heading: 'Gestion de Secretos',
      paragraphs: [
        'La gestion de secretos es la practica de almacenar, acceder y rotar datos sensibles. Es esencial para proteger API keys, contrasenas y certificados.',
        'Los recursos a continuacion cubren vaults, secret stores, rotacion y control de acceso. Cada guia te ayuda a gestionar secretos de forma segura.',
      ],
    },
  },
  iptables: {
    en: {
      heading: 'iptables and Firewall Rules',
      paragraphs: [
        'iptables is a user-space tool to configure Linux kernel firewall rules. It controls network traffic by packet filtering.',
        'The resources below cover chains, rules, NAT, filtering, and common patterns. Each guide helps you secure Linux network traffic with iptables.',
      ],
    },
    es: {
      heading: 'iptables y Reglas de Firewall',
      paragraphs: [
        'iptables es una herramienta de espacio de usuario para configurar reglas de firewall del kernel de Linux. Controla el trafico de red mediante filtrado de paquetes.',
        'Los recursos a continuacion cubren cadenas, reglas, NAT, filtrado y patrones comunes. Cada guia te ayuda a asegurar el trafico de red de Linux con iptables.',
      ],
    },
  },
  gzip: {
    en: {
      heading: 'gzip Compression',
      paragraphs: [
        'gzip is a file compression format and utility. It reduces size for storage and transfer and is widely supported by web servers.',
        'The resources below cover gzip usage, streaming, decompression, and integration. Each guide helps you compress and decompress data efficiently.',
      ],
    },
    es: {
      heading: 'Compresion gzip',
      paragraphs: [
        'gzip es un formato y utilidad de compresion de archivos. Reduce el tamano para almacenamiento y transferencia y es ampliamente soportado por servidores web.',
        'Los recursos a continuacion cubren uso de gzip, streaming, descompresion e integracion. Cada guia te ayuda a comprimir y descomprimir datos eficientemente.',
      ],
    },
  },
  ssh: {
    en: {
      heading: 'SSH and Secure Remote Access',
      paragraphs: [
        'SSH provides encrypted remote access to servers. It is the standard for secure administration and file transfer.',
        'The resources below cover keys, configuration, port forwarding, and bastion hosts. Each guide helps you use SSH safely.',
      ],
    },
    es: {
      heading: 'SSH y Acceso Remoto Seguro',
      paragraphs: [
        'SSH proporciona acceso remoto cifrado a servidores. Es el estandar para administracion segura y transferencia de archivos.',
        'Los recursos a continuacion cubren claves, configuracion, port forwarding y bastion hosts. Cada guia te ayuda a usar SSH de forma segura.',
      ],
    },
  },
  zip: {
    en: {
      heading: 'ZIP Files',
      paragraphs: [
        'ZIP is a popular archive and compression format. It bundles multiple files and is supported across platforms.',
        'The resources below cover compression, extraction, password protection, and libraries. Each guide helps you work with ZIP archives.',
      ],
    },
    es: {
      heading: 'Archivos ZIP',
      paragraphs: [
        'ZIP es un formato popular de archivo y compresion. Agrupa multiples archivos y es soportado en todas las plataformas.',
        'Los recursos a continuacion cubren compresion, extraccion, proteccion por contrasena y librerias. Cada guia te ayuda a trabajar con archivos ZIP.',
      ],
    },
  },
  brotli: {
    en: {
      heading: 'Brotli Compression',
      paragraphs: [
        'Brotli is a modern compression algorithm optimized for web content. It often outperforms gzip and is supported by browsers.',
        'The resources below cover Brotli encoding, web server configuration, and trade-offs. Each guide helps you serve compressed content efficiently.',
      ],
    },
    es: {
      heading: 'Compresion Brotli',
      paragraphs: [
        'Brotli es un algoritmo moderno de compresion optimizado para contenido web. A menudo supera a gzip y es soportado por navegadores.',
        'Los recursos a continuacion cubren codificacion Brotli, configuracion de servidores web y trade-offs. Cada guia te ayuda a servir contenido comprimido eficientemente.',
      ],
    },
  },
  filesystem: {
    en: {
      heading: 'File Systems',
      paragraphs: [
        'A file system organizes how data is stored and retrieved. It affects performance, reliability, and access patterns.',
        'The resources below cover file system types, operations, permissions, and monitoring. Each guide helps you understand and work with file systems.',
      ],
    },
    es: {
      heading: 'Sistemas de Archivos',
      paragraphs: [
        'Un sistema de archivos organiza como se almacenan y recuperan los datos. Afecta rendimiento, confiabilidad y patrones de acceso.',
        'Los recursos a continuacion cubren tipos de sistemas de archivos, operaciones, permisos y monitoreo. Cada guia te ayuda a entender y trabajar con sistemas de archivos.',
      ],
    },
  },
  cleanup: {
    en: {
      heading: 'Resource Cleanup',
      paragraphs: [
        'Cleanup releases resources after use. It prevents leaks, locks, and stale state in long-running applications.',
        'The resources below cover finally blocks, try-with-resources, destructors, and cleanup patterns. Each guide helps you manage resource lifecycles.',
      ],
    },
    es: {
      heading: 'Limpieza de Recursos',
      paragraphs: [
        'La limpieza libera recursos despues de su uso. Previene fugas, locks y estado obsoleto en aplicaciones de larga duracion.',
        'Los recursos a continuacion cubren bloques finally, try-with-resources, destructores y patrones de limpieza. Cada guia te ayuda a gestionar ciclos de vida de recursos.',
      ],
    },
  },
  'file-upload': {
    en: {
      heading: 'File Uploads',
      paragraphs: [
        'File uploads let users send files to a server. They require validation, storage, and security considerations.',
        'The resources below cover multipart forms, storage, validation, and size limits. Each guide helps you handle file uploads safely.',
      ],
    },
    es: {
      heading: 'Subida de Archivos',
      paragraphs: [
        'La subida de archivos permite a los usuarios enviar archivos a un servidor. Requiere validacion, almacenamiento y consideraciones de seguridad.',
        'Los recursos a continuacion cubren formularios multipart, almacenamiento, validacion y limites de tamano. Cada guia te ayuda a manejar subidas de archivos de forma segura.',
      ],
    },
  },
  layout: {
    en: {
      heading: 'UI Layout and Composition',
      paragraphs: [
        'Layout defines how UI elements are arranged. Good layout creates clear hierarchy and responsive interfaces.',
        'The resources below cover CSS layout, grids, flexbox, and design patterns. Each guide helps you build interfaces that are easy to navigate and understand.',
      ],
    },
    es: {
      heading: 'Layout y Composicion de UI',
      paragraphs: [
        'El layout define como se organizan los elementos de UI. Un buen layout crea jerarquia clara e interfaces responsivas.',
        'Los recursos a continuacion cubren layout CSS, grids, flexbox y patrones de diseno. Cada guia te ayuda a construir interfaces faciles de navegar y entender.',
      ],
    },
  },
  theming: {
    en: {
      heading: 'Theming and Design Tokens',
      paragraphs: [
        'Theming defines the visual style of an application. Design tokens are reusable values for colors, spacing, and typography.',
        'The resources below cover CSS variables, theme switching, Tailwind config, and dark mode. Each guide helps you build consistent and themeable UIs.',
      ],
    },
    es: {
      heading: 'Theming y Design Tokens',
      paragraphs: [
        'El theming define el estilo visual de una aplicacion. Los design tokens son valores reutilizables para colores, espaciado y tipografia.',
        'Los recursos a continuacion cubren variables CSS, cambio de tema, configuracion de Tailwind y modo oscuro. Cada guia te ayuda a construir UIs consistentes y tematizables.',
      ],
    },
  },
  'service-worker': {
    en: {
      heading: 'Service Workers',
      paragraphs: [
        'Service workers run in the background and enable offline support, caching, and push notifications in web applications.',
        'The resources below cover registration, lifecycle, caching strategies, and Workbox. Each guide helps you build resilient web experiences.',
      ],
    },
    es: {
      heading: 'Service Workers',
      paragraphs: [
        'Los service workers se ejecutan en segundo plano y habilitan soporte offline, cache y notificaciones push en aplicaciones web.',
        'Los recursos a continuacion cubren registro, ciclo de vida, estrategias de cache y Workbox. Cada guia te ayuda a construir experiencias web resilientes.',
      ],
    },
  },
  pwa: {
    en: {
      heading: 'Progressive Web Apps',
      paragraphs: [
        'Progressive Web Apps combine the reach of web with the experience of native apps. They work offline, installable, and responsive.',
        'The resources below cover service workers, manifests, offline, and PWA best practices. Each guide helps you build app-like web experiences.',
      ],
    },
    es: {
      heading: 'Progressive Web Apps',
      paragraphs: [
        'Las Progressive Web Apps combinan el alcance de la web con la experiencia de aplicaciones nativas. Funcionan offline, son instalables y responsivas.',
        'Los recursos a continuacion cubren service workers, manifests, offline y mejores practicas de PWA. Cada guia te ayuda a construir experiencias web tipo app.',
      ],
    },
  },
  offline: {
    en: {
      heading: 'Offline Support',
      paragraphs: [
        'Offline support allows applications to function without network connectivity. It requires caching, synchronization, and graceful degradation.',
        'The resources below cover service workers, local storage, background sync, and offline-first design. Each guide helps you build apps that work without a connection.',
      ],
    },
    es: {
      heading: 'Soporte Offline',
      paragraphs: [
        'El soporte offline permite que las aplicaciones funcionen sin conectividad de red. Requiere cache, sincronizacion y degradacion elegante.',
        'Los recursos a continuacion cubren service workers, almacenamiento local, sincronizacion en segundo plano y diseno offline-first. Cada guia te ayuda a construir apps que funcionen sin conexion.',
      ],
    },
  },
  zod: {
    en: {
      heading: 'Zod Schema Validation',
      paragraphs: [
        'Zod is a TypeScript-first schema validation library. It lets you define, validate, and infer types from schemas.',
        'The resources below cover schema definition, parsing, refinements, and error handling. Each guide helps you add type-safe validation to your applications.',
      ],
    },
    es: {
      heading: 'Validacion de Esquemas con Zod',
      paragraphs: [
        'Zod es una libreria de validacion de esquemas pensada primero para TypeScript. Permite definir, validar e inferir tipos desde esquemas.',
        'Los recursos a continuacion cubren definicion de esquemas, parseo, refinements y manejo de errores. Cada guia te ayuda a agregar validacion type-safe a tus aplicaciones.',
      ],
    },
  },
  virtualization: {
    en: {
      heading: 'Virtualization and Hypervisors',
      paragraphs: [
        'Virtualization abstracts physical hardware to run multiple virtual machines. It is the foundation of cloud computing.',
        'The resources below cover hypervisors, VMs, containers vs VMs, and resource allocation. Each guide helps you understand virtualization technology.',
      ],
    },
    es: {
      heading: 'Virtualizacion e Hipervisores',
      paragraphs: [
        'La virtualizacion abstrae el hardware fisico para ejecutar multiples maquinas virtuales. Es la base del cloud computing.',
        'Los recursos a continuacion cubren hipervisores, VMs, contenedores vs VMs y asignacion de recursos. Cada guia te ayuda a entender la tecnologia de virtualizacion.',
      ],
    },
  },
  'type-safety': {
    en: {
      heading: 'Type Safety',
      paragraphs: [
        'Type safety prevents invalid operations by enforcing correct types at compile or runtime. It reduces bugs and improves code quality.',
        'The resources below cover static typing, TypeScript, type guards, and runtime validation. Each guide helps you write code with fewer type-related errors.',
      ],
    },
    es: {
      heading: 'Seguridad de Tipos',
      paragraphs: [
        'La seguridad de tipos previene operaciones invalidas al exigir tipos correctos en compile o runtime. Reduce errores y mejora la calidad del codigo.',
        'Los recursos a continuacion cubren tipado estatico, TypeScript, type guards y validacion en runtime. Cada guia te ayuda a escribir codigo con menos errores relacionados con tipos.',
      ],
    },
  },
  'conditional-types': {
    en: {
      heading: 'Conditional Types in TypeScript',
      paragraphs: [
        'Conditional types in TypeScript select a type based on a condition. They enable powerful type-level logic and utility types.',
        'The resources below cover conditional type syntax, infer, mapped types, and examples. Each guide helps you write flexible and reusable type definitions.',
      ],
    },
    es: {
      heading: 'Tipos Condicionales en TypeScript',
      paragraphs: [
        'Los tipos condicionales en TypeScript seleccionan un tipo basado en una condicion. Habilitan logica poderosa a nivel de tipos y utility types.',
        'Los recursos a continuacion cubren sintaxis de tipos condicionales, infer, mapped types y ejemplos. Cada guia te ayuda a escribir definiciones de tipo flexibles y reutilizables.',
      ],
    },
  },
  batching: {
    en: {
      heading: 'Request Batching',
      paragraphs: [
        'Batching combines multiple requests into a single operation. It reduces overhead and improves throughput for APIs and databases.',
        'The resources below cover batch APIs, data loaders, and batch processing patterns. Each guide helps you optimize communication with batched operations.',
      ],
    },
    es: {
      heading: 'Batching de Peticiones',
      paragraphs: [
        'El batching combina multiples peticiones en una sola operacion. Reduce el overhead y mejora el rendimiento de APIs y bases de datos.',
        'Los recursos a continuacion cubren APIs de batch, data loaders y patrones de procesamiento por lotes. Cada guia te ayuda a optimizar la comunicacion con operaciones agrupadas.',
      ],
    },
  },
  relay: {
    en: {
      heading: 'Relay and GraphQL Pagination',
      paragraphs: [
        'Relay is a GraphQL client developed by Meta. It provides conventions for colocation, pagination, and data fetching.',
        'The resources below cover Relay fragments, connections, pagination, and the store. Each guide helps you build scalable GraphQL clients with Relay.',
      ],
    },
    es: {
      heading: 'Relay y Paginacion GraphQL',
      paragraphs: [
        'Relay es un cliente GraphQL desarrollado por Meta. Proporciona convenciones para colocacion, paginacion y obtencion de datos.',
        'Los recursos a continuacion cubren fragmentos de Relay, conexiones, paginacion y el store. Cada guia te ayuda a construir clientes GraphQL escalables con Relay.',
      ],
    },
  },
  cursor: {
    en: {
      heading: 'Database Cursors',
      paragraphs: [
        'A cursor is a pointer to a result set in a database. It allows row-by-row processing and is useful for large datasets.',
        'The resources below cover cursor creation, iteration, fetching, and closing. Each guide helps you use cursors to handle large result sets efficiently.',
      ],
    },
    es: {
      heading: 'Cursores de Base de Datos',
      paragraphs: [
        'Un cursor es un puntero a un conjunto de resultados en una base de datos. Permite procesamiento fila por fila y es util para grandes conjuntos de datos.',
        'Los recursos a continuacion cubren creacion de cursores, iteracion, fetching y cierre. Cada guia te ayuda a usar cursores para manejar grandes conjuntos de resultados eficientemente.',
      ],
    },
  },
  'consumer-group': {
    en: {
      heading: 'Consumer Groups in Messaging',
      paragraphs: [
        'Consumer groups allow multiple consumers to process a stream in parallel. Each message is delivered to only one consumer in the group.',
        'The resources below cover Kafka consumer groups, partitions, rebalancing, and offset management. Each guide helps you scale message consumption.',
      ],
    },
    es: {
      heading: 'Grupos de Consumidores en Mensajeria',
      paragraphs: [
        'Los grupos de consumidores permiten que multiples consumidores procesen un stream en paralelo. Cada mensaje se entrega a un solo consumidor del grupo.',
        'Los recursos a continuacion cubren grupos de consumidores de Kafka, particiones, rebalancing y gestion de offsets. Cada guia te ayuda a escalar el consumo de mensajes.',
      ],
    },
  },
  'outbox-pattern': {
    en: {
      heading: 'Outbox Pattern',
      paragraphs: [
        'The outbox pattern ensures reliable event publishing by first storing events in a database table. It guarantees eventual delivery and consistency.',
        'The resources below cover outbox implementation, event relay, idempotency, and ordering. Each guide helps you publish events reliably from transactions.',
      ],
    },
    es: {
      heading: 'Patron Outbox',
      paragraphs: [
        'El patron outbox asegura la publicacion confiable de eventos almacenando primero los eventos en una tabla de base de datos. Garantiza entrega eventual y consistencia.',
        'Los recursos a continuacion cubren implementacion del outbox, relay de eventos, idempotencia y ordenamiento. Cada guia te ayuda a publicar eventos de forma confiable desde transacciones.',
      ],
    },
  },
  dlq: {
    en: {
      heading: 'Dead Letter Queues',
      paragraphs: [
        'A dead letter queue holds messages that could not be processed successfully. It is essential for debugging and handling poison messages.',
        'The resources below cover DLQ configuration, redrive, monitoring, and patterns. Each guide helps you build resilient messaging with dead letter queues.',
      ],
    },
    es: {
      heading: 'Colas de Mensajes Muertos',
      paragraphs: [
        'Una cola de mensajes muertos contiene mensajes que no pudieron procesarse correctamente. Es esencial para debugging y manejo de mensajes venenosos.',
        'Los recursos a continuacion cubren configuracion de DLQ, redrive, monitoreo y patrones. Cada guia te ayuda a construir mensajeria resiliente con dead letter queues.',
      ],
    },
  },
  sentry: {
    en: {
      heading: 'Sentry and Error Monitoring',
      paragraphs: [
        'Sentry is an error tracking and performance monitoring platform. It helps teams detect, diagnose, and fix issues in production.',
        'The resources below cover Sentry setup, breadcrumbs, releases, alerts, and tracing. Each guide helps you monitor application health with Sentry.',
      ],
    },
    es: {
      heading: 'Sentry y Monitoreo de Errores',
      paragraphs: [
        'Sentry es una plataforma de seguimiento de errores y monitoreo de rendimiento. Ayuda a los equipos a detectar, diagnosticar y solucionar problemas en produccion.',
        'Los recursos a continuacion cubren configuracion de Sentry, breadcrumbs, releases, alertas y tracing. Cada guia te ayuda a monitorear la salud de aplicaciones con Sentry.',
      ],
    },
  },
  'error-tracking': {
    en: {
      heading: 'Error Tracking',
      paragraphs: [
        'Error tracking collects and aggregates errors in production. It provides context for debugging and prioritizing fixes.',
        'The resources below cover logging, exception tracking, crash reporting, and integrations. Each guide helps you track and resolve errors effectively.',
      ],
    },
    es: {
      heading: 'Seguimiento de Errores',
      paragraphs: [
        'El seguimiento de errores recopila y agrega errores en produccion. Proporciona contexto para debugging y priorizar correcciones.',
        'Los recursos a continuacion cubren logging, seguimiento de excepciones, crash reporting e integraciones. Cada guia te ayuda a rastrear y resolver errores efectivamente.',
      ],
    },
  },
  spa: {
    en: {
      heading: 'Single Page Applications',
      paragraphs: [
        'Single page applications load a single HTML page and update content dynamically. They offer app-like experiences in the browser.',
        'The resources below cover routing, state, hydration, performance, and SEO. Each guide helps you build SPAs that are fast and maintainable.',
      ],
    },
    es: {
      heading: 'Aplicaciones de Pagina Unica',
      paragraphs: [
        'Las single page applications cargan una sola pagina HTML y actualizan el contenido dinamicamente. Ofrecen experiencias tipo app en el navegador.',
        'Los recursos a continuacion cubren routing, estado, hydration, rendimiento y SEO. Cada guia te ayuda a construir SPAs rapidas y mantenibles.',
      ],
    },
  },
  eslint: {
    en: {
      heading: 'ESLint and Static Analysis',
      paragraphs: [
        'ESLint is a static analyzer for JavaScript and TypeScript. It finds problems, enforces style, and supports custom rules.',
        'The resources below cover configuration, plugins, rules, and autofix. Each guide helps you keep JavaScript code clean and consistent.',
      ],
    },
    es: {
      heading: 'ESLint y Analisis Estatico',
      paragraphs: [
        'ESLint es un analizador estatico para JavaScript y TypeScript. Encuentra problemas, hace cumplir el estilo y soporta reglas personalizadas.',
        'Los recursos a continuacion cubren configuracion, plugins, reglas y autofix. Cada guia te ayuda a mantener codigo JavaScript limpio y consistente.',
      ],
    },
  },
  'type-checking': {
    en: {
      heading: 'Type Checking',
      paragraphs: [
        'Type checking verifies that a program uses types correctly. It catches errors before runtime and improves code quality.',
        'The resources below cover TypeScript, mypy, type hints, and type guards. Each guide helps you add and enforce type safety.',
      ],
    },
    es: {
      heading: 'Verificacion de Tipos',
      paragraphs: [
        'La verificacion de tipos comprueba que un programa usa los tipos correctamente. Detecta errores antes de runtime y mejora la calidad del codigo.',
        'Los recursos a continuacion cubren TypeScript, mypy, type hints y type guards. Cada guia te ayuda a agregar y hacer cumplir la seguridad de tipos.',
      ],
    },
  },
  'hashicorp-vault': {
    en: {
      heading: 'HashiCorp Vault',
      paragraphs: [
        'Vault is a tool for managing secrets and protecting sensitive data. It provides dynamic secrets, encryption, and access control.',
        'The resources below cover Vault setup, secrets engines, policies, and integration. Each guide helps you manage secrets at scale with Vault.',
      ],
    },
    es: {
      heading: 'HashiCorp Vault',
      paragraphs: [
        'Vault es una herramienta para gestionar secretos y proteger datos sensibles. Proporciona secretos dinamicos, cifrado y control de acceso.',
        'Los recursos a continuacion cubren setup de Vault, secrets engines, politicas e integracion. Cada guia te ayuda a gestionar secretos a escala con Vault.',
      ],
    },
  },
  'sql-injection': {
    en: {
      heading: 'SQL Injection Prevention',
      paragraphs: [
        'SQL injection is an attack that inserts malicious SQL into queries. Preventing it is essential for application security.',
        'The resources below cover parameterized queries, ORMs, input validation, and WAF rules. Each guide helps you write SQL that attackers cannot exploit.',
      ],
    },
    es: {
      heading: 'Prevencion de Inyeccion SQL',
      paragraphs: [
        'La inyeccion SQL es un ataque que inserta SQL malicioso en consultas. Prevenirla es esencial para la seguridad de las aplicaciones.',
        'Los recursos a continuacion cubren consultas parametrizadas, ORMs, validacion de entradas y reglas de WAF. Cada guia te ayuda a escribir SQL que los atacantes no puedan explotar.',
      ],
    },
  },
  layers: {
    en: {
      heading: 'Architectural Layers',
      paragraphs: [
        'Layers group related functionality into separate levels. They reduce coupling and improve maintainability in large applications.',
        'The resources below cover presentation, domain, persistence, and infrastructure layers. Each guide helps you structure applications with clear boundaries.',
      ],
    },
    es: {
      heading: 'Capas Arquitectonicas',
      paragraphs: [
        'Las capas agrupan funcionalidad relacionada en niveles separados. Reducen el acoplamiento y mejoran la mantenibilidad en aplicaciones grandes.',
        'Los recursos a continuacion cubren capas de presentacion, dominio, persistencia e infraestructura. Cada guia te ayuda a estructurar aplicaciones con limites claros.',
      ],
    },
  },
  'http-trigger': {
    en: {
      heading: 'HTTP Triggers and Webhooks',
      paragraphs: [
        'HTTP triggers invoke functions or workflows through HTTP requests. They are the foundation of serverless functions and webhooks.',
        'The resources below cover trigger configuration, routing, authentication, and retry. Each guide helps you build event-driven integrations over HTTP.',
      ],
    },
    es: {
      heading: 'Triggers HTTP y Webhooks',
      paragraphs: [
        'Los triggers HTTP invocan funciones o workflows a traves de peticiones HTTP. Son la base de funciones serverless y webhooks.',
        'Los recursos a continuacion cubren configuracion de triggers, routing, autenticacion y reintentos. Cada guia te ayuda a construir integraciones event-driven sobre HTTP.',
      ],
    },
  },
  'consumer-driven-contracts': {
    en: {
      heading: 'Consumer-Driven Contracts',
      paragraphs: [
        'Consumer-driven contracts let consumers define the expected behavior of a service. They improve API compatibility and collaboration.',
        'The resources below cover Pact, contract tests, provider verification, and CI. Each guide helps you align services around consumer expectations.',
      ],
    },
    es: {
      heading: 'Contratos Dirigidos por Consumidores',
      paragraphs: [
        'Los contratos dirigidos por consumidores permiten que los consumidores definan el comportamiento esperado de un servicio. Mejoran compatibilidad de APIs y colaboracion.',
        'Los recursos a continuacion cubren Pact, tests de contrato, verificacion de proveedores y CI. Cada guia te ayuda a alinear servicios con las expectativas de los consumidores.',
      ],
    },
  },
  'property-based-testing': {
    en: {
      heading: 'Property-Based Testing',
      paragraphs: [
        'Property-based testing verifies that properties hold for a wide range of generated inputs. It finds edge cases that manual tests miss.',
        'The resources below cover invariants, generators, shrinking, and frameworks. Each guide helps you write tests that explore many scenarios.',
      ],
    },
    es: {
      heading: 'Testing Basado en Propiedades',
      paragraphs: [
        'El testing basado en propiedades verifica que las propiedades se cumplen para una amplia gama de entradas generadas. Encuentra casos extremos que los tests manuales omiten.',
        'Los recursos a continuacion cubren invariantes, generadores, shrinking y frameworks. Cada guia te ayuda a escribir tests que exploran muchos escenarios.',
      ],
    },
  },
  'fast-check': {
    en: {
      heading: 'fast-check and Property Testing',
      paragraphs: [
        'fast-check is a property-based testing library for JavaScript. It generates inputs and finds minimal failing cases.',
        'The resources below cover arbitraries, properties, shrinking, and integration. Each guide helps you add property-based tests to JavaScript projects.',
      ],
    },
    es: {
      heading: 'fast-check y Testing de Propiedades',
      paragraphs: [
        'fast-check es una libreria de testing basado en propiedades para JavaScript. Genera entradas y encuentra casos minimos de falla.',
        'Los recursos a continuacion cubren arbitraries, propiedades, shrinking e integracion. Cada guia te ayuda a agregar tests basados en propiedades a proyectos JavaScript.',
      ],
    },
  },
  fuzzing: {
    en: {
      heading: 'Fuzz Testing',
      paragraphs: [
        'Fuzz testing feeds random or unexpected input to a program. It discovers crashes, security flaws, and robustness issues.',
        'The resources below cover fuzzers, coverage-guided fuzzing, and integration. Each guide helps you find vulnerabilities through automated fuzzing.',
      ],
    },
    es: {
      heading: 'Fuzz Testing',
      paragraphs: [
        'El fuzz testing alimenta a un programa con entradas aleatorias o inesperadas. Descubre crashes, fallas de seguridad y problemas de robustez.',
        'Los recursos a continuacion cubren fuzzers, fuzzing guiado por cobertura e integracion. Cada guia te ayuda a encontrar vulnerabilidades mediante fuzzing automatizado.',
      ],
    },
  },
  testcontainers: {
    en: {
      heading: 'Testcontainers',
      paragraphs: [
        'Testcontainers is a library that spins up real services in Docker for tests. It improves integration tests by using actual databases and message brokers.',
        'The resources below cover setup, lifecycle, networking, and common use cases. Each guide helps you write tests against real dependencies.',
      ],
    },
    es: {
      heading: 'Testcontainers',
      paragraphs: [
        'Testcontainers es una libreria que levanta servicios reales en Docker para tests. Mejora los tests de integracion usando bases de datos y brokers de mensajes reales.',
        'Los recursos a continuacion cubren setup, ciclo de vida, networking y casos de uso comunes. Cada guia te ayuda a escribir tests contra dependencias reales.',
      ],
    },
  },
  wiremock: {
    en: {
      heading: 'WireMock',
      paragraphs: [
        'WireMock is a mock server for HTTP-based APIs. It is used for stubbing and simulating services during testing.',
        'The resources below cover stubs, mappings, request matching, and verification. Each guide helps you mock external HTTP services in tests.',
      ],
    },
    es: {
      heading: 'WireMock',
      paragraphs: [
        'WireMock es un servidor mock para APIs basadas en HTTP. Se usa para stubbing y simulacion de servicios durante testing.',
        'Los recursos a continuacion cubren stubs, mappings, matching de peticiones y verificacion. Cada guia te ayuda a simular servicios HTTP externos en tests.',
      ],
    },
  },
  stub: {
    en: {
      heading: 'Stubs and Mocks',
      paragraphs: [
        'Stubs provide canned responses for tests. They are simpler than full mocks and help isolate the unit under test.',
        'The resources below cover stubbing patterns, mock servers, and when to use each. Each guide helps you test components in isolation.',
      ],
    },
    es: {
      heading: 'Stubs y Mocks',
      paragraphs: [
        'Los stubs proporcionan respuestas predefinidas para tests. Son mas simples que mocks completos y ayudan a aislar la unidad bajo test.',
        'Los recursos a continuacion cubren patrones de stubbing, servidores mock y cuando usar cada uno. Cada guia te ayuda a testear componentes de forma aislada.',
      ],
    },
  },
  msw: {
    en: {
      heading: 'Mock Service Worker',
      paragraphs: [
        'MSW is a tool for mocking HTTP requests. It works in the browser and in Node, making tests resilient and fast.',
        'The resources below cover handlers, interceptors, integration, and best practices. Each guide helps you mock network requests in JavaScript tests.',
      ],
    },
    es: {
      heading: 'Mock Service Worker',
      paragraphs: [
        'MSW es una herramienta para simular peticiones HTTP. Funciona en el navegador y en Node, haciendo los tests resilientes y rapidos.',
        'Los recursos a continuacion cubren handlers, interceptors, integracion y mejores practicas. Cada guia te ayuda a simular peticiones de red en tests JavaScript.',
      ],
    },
  },
  vitest: {
    en: {
      heading: 'Vitest',
      paragraphs: [
        'Vitest is a fast unit testing framework powered by Vite. It is designed for modern JavaScript and TypeScript projects.',
        'The resources below cover configuration, mocking, watch mode, and coverage. Each guide helps you write fast and effective tests with Vitest.',
      ],
    },
    es: {
      heading: 'Vitest',
      paragraphs: [
        'Vitest es un framework de testing unitario rapido impulsado por Vite. Esta disenado para proyectos modernos de JavaScript y TypeScript.',
        'Los recursos a continuacion cubren configuracion, mocking, watch mode y cobertura. Cada guia te ayuda a escribir tests rapidos y efectivos con Vitest.',
      ],
    },
  },
  'pytest-cov': {
    en: {
      heading: 'pytest-cov and Coverage',
      paragraphs: [
        'pytest-cov is a plugin for measuring test coverage in Python. It integrates coverage.py with pytest.',
        'The resources below cover configuration, reporting, thresholds, and CI. Each guide helps you track and improve Python test coverage.',
      ],
    },
    es: {
      heading: 'pytest-cov y Cobertura',
      paragraphs: [
        'pytest-cov es un plugin para medir la cobertura de tests en Python. Integra coverage.py con pytest.',
        'Los recursos a continuacion cubren configuracion, reportes, umbrales y CI. Cada guia te ayuda a rastrear y mejorar la cobertura de tests Python.',
      ],
    },
  },
  ci: {
    en: {
      heading: 'Continuous Integration',
      paragraphs: [
        'Continuous Integration is the practice of merging code changes frequently and running automated tests. It catches issues early and improves team velocity.',
        'The resources below cover CI pipelines, GitHub Actions, test automation, and build checks. Each guide helps you set up CI that keeps code healthy.',
      ],
    },
    es: {
      heading: 'Integracion Continua',
      paragraphs: [
        'La integracion continua es la practica de fusionar cambios de codigo con frecuencia y ejecutar tests automatizados. Detecta problemas temprano y mejora la velocidad del equipo.',
        'Los recursos a continuacion cubren pipelines de CI, GitHub Actions, automatizacion de tests y verificaciones de build. Cada guia te ayuda a configurar CI que mantenga el codigo saludable.',
      ],
    },
  },
  'llm-security': {
    en: {
      heading: 'LLM Security',
      paragraphs: [
        'LLM security protects applications and models from misuse, data leaks, and adversarial inputs. It is an emerging and critical field.',
        'The resources below cover prompt injection, output filtering, model safety, and governance. Each guide helps you deploy LLMs securely.',
      ],
    },
    es: {
      heading: 'Seguridad de LLM',
      paragraphs: [
        'La seguridad de LLM protege aplicaciones y modelos contra uso indebido, fugas de datos y entradas adversariales. Es un campo emergente y critico.',
        'Los recursos a continuacion cubren prompt injection, filtrado de salidas, seguridad de modelos y gobernanza. Cada guia te ayuda a desplegar LLMs de forma segura.',
      ],
    },
  },
  'prompt-injection': {
    en: {
      heading: 'Prompt Injection Attacks',
      paragraphs: [
        'Prompt injection manipulates LLM behavior through crafted input. It is a critical security risk for AI applications.',
        'The resources below cover indirect, direct, and jailbreak prompt injection, plus mitigations. Each guide helps you defend LLM-powered applications.',
      ],
    },
    es: {
      heading: 'Ataques de Prompt Injection',
      paragraphs: [
        'El prompt injection manipula el comportamiento de un LLM a traves de entrada disenada. Es un riesgo de seguridad critico para aplicaciones de IA.',
        'Los recursos a continuacion cubren prompt injection indirecto, directo y jailbreak, ademas de mitigaciones. Cada guia te ayuda a defender aplicaciones basadas en LLM.',
      ],
    },
  },
  'model-selection': {
    en: {
      heading: 'LLM Model Selection',
      paragraphs: [
        'Model selection is the process of choosing the right LLM for a task. It balances cost, latency, quality, and capability.',
        'The resources below cover model benchmarks, cost analysis, fine-tuning, and use case matching. Each guide helps you pick the best model for your needs.',
      ],
    },
    es: {
      heading: 'Seleccion de Modelos LLM',
      paragraphs: [
        'La seleccion de modelos es el proceso de elegir el LLM adecuado para una tarea. Equilibra costo, latencia, calidad y capacidad.',
        'Los recursos a continuacion cubren benchmarks de modelos, analisis de costos, fine-tuning y correspondencia de casos de uso. Cada guia te ayuda a elegir el mejor modelo para tus necesidades.',
      ],
    },
  },
  ambassador: {
    en: {
      heading: 'Ambassador Pattern',
      paragraphs: [
        'The ambassador pattern offloads common client tasks to a helper container or process. It simplifies language-specific clients and adds features like retries or logging.',
        'The resources below cover sidecar proxies, service mesh, and client-side ambassadors. Each guide helps you build resilient and observable clients.',
      ],
    },
    es: {
      heading: 'Patron Ambassador',
      paragraphs: [
        'El patron ambassador descarga tareas comunes del cliente en un contenedor o proceso auxiliar. Simplifica clientes especificos de lenguaje y agrega funciones como reintentos o logging.',
        'Los recursos a continuacion cubren proxies sidecar, service mesh y ambassadors del lado del cliente. Cada guia te ayuda a construir clientes resilientes y observables.',
      ],
    },
  },
  consensus: {
    en: {
      heading: 'Distributed Consensus',
      paragraphs: [
        'Distributed consensus lets multiple nodes agree on a value or state. It is the foundation of reliable distributed systems.',
        'The resources below cover Raft, Paxos, leader election, and consensus algorithms. Each guide helps you build systems that agree under failures.',
      ],
    },
    es: {
      heading: 'Consenso Distribuido',
      paragraphs: [
        'El consenso distribuido permite que multiples nodos acuerden un valor o estado. Es la base de los sistemas distribuidos confiables.',
        'Los recursos a continuacion cubren Raft, Paxos, eleccion de lider y algoritmos de consenso. Cada guia te ayuda a construir sistemas que acuerden bajo fallas.',
      ],
    },
  },
  'multi-tenant': {
    en: {
      heading: 'Multi-Tenant Architectures',
      paragraphs: [
        'Multi-tenancy serves multiple customers from a single deployment. It requires isolation, scalability, and efficient resource sharing.',
        'The resources below cover tenant isolation, SaaS patterns, data separation, and billing. Each guide helps you design multi-tenant applications.',
      ],
    },
    es: {
      heading: 'Arquitecturas Multi-Tenant',
      paragraphs: [
        'El multi-tenancy atiende a multiples clientes desde un solo despliegue. Requiere aislamiento, escalabilidad y comparticion eficiente de recursos.',
        'Los recursos a continuacion cubren aislamiento de tenants, patrones SaaS, separacion de datos y facturacion. Cada guia te ayuda a disenar aplicaciones multi-tenant.',
      ],
    },
  },
  sidecar: {
    en: {
      heading: 'Sidecar Pattern',
      paragraphs: [
        'The sidecar pattern deploys a helper container alongside the main application. It adds functionality without changing the main container.',
        'The resources below cover service mesh, logging sidecars, and lifecycle management. Each guide helps you use sidecars to extend application behavior.',
      ],
    },
    es: {
      heading: 'Patron Sidecar',
      paragraphs: [
        'El patron sidecar despliega un contenedor auxiliar junto a la aplicacion principal. Agrega funcionalidad sin cambiar el contenedor principal.',
        'Los recursos a continuacion cubren service mesh, sidecars de logging y gestion del ciclo de vida. Cada guia te ayuda a usar sidecars para extender el comportamiento de aplicaciones.',
      ],
    },
  },
  'strangler-fig': {
    en: {
      heading: 'Strangler Fig Pattern',
      paragraphs: [
        'The strangler fig pattern gradually replaces a legacy system by routing functionality to new components. It reduces migration risk.',
        'The resources below cover incremental migration, routing, and feature toggles. Each guide helps you modernize systems without big-bang rewrites.',
      ],
    },
    es: {
      heading: 'Patron Strangler Fig',
      paragraphs: [
        'El patron strangler fig reemplaza gradualmente un sistema legacy dirigiendo funcionalidad a nuevos componentes. Reduce el riesgo de migracion.',
        'Los recursos a continuacion cubren migracion incremental, routing y feature toggles. Cada guia te ayuda a modernizar sistemas sin reescrituras big-bang.',
      ],
    },
  },
  oidc: {
    en: {
      heading: 'OpenID Connect',
      paragraphs: [
        'OpenID Connect is an identity layer on top of OAuth 2.0. It enables authentication and user info sharing in a standardized way.',
        'The resources below cover ID tokens, userinfo, flows, and integration. Each guide helps you implement modern authentication with OIDC.',
      ],
    },
    es: {
      heading: 'OpenID Connect',
      paragraphs: [
        'OpenID Connect es una capa de identidad sobre OAuth 2.0. Habilita autenticacion y comparticion de informacion de usuario de forma estandarizada.',
        'Los recursos a continuacion cubren ID tokens, userinfo, flujos e integracion. Cada guia te ayuda a implementar autenticacion moderna con OIDC.',
      ],
    },
  },
  delegation: {
    en: {
      heading: 'Delegation Pattern',
      paragraphs: [
        'Delegation passes responsibility from one object to another. It is an alternative to inheritance and promotes composition.',
        'The resources below cover delegation, composition, and design examples. Each guide helps you build flexible object relationships.',
      ],
    },
    es: {
      heading: 'Patron Delegacion',
      paragraphs: [
        'La delegacion pasa la responsabilidad de un objeto a otro. Es una alternativa a la herencia y promueve la composicion.',
        'Los recursos a continuacion cubren delegacion, composicion y ejemplos de diseno. Cada guia te ayuda a construir relaciones de objetos flexibles.',
      ],
    },
  },
  metadata: {
    en: {
      heading: 'Metadata Management',
      paragraphs: [
        'Metadata is data that describes other data. It is used for discovery, indexing, governance, and tooling.',
        'The resources below cover metadata schemas, catalogs, annotations, and lineage. Each guide helps you manage metadata effectively.',
      ],
    },
    es: {
      heading: 'Gestion de Metadatos',
      paragraphs: [
        'Los metadatos son datos que describen otros datos. Se usan para descubrimiento, indexacion, gobernanza y herramientas.',
        'Los recursos a continuacion cubren esquemas de metadatos, catalogos, anotaciones y lineage. Cada guia te ayuda a gestionar metadatos efectivamente.',
      ],
    },
  },
  avro: {
    en: {
      heading: 'Apache Avro',
      paragraphs: [
        'Avro is a binary data serialization format with schemas. It is widely used for data lakes, Kafka, and RPC.',
        'The resources below cover schema definition, serialization, compatibility, and integration. Each guide helps you use Avro for efficient data exchange.',
      ],
    },
    es: {
      heading: 'Apache Avro',
      paragraphs: [
        'Avro es un formato de serializacion de datos binario con esquemas. Se usa ampliamente para data lakes, Kafka y RPC.',
        'Los recursos a continuacion cubren definicion de esquemas, serializacion, compatibilidad e integracion. Cada guia te ayuda a usar Avro para intercambio de datos eficiente.',
      ],
    },
  },
  'abstract-factory': {
    en: {
      heading: 'Abstract Factory Pattern',
      paragraphs: [
        'The abstract factory pattern provides an interface for creating families of related objects. It decouples object creation from client code.',
        'The resources below cover factory families, interfaces, and practical examples. Each guide helps you create consistent object families.',
      ],
    },
    es: {
      heading: 'Patron Abstract Factory',
      paragraphs: [
        'El patron abstract factory proporciona una interfaz para crear familias de objetos relacionados. Desacopla la creacion de objetos del codigo cliente.',
        'Los recursos a continuacion cubren familias de factories, interfaces y ejemplos practicos. Cada guia te ayuda a crear familias de objetos consistentes.',
      ],
    },
  },
  'flow-control': {
    en: {
      heading: 'Flow Control in Systems',
      paragraphs: [
        'Flow control manages the rate at which data or work moves through a system. It prevents overload and backpressure.',
        'The resources below cover backpressure, throttling, rate limiting, and buffering. Each guide helps you keep systems stable under load.',
      ],
    },
    es: {
      heading: 'Control de Flujo en Sistemas',
      paragraphs: [
        'El control de flujo gestiona la tasa a la que los datos o el trabajo se mueven a traves de un sistema. Previene sobrecarga y backpressure.',
        'Los recursos a continuacion cubren backpressure, throttling, rate limiting y buffering. Cada guia te ayuda a mantener sistemas estables bajo carga.',
      ],
    },
  },
  builder: {
    en: {
      heading: 'Builder Pattern',
      paragraphs: [
        'The builder pattern constructs complex objects step by step. It separates object construction from representation.',
        'The resources below cover fluent builders, immutable builders, and director patterns. Each guide helps you create readable object construction.',
      ],
    },
    es: {
      heading: 'Patron Builder',
      paragraphs: [
        'El patron builder construye objetos complejos paso a paso. Separa la construccion del objeto de su representacion.',
        'Los recursos a continuacion cubren builders fluidos, builders inmutables y patrones director. Cada guia te ayuda a crear construccion de objetos legible.',
      ],
    },
  },
  'progressive-delivery': {
    en: {
      heading: 'Progressive Delivery',
      paragraphs: [
        'Progressive delivery releases changes gradually to selected users. It combines feature flags, canary, and A/B testing for safer deployments.',
        'The resources below cover rings, canary, feature flags, and rollout strategies. Each guide helps you deliver features with less risk.',
      ],
    },
    es: {
      heading: 'Entrega Progresiva',
      paragraphs: [
        'La entrega progresiva libera cambios gradualmente a usuarios seleccionados. Combina feature flags, canary y A/B testing para despliegues mas seguros.',
        'Los recursos a continuacion cubren anillos, canary, feature flags y estrategias de rollout. Cada guia te ayuda a entregar funciones con menos riesgo.',
      ],
    },
  },
  'chain-of-responsibility': {
    en: {
      heading: 'Chain of Responsibility',
      paragraphs: [
        'The chain of responsibility passes a request along a chain of handlers. Each handler decides whether to process or forward the request.',
        'The resources below cover chains, handlers, middleware, and filters. Each guide helps you build flexible processing pipelines.',
      ],
    },
    es: {
      heading: 'Cadena de Responsabilidad',
      paragraphs: [
        'La cadena de responsabilidad pasa una solicitud a lo largo de una cadena de handlers. Cada handler decide si procesa o reenvia la solicitud.',
        'Los recursos a continuacion cubren cadenas, handlers, middleware y filtros. Cada guia te ayuda a construir pipelines de procesamiento flexibles.',
      ],
    },
  },
  'architecture-pattern': {
    en: {
      heading: 'Architecture Patterns',
      paragraphs: [
        'Architecture patterns are reusable solutions for high-level structure. They guide the organization of systems and components.',
        'The resources below cover layered, hexagonal, microservices, and event-driven patterns. Each guide helps you choose architecture that fits your goals.',
      ],
    },
    es: {
      heading: 'Patrones de Arquitectura',
      paragraphs: [
        'Los patrones de arquitectura son soluciones reutilizables para la estructura de alto nivel. Guian la organizacion de sistemas y componentes.',
        'Los recursos a continuacion cubren patrones en capas, hexagonal, microservicios y event-driven. Cada guia te ayuda a elegir una arquitectura que se ajuste a tus objetivos.',
      ],
    },
  },
  command: {
    en: {
      heading: 'Command Pattern',
      paragraphs: [
        'The command pattern encapsulates a request as an object. It enables queuing, undo, and parameterization of operations.',
        'The resources below cover command objects, invokers, receivers, and undo. Each guide helps you build flexible and reversible operations.',
      ],
    },
    es: {
      heading: 'Patron Command',
      paragraphs: [
        'El patron command encapsula una solicitud como un objeto. Permite encolar, deshacer y parametrizar operaciones.',
        'Los recursos a continuacion cubren objetos command, invokers, receivers y undo. Cada guia te ayuda a construir operaciones flexibles y reversibles.',
      ],
    },
  },
  undo: {
    en: {
      heading: 'Undo and Redo Patterns',
      paragraphs: [
        'Undo and redo allow users to reverse and reapply actions. They are essential for interactive applications.',
        'The resources below cover command stacks, history, memento, and state snapshots. Each guide helps you implement reliable undo/redo.',
      ],
    },
    es: {
      heading: 'Patrones Undo y Redo',
      paragraphs: [
        'Undo y redo permiten a los usuarios revertir y reaplicar acciones. Son esenciales para aplicaciones interactivas.',
        'Los recursos a continuacion cubren pilas de comandos, historial, memento y snapshots de estado. Cada guia te ayuda a implementar undo/redo confiable.',
      ],
    },
  },
  cloudfront: {
    en: {
      heading: 'Amazon CloudFront',
      paragraphs: [
        'CloudFront is AWS content delivery network. It caches content at edge locations to reduce latency and improve performance.',
        'The resources below cover distributions, origins, cache behaviors, and signed URLs. Each guide helps you deliver content faster with CloudFront.',
      ],
    },
    es: {
      heading: 'Amazon CloudFront',
      paragraphs: [
        'CloudFront es la red de entrega de contenido de AWS. Cachea contenido en ubicaciones de edge para reducir latencia y mejorar rendimiento.',
        'Los recursos a continuacion cubren distribuciones, origenes, comportamientos de cache y URLs firmadas. Cada guia te ayuda a entregar contenido mas rapido con CloudFront.',
      ],
    },
  },
  'data-ownership': {
    en: {
      heading: 'Data Ownership and Governance',
      paragraphs: [
        'Data ownership defines who is responsible for data quality, access, and lifecycle. It is a foundation for governance and compliance.',
        'The resources below cover data stewards, lineage, catalogs, and access control. Each guide helps you establish clear data ownership.',
      ],
    },
    es: {
      heading: 'Propiedad y Gobernanza de Datos',
      paragraphs: [
        'La propiedad de datos define quien es responsable de la calidad, acceso y ciclo de vida de los datos. Es una base para la gobernanza y el cumplimiento.',
        'Los recursos a continuacion cubren data stewards, lineage, catalogos y control de acceso. Cada guia te ayuda a establecer propiedad de datos clara.',
      ],
    },
  },
  'game-dev': {
    en: {
      heading: 'Game Development Patterns',
      paragraphs: [
        'Game development uses specialized patterns for state, physics, rendering, and networking. Good patterns keep game code maintainable.',
        'The resources below cover game loops, ECS, state machines, and networking. Each guide helps you build game systems with solid architecture.',
      ],
    },
    es: {
      heading: 'Patrones de Desarrollo de Juegos',
      paragraphs: [
        'El desarrollo de juegos usa patrones especializados para estado, fisica, renderizado y redes. Buenos patrones mantienen el codigo de juegos mantenible.',
        'Los recursos a continuacion cubren game loops, ECS, maquinas de estado y redes. Cada guia te ayuda a construir sistemas de juegos con arquitectura solida.',
      ],
    },
  },
  factory: {
    en: {
      heading: 'Factory Pattern',
      paragraphs: [
        'The factory pattern creates objects without exposing instantiation logic. It centralizes creation and supports polymorphism.',
        'The resources below cover simple, static, and abstract factories. Each guide helps you create objects cleanly and flexibly.',
      ],
    },
    es: {
      heading: 'Patron Factory',
      paragraphs: [
        'El patron factory crea objetos sin exponer la logica de instanciacion. Centraliza la creacion y soporta polimorfismo.',
        'Los recursos a continuacion cubren factories simples, estaticas y abstractas. Cada guia te ayuda a crear objetos limpia y flexiblemente.',
      ],
    },
  },
  interpreter: {
    en: {
      heading: 'Interpreter Pattern',
      paragraphs: [
        'The interpreter pattern defines a representation for a grammar and an interpreter. It is useful for domain-specific languages.',
        'The resources below cover grammar, abstract syntax trees, and evaluation. Each guide helps you build small interpreters and parsers.',
      ],
    },
    es: {
      heading: 'Patron Interpreter',
      paragraphs: [
        'El patron interpreter define una representacion para una gramatica y un interprete. Es util para lenguajes especificos de dominio.',
        'Los recursos a continuacion cubren gramaticas, arboles de sintaxis abstracta y evaluacion. Cada guia te ayuda a construir pequenos interpretes y parsers.',
      ],
    },
  },
  iterator: {
    en: {
      heading: 'Iterator Pattern',
      paragraphs: [
        'The iterator pattern provides sequential access to elements without exposing internal structure. It is fundamental to collections.',
        'The resources below cover iterators, generators, foreach, and custom collections. Each guide helps you traverse collections cleanly.',
      ],
    },
    es: {
      heading: 'Patron Iterator',
      paragraphs: [
        'El patron iterator proporciona acceso secuencial a elementos sin exponer la estructura interna. Es fundamental para colecciones.',
        'Los recursos a continuacion cubren iterators, generators, foreach y colecciones personalizadas. Cada guia te ayuda a recorrer colecciones limpiamente.',
      ],
    },
  },
  lifecycle: {
    en: {
      heading: 'Object and Component Lifecycle',
      paragraphs: [
        'Lifecycle defines the stages an object or component goes through. Understanding lifecycle helps prevent leaks and inconsistent state.',
        'The resources below cover construction, initialization, use, disposal, and cleanup. Each guide helps you manage lifecycle in frameworks and components.',
      ],
    },
    es: {
      heading: 'Ciclo de Vida de Objetos y Componentes',
      paragraphs: [
        'El ciclo de vida define las etapas por las que pasa un objeto o componente. Comprender el ciclo de vida ayuda a prevenir fugas y estado inconsistente.',
        'Los recursos a continuacion cubren construccion, inicializacion, uso, disposicion y limpieza. Cada guia te ayuda a gestionar el ciclo de vida en frameworks y componentes.',
      ],
    },
  },
  mediator: {
    en: {
      heading: 'Mediator Pattern',
      paragraphs: [
        'The mediator pattern centralizes communication between components. It reduces direct connections and simplifies complex interactions.',
        'The resources below cover mediator interfaces, colleagues, and decoupled communication. Each guide helps you coordinate objects without tight coupling.',
      ],
    },
    es: {
      heading: 'Patron Mediator',
      paragraphs: [
        'El patron mediator centraliza la comunicacion entre componentes. Reduce conexiones directas y simplifica interacciones complejas.',
        'Los recursos a continuacion cubren interfaces de mediator, colleagues y comunicacion desacoplada. Cada guia te ayuda a coordinar objetos sin acoplamiento fuerte.',
      ],
    },
  },
  memento: {
    en: {
      heading: 'Memento Pattern',
      paragraphs: [
        'The memento pattern captures and restores an objects internal state. It is useful for undo, history, and state rollback.',
        'The resources below cover originator, memento, caretaker, and state storage. Each guide helps you implement state preservation without exposing internals.',
      ],
    },
    es: {
      heading: 'Patron Memento',
      paragraphs: [
        'El patron memento captura y restaura el estado interno de un objeto. Es util para undo, historial y rollback de estado.',
        'Los recursos a continuacion cubren originator, memento, caretaker y almacenamiento de estado. Cada guia te ayuda a implementar preservacion de estado sin exponer internos.',
      ],
    },
  },
  scope: {
    en: {
      heading: 'Scope and Visibility',
      paragraphs: [
        'Scope defines where a variable, function, or resource is accessible. Proper scoping limits coupling and avoids name collisions.',
        'The resources below cover lexical scope, closures, dependency scope, and request scope. Each guide helps you manage visibility and lifetime.',
      ],
    },
    es: {
      heading: 'Scope y Visibilidad',
      paragraphs: [
        'El scope define donde es accesible una variable, funcion o recurso. Un scoping adecuado limita el acoplamiento y evita colisiones de nombres.',
        'Los recursos a continuacion cubren scope lexico, closures, scope de dependencias y scope de peticion. Cada guia te ayuda a gestionar visibilidad y tiempo de vida.',
      ],
    },
  },
  registry: {
    en: {
      heading: 'Registry Pattern',
      paragraphs: [
        'The registry pattern provides a central place to look up objects or services. It is an alternative to dependency injection in some cases.',
        'The resources below cover service registries, lookup, and lifecycle. Each guide helps you build flexible object discovery.',
      ],
    },
    es: {
      heading: 'Patron Registry',
      paragraphs: [
        'El patron registry proporciona un lugar central para buscar objetos o servicios. Es una alternativa a la inyeccion de dependencias en algunos casos.',
        'Los recursos a continuacion cubren service registries, lookup y ciclo de vida. Cada guia te ayuda a construir descubrimiento flexible de objetos.',
      ],
    },
  },
  'resource-management': {
    en: {
      heading: 'Resource Management',
      paragraphs: [
        'Resource management allocates, uses, and releases system resources. It is critical for performance and stability.',
        'The resources below cover pools, limits, cleanup, and monitoring. Each guide helps you manage resources without leaks or exhaustion.',
      ],
    },
    es: {
      heading: 'Gestion de Recursos',
      paragraphs: [
        'La gestion de recursos asigna, usa y libera recursos del sistema. Es critica para el rendimiento y la estabilidad.',
        'Los recursos a continuacion cubren pools, limites, limpieza y monitoreo. Cada guia te ayuda a gestionar recursos sin fugas ni agotamiento.',
      ],
    },
  },
  prototype: {
    en: {
      heading: 'Prototype Pattern',
      paragraphs: [
        'The prototype pattern creates new objects by copying an existing one. It is useful when object creation is expensive or complex.',
        'The resources below cover cloning, prototype registries, and examples. Each guide helps you create objects from prototypes.',
      ],
    },
    es: {
      heading: 'Patron Prototype',
      paragraphs: [
        'El patron prototype crea nuevos objetos copiando uno existente. Es util cuando la creacion de objetos es costosa o compleja.',
        'Los recursos a continuacion cubren clonado, registries de prototipos y ejemplos. Cada guia te ayuda a crear objetos desde prototipos.',
      ],
    },
  },
  pgbouncer: {
    en: {
      heading: 'PgBouncer Connection Pooling',
      paragraphs: [
        'PgBouncer is a lightweight connection pooler for PostgreSQL. It reduces the overhead of creating new database connections.',
        'The resources below cover session, transaction, and statement pooling modes, and configuration. Each guide helps you optimize PostgreSQL connections.',
      ],
    },
    es: {
      heading: 'Pooling de Conexiones con PgBouncer',
      paragraphs: [
        'PgBouncer es un pooler de conexiones ligero para PostgreSQL. Reduce el overhead de crear nuevas conexiones a la base de datos.',
        'Los recursos a continuacion cubren modos de pooling session, transaction y statement, y configuracion. Cada guia te ayuda a optimizar conexiones de PostgreSQL.',
      ],
    },
  },
  'object-storage': {
    en: {
      heading: 'Object Storage',
      paragraphs: [
        'Object storage stores data as objects in flat buckets. It is the foundation of cloud storage for files, backups, and media.',
        'The resources below cover S3, buckets, keys, presigned URLs, and lifecycle. Each guide helps you use object storage effectively.',
      ],
    },
    es: {
      heading: 'Almacenamiento de Objetos',
      paragraphs: [
        'El almacenamiento de objetos guarda datos como objetos en buckets planos. Es la base del almacenamiento cloud para archivos, backups y medios.',
        'Los recursos a continuacion cubren S3, buckets, keys, URLs prefirmadas y ciclo de vida. Cada guia te ayuda a usar almacenamiento de objetos efectivamente.',
      ],
    },
  },
  algorithm: {
    en: {
      heading: 'Algorithms',
      paragraphs: [
        'Algorithms are step-by-step procedures for solving problems. Good algorithms improve performance and correctness.',
        'The resources below cover sorting, searching, graph, and dynamic programming algorithms. Each guide helps you choose and implement the right algorithm.',
      ],
    },
    es: {
      heading: 'Algoritmos',
      paragraphs: [
        'Los algoritmos son procedimientos paso a paso para resolver problemas. Buenos algoritmos mejoran rendimiento y correccion.',
        'Los recursos a continuacion cubren algoritmos de ordenamiento, busqueda, grafos y programacion dinamica. Cada guia te ayuda a elegir e implementar el algoritmo correcto.',
      ],
    },
  },
  executor: {
    en: {
      heading: 'Task Executors',
      paragraphs: [
        'Executors manage the execution of tasks in threads or processes. They abstract thread management and improve concurrency control.',
        'The resources below cover thread pools, executors, work queues, and shutdown. Each guide helps you run tasks concurrently with proper management.',
      ],
    },
    es: {
      heading: 'Ejecutores de Tareas',
      paragraphs: [
        'Los ejecutores gestionan la ejecucion de tareas en threads o procesos. Abstraen la gestion de threads y mejoran el control de concurrencia.',
        'Los recursos a continuacion cubren thread pools, ejecutores, colas de trabajo y shutdown. Cada guia te ayuda a ejecutar tareas concurrentemente con gestion adecuada.',
      ],
    },
  },
  'leaky-bucket': {
    en: {
      heading: 'Leaky Bucket Rate Limiting',
      paragraphs: [
        'The leaky bucket algorithm smooths traffic by allowing a steady outflow. It is used for rate limiting and traffic shaping.',
        'The resources below cover bucket capacity, leak rate, and implementation. Each guide helps you control traffic with the leaky bucket pattern.',
      ],
    },
    es: {
      heading: 'Rate Limiting con Leaky Bucket',
      paragraphs: [
        'El algoritmo leaky bucket suaviza el trafico permitiendo un flujo de salida constante. Se usa para rate limiting y shaping de trafico.',
        'Los recursos a continuacion cubren capacidad del bucket, tasa de fuga e implementacion. Cada guia te ayuda a controlar trafico con el patron leaky bucket.',
      ],
    },
  },
  timeout: {
    en: {
      heading: 'Timeouts in Distributed Systems',
      paragraphs: [
        'Timeouts prevent operations from waiting indefinitely. They are essential for resilience and user experience.',
        'The resources below cover request timeouts, circuit breakers, retries, and fallback. Each guide helps you set and handle timeouts correctly.',
      ],
    },
    es: {
      heading: 'Timeouts en Sistemas Distribuidos',
      paragraphs: [
        'Los timeouts evitan que las operaciones esperen indefinidamente. Son esenciales para resiliencia y experiencia de usuario.',
        'Los recursos a continuacion cubren timeouts de peticion, circuit breakers, reintentos y fallback. Cada guia te ayuda a configurar y manejar timeouts correctamente.',
      ],
    },
  },
  'in-memory': {
    en: {
      heading: 'In-Memory Data Storage',
      paragraphs: [
        'In-memory storage keeps data in RAM for fast access. It is used for caches, sessions, and temporary data.',
        'The resources below cover in-memory databases, data grids, and TTL. Each guide helps you use in-memory storage for speed.',
      ],
    },
    es: {
      heading: 'Almacenamiento de Datos en Memoria',
      paragraphs: [
        'El almacenamiento en memoria mantiene datos en RAM para acceso rapido. Se usa para caches, sesiones y datos temporales.',
        'Los recursos a continuacion cubren bases de datos en memoria, data grids y TTL. Cada guia te ayuda a usar almacenamiento en memoria para velocidad.',
      ],
    },
  },
  visitor: {
    en: {
      heading: 'Visitor Pattern',
      paragraphs: [
        'The visitor pattern separates operations from the objects on which they operate. It is useful when adding operations without changing classes.',
        'The resources below cover visitor, elements, double dispatch, and examples. Each guide helps you extend object behavior without modification.',
      ],
    },
    es: {
      heading: 'Patron Visitor',
      paragraphs: [
        'El patron visitor separa las operaciones de los objetos sobre los que operan. Es util cuando se agregan operaciones sin cambiar clases.',
        'Los recursos a continuacion cubren visitor, elementos, double dispatch y ejemplos. Cada guia te ayuda a extender el comportamiento de objetos sin modificacion.',
      ],
    },
  },
  'write-through': {
    en: {
      heading: 'Write-Through Caching',
      paragraphs: [
        'Write-through writes data to the cache and backing store at the same time. It keeps the cache consistent at the cost of higher write latency.',
        'The resources below cover cache patterns, write-behind, and consistency. Each guide helps you choose write strategies for caching.',
      ],
    },
    es: {
      heading: 'Cache Write-Through',
      paragraphs: [
        'El write-through escribe datos en el cache y en el almacenamiento de respaldo al mismo tiempo. Mantiene el cache consistente a costa de mayor latencia de escritura.',
        'Los recursos a continuacion cubren patrones de cache, write-behind y consistencia. Cada guia te ayuda a elegir estrategias de escritura para caching.',
      ],
    },
  },
  'design-system': {
    en: {
      heading: 'Design Systems',
      paragraphs: [
        'A design system is a collection of reusable components, patterns, and guidelines. It ensures consistency across products.',
        'The resources below cover tokens, components, documentation, and governance. Each guide helps you build and maintain a design system.',
      ],
    },
    es: {
      heading: 'Sistemas de Diseno',
      paragraphs: [
        'Un sistema de diseno es una coleccion de componentes reutilizables, patrones y guias. Asegura consistencia entre productos.',
        'Los recursos a continuacion cubren tokens, componentes, documentacion y gobernanza. Cada guia te ayuda a construir y mantener un sistema de diseno.',
      ],
    },
  },
  reusability: {
    en: {
      heading: 'Code Reusability',
      paragraphs: [
        'Reusability is the ability to use existing code in multiple contexts. It reduces duplication and improves maintainability.',
        'The resources below cover components, libraries, abstractions, and modularity. Each guide helps you write code that can be reused.',
      ],
    },
    es: {
      heading: 'Reutilizacion de Codigo',
      paragraphs: [
        'La reutilizacion es la capacidad de usar codigo existente en multiples contextos. Reduce duplicacion y mejora mantenibilidad.',
        'Los recursos a continuacion cubren componentes, librerias, abstracciones y modularidad. Cada guia te ayuda a escribir codigo que pueda reutilizarse.',
      ],
    },
  },
  ssr: {
    en: {
      heading: 'Server-Side Rendering',
      paragraphs: [
        'Server-side rendering generates HTML on the server before sending it to the client. It improves initial load and SEO.',
        'The resources below cover hydration, rendering strategies, and frameworks. Each guide helps you implement SSR for better performance and discoverability.',
      ],
    },
    es: {
      heading: 'Renderizado en el Servidor',
      paragraphs: [
        'El server-side rendering genera HTML en el servidor antes de enviarlo al cliente. Mejora la carga inicial y el SEO.',
        'Los recursos a continuacion cubren hydration, estrategias de renderizado y frameworks. Cada guia te ayuda a implementar SSR para mejor rendimiento y descubrimiento.',
      ],
    },
  },
  connection: {
    en: {
      heading: 'Connection Management',
      paragraphs: [
        'Connection management controls how clients and servers establish and maintain connections. It affects scalability and reliability.',
        'The resources below cover connection pools, keep-alive, timeouts, and backpressure. Each guide helps you manage network connections efficiently.',
      ],
    },
    es: {
      heading: 'Gestion de Conexiones',
      paragraphs: [
        'La gestion de conexiones controla como clientes y servidores establecen y mantienen conexiones. Afecta escalabilidad y confiabilidad.',
        'Los recursos a continuacion cubren pools de conexion, keep-alive, timeouts y backpressure. Cada guia te ayuda a gestionar conexiones de red eficientemente.',
      ],
    },
  },
  'apollo-server': {
    en: {
      heading: 'Apollo Server',
      paragraphs: [
        'Apollo Server is a GraphQL server for Node.js. It provides schema definition, resolvers, and built-in tooling.',
        'The resources below cover schema, resolvers, context, plugins, and federation. Each guide helps you build GraphQL APIs with Apollo Server.',
      ],
    },
    es: {
      heading: 'Apollo Server',
      paragraphs: [
        'Apollo Server es un servidor GraphQL para Node.js. Proporciona definicion de esquemas, resolvers y herramientas integradas.',
        'Los recursos a continuacion cubren esquema, resolvers, contexto, plugins y federacion. Cada guia te ayuda a construir APIs GraphQL con Apollo Server.',
      ],
    },
  },
  mutation: {
    en: {
      heading: 'GraphQL Mutations',
      paragraphs: [
        'GraphQL mutations modify data on the server. They are the equivalent of POST, PUT, and DELETE in REST.',
        'The resources below cover mutation design, input types, validation, and error handling. Each guide helps you write mutations that are safe and clear.',
      ],
    },
    es: {
      heading: 'Mutations en GraphQL',
      paragraphs: [
        'Las mutations de GraphQL modifican datos en el servidor. Son el equivalente de POST, PUT y DELETE en REST.',
        'Los recursos a continuacion cubren diseno de mutations, tipos de entrada, validacion y manejo de errores. Cada guia te ayuda a escribir mutations seguras y claras.',
      ],
    },
  },
  'correlation-id': {
    en: {
      heading: 'Correlation IDs',
      paragraphs: [
        'A correlation ID travels with a request across services. It enables tracing and debugging in distributed systems.',
        'The resources below cover propagation, logging, and implementation. Each guide helps you track requests end-to-end.',
      ],
    },
    es: {
      heading: 'IDs de Correlacion',
      paragraphs: [
        'Un ID de correlacion viaja con una peticion a traves de servicios. Habilita tracing y debugging en sistemas distribuidos.',
        'Los recursos a continuacion cubren propagacion, logging e implementacion. Cada guia te ayuda a rastrear peticiones de extremo a extremo.',
      ],
    },
  },
  'json-logs': {
    en: {
      heading: 'JSON Logs',
      paragraphs: [
        'JSON logs are machine-readable log entries. They simplify parsing, indexing, and analysis in log management tools.',
        'The resources below cover structured logging, fields, correlation, and tools. Each guide helps you produce logs that are easy to query.',
      ],
    },
    es: {
      heading: 'Logs en JSON',
      paragraphs: [
        'Los logs JSON son entradas de log legibles por maquinas. Simplifican parseo, indexado y analisis en herramientas de gestion de logs.',
        'Los recursos a continuacion cubren logging estructurado, campos, correlacion y herramientas. Cada guia te ayuda a producir logs faciles de consultar.',
      ],
    },
  },
  'high-availability': {
    en: {
      heading: 'High Availability',
      paragraphs: [
        'High availability minimizes downtime and ensures continuous operation. It requires redundancy, failover, and monitoring.',
        'The resources below cover clustering, load balancing, failover, and SLAs. Each guide helps you design systems that stay available.',
      ],
    },
    es: {
      heading: 'Alta Disponibilidad',
      paragraphs: [
        'La alta disponibilidad minimiza el tiempo de inactividad y asegura operacion continua. Requiere redundancia, failover y monitoreo.',
        'Los recursos a continuacion cubren clustering, balanceo de carga, failover y SLAs. Cada guia te ayuda a disenar sistemas que permanecen disponibles.',
      ],
    },
  },
};
