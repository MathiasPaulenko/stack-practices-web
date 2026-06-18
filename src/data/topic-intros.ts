export interface TopicIntro {
  en: { heading: string; paragraphs: string[] };
  es: { heading: string; paragraphs: string[] };
}

export const topicIntros: Record<string, TopicIntro> = {
  data: {
    en: {
      heading: 'Understanding Data Processing in Software Engineering',
      paragraphs: [
        'Every application eventually deals with data — parsing user input, serializing objects for APIs, validating form submissions, or transforming records between formats. Getting data handling right is what separates fragile scripts from production-grade systems.',
        'This collection covers practical recipes and patterns for working with JSON, CSV, XML, YAML, and custom formats. You will find copy-paste solutions for common tasks like flattening nested objects, sanitizing user input, generating slugs, and formatting dates across Python, Java, and JavaScript.',
      ],
    },
    es: {
      heading: 'Entendiendo el Procesamiento de Datos en Ingeniería de Software',
      paragraphs: [
        'Toda aplicación eventualmente trabaja con datos — analizando entrada de usuario, serializando objetos para APIs, validando envíos de formularios o transformando registros entre formatos. Manejar datos correctamente es lo que separa scripts frágiles de sistemas listos para producción.',
        'Esta colección cubre recetas y patrones prácticos para trabajar con JSON, CSV, XML, YAML y formatos personalizados. Encontrarás soluciones listas para copiar para tareas comunes como aplanar objetos anidados, sanitizar entrada de usuario, generar slugs y formatear fechas en Python, Java y JavaScript.',
      ],
    },
  },
  api: {
    en: {
      heading: 'Building Robust APIs',
      paragraphs: [
        'APIs are the contract between systems. Whether you are exposing a public REST endpoint, designing an internal GraphQL schema, or integrating with a third-party service, the patterns you choose determine reliability, performance, and developer experience.',
        'Here you will find recipes for handling CORS, implementing pagination, versioning endpoints, managing rate limits, and documenting APIs with OpenAPI. Each example includes runnable code in multiple languages so you can adapt it to your stack immediately.',
      ],
    },
    es: {
      heading: 'Construyendo APIs Robustas',
      paragraphs: [
        'Las APIs son el contrato entre sistemas. Ya sea que expongas un endpoint REST público, diseñes un schema GraphQL interno o te integres con un servicio de terceros, los patrones que elijas determinan la confiabilidad, rendimiento y experiencia del desarrollador.',
        'Aquí encontrarás recetas para manejar CORS, implementar paginación, versionar endpoints, gestionar límites de tasa y documentar APIs con OpenAPI. Cada ejemplo incluye código ejecutable en múltiples lenguajes para que puedas adaptarlo a tu stack inmediatamente.',
      ],
    },
  },
  authentication: {
    en: {
      heading: 'Securing Access to Your Systems',
      paragraphs: [
        'Authentication and authorization are the foundation of application security. From password hashing and JWT tokens to OAuth2 flows and multi-factor authentication, getting identity right protects both your users and your data.',
        'These resources cover proven patterns for session management, API key handling, SSO with SAML, and role-based access control. Each guide explains when to use a given approach, common pitfalls to avoid, and complete implementation examples.',
      ],
    },
    es: {
      heading: 'Asegurando el Acceso a Tus Sistemas',
      paragraphs: [
        'La autenticación y autorización son la base de la seguridad de aplicaciones. Desde el hashing de contraseñas y tokens JWT hasta flujos OAuth2 y autenticación multifactor, hacer la identidad correctamente protege tanto a tus usuarios como a tus datos.',
        'Estos recursos cubren patrones probados para gestión de sesiones, manejo de API keys, SSO con SAML y control de acceso basado en roles. Cada guía explica cuándo usar un enfoque dado, trampas comunes a evitar y ejemplos de implementación completos.',
      ],
    },
  },
  'file-handling': {
    en: {
      heading: 'Working with Files and Streams',
      paragraphs: [
        'File operations are deceptively simple until you face large datasets, concurrent writes, or cross-platform path differences. Production code needs to handle streaming, compression, encoding, and cleanup gracefully.',
        'This section provides recipes for reading large files efficiently, watching directories for changes, compressing archives, rotating logs, and parsing configuration files. Solutions cover Python, Java, Node.js, and Bash for maximum flexibility.',
      ],
    },
    es: {
      heading: 'Trabajando con Archivos y Streams',
      paragraphs: [
        'Las operaciones de archivo son engañosamente simples hasta que te enfrentas a grandes datasets, escrituras concurrentes o diferencias de paths entre plataformas. El código de producción necesita manejar streaming, compresión, encoding y limpieza con elegancia.',
        'Esta sección proporciona recetas para leer archivos grandes eficientemente, monitorear directorios por cambios, comprimir archivos, rotar logs y analizar archivos de configuración. Las soluciones cubren Python, Java, Node.js y Bash para máxima flexibilidad.',
      ],
    },
  },
  testing: {
    en: {
      heading: 'Testing Strategies That Ship with Confidence',
      paragraphs: [
        'Testing is not just about catching bugs — it is about shipping faster, refactoring without fear, and documenting behavior through executable specs. A well-tested codebase reduces incident response time and onboarding friction for new developers.',
        'Explore recipes for unit testing with mocks, integration testing with real dependencies, end-to-end testing with Playwright, and load testing with k6. Each pattern includes setup instructions, assertion strategies, and CI/CD integration tips.',
      ],
    },
    es: {
      heading: 'Estrategias de Testing que Entregan con Confianza',
      paragraphs: [
        'El testing no se trata solo de encontrar bugs — se trata de entregar más rápido, refactorizar sin miedo y documentar comportamiento a través de specs ejecutables. Una base de código bien testeada reduce el tiempo de respuesta a incidentes y la fricción de onboarding.',
        'Explora recetas para unit testing con mocks, testing de integración con dependencias reales, testing end-to-end con Playwright y load testing con k6. Cada patrón incluye instrucciones de setup, estrategias de aserción y tips de integración CI/CD.',
      ],
    },
  },
  architecture: {
    en: {
      heading: 'Designing Systems That Scale',
      paragraphs: [
        'Software architecture is the art of making trade-offs. Every pattern — from microservices to event-driven systems — solves specific problems while introducing new constraints. Understanding these trade-offs is what makes an engineer an architect.',
        'This hub collects guides and patterns for API gateways, load balancing, circuit breakers, sagas, and service meshes. Whether you are designing a new system or modernizing a legacy monolith, these resources provide the mental models and implementation details you need.',
      ],
    },
    es: {
      heading: 'Diseñando Sistemas que Escalan',
      paragraphs: [
        'La arquitectura de software es el arte de hacer trade-offs. Cada patrón — desde microservicios hasta sistemas orientados a eventos — resuelve problemas específicos mientras introduce nuevas restricciones. Entender estos trade-offs es lo que convierte a un ingeniero en arquitecto.',
        'Este hub colecciona guías y patrones para API gateways, balanceo de carga, circuit breakers, sagas y service meshes. Ya sea que estés diseñando un sistema nuevo o modernizando un monolito legacy, estos recursos proporcionan los modelos mentales y detalles de implementación que necesitas.',
      ],
    },
  },
  design: {
    en: {
      heading: 'Patterns for Maintainable Code',
      paragraphs: [
        'Design patterns are not cookbook recipes — they are a shared vocabulary for discussing solutions to recurring problems. Knowing when to apply (and when to avoid) a pattern is a hallmark of senior engineering.',
        'Browse our catalog of creational, structural, and behavioral patterns. Each entry includes a real-world scenario, UML diagrams, implementation in multiple languages, and a discussion of trade-offs. From Singleton to Outbox, find the right tool for your context.',
      ],
    },
    es: {
      heading: 'Patrones para Código Mantenible',
      paragraphs: [
        'Los patrones de diseño no son recetas de libro de cocina — son un vocabulario compartido para discutir soluciones a problemas recurrentes. Saber cuándo aplicar (y cuándo evitar) un patrón es una marca de ingeniería senior.',
        'Explora nuestro catálogo de patrones creacionales, estructurales y de comportamiento. Cada entrada incluye un escenario del mundo real, diagramas UML, implementación en múltiples lenguajes y una discusión de trade-offs. Desde Singleton hasta Outbox, encuentra la herramienta correcta para tu contexto.',
      ],
    },
  },
  devops: {
    en: {
      heading: 'Automating Infrastructure and Delivery',
      paragraphs: [
        'DevOps bridges the gap between writing code and running it in production. Containerization, CI/CD pipelines, infrastructure as code, and observability are no longer optional — they are table stakes for modern engineering teams.',
        'Find practical recipes for building Docker images, writing GitHub Actions workflows, deploying to Kubernetes, managing Terraform state, and setting up Prometheus monitoring. Each guide is tested against real cloud environments and includes troubleshooting tips.',
      ],
    },
    es: {
      heading: 'Automatizando Infraestructura y Entrega',
      paragraphs: [
        'DevOps cierra la brecha entre escribir código y ejecutarlo en producción. La containerización, pipelines CI/CD, infraestructura como código y observabilidad ya no son opcionales — son requisitos básicos para equipos de ingeniería modernos.',
        'Encuentra recetas prácticas para construir imágenes Docker, escribir workflows de GitHub Actions, desplegar en Kubernetes, gestionar estado de Terraform y configurar monitoreo con Prometheus. Cada guía está probada contra entornos cloud reales e incluye tips de troubleshooting.',
      ],
    },
  },
  databases: {
    en: {
      heading: 'Storing, Querying, and Scaling Data',
      paragraphs: [
        'Databases are the persistence layer every application depends on. Choosing between relational and NoSQL, designing indexes, handling migrations, and optimizing slow queries are skills that directly impact user experience and infrastructure cost.',
        'This section covers recipes for PostgreSQL and MySQL connections, MongoDB CRUD operations, Redis caching strategies, and schema design patterns. You will also find guides on ACID transactions, connection pooling, and full-text search implementation.',
      ],
    },
    es: {
      heading: 'Almacenando, Consultando y Escalando Datos',
      paragraphs: [
        'Las bases de datos son la capa de persistencia de la que toda aplicación depende. Elegir entre relacional y NoSQL, diseñar índices, manejar migraciones y optimizar queries lentas son habilidades que impactan directamente la experiencia del usuario y el costo de infraestructura.',
        'Esta sección cubre recetas para conexiones PostgreSQL y MySQL, operaciones CRUD en MongoDB, estrategias de cacheo con Redis y patrones de diseño de schemas. También encontrarás guías sobre transacciones ACID, pools de conexiones e implementación de búsqueda full-text.',
      ],
    },
  },
  ai: {
    en: {
      heading: 'Integrating AI and Machine Learning',
      paragraphs: [
        'Artificial intelligence has moved from research labs to production pipelines. LLMs, vector databases, and embedding-based search are now standard tools for building intelligent applications that understand context and generate content.',
        'Explore recipes for building RAG pipelines, fine-tuning models, engineering prompts, and implementing semantic search. Each example focuses on practical integration rather than theory, with code you can adapt to your own data and use case.',
      ],
    },
    es: {
      heading: 'Integrando IA y Machine Learning',
      paragraphs: [
        'La inteligencia artificial ha pasado de laboratorios de investigación a pipelines de producción. Los LLMs, bases de datos vectoriales y búsqueda basada en embeddings son ahora herramientas estándar para construir aplicaciones inteligentes que entienden contexto y generan contenido.',
        'Explora recetas para construir pipelines RAG, fine-tuning de modelos, ingeniería de prompts e implementación de búsqueda semántica. Cada ejemplo se enfoca en integración práctica en lugar de teoría, con código que puedes adaptar a tus propios datos y casos de uso.',
      ],
    },
  },
  frontend: {
    en: {
      heading: 'Building Fast and Accessible User Interfaces',
      paragraphs: [
        'Frontend development is more than component libraries. Performance budgets, accessibility compliance, state management, and progressive enhancement determine whether users stay or leave.',
        'This topic covers patterns for web components, state management strategies, accessibility audits with WCAG, and performance optimization techniques. Resources include both framework-agnostic principles and specific implementations for modern stacks.',
      ],
    },
    es: {
      heading: 'Construyendo Interfaces de Usuario Rápidas y Accesibles',
      paragraphs: [
        'El desarrollo frontend es más que bibliotecas de componentes. Los presupuestos de rendimiento, cumplimiento de accesibilidad, gestión de estado y mejora progresiva determinan si los usuarios se quedan o se van.',
        'Este tema cubre patrones para web components, estrategias de gestión de estado, auditorías de accesibilidad con WCAG y técnicas de optimización de rendimiento. Los recursos incluyen tanto principios agnósticos de framework como implementaciones específicas para stacks modernos.',
      ],
    },
  },
  infrastructure: {
    en: {
      heading: 'Designing Reliable Infrastructure',
      paragraphs: [
        'Infrastructure is the platform your applications run on. From cloud networking and load balancing to service meshes and auto-scaling policies, the decisions you make here affect availability, latency, and operational cost for years.',
        'Find guides on infrastructure as code with Terraform, Kubernetes deployment patterns, reverse proxy configuration, and SSL certificate automation. Each resource is built from real-world experience running production workloads on AWS, GCP, and Azure.',
      ],
    },
    es: {
      heading: 'Diseñando Infraestructura Confiable',
      paragraphs: [
        'La infraestructura es la plataforma sobre la que corren tus aplicaciones. Desde networking cloud y balanceo de carga hasta service meshes y políticas de auto-scaling, las decisiones que tomes aquí afectan la disponibilidad, latencia y costo operacional por años.',
        'Encuentra guías sobre infraestructura como código con Terraform, patrones de despliegue en Kubernetes, configuración de reverse proxy y automatización de certificados SSL. Cada recurso está construido desde experiencia real ejecutando cargas de trabajo de producción en AWS, GCP y Azure.',
      ],
    },
  },
  messaging: {
    en: {
      heading: 'Connecting Systems with Messages and Events',
      paragraphs: [
        'When direct API calls become bottlenecks, messaging patterns provide the decoupling and resilience needed for distributed systems. Message queues, event buses, and stream processors handle backpressure, retries, and eventual consistency.',
        'This collection covers recipes for implementing pub/sub patterns, using message brokers like RabbitMQ and Kafka, designing event-driven architectures, and handling dead letter queues. Each pattern includes failure scenarios and recovery strategies.',
      ],
    },
    es: {
      heading: 'Conectando Sistemas con Mensajes y Eventos',
      paragraphs: [
        'Cuando las llamadas API directas se convierten en cuellos de botella, los patrones de mensajería proporcionan el desacoplamiento y resiliencia necesarios para sistemas distribuidos. Las colas de mensajes, buses de eventos y procesadores de streams manejan backpressure, reintentos y consistencia eventual.',
        'Esta colección cubre recetas para implementar patrones pub/sub, usar brokers de mensajes como RabbitMQ y Kafka, diseñar arquitecturas orientadas a eventos y manejar dead letter queues. Cada patrón incluye escenarios de fallo y estrategias de recuperación.',
      ],
    },
  },
  observability: {
    en: {
      heading: 'Understanding Production Systems',
      paragraphs: [
        'You cannot fix what you cannot see. Observability combines metrics, logs, and traces into a coherent picture of system health. It is the difference between reactive firefighting and proactive capacity planning.',
        'These resources cover structured logging with JSON, Prometheus metric collection, Grafana dashboard design, distributed tracing with OpenTelemetry, and alerting strategies. Learn how to reduce mean time to detection and resolution in production environments.',
      ],
    },
    es: {
      heading: 'Entendiendo Sistemas en Producción',
      paragraphs: [
        'No puedes arreglar lo que no puedes ver. La observabilidad combina métricas, logs y traces en una imagen coherente de la salud del sistema. Es la diferencia entre combatir incendios reactivamente y planificar capacidad proactivamente.',
        'Estos recursos cubren logging estructurado con JSON, colección de métricas con Prometheus, diseño de dashboards en Grafana, tracing distribuido con OpenTelemetry y estrategias de alertado. Aprende a reducir el tiempo medio de detección y resolución en entornos de producción.',
      ],
    },
  },
  graphql: {
    en: {
      heading: 'Designing Flexible APIs with GraphQL',
      paragraphs: [
        'GraphQL shifts the power balance from server to client, allowing consumers to request exactly the data they need. But with flexibility comes complexity: N+1 queries, schema evolution, and resolver performance require careful design.',
        'Explore recipes for writing resolvers, implementing federation, handling subscriptions, and managing schema versioning. Each pattern includes performance considerations and security best practices specific to GraphQL implementations.',
      ],
    },
    es: {
      heading: 'Diseñando APIs Flexibles con GraphQL',
      paragraphs: [
        'GraphQL cambia el balance de poder del servidor al cliente, permitiendo que los consumidores soliciten exactamente los datos que necesitan. Pero con la flexibilidad viene la complejidad: queries N+1, evolución de schemas y rendimiento de resolvers requieren diseño cuidadoso.',
        'Explora recetas para escribir resolvers, implementar federación, manejar subscriptions y gestionar versionado de schemas. Cada patrón incluye consideraciones de rendimiento y mejores prácticas de seguridad específicas para implementaciones GraphQL.',
      ],
    },
  },
  serverless: {
    en: {
      heading: 'Running Code Without Managing Servers',
      paragraphs: [
        'Serverless computing abstracts infrastructure so teams can focus on business logic. Functions, managed databases, and event triggers scale automatically while you pay only for execution time.',
        'This topic covers AWS Lambda patterns, Google Cloud Functions deployment, Azure Durable Functions orchestration, and API Gateway integration. Learn to optimize cold starts, manage state between invocations, and design event-driven serverless architectures.',
      ],
    },
    es: {
      heading: 'Ejecutando Código Sin Gestionar Servidores',
      paragraphs: [
        'La computación serverless abstrae la infraestructura para que los equipos se enfoquen en la lógica de negocio. Las funciones, bases de datos gestionadas y triggers de eventos escalan automáticamente mientras pagas solo por el tiempo de ejecución.',
        'Este tema cubre patrones de AWS Lambda, despliegue de Google Cloud Functions, orquestación con Azure Durable Functions e integración con API Gateway. Aprende a optimizar cold starts, gestionar estado entre invocaciones y diseñar arquitecturas serverless orientadas a eventos.',
      ],
    },
  },
  caching: {
    en: {
      heading: 'Speeding Up Applications with Caching',
      paragraphs: [
        'Caching is one of the highest-impact optimizations available to engineers. A well-placed cache can reduce database load by orders of magnitude and turn slow endpoints into sub-millisecond responses.',
        'Discover patterns for in-memory caching with Redis, CDN edge caching, cache-aside and write-through strategies, and invalidation approaches. Each recipe discusses consistency trade-offs and provides production-tested configuration examples.',
      ],
    },
    es: {
      heading: 'Acelerando Aplicaciones con Cache',
      paragraphs: [
        'El cacheo es una de las optimizaciones de mayor impacto disponibles para ingenieros. Un cache bien ubicado puede reducir la carga de base de datos en órdenes de magnitud y convertir endpoints lentos en respuestas sub-milisegundo.',
        'Descubre patrones para cacheo en memoria con Redis, cacheo en edge de CDN, estrategias cache-aside y write-through, y enfoques de invalidación. Cada receta discute trade-offs de consistencia y proporciona ejemplos de configuración probados en producción.',
      ],
    },
  },
  performance: {
    en: {
      heading: 'Optimizing for Speed and Efficiency',
      paragraphs: [
        'Performance is a feature. Slow applications lose users, increase infrastructure costs, and create a poor developer experience. Profiling, benchmarking, and systematic optimization are essential skills for senior engineers.',
        'This section covers profiling techniques, database query optimization, frontend bundle analysis, memory leak detection, and latency reduction strategies. Each guide includes measurable targets and before/after benchmarks.',
      ],
    },
    es: {
      heading: 'Optimizando para Velocidad y Eficiencia',
      paragraphs: [
        'El rendimiento es una feature. Las aplicaciones lentas pierden usuarios, aumentan costos de infraestructura y crean mala experiencia de desarrollador. El profiling, benchmarking y la optimización sistemática son habilidades esenciales para ingenieros senior.',
        'Esta sección cubre técnicas de profiling, optimización de queries de base de datos, análisis de bundles frontend, detección de memory leaks y estrategias de reducción de latencia. Cada guía incluye objetivos medibles y benchmarks antes/después.',
      ],
    },
  },
  security: {
    en: {
      heading: 'Protecting Applications and Data',
      paragraphs: [
        'Security is not a checkbox — it is a mindset. From input validation and XSS prevention to secrets management and compliance frameworks, every layer of the stack needs defensive design.',
        'Browse recipes for implementing Content Security Policy, encrypting data at rest and in transit, managing API keys, and conducting dependency audits. Guides also cover OWASP Top 10 mitigations and secure coding practices by language.',
      ],
    },
    es: {
      heading: 'Protegiendo Aplicaciones y Datos',
      paragraphs: [
        'La seguridad no es una casilla de verificación — es una mentalidad. Desde la validación de entrada y prevención de XSS hasta la gestión de secretos y marcos de cumplimiento, cada capa del stack necesita diseño defensivo.',
        'Explora recetas para implementar Content Security Policy, encriptar datos en reposo y en tránsito, gestionar API keys y realizar auditorías de dependencias. Las guías también cubren mitigaciones del OWASP Top 10 y prácticas de código seguro por lenguaje.',
      ],
    },
  },
  concurrency: {
    en: {
      heading: 'Managing Parallel Execution',
      paragraphs: [
        'Modern hardware is parallel, but writing correct concurrent code remains one of the hardest problems in software engineering. Race conditions, deadlocks, and thread starvation can cause bugs that only appear under production load.',
        'This collection covers async patterns, thread pools, locks and mutexes, concurrent data structures, and message-passing models like CSP. Each pattern includes common pitfalls and language-specific implementation advice.',
      ],
    },
    es: {
      heading: 'Gestionando Ejecución Paralela',
      paragraphs: [
        'El hardware moderno es paralelo, pero escribir código concurrente correcto sigue siendo uno de los problemas más difíciles en ingeniería de software. Las race conditions, deadlocks y starvation de threads pueden causar bugs que solo aparecen bajo carga de producción.',
        'Esta colección cubre patrones async, thread pools, locks y mutexes, estructuras de datos concurrentes y modelos de paso de mensajes como CSP. Cada patrón incluye trampas comunes y consejos de implementación específicos por lenguaje.',
      ],
    },
  },
};
