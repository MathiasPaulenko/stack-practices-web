const fs = require('fs');

function fillBody(filePath, newBody) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) { console.error('Invalid frontmatter in', filePath); return; }
  const frontmatter = '---' + parts[1] + '---';
  fs.writeFileSync(filePath, frontmatter + '\n' + newBody.trim() + '\n', 'utf8');
  console.log('Updated:', filePath);
}

const articles = {
  'src/content/recipes/performance/caching-strategies.es.md': `## Visión General

El caching es la técnica más efectiva para mejorar el rendimiento de aplicaciones. Almacenando datos frecuentemente accedidos cerca de los consumidores — en memoria del navegador, bordes de CDN o almacenamiento in-memory — reduces latencia, disminuyes carga de base de datos y mejoras la experiencia del usuario. Elegir la estrategia correcta depende de los requisitos de frescura de datos y patrones de lectura/escritura.

## Cuándo Usar

Usa este recurso cuando:
- Las consultas de base de datos se vuelven un cuello de botella bajo carga
- Los tiempos de respuesta de API exceden 200ms para endpoints de lectura intensiva
- Sirves assets estáticos (imágenes, JS, CSS) a usuarios globales
- Construyes aplicaciones de alto tráfico donde datos stale son aceptables

## Solución

### Cache-Aside con Redis (Node.js)

\`\`\`javascript
const redis = require('redis');
const client = redis.createClient();

async function getUser(userId) {
  const cacheKey = \`user:\${userId}\`;
  
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  const user = await db.users.findById(userId);
  if (user) {
    await client.setEx(cacheKey, 3600, JSON.stringify(user));
  }
  return user;
}
\`\`\`

### Stale-While-Revalidate (HTTP)

\`\`\`javascript
app.get('/api/products', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(products);
});
\`\`\`

### CDN Edge Caching (CloudFront/Vercel)

\`\`\`json
{
  "routes": [
    {
      "src": "/api/public/.*",
      "headers": {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400"
      }
    }
  ]
}
\`\`\`

## Explicación

| Estrategia | Patrón | Ideal Para |
|------------|--------|------------|
| Cache-Aside | La app revisa cache, fallback a DB | Lectura intensiva; simple de implementar |
| Read-Through | Cache actúa como proxy transparente de DB | Lectura intensiva; la librería maneja lógica |
| Write-Through | Escrituras actualizan cache y DB simultáneamente | Consistencia de datos crítica |
| Write-Behind | Escrituras actualizan cache; flush async a DB | Escritura intensiva; consistencia eventual |
| Refresh-Ahead | Refresh en background antes de expiración | Patrones de acceso predecibles |

**Enfoques de invalidación de cache**:
- **Basado en tiempo (TTL)**: Simple pero puede servir datos stale
- **Basado en clave**: Incluye versión o hash en la clave de cache
- **Basado en eventos**: Invalida cuando los datos cambian vía message bus

## Variantes

| Capa | Tecnología | Latencia | Caso de Uso |
|------|------------|----------|-------------|
| Navegador | LocalStorage, IndexedDB | ~1ms | Apps offline-first |
| CDN | CloudFront, Cloudflare, Fastly | ~10-50ms | Assets estáticos, caching de API en edge |
| Aplicación | Redis, Memcached | ~1ms | Session store, datos hot |
| Base de datos | Query cache, vistas materializadas | ~1-10ms | Queries complejas repetidas |
| Disco | Page cache, buffers del OS | ~0.1ms | Lecturas de file system |

## Mejores Prácticas

- **Ajusta TTLs según volatilidad**: Perfiles de usuario (1h), catálogos de productos (24h), precios de acciones (10s)
- **Cachea en múltiples capas**: Navegador + CDN + Redis + query cache de DB
- **Usa protección contra stampede**: Lock durante cache miss para prevenir thundering herd
- **Monitorea hit rates**: Por debajo de 80% señala mala configuración o TTL demasiado corto
- **Versiona tus claves de cache**: Incluye versión de app para invalidar en deploy

## Errores Comunes

1. **Cachear todo**: Datos estáticos sí; datos específicos de usuario o cambiantes frecuentemente no
2. **Sin estrategia de invalidación**: Datos stale persisten indefinidamente sin TTL o eventos
3. **Thundering herd**: 1000 requests golpean un cache cold simultáneamente; usa locking
4. **Cache poisoning**: Input de usuario no validado almacenado en cache compartido afecta a todos los usuarios
5. **Ignorar cache warming**: Deploys a producción arrancan con caches vacíos y alta latencia

## Preguntas Frecuentes

**P: ¿Cómo prevengo cache stampedes?**
R: Usa un mutex o Redis SET NX (lock) para que solo un request reconstruya el cache mientras otros esperan.

**P: ¿Debería cachear respuestas GraphQL?**
R: Sí, pero cachea por hash de query + variables. Apollo Server tiene caching de respuestas built-in.

**P: ¿Cuál es la diferencia entre Redis y Memcached?**
R: Redis soporta estructuras de datos (listas, sets, sorted sets) y persistencia. Memcached es más simple y ligeramente más rápido para caching plain key-value.
`,

  'src/content/recipes/devops/cicd-pipeline-setup.es.md': `## Visión General

Continuous Integration y Continuous Deployment (CI/CD) automatizan el viaje desde el commit de código hasta el deploy en producción. Un pipeline bien configurado ejecuta tests, construye artifacts, escanea vulnerabilidades y despliega a staging o producción sin intervención manual. Esto elimina errores humanos, acelera releases y provee feedback rápido a los desarrolladores.

## Cuándo Usar

Usa este recurso cuando:
- configures un nuevo proyecto y quieras testing automatizado desde el día uno
- Migres de deploys manuales a releases automatizados
- Agregues scanning de seguridad, linting o gates de calidad de código a tu workflow
- Construyas una estrategia de deploy multi-ambiente (dev → staging → prod)

## Solución

### Workflow de GitHub Actions

\`\`\`yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:ci
      - run: npm run build

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=moderate

  deploy:
    needs: [test, security]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to staging
        run: |
          npm run build
          npm run deploy:staging
\`\`\`

### Configuración de GitLab CI

\`\`\`yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run test:ci

deploy_prod:
  stage: deploy
  script:
    - npm run deploy:production
  only:
    - main
  environment:
    name: production
    url: https://api.example.com
\`\`\`

## Explicación

Un pipeline de CI/CD de producción típicamente incluye:

1. **Trigger**: Push, pull request o job programado por cron
2. **Build**: Compila, bundlea y crea artifacts
3. **Test**: Tests unitarios, tests de integración, linting, type checking
4. **Seguridad**: Auditoría de dependencias, SAST, escaneo de secretos
5. **Deploy**: Push a staging, smoke tests, promoción a producción
6. **Notificación**: Slack, email o sistema de incident management

**Estrategias de deploy**:
- **Básico**: Deploy directo a producción
- **Blue-Green**: Dos ambientes idénticos; switch de tráfico instantáneo
- **Canary**: Rutea 1% de tráfico a nueva versión; incrementa gradualmente
- **Rolling**: Reemplaza instancias una a una con zero downtime

## Variantes

| Plataforma | Ideal Para | Notas |
|------------|------------|-------|
| GitHub Actions | Open source, repos GitHub | Gratis para repos públicos; marketplace de actions |
| GitLab CI | Proyectos GitLab-hosted | Built-in; excelente para monorepos |
| CircleCI | Testing paralelo rápido | Excelente soporte de Docker |
| Jenkins | On-premise, plugins custom | Self-hosted; alto mantenimiento |
| ArgoCD | Kubernetes GitOps | Declarativo; sincroniza cluster con estado Git |

## Mejores Prácticas

- **Fail fast**: Ejecuta linting y tests unitarios rápidos antes de tests de integración costosos
- **Paraleliza jobs**: Divide tests por archivo o módulo para reducir tiempo wall-clock
- **Cachea dependencias**: Cachea node_modules, pip cache y capas Docker entre ejecuciones
- **Usa secrets management**: Nunca commitees API keys; usa secrets de GitHub/GitLab o Vault
- **Requiere reviews para prod**: Usa branch protection y CODEOWNERS

## Errores Comunes

1. **Sin promoción de artifacts**: Reconstruir en cada stage introduce no-determinismo
2. **Testear solo en CI**: Los desarrolladores hacen push de código roto y esperan feedback de CI
3. **Secrets en variables de entorno**: Visibles en logs de jobs; usa secrets enmascarados
4. **Sin plan de rollback**: Deploys fallidos necesitan revert instantáneo vía blue-green o imagen anterior
5. **Ignorar tests flaky**: Fallos aleatorios erosionan la confianza en el pipeline

## Preguntas Frecuentes

**P: ¿Debería deployar en cada commit a main?**
R: Sí para staging. Para producción, usa un gate manual o deploy en releases taggeados.

**P: ¿Cómo manejo migraciones de base de datos en CI/CD?**
R: Ejecuta migraciones en un job separado antes del deploy. Usa migraciones backward-compatible para evitar downtime.

**P: ¿Puedo usar el mismo pipeline para microservicios?**
R: Sí, pero usa triggers basados en paths para que solo los servicios afectados se construyan y desplieguen. Herramientas de monorepo (Nx, Turborepo) ayudan.
`,

  'src/content/recipes/observability/structured-logging.es.md': `## Visión General

El logging estructurado reemplaza mensajes de log de texto libre con objetos JSON legibles por máquinas. Esto habilita filtrado potente, agregación y correlación a través de servicios distribuidos. En lugar de parsear regex de strings como "User 123 logged in at 10:00", los logs estructurados emiten { "event": "login", "user_id": 123, "timestamp": "..." } — haciendo el análisis de logs trivial en ELK, Loki o plataformas cloud.

## Cuándo Usar

Usa este recurso cuando:
- Ejecutes más de un servicio que necesite agregación de logs centralizada
- Debuggees issues que abarcan múltiples microservicios o jobs async
- Construyas dashboards y alertas basadas en eventos de log
- Migres de logs de texto plano a un stack moderno de observabilidad

## Solución

### Logger JSON (Node.js con Pino)

\`\`\`javascript
const pino = require('pino');
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'user-api', version: '1.2.3' }
});

function handleRequest(req, res) {
  const child = logger.child({
    request_id: req.headers['x-request-id'] || crypto.randomUUID(),
    user_id: req.user?.id,
    route: req.route?.path
  });

  child.info({ event: 'request_start', method: req.method });
  
  try {
    const result = processOrder(req.body);
    child.info({ event: 'order_processed', order_id: result.id });
  } catch (err) {
    child.error({ event: 'order_failed', error: err.message });
  }
}
\`\`\`

### Python con structlog

\`\`\`python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

def transfer_funds(from_account, to_account, amount):
    logger.info(
        "transfer_initiated",
        from_account=from_account,
        to_account=to_account,
        amount_cents=amount,
        request_id=get_current_request_id()
    )
\`\`\`

### Middleware de Correlation ID (Go)

\`\`\`go
func CorrelationIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        id := r.Header.Get("X-Request-ID")
        if id == "" {
            id = uuid.New().String()
        }
        ctx := context.WithValue(r.Context(), "request_id", id)
        w.Header().Set("X-Request-ID", id)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
\`\`\`

## Explicación

**Campos clave para cada entrada de log**:
- **timestamp**: ISO 8601 con timezone
- **level**: debug, info, warn, error, fatal
- **service**: Nombre de aplicación o componente
- **request_id**: Correlaciona todos los logs de un solo request de usuario a través de servicios
- **event**: Nombre de acción legible por máquinas (snake_case)
- **message**: Descripción legible por humanos (opcional en logging puramente estructurado)

**¿Por qué estructurado sobre texto?**
- Consulta logs sin regex frágiles: { event: "payment_failed", amount: { $gt: 1000 } }
- Agregación automática por cualquier campo en Elasticsearch/Loki
- Fácil integración con tracing (OpenTelemetry) y métricas

## Variantes

| Stack | Componentes | Ideal Para |
|-------|-------------|------------|
| ELK | Elasticsearch, Logstash, Kibana | Búsqueda full-text; dashboards complejos |
| PLG | Promtail, Loki, Grafana | Kubernetes-native; queries basadas en labels |
| CloudWatch | AWS nativo | Infraestructura AWS; setup mínimo |
| Datadog | SaaS | APM + logs + trazas unificados |
| Splunk | Enterprise | Cumplimiento; analytics avanzados |

## Mejores Prácticas

- **Siempre incluye request_id**: Traza un viaje de usuario a través de 10+ servicios
- **Usa niveles de log consistentemente**: debug para dev; info para operaciones normales; error para issues accionables
- **Nunca loguees datos sensibles**: Enmascara PII, tokens y passwords antes de serialización
- **Loguea en boundaries de servicio**: Entrada/salida de cada handler HTTP, consumer de cola y job en background
- **Emite métricas desde logs**: Usa métricas derivadas de logs para dashboards en lugar de instrumentación custom

## Errores Comunes

1. **Concatenación de strings en logs**: \`log.info("User " + id + " failed")\` — previene indexación
2. **Contexto faltante**: Logs dicen "Payment failed" sin user_id, amount o error code
3. **Nivel de log incorrecto**: info para cada línea de código; error para excepciones manejadas
4. **Ignorar volumen de logs**: Logs debug en producción pueden costar miles en fees de ingestión
5. **Nombres de campo inconsistentes**: userId vs user_id vs userID rompe agregación

## Preguntas Frecuentes

**P: ¿Debería usar una librería de logging o console.log?**
R: Siempre usa una librería (Pino, Winston, structlog, Zap). Manejan buffering, serialización y niveles de log correctamente.

**P: ¿Cómo correlaciono logs a través de microservicios?**
R: Propaga un correlation ID en headers HTTP (X-Request-ID) e inclúyelo en cada entrada de log. Usa una librería de tracing (OpenTelemetry) para trazas distribuidas completas.

**P: ¿Cuál es la diferencia entre logs y trazas?**
R: Los logs son eventos discretos con timestamps. Las trazas conectan operaciones relacionadas (spans) a través de servicios. Usa ambos: logs estructurados para eventos, trazas para flujo de requests.
`
};

for (const [filePath, body] of Object.entries(articles)) {
  fillBody(filePath, body);
}

console.log('ES part 2 done for batch 13.');
