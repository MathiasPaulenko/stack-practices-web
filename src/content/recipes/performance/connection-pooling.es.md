---
contentType: recipes
slug: connection-pooling
title: "Configurar connection pooling para bases de datos y"
description: "Cómo configurar connection pooling para bases de datos y clientes HTTP para mejorar rendimiento y confiabilidad"
metaDescription: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP. Mejora throughput, reduce latencia y previene agotamiento de conexiones."
difficulty: intermediate
topics:
  - performance
tags:
  - performance
  - database
  - optimization
  - profiling
  - latency
relatedResources:
  - /guides/sql-performance-tuning-guide
  - /guides/performance-optimization-guide
  - /recipes/cdn-edge-caching
  - /recipes/debounce-throttle
  - /patterns/cache-aside-pattern
  - /recipes/redis-cache-patterns
  - /recipes/cache-invalidation
  - /recipes/database-indexing
  - /recipes/query-optimization
lastUpdated: "2026-06-12"
publishedAt: "2026-06-13"
author: Mathias Paulenko
seo:
  metaDescription: "Configura connection pooling para PostgreSQL, MySQL, Redis y clientes HTTP. Mejora throughput, reduce latencia y previene agotamiento de conexiones."
  keywords:
    - connection-pooling
    - base-datos
    - postgresql
    - redis
    - http-client
    - rendimiento


---
## Visión General

Abrir una nueva conexión de base de datos o HTTP para cada petición es costoso. El connection pooling mantiene un conjunto reutilizable de conexiones ya establecidas, reduciendo drásticamente la latencia y previniendo el agotamiento de recursos bajo carga. La mayoría de los incidentes en producción relacionados con "demasiadas conexiones" se resuelven con una configuración adecuada del pool.

El siguiente enfoque cubre connection pooling de base de datos con PostgreSQL, MySQL y Redis, más pooling de clientes HTTP para llamadas a APIs externas.

## Cuándo Usar

Usa este recurso cuando:
- Tu aplicación abre una conexión nueva por petición y el throughput es bajo. Consulta [SQL Performance Tuning](/guides/databases/sql-performance-tuning-guide) para optimización previa.
- Recibes errores de "demasiadas conexiones" bajo carga. Consulta [Performance Optimization](/guides/performance/performance-optimization-guide) para diagnóstico de cuellos de botella.
- Haces llamadas HTTP frecuentes a APIs externas y quieres reutilizar conexiones TCP. Consulta [Call REST API](/recipes/api/call-rest-api) para patrones de cliente HTTP.
- Necesitas ajustar los límites de concurrencia para un servicio web o worker. Consulta [Rate Limiting](/recipes/api/rate-limiting) para control de concurrencia.

## Solución

### Python

```python
import psycopg2
from psycopg2 import pool
import requests
from requests.adapters import HTTPAdapter

# Pool de conexiones PostgreSQL
pg_pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5,
    maxconn=20,
    host="localhost",
    database="app",
    user="app",
    password="secret"
)

def get_user(user_id: int):
    conn = pg_pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id = %s", (user_id,))
            return cur.fetchone()
    finally:
        pg_pool.putconn(conn)

# Pool de conexiones HTTP
session = requests.Session()
adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20)
session.mount("https://", adapter)
session.mount("http://", adapter)

resp = session.get("https://api.example.com/data")
```

### JavaScript

```javascript
const { Pool } = require('pg');
const axios = require('axios');

// Pool de conexiones PostgreSQL
const pgPool = new Pool({
  host: 'localhost',
  database: 'app',
  user: 'app',
  password: 'secret',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function getUser(userId) {
  const client = await pgPool.connect();
  try {
    const result = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Cliente HTTP con keep-alive
const httpAgent = new (require('http').Agent)({ keepAlive: true, maxSockets: 20 });
const httpsAgent = new (require('https').Agent)({ keepAlive: true, maxSockets: 20 });

const api = axios.create({ httpAgent, httpsAgent });
```

### Java

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;

// HikariCP — el estándar de oro para pooling en JVM
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost/app");
config.setUsername("app");
config.setPassword("secret");
config.setMaximumPoolSize(20);
config.setMinimumIdle(5);
config.setConnectionTimeout(2000);
config.setIdleTimeout(30000);
config.addDataSourceProperty("cachePrepStmts", "true");

HikariDataSource ds = new HikariDataSource(config);

try (Connection conn = ds.getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setInt(1, userId);
    ResultSet rs = ps.executeQuery();
    while (rs.next()) {
        System.out.println(rs.getString("name"));
    }
}

// Cliente HTTP con pooling (Java 11+)
HttpClient client = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
```

## Explicación

El connection pooling funciona manteniendo una cola acotada de conexiones TCP ya establecidas. Cuando tu código solicita una conexión, el pool entrega una inactiva en lugar de abrir un nuevo socket. Cuando la operación termina, la conexión vuelve al pool en lugar de cerrarse.

**Parámetros clave del pool:**
- **min connections**: Conexiones precalentadas listas al inicio
- **max connections**: Tope máximo para proteger la base de datos o servidor remoto
- **connection timeout**: Cuánto esperar por una conexión disponible antes de fallar
- **idle timeout**: Cuánto mantener una conexión inactiva abierta antes de cerrarla

Para clientes HTTP, `keep-alive` reutiliza la conexión TCP subyacente entre múltiples peticiones al mismo host, eliminando el overhead del handshake TLS en cada llamada.

## Variantes

| Tecnología | Enfoque | Notas |
|------------|---------|-------|
| PostgreSQL | psycopg2.pool / pg / HikariCP | ThreadedConnectionPool para threads, AsyncConnectionPool para asyncio |
| MySQL | mysql-connector-python / mysql2 / HikariCP | Mismos conceptos de pool; cuidado con `wait_timeout` del servidor |
| Redis | redis-py connection pool / ioredis / Lettuce | Redis es rápido, pero el pool sigue siendo importante en alta concurrencia |
| HTTP (Python) | requests Session + HTTPAdapter | `pool_maxsize` controla conexiones por host |
| HTTP (Node) | axios + http.Agent | `maxSockets` controla conexiones paralelas |
| HTTP (Java) | Apache HttpClient / OkHttp | Connection managers integrados con límites por ruta |

## Lo que funciona

1. Ajusta `max pool size` aproximadamente al número de workers concurrentes (threads, procesos o concurrencia del event loop)
2. Siempre usa `release()` o `putconn()` en un bloque `finally` para evitar fugas
3. Configura `connectionTimeout` menor que el timeout total de la petición de tu aplicación
4. Monitorea métricas del pool: activas, inactivas, en espera y totales
5. Usa cache de prepared statements a nivel de pool cuando esté disponible (ej. HikariCP `cachePrepStmts`)

## Errores Comunes

1. **No liberar conexiones** — siempre devuélvelas al pool, incluso ante excepciones
2. **Pool size = 1** — serializa todo el acceso a base de datos y mata el throughput
3. **Pool demasiado grande** — puede saturar la base de datos con límites de `max_connections`
4. **Ignorar idle timeouts** — conexiones stale causan fallos silenciosos o sockets semiabiertos
5. **Sin HTTP keep-alive** — reabrir TLS en cada petición externa desperdicia milisegundos

## Manejo de Errores y Recuperacion

- **Fallos de compression**: cuando Brotli compression falla, sirve uncompressed content como fallback.   Setea compression quality basado en CPU availability.
- **Fallos de CDN origin**: cuando CDN no puede alcanzar origin, sirve stale content.   Setea appropriate TTLs.
- **Connection pool exhaustion**: cuando todas las connections estan in use, requests queuean o fallan.   Setea max pool size basado en database capacity.
- **Fallos de lazy loading intersection observer**: cuando Intersection Observer falla, content nunca loads.
- **Fallos de load test scripts**: cuando k6 scripts fallan, test results son invalid.   Valida test scripts antes de execution.   Usa version control para test scripts.
- **Fallos de code splitting**: cuando dynamic imports fallan, components no loadean.   Usa prefetch para critical chunks.

## Performance y Escalabilidad

- **Tuning de compression level**: Brotli level 4 para dynamic content.   Brotli level 11 para static assets.   Gzip level 6 como fallback.
- **Optimizacion de CDN cache hit ratio**: maximiza cache hit ratio para reducir origin load.   Setea appropriate Cache-Control headers.   Purga cache en content updates.
- **Sizing de connection pool**: dimensiona pools basado en concurrent request volume.   Empieza con 10 connections por pool.   Incrementa pool size si wait time excede 100ms.   Decrementa si connections estan idle.
- **Tuning de lazy loading threshold**: setea root margin para early loading.   Usa 400px para heavy components.   Ajusta threshold basado en device performance.
- **Patrones de load test ramp**: Empieza con 10 users.   Rampea a 100 over 2 minutes.   Hold por 5 minutes.   Rampea a peak.   Hold por 10 minutes.   Ramp down.
- **Optimizacion de bundle size**: Splitea vendor y app code.   Analiza bundle con webpack-bundle-analyzer.   Setea performance budgets.
## Consideraciones de Seguridad

- **HTTPS y compression**: habilita compression solo sobre HTTPS para prevenir BREACH attacks.   No comprimas sensitive responses con user-controlled input.
o-transform header para content ya compressed. Monitorea compression-related vulnerabilities. Documenta security configuration. Testea con security scanners. Revisa security trimestralmente
- **Seguridad de CDN**: secura CDN con proper access controls.   Habilita DDoS protection.
- **Seguridad de connection pool**: Setea connection timeout para prevenir slow-loris attacks.   Rota database credentials.
- **Content Security Policy para lazy loading**: setea CSP headers para permitir lazy-loaded resources.

## Deployment y CI/CD

- **Performance testing en CI**: corre performance tests en cada PR.   Usa k6 para load testing.   Setea performance budgets.   Failea builds en budget violations.
- **Deployment progresivo para performance changes**: deploya performance changes gradualmente.   Roll back en regression.
- **Bundle analysis en CI**: analiza bundle size en cada build.   Setea size budgets por chunk.

## Testing y Quality Assurance

- **Performance regression testing**: corre performance tests en cada release.
- **Best practices de load testing**: Rampea up gradualmente.   Usa production-like data volumes.
- **CDN cache testing**: verifica que cache headers esten seteados correctamente.   Verifica stale content serving.   Testea con query parameters.
## Herramientas y Plataformas

- **WebPageTest**: herramienta detailed de web performance testing.   Waterfall view de resource loading.   Filmstrip view de visual progress.   Setea custom connectivity profiles.
- **Lighthouse**: herramienta de Google para web performance auditing.   Scorea performance, accessibility, SEO y best practices.   Setea performance budget basado en Lighthouse scores.
- **k6**: herramienta modern de load testing por Grafana.   Soporte para HTTP, gRPC, WebSocket.   Thresholds para pass/fail.   Cloud execution option.   Integration con Grafana.   Crea reusable test scenarios.
- **webpack-bundle-analyzer**: visualiza bundle composition.   Encuentra duplicate modules.   Setea size alerts.
- **Cloudflare CDN**: CDN global con edge caching.   Workers para edge compute.   Cache rules y page rules.   Real-time analytics.   DDoS protection incluido.
- **Fastly CDN**: CDN con instant purge.   VCL para edge configuration.   Real-time logging.   Image optimization.

## Pitfalls Comunes y Anti-Patrones

- **Over-compression**: comprimir content ya compressed wastea CPU.   No comprimas images, videos o pre-compressed assets.   Setea gzip_types y rotli_types cuidadosamente.
- **Miconfiguracion de CDN**: incorrect cache headers causan poor hit ratio.   No cachees personalized content.   Setea appropriate TTLs.
- **Connection pool over-sizing**: demasiadas connections wastean database resources.   Setea max pool size basado en database capacity.
- **Lazy loading everything**: lazy loading above-the-fold content perjudica LCP.   Loadea critical content eagerly.   Usa etchpriority="high" para LCP elements.
- **Load testing sin think time**: load testing sin think time crea unrealistic load.   Agrega think time entre requests.   Simula real user behavior.
- **Code splitting demasiado granular**: demasiados small chunks causan excessive network requests.   Groupa related components en chunks.   Setea minimum chunk size.

## Resumen de Best Practices

- **Setea performance budgets**: define budgets para key metrics.   LCP under 2.  5 segundos.   FID under 100ms.   CLS under 0.  1.   Bundle size under 200KB.   Failea builds en violations.
- **Monitorea Core Web Vitals**: Usa synthetic monitoring para lab data.   Setea alerts en metric degradation.
- **Optimiza critical rendering path**: Inlinea critical CSS.   Deferea non-critical JavaScript.
- **Usa progressive enhancement**: builda core functionality primero.   Enhancea con JavaScript.   Usa server-side rendering.
## Optimizacion de Costos

- **Gestion de costos de CDN**: Setea appropriate TTLs para maximizar cache hits.   Usa compression para reducir bandwidth.
- **Costos de CPU de compression**: Pre-comprime static assets en build time.
- **Costos de resources de connection pool**: Cierra unused connections.
- **Costos de load testing infrastructure**: Programa tests durante off-peak.   Usa cloud-native load testing.

## Guia de Troubleshooting

- **Slow page load**: diagnostica con WebPageTest.   Minifica CSS y JavaScript.
- **High CDN origin requests**: Verifica cache key configuration.
- **Connection pool timeouts**: chequea pool size.   Incrementa pool size si needed.
- **Poor load test results**: Verifica test environment.   Scalea infrastructure.
## Monitoring y Alerting

- **Estrategia de performance monitoring**: Setea thresholds para alerts.   Usa synthetic monitoring para lab data.
- **Configuracion de alerts para performance**: setea alerts en metric degradation.   LCP above 2.  5 segundos.   Error rate above 1%.   Response time above 500ms.   Reduce alert noise.
- **Diseno de dashboards para performance**: crea dashboards para diferentes audiences.   Executive dashboard para high-level metrics.   Engineering dashboard para detailed metrics.   Operations dashboard para real-time monitoring.
- **Deteccion de performance regression**: automatiza regression detection.

## Patrones Avanzados

- **Edge computing para performance**: mueve computation al edge.   Reduce latency para global users.   Cachea dynamic content en edge.
- **Optimizacion de resource hints**: Usa preload para key resources.   Usa dns-prefetch para external domains.
- **Pipeline de image optimization**: Usa modern formats como WebP y AVIF.
## Estrategias de Migracion

- **Migracion de gzip a Brotli**: habilita Brotli junto a gzip para gradual migration.   Roll out progresivamente.
- **Migracion a un nuevo CDN**: corre ambos CDNs en paralelo durante migration.   Verifica SSL certificates.   Switchea DNS gradualmente.
- **Migracion de connection pools**: migra pool configuration gradualmente.   Roll out a un service a la vez.   Completa migration despues de validation.

## Compliance y Governance

- **Performance SLAs**: define performance SLAs para critical endpoints.   API response time under 200ms.   Page load time under 3 segundos.
- **Performance reporting**: genera weekly performance reports.




## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de performance y database para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica configurar connection pooling para bases de datos y** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Preguntas Frecuentes

### ¿Cuál es el tamaño óptimo del pool?

Un buen punto de partida es `(núcleos * 2) + discos_efectivos` para cargas OLTP. Para bases de datos en la nube, iguala el tamaño del pool a la concurrencia de la aplicación, no a los núcleos de CPU. Monitorea métricas de `waiting` y aumenta solo si las conexiones se encolan.

### ¿Debo usar un pool o varios?

Un pool por base de datos por instancia de aplicación es el estándar. Crear múltiples pools a la misma base de datos fragmenta recursos y reduce eficiencia. Para microservicios, cada servicio gestiona su propio pool.

### ¿Cómo manejo el agotamiento del pool?

Configura un `connectionTimeout` razonable para que las peticiones fallen rápido en lugar de colgarse indefinidamente. Agrega circuit breakers o reintentos con backoff. Monitorea la saturación del pool y escala la base de datos o los workers antes de que el agotamiento sea crítico.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
