---


contentType: recipes
slug: load-testing
title: "Realizar Load Testing en APIs"
description: "Cómo simular tráfico realista, medir tiempos de respuesta e identificar cuellos de botella usando k6 y JMeter para APIs y servicios web."
metaDescription: "Aprende load testing con k6 y JMeter. Simula tráfico, mide tiempos de respuesta de APIs, identifica cuellos de botella y valida escalabilidad bajo carga realista."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - api-testing
  - benchmarks
  - unit-tests
  - integration
relatedResources:
  - /recipes/integration-testing
  - /recipes/rate-limiting
  - /recipes/connection-pooling
  - /recipes/load-testing-k6
  - /recipes/unit-testing-mocking
lastUpdated: "2026-07-09"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende load testing con k6 y JMeter. Simula tráfico, mide tiempos de respuesta de APIs, identifica cuellos de botella y valida escalabilidad bajo carga realista."
  keywords:
    - load testing
    - k6
    - jmeter
    - api performance
    - stress testing
    - scalability testing
    - performance benchmarks


---

## Visión general

El load testing mide cómo se comporta un sistema bajo un volumen específico de usuarios o requests concurrentes. A diferencia de los tests funcionales que verifican correctitud, los load tests revelan límites de rendimiento: ¿en qué punto el tiempo de respuesta degrada de 50ms a 2 segundos? ¿En qué carga los errores saltan de 0.1% a 10%? ¿Cuándo se agota el pool de conexiones a la base de datos?

Herramientas modernas como k6 y JMeter permiten definir escenarios en código o configuración, ejecutarlos desde la línea de comandos o pipelines de CI, y exportar métricas detalladas. La solucion a continuacion cubre cómo diseñar load tests realistas, interpretar los resultados e iterar sobre mejoras de rendimiento.

## Cuándo usarlo

Usa esta receta cuando:

- Te preparas para un lanzamiento de producto, campaña de marketing o pico de tráfico estacional. Consulta [Connection Pooling](/recipes/databases/database-connection-pooling) para manejar conexiones concurrentes a base de datos.
- Migras infraestructura y necesitas validar que la nueva plataforma maneja carga equivalente
- Estableces baselines de rendimiento y Objetivos de Nivel de Servicio (SLOs). Consulta [Caching Strategies](/recipes/performance/caching-strategies) para reducir carga en servicios backend.
- Investigas timeouts o errores intermitentes que solo aparecen bajo carga concurrente. Consulta [Rate Limiting](/recipes/api/rate-limiting) para proteger APIs bajo tráfico intenso.
- Comparas rendimiento antes y después de un cambio mayor de código o infraestructura

## Solución

### k6 (JavaScript/Go)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp up a 100 usuarios
    { duration: '5m', target: 100 },   // sostener carga
    { duration: '2m', target: 200 },   // ramp up a 200 usuarios
    { duration: '5m', target: 200 },   // sostener carga mayor
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% de requests bajo 500ms
    http_req_failed: ['rate<0.01'],     // tasa de error bajo 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### JMeter (XML/GUI)

```xml
<ThreadGroup testname="API Load Test" guiclass="ThreadGroupGui">
  <stringProp name="ThreadGroup.num_threads">100</stringProp>
  <stringProp name="ThreadGroup.ramp_time">60</stringProp>
  <stringProp name="ThreadGroup.duration">300</stringProp>
  <elementProp name="HTTPsampler" elementType="HTTPSamplerProxy">
    <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
    <stringProp name="HTTPSampler.path">/users</stringProp>
    <stringProp name="HTTPSampler.method">GET</stringProp>
  </elementProp>
</ThreadGroup>
```

### Analizando Resultados (k6)

```
http_req_duration..............: avg=234ms  min=45ms  med=198ms max=1.2s  p(90)=412ms p(95)=567ms
http_req_failed................: 0.23%
data_received..................: 12 MB
iterations.....................: 12000
```

## Explicación

- **Virtual Users (VUs)**: Usuarios concurrentes simulados que hacen requests. 100 VUs no significan 100 requests por segundo — depende del think time (`sleep`) y la latencia de respuesta.
- **Ramp-up**: Incrementar VUs gradualmente previene una avalancha repentina que distorsionaría los resultados. Un ramp de 2 minutos a 100 VUs es más realista que 100 VUs instantáneos.
- **Thresholds**: Criterios de pass/fail definidos antes del test. Si la latencia p(95) excede 500ms, k6 sale con código no cero, fallando el build de CI.
- **Escenarios**: Diferentes comportamientos de usuario modelados simultáneamente. Un test realista de e-commerce podría tener 80% de usuarios navegando, 15% agregando al carrito, y 5% haciendo checkout.

## Variantes

| Herramienta | Scripting | Mejor para | Infraestructura |
|-------------|-----------|------------|-----------------|
| k6 | JavaScript/Go | Developer-friendly, CI-native | Self-hosted o cloud |
| JMeter | XML/GUI | Protocolos complejos, equipos enterprise | Self-hosted |
| Artillery | YAML/JS | Configuración rápida, equipos Node | Self-hosted o cloud |
| Locust | Python | Ecosistemas Python, lógica custom | Self-hosted |

## Lo que funciona

- **Testea contra un entorno similar a producción**: testear localhost con CPU single-core da resultados sin sentido. Usa staging con hardware e idéntico volumen de datos.
- **Calienta el sistema primero**: caches, pools de conexiones y compilación JIT necesitan tiempo para estabilizarse. Corre un warm-up de 5 minutos antes de medir.
- **Monitorea métricas server-side durante el test**: correlaciona picos de latencia de k6 con logs de queries lentas de base de datos, uso de CPU y presión de memoria.
- **Usa distribuciones de datos realistas**: si el 1% de usuarios genera el 50% de carga (power users), modela eso. Las distribuciones uniformes raramente coinciden con la realidad.
- **Testea endpoints idempotentes**: los writes no idempotentes (pagos, deducciones de inventario) requieren manejo especial para evitar corromper datos de producción.

## Errores comunes

- **Testear desde una sola máquina**: tu generador de carga puede convertirse en el cuello de botella. Usa k6 cloud o JMeter distribuido cuando empujas miles de RPS.
- **Ignorar latencia de red**: testear una API en el mismo datacenter subestima la latencia real del mundo. Agrega delay de red realista o testea desde regiones remotas.
- **Correr tests cortos**: un test de 30 segundos te dice casi nada. Tests significativos corren por al menos 10 minutos para capturar ciclos de garbage collection y warmup de cache.
- **No validar respuestas**: una respuesta de 200ms que devuelve una página de error no es un éxito. Siempre asserta status codes y contenido del body.

## Preguntas frecuentes

### ¿Cuántos virtual users necesito para simular tráfico real?

Modela usuarios concurrentes, no usuarios totales. Si tienes 10,000 usuarios diarios pero solo 500 activos en cualquier momento, testea con 500 VUs (más un margen de seguridad de 20-50%). Calcula usuarios concurrentes desde analytics: `concurrent_users = (daily_users * avg_session_duration_seconds) / 86400`. Para un sitio con 100,000 usuarios diarios y sesiones promedio de 5 minutos: `(100000 * 300) / 86400 = 347 usuarios concurrentes`. Testea con 500 VUs para contar picos. Para API testing, calcula RPS desde tráfico de hora pico: si manejas 360,000 requests en la hora pico, eso son 100 RPS. Usa escenarios de k6 con diferentes arrival rates: `scenarios: { browsing: { executor: 'ramping-arrival-rate', startRate: 10, timeUnit: '1s', stages: [{ target: 100, duration: '2m' }] } }`.

### ¿Cuál es la diferencia entre load testing y stress testing?

El load testing valida comportamiento en niveles de tráfico esperados. El stress testing empuja más allá de los niveles esperados para encontrar el punto de ruptura y observar comportamiento de recuperación. El soak testing corre a carga normal por períodos extendidos (horas) para detectar memory leaks y agotamiento de recursos. El spike testing incrementa carga repentinamente para verificar que el sistema maneja bursts súbitos. El breakpoint testing incrementa carga incrementalmente hasta que el sistema falla, identificando el umbral exacto de falla. Cada tipo de test sirve un propósito diferente: load tests validan compliance de SLO, stress tests revelan modos de falla, soak tests detectan issues de larga duración, spike tests verifican autoscaling. En k6, implementa cada uno: `// Stress test\nexport const options = { stages: [{ duration: '10m', target: 1000 }] };\n// Soak test\nexport const options = { stages: [{ duration: '4h', target: 200 }] };\n// Spike test\nexport const options = { stages: [{ duration: '10s', target: 500 }, { duration: '1m', target: 500 }, { duration: '10s', target: 0 }] }`.

### ¿Puedo ejecutar load tests en pipelines de CI/CD?

Sí. k6 y Artillery están diseñados para esto. Corre smoke tests nocturnos (carga pequeña) y tests de regresión pre-release (carga completa) en tu pipeline. En GitHub Actions: `name: Load Test\non: pull_request\njobs:\n  k6:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: grafana/k6-action@v0.3.1\n        with:\n          filename: tests/load/test.js\n          flags: --quiet --thresholds`. Usa thresholds de k6 para fallar el build: `thresholds: { http_req_duration: ['p(95)<500'], http_req_failed: ['rate<0.01'] }`. Para CI cost-effective, corre smoke tests con 10-20 VUs por 1 minuto en cada PR, y load tests completos con 500+ VUs solo en branches de release. Usa k6 cloud para tests distribuidos: `k6 cloud test.js --vus 500 --duration 10m`. Cachea dependencias de test en CI: `npm ci` para scripts de k6, `mvn dependency:resolve` para JMeter.

### ¿Debería testear producción directamente?

Solo con extrema precaución. Usa transacciones sintéticas, endpoints read-only y horas de menor tráfico. Prefiere staging para tests destructivos o write-heavy. Para testing en producción, usa shadow traffic: espeja requests reales a un endpoint de test sin afectar usuarios. En k6, usa el flag `--out` para exportar métricas sin impactar producción: `k6 run --out json=results.json test.js`. Para tests read-only en producción: `export default function () { const res = http.get('https://api.example.com/health'); check(res, { 'status is 200': (r) => r.status === 200 }); }`. Usa feature flags para aislar tráfico de test: rutea requests de test a un pool de backend separado. Monitorea métricas de producción durante el test: si la tasa de error excede 0.5%, aborta el test inmediatamente. Usa el flag `--abort-on-error` de k6: `k6 run --abort-on-error test.js`. Para sistemas de pagos, usa endpoints sandbox que simulan el procesador de pagos sin cobros reales.

### ¿Cómo correlaciono resultados de load test con métricas server-side?

Ejecuta load tests mientras monitoreas métricas server-side para identificar cuellos de botella. Usa Prometheus y Grafana: `# docker-compose.yml\nservices:\n  prometheus:\n    image: prom/prometheus\n  grafana:\n    image: grafana/grafana`. En k6, exporta métricas a Prometheus: `k6 run --out experimental-prometheus=http://prometheus:9090 test.js`. Correlaciona latencia de k6 con métricas de base de datos: query Prometheus para `pg_stat_database_tup_returned` durante la ventana de test. Usa distributed tracing con Jaeger: instrumenta la API con OpenTelemetry, luego traza requests lentos específicos encontrados en resultados de k6. En k6, añade tags custom para tracing: `const res = http.get('https://api.example.com/users', { tags: { test_run: 'nightly-2025-01-15' } });`. Monitorea métricas JVM para aplicaciones Java: `jcmd <pid> GC.heap_info` durante el test. Trackea uso de connection pool: `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'` durante el test. Usa APM tools como Datadog o New Relic para overlay de métricas de k6 con métricas de server en un solo dashboard.

### ¿Cómo manejo autenticación en load tests?

Maneja autenticación logueando una vez por iteración de VU y reutilizando tokens. Para Bearer tokens: `import http from 'k6/http';\nconst token = __ENV.API_TOKEN;\nexport default function () {\n  const res = http.get('https://api.example.com/users', {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n};`. Para flows de OAuth2 login: `export default function () {\n  const loginRes = http.post('https://api.example.com/oauth/token', {\n    client_id: 'test_client',\n    client_secret: 'test_secret',\n    grant_type: 'client_credentials'\n  });\n  const token = loginRes.json('access_token');\n  http.get('https://api.example.com/users', {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n}`. Para performance, cachea tokens entre iteraciones: `let cachedToken = null;\nexport function setup() {\n  const res = http.post('https://api.example.com/oauth/token', { ... });\n  return { token: res.json('access_token') };\n}\nexport default function (data) {\n  http.get('https://api.example.com/users', {\n    headers: { Authorization: `Bearer ${data.token}` }\n  });\n}`. Usa las funciones `setup()` y `teardown()` de k6 para login/logout. Para JWT con refresh, maneja expiración de token: `if (Date.now() > tokenExpiry) { refreshToken(); }`.

### ¿Cómo testeo conexiones WebSocket con k6?

k6 soporta testing de WebSocket para aplicaciones real-time. Crea una conexión WebSocket: `import ws from 'k6/ws';\nexport default function () {\n  const url = 'wss://api.example.com/ws';\n  ws.connect(url, {}, (socket) => {\n    socket.on('open', () => {\n      socket.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }));\n    });\n    socket.on('message', (data) => {\n      check(data, { 'has payload': (d) => JSON.parse(d).payload !== undefined });\n    });\n    socket.setInterval(() => {\n      socket.send(JSON.stringify({ type: 'ping' }));\n    }, 30000);\n    socket.setTimeout(() => {\n      socket.close();\n    }, 60000);\n  });\n}`. Testea estabilidad de conexión bajo carga: `export const options = {\n  vus: 100,\n  duration: '5m',\n  thresholds: {\n    ws_sessions_opened: ['count>0'],\n    ws_msgs_received: ['rate>10'],\n    ws_sessions_closed: ['rate<0.1']\n  }\n};`. Mide latencia de mensajes: `socket.on('message', (data) => {\n  const msg = JSON.parse(data);\n  if (msg.timestamp) {\n    const latency = Date.now() - msg.timestamp;\n    console.log(`WS latency: ${latency}ms`);\n  }\n});`. Testea lógica de reconexión: cierra conexiones random y verifica que el cliente reconecta dentro de 5 segundos.

### ¿Cómo parametrizo load tests con test data?

Usa archivos CSV de datos o genera test data dinámicamente. Con k6, carga datos CSV: `import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';\nconst users = papaparse.parse(open('./users.csv'), { header: true }).data;\nexport default function () {\n  const user = users[Math.floor(Math.random() * users.length)];\n  http.post('https://api.example.com/login', {\n    email: user.email,\n    password: user.password\n  });\n}`. Genera data random: `import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';\nexport default function () {\n  const email = `user${randomIntBetween(1, 10000)}@test.com`;\n  http.post('https://api.example.com/users', { email, name: randomString(8) });\n}`. Usa execution contexts de k6 para data única por VU: `export default function () {\n  const vuId = __VU;\n  const iterId = __ITER;\n  const email = `user-${vuId}-${iterId}@test.com`;\n  http.post('https://api.example.com/users', { email });\n}`. Para JMeter, usa CSV Data Set Config: `<CSVDataSet filename="users.csv" variableNames="email,password" delimiter="," recycle=false/>`. Para datasets grandes, usa base de datos: `const db = sql.open('postgres', 'host=localhost dbname=testdb');\nexport default function () {\n  const user = db.query('SELECT email, password FROM test_users ORDER BY RANDOM() LIMIT 1')[0];\n  http.post('https://api.example.com/login', { email: user.email, password: user.password });\n}`.

### ¿Cómo mido percentile latencies correctamente?

Percentile latencies (p50, p90, p95, p99) proveen mejor insight que promedios. Un p99 de 2 segundos significa que 1% de usuarios experimentan delays de 2+ segundos. En k6, configura thresholds: `thresholds: {\n  http_req_duration: ['p(50)<200', 'p(90)<500', 'p(95)<800', 'p(99)<2000']\n}`. Interpreta percentiles: p50 (mediana) muestra experiencia típica de usuario, p90 muestra el extremo lento, p99 muestra tail latency. No uses promedios para latencia: unos pocos outliers de 10 segundos pueden hacer un promedio de 200ms engañoso. Usa histogramas para visualización: `k6 run --out json=results.json test.js && jq '.metrics.http_req_duration.values' results.json`. Para mediciones precisas, corre tests suficientemente largo: 10+ minutos para percentiles estables. Descarta los primeros 2 minutos (warmup) del análisis. Usa `--summary-export` de k6 para output machine-readable: `k6 run --summary-export=summary.json test.js`. Compara percentiles across test runs para trackear regresiones: almacena resultados en una time series database y alerta cuando p95 incrementa más de 20%.

### ¿Cómo testeo rate limiting de API bajo carga?

Verifica comportamiento de rate limiting enviando requests por encima del umbral de rate limit. En k6: `export const options = {\n  scenarios: {\n    burst: {\n      executor: 'constant-arrival-rate',\n      rate: 200,\n      timeUnit: '1s',\n      duration: '1m',\n      preAllocatedVUs: 300\n    }\n  },\n  thresholds: {\n    http_req_failed: ['rate<0.15']\n  }\n};\nexport default function () {\n  const res = http.get('https://api.example.com/api');\n  check(res, {\n    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,\n    'has rate limit headers': (r) => r.headers['X-RateLimit-Limit'] !== undefined\n  });\n}`. Verifica que la response 429 incluya header `Retry-After`: `check(res, {\n  '429 has Retry-After': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined\n});`. Testea recuperación de rate limit: después de hitting el límite, espera y verifica que los requests funcionan de nuevo: `if (res.status === 429) {\n  const retryAfter = parseInt(res.headers['Retry-After']);\n  sleep(retryAfter + 1);\n  const retryRes = http.get('https://api.example.com/api');\n  check(retryRes, { 'recovered': (r) => r.status === 200 });\n}`. Testea rate limits por usuario: usa diferentes API keys por VU. Testea comportamiento sliding window vs fixed window: envía requests en el boundary de la ventana.

### ¿Cómo distribuyo load tests across múltiples máquinas?

Para testing de alto volumen (10,000+ VUs), distribuye across múltiples máquinas. Con k6 cloud: `k6 cloud test.js --vus 10000 --duration 10m`. Para k6 distribuido self-hosted, usa k6-operator en Kubernetes: `# k6-operator.yaml\napiVersion: k6.io/v1alpha1\nkind: K6\nmetadata:\n  name: k6-sample\nspec:\n  parallelism: 10\n  script:\n    configMap:\n      name: k6-script\n      file: test.js`. Para JMeter distributed testing: `jmeter -n -t test.jmx -r server1,server2,server3 -l results.jtl`. Configura JMeter servers: `jmeter-server -Djava.rmi.server.hostname=server1`. Para Locust distributed: `locust --master --host=https://api.example.com` y `locust --worker --master-host=master-host`. Asegura que los load generators estén en la misma región que el target para minimizar varianza de red. Monitorea CPU del load generator: si excede 80%, añade más máquinas. Usa un coordinator para agregar resultados: `k6 cloud test.js` maneja esto automáticamente. Para aggregación custom, envía resultados a un InfluxDB compartido: `k6 run --out influxdb=http://influxdb:8086/k6 test.js`.

### ¿Cómo manejo database load testing?

Testea performance de base de datos bajo conexiones concurrentes y queries complejas. Usa k6 con la extensión `k6/x/sql`: `import sql from 'k6/x/sql';\nconst db = sql.open('postgres', 'host=localhost dbname=testdb user=test password=test');\nexport const options = { vus: 50, duration: '5m' };\nexport default function () {\n  const rows = db.query('SELECT * FROM users WHERE created_at > NOW() - INTERVAL \'1 day\' LIMIT 100');\n  check(rows, { 'has results': (r) => r.length > 0 });\n}`. Testea agotamiento de connection pool: `export const options = { vus: 200, duration: '3m' };\nexport default function () {\n  const result = db.query('SELECT pg_sleep(0.5)');\n  // With 200 VUs and 500ms queries, you need 100+ connections\n}`. Monitorea métricas de base de datos durante el test: `SELECT count(*) FROM pg_stat_activity; SELECT * FROM pg_stat_database WHERE datname = 'testdb';`. Testea ratios read/write: `// 80% reads, 20% writes\nif (Math.random() < 0.8) {\n  db.query('SELECT * FROM users WHERE id = $1', [randomId]);\n} else {\n  db.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [randomId]);\n}`. Para validación de índices, corre `EXPLAIN ANALYZE` en queries lentas encontradas durante el test. Testea deadlocks de transacciones: `db.exec('BEGIN'); db.query('UPDATE accounts SET balance = balance - 10 WHERE id = $1', [fromId]); db.query('UPDATE accounts SET balance = balance + 10 WHERE id = $1', [toId]); db.exec('COMMIT');`.

### ¿Cómo testeo microservices bajo carga?

Testea microservicios individuales y la cadena completa de requests. Para testing de servicio individual: targetea un endpoint de servicio directamente. Para testing end-to-end: simula el journey completo de usuario across múltiples servicios. En k6, encadena requests: `export default function () {\n  // Step 1: Login\n  const loginRes = http.post('https://api.example.com/auth/login', { email, password });\n  const token = loginRes.json('token');\n  // Step 2: Get profile\n  const profileRes = http.get('https://api.example.com/profile', {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n  // Step 3: Update profile\n  http.put('https://api.example.com/profile', { name: 'Updated' }, {\n    headers: { Authorization: `Bearer ${token}` }\n  });\n}`. Testea comportamiento de circuit breaker: envía alta carga a un servicio y verifica que el circuit breaker tripa: `check(res, {\n  'circuit breaker open': (r) => r.status === 503 && r.headers['X-Circuit-Breaker'] === 'open'\n});`. Testea comportamiento de service mesh: verifica políticas de retry de Istio/Linkerd bajo carga. Usa escenarios de k6 para testear múltiples servicios simultáneamente: `scenarios: {\n  auth: { executor: 'ramping-vus', stages: [{ target: 100, duration: '5m' }], exec: 'authTest' },\n  catalog: { executor: 'ramping-vus', stages: [{ target: 200, duration: '5m' }], exec: 'catalogTest' }\n}`. Monitorea distributed tracing durante el test para identificar latencia cross-service.

### ¿Cómo creo escenarios realistas de user journey en k6?

Modela comportamiento realista de usuario con múltiples escenarios y distribuciones weighted. Define escenarios: `export const options = {\n  scenarios: {\n    browsing: {\n      executor: 'ramping-vus',\n      stages: [{ duration: '5m', target: 80 }],\n      exec: 'browse'\n    },\n    shopping: {\n      executor: 'ramping-vus',\n      stages: [{ duration: '5m', target: 15 }],\n      exec: 'shop'\n    },\n    checkout: {\n      executor: 'ramping-vus',\n      stages: [{ duration: '5m', target: 5 }],\n      exec: 'checkout'\n    }\n  }\n};\nfunction browse() {\n  http.get('https://api.example.com/products');\n  sleep(randomIntBetween(5, 30));\n}\nfunction shop() {\n  http.get('https://api.example.com/products');\n  http.post('https://api.example.com/cart', { productId: 1 });\n  sleep(randomIntBetween(10, 60));\n}\nfunction checkout() {\n  http.post('https://api.example.com/cart/checkout', { paymentMethod: 'card' });\n  sleep(randomIntBetween(30, 120));\n}`. Usa think times entre requests: los usuarios reales no envían requests continuamente. Añade think time random: `sleep(randomIntBetween(1, 10))`. Modela diferentes tipos de usuario: nuevos (más lentos, más page views), recurrentes (más rápidos, navegación directa), power users (API-heavy). Usa la función `exec` de k6 para asignar diferentes comportamientos por escenario. Añade fallos random y retries para simular comportamiento real de browser.

### ¿Cómo interpreto resultados de load test e identifico cuellos de botella?

Analiza output de k6 sistemáticamente. Checkea thresholds primero: si cualquier threshold falla, el test falla. Revisa el summary: `http_req_duration: avg=234ms p(95)=567ms` — si p95 excede tu SLO, investiga. Busca patrones de error: `http_req_failed: 5.2%` con errores 4xx sugiere rate limiting, 5xx sugiere server overload. Correlaciona con métricas de server: CPU alta durante el test sugiere cuellos de botella compute-bound, memoria alta sugiere leaks, disk I/O alto sugiere issues de base de datos. Usa `--out json=results.json` de k6 para análisis detallado: `jq '.data | select(.metric == "http_req_duration") | .value' results.json | sort -n | tail -10` muestra los 10 requests más lentos. Identifica capas de cuello de botella: si queries de base de datos toman 800ms pero la API responde en 900ms, la base de datos es el cuello de botella. Si la API responde en 2000ms pero queries toman 100ms, la capa de aplicación es el cuello de botella. Checkea stats de connection pool: si conexiones activas igualan max connections, el pool está agotado. Checkea stats de thread pool: si todos los threads están busy, el server no puede manejar más requests concurrentes. Usa flame graphs para identificar CPU hotspots: `async-profiler --flamegraph flame.html <pid>` para aplicaciones JVM.

### ¿Cómo testeo autoscaling bajo carga?

Verifica comportamiento de autoscaling incrementando carga gradualmente y observando scale-up. En k6: `export const options = {\n  stages: [\n    { duration: '2m', target: 50 },   // baseline\n    { duration: '5m', target: 200 },   // trigger scale-up\n    { duration: '10m', target: 200 },  // wait for new pods\n    { duration: '5m', target: 500 },   // higher load\n    { duration: '10m', target: 500 },  // verify stability\n    { duration: '5m', target: 0 }      // scale-down\n  ]\n};`. Monitorea HPA de Kubernetes: `kubectl get hpa -w` durante el test. Verifica que nuevos pods se ready: `kubectl get pods -w | grep Running`. Checkea que la carga se distribuye across pods: `kubectl logs -l app=api --tail=100 | grep request_count`. Verifica que el autoscaler responde dentro del tiempo esperado: si HPA scale-up toma 3 minutos pero tu test solo sostiene peak load por 2 minutos, el sistema nunca escala. Testea comportamiento de scale-down: después de que la carga baja, verifica que pods se remueven dentro del período de cooldown. Testea cluster autoscaler: si pods están pending por nodos insuficientes, verifica que nuevos nodos se unen al cluster. Monitorea thrashing: si el autoscaler escala up y down rápidamente, ajusta el stabilization window: `behavior: { scaleDown: { stabilizationWindowSeconds: 300 } }`.

### ¿Cómo manejo cleanup de test data después de load tests?

Limpia test data para evitar poluir la base de datos. Usa la función teardown de k6: `export function teardown(data) {\n  // Clean up test users\n  http.del('https://api.example.com/test-users', {\n    headers: { Authorization: `Bearer ${data.adminToken}` }\n  });\n}`. Usa prefijos únicos para test data: `const testPrefix = `loadtest-${Date.now()}-`;\nhttp.post('https://api.example.com/users', {\n  email: `${testPrefix}user@test.com`,\n  name: 'Load Test User'\n});`. Limpia por prefijo: `DELETE FROM users WHERE email LIKE 'loadtest-%';`. Usa transacciones de base de datos que roll back: `BEGIN; INSERT INTO users (...); -- test queries here; ROLLBACK;`. Para JMeter, usa JSR223 Post Processor: `import groovy.sql.Sql;\ndef sql = Sql.newInstance('jdbc:postgresql://localhost/testdb', 'user', 'pass');\nsql.execute('DELETE FROM test_data WHERE created_at > ?', [testStartTime]);\nsql.close();`. Programa cleanup jobs: job de `pg_cron` que borra test data más viejo que 1 hora. Usa base de datos de test separada: `K6_TEST_DATABASE_URL=postgres://test:test@localhost/testdb_loadtest`. Nunca corras load tests contra data de producción sin un plan de cleanup.

### ¿Cómo testeo APIs gRPC bajo carga?

k6 soporta testing de gRPC con el módulo `k6/net/grpc`. Define un cliente gRPC: `import grpc from 'k6/net/grpc';\nconst client = new grpc.Client();\nclient.load(['./proto'], 'user_service.proto');\nexport const options = { vus: 100, duration: '5m' };\nexport default function () {\n  client.connect('grpc.example.com:443', { plaintext: false });\n  const response = client.invoke('user.UserService/GetUser', { user_id: '123' });\n  check(response, {\n    'status is OK': (r) => r.status === grpc.StatusOK,\n    'has user data': (r) => r.message.user_id === '123'\n  });\n  client.close();\n}`. Testea streaming RPCs: `const stream = client.invoke('user.UserService/StreamUsers', {});\nstream.on('data', (msg) => {\n  check(msg, { 'has user': (m) => m.user_id !== undefined });\n});\nstream.on('end', () => { client.close(); });`. Mide métricas específicas de gRPC: `grpc_req_duration`, `grpc_streams_msgs_received`. Testea con diferentes tamaños de mensaje: mensajes pequeños (100 bytes) testean throughput, mensajes grandes (1MB) testean serialization. Testea metadata propagation: `client.invoke('user.UserService/GetUser', { user_id: '123' }, { metadata: { 'x-request-id': 'test-123' } });`. Testea deadline propagation: `client.invoke('user.UserService/GetUser', { user_id: '123' }, { timeout: '5s' });`. Monitorea gRPC server stats: `grpc_server_handled_total`, `grpc_server_msg_received_total`.

### ¿Cómo comparo resultados de load test across runs?

Trackea regresiones de performance comparando resultados across test runs. Almacena resultados en una time series database: `k6 run --out influxdb=http://influxdb:8086/k6 test.js`. Usa Grafana para visualizar trends: crea dashboards mostrando p95 latency, error rate, y throughput over time. Define thresholds de regresión: alerta cuando p95 incrementa más de 20% comparado con el run anterior. Usa `--summary-export` de k6 para output estructurado: `k6 run --summary-export=summary.json test.js`. Compara summaries: `jq '.metrics.http_req_duration.values.p95' summary.json` across runs. Usa significancia estadística: corre el mismo test 3 veces y compara medianas para account por varianza. Usa la API de k6 cloud para comparación histórica: `curl -H 'Authorization: Token $K6_TOKEN' https://api.k6.io/v3/test-runs`. Para JMeter, usa el Performance Plugin en Jenkins para trackear trends. Para detección automatizada de regresión, usa un archivo baseline: `k6 run --out json=baseline.json test.js` y compara runs futuros contra él.

### ¿Cómo testeo comportamiento de CDN caching bajo carga?

Verifica cache hit ratios y comportamiento de TTL del CDN bajo carga. Envía requests con parámetros cache-busting: `export default function () {\\n  const cacheBuster = __ITER;\\n  http.get(`https://cdn.example.com/assets/app.js?v=${cacheBuster}`);\\n}`. Testea warm-up de cache: `export const options = {\\n  stages: [\\n    { duration: '2m', target: 10 },   // warm cache\\n    { duration: '5m', target: 100 },   // test cached responses\\n    { duration: '2m', target: 0 }\\n  ]\\n};`. Verifica cache headers: `check(res, {\\n  'has cache-control': (r) => r.headers['Cache-Control'] !== undefined,\\n  'has ETag': (r) => r.headers['ETag'] !== undefined,\\n  'cache hit from CDN': (r) => r.headers['X-Cache'] === 'HIT' || r.headers['CF-Cache-Status'] === 'HIT'\\n});`. Testea conditional requests con If-None-Match: `const etag = previousRes.headers['ETag'];\\nconst res = http.get('https://cdn.example.com/assets/app.js', {\\n  headers: { 'If-None-Match': etag }\\n});\\ncheck(res, { '304 Not Modified': (r) => r.status === 304 });`. Mide cache hit rate: `const cacheHits = new Counter('cache_hits');\\nexport default function () {\\n  const res = http.get('https://cdn.example.com/image.png');\\n  if (res.headers['X-Cache'] === 'HIT') cacheHits.add(1);\\n}`. Testea cache eviction: envía requests para muchas URLs únicas para llenar el cache, luego verifica que entradas más viejas se evictan. Testea stale-while-revalidate: `check(res, {\\n  'stale content served': (r) => r.headers['Age'] > 3600 && r.status === 200\\n});`.

### ¿Cómo testeo performance de API pagination bajo carga?

Pagination puede causar degradación de performance en offsets profundos. Testea cursor-based pagination: `export default function () {\\n  let cursor = null;\\n  for (let i = 0; i < 100; i++) {\\n    const url = cursor\\n      ? `https://api.example.com/users?cursor=${cursor}`\\n      : 'https://api.example.com/users';\\n    const res = http.get(url);\\n    check(res, { 'status is 200': (r) => r.status === 200 });\\n    cursor = res.json('next_cursor');\\n    if (!cursor) break;\\n  }\\n}`. Testea degradación de offset-based pagination: `export default function () {\\n  const offsets = [0, 1000, 10000, 50000, 100000];\\n  for (const offset of offsets) {\\n    const res = http.get(`https://api.example.com/users?offset=${offset}&limit=100`);\\n    console.log(`offset=${offset} duration=${res.timings.duration}ms`);\\n  }\\n}`. Compara performance cursor vs offset: cursor pagination debería mantener latencia constante independientemente de la profundidad, mientras offset pagination degrada. Setea thresholds para deep pagination: `thresholds: {\\n  http_req_duration: [{ threshold: 'p(95)<500', method: 'cursor' }, { threshold: 'p(95)<2000', method: 'offset' }]\\n}`. Testea impacto de page size: `const pageSizes = [10, 50, 100, 500, 1000];\\nfor (const size of pageSizes) {\\n  const res = http.get(`https://api.example.com/users?limit=${size}`);\\n  console.log(`limit=${size} duration=${res.timings.duration}ms`);\\n}`. Monitorea tiempo de ejecución de queries de pagination con `EXPLAIN ANALYZE`.

### ¿Cómo testeo concurrencia de API y race conditions?

Load testing puede revelar race conditions que unit tests no detectan. Testea writes concurrentes al mismo recurso: `export default function () {\\n  const userId = 1; // all VUs target the same user\\n  http.patch(`https://api.example.com/users/${userId}`, {\\n    balance: Math.random() * 100\\n  });\\n}`. Verifica optimistic locking: `const res = http.get('https://api.example.com/users/1');\\nconst version = res.json('version');\\nconst updateRes = http.patch('https://api.example.com/users/1', {\\n  name: 'Updated',\\n  version: version\\n});\\ncheck(updateRes, {\\n  'success or conflict': (r) => r.status === 200 || r.status === 409\\n});`. Testea idempotency keys: `const idempotencyKey = `key-${__VU}-${__ITER}`;\\nhttp.post('https://api.example.com/charges', { amount: 100 }, {\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});`. Envía la misma key dos veces: `http.post('https://api.example.com/charges', { amount: 100 }, {\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});` y verifica que la segunda response retorna el mismo resultado. Testea transaction isolation de base de datos: `// Concurrent transfers between accounts\\nhttp.post('https://api.example.com/transfer', { from: 1, to: 2, amount: 10 });` con 100 VUs targeteando las mismas cuentas. Verifica que el balance total se conserva después del test.

### ¿Cómo testeo manejo de errores de API bajo carga?

Verifica que la API maneja errores gracefully bajo stress. Testea comportamiento de timeout: `export const options = {\\n  vus: 500,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.05']\\n  }\\n};`. Verifica que las error responses son estructuradas: `check(res, {\\n  'error has code': (r) => r.status >= 400 && r.json('error.code') !== undefined,\\n  'error has message': (r) => r.status >= 400 && r.json('error.message') !== undefined\\n});`. Testea fallback responses de circuit breaker: `check(res, {\\n  'fallback response': (r) => r.status === 200 || (r.status === 503 && r.json('error.fallback') === true)\\n});`. Testea comportamiento de retry: `// First request may fail, retry should succeed\\nlet res = http.get('https://api.example.com/unstable');\\nif (res.status >= 500) {\\n  sleep(1);\\n  res = http.get('https://api.example.com/unstable');\\n  check(res, { 'retry succeeded': (r) => r.status === 200 });\\n}`. Verifica que error responses de rate limit incluyen headers útiles: `check(res, {\\n  '429 has Retry-After': (r) => r.status !== 429 || r.headers['Retry-After'] !== undefined,\\n  '429 has rate limit info': (r) => r.status !== 429 || r.headers['X-RateLimit-Reset'] !== undefined\\n});`. Testea tiempo de response de errores: los errores deberían retornar rápido, no colgar: `check(res, {\\n  'errors respond fast': (r) => r.status < 500 || r.timings.duration < 100\\n});`.

### ¿Cómo testeo performance de file uploads de API bajo carga?

File uploads estresan componentes diferentes del sistema comparado con JSON APIs. Testea multipart uploads: `export default function () {\\n  const file = {\\n    type: 'image/jpeg',\\n    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='\\n  };\\n  const res = http.post('https://api.example.com/upload', {\\n    file: http.file(file.data, 'test.jpg', file.type)\\n  });\\n  check(res, { 'upload succeeded': (r) => r.status === 201 });\\n}`. Testea large file uploads: genera un payload de 10MB: `const largeFile = new Array(10 * 1024 * 1024).fill('a').join('');\\nhttp.post('https://api.example.com/upload', {\\n  file: http.file(largeFile, 'large.bin', 'application/octet-stream')\\n});`. Testea concurrent uploads: `export const options = { vus: 50, duration: '5m' };` para verificar que el servicio de upload maneja uploads paralelos sin corrupción. Testea upload timeout: `export const options = {\\n  vus: 10,\\n  duration: '2m',\\n  httpDebug: 'full'\\n};` y monitorea por timeout errors. Testea chunked uploads: `const chunkSize = 5 * 1024 * 1024; // 5MB chunks\\nfor (let i = 0; i < totalChunks; i++) {\\n  http.put(`https://api.example.com/upload/${uploadId}?chunk=${i}`, chunkData);\\n}`. Verifica integridad de upload: compara checksum del archivo subido con el original. Monitorea disk I/O durante uploads: `iostat -x 1` en el server. Testea upload a storage backed por CDN: verifica direct-to-S3 uploads funcionan bajo carga.

### ¿Cómo testeo memory leaks de API con soak testing?

Soak tests corren por períodos extendidos para detectar memory leaks y agotamiento de recursos. Corre un test de 4 horas: `export const options = {\\n  vus: 100,\\n  duration: '4h',\\n  thresholds: {\\n    http_req_duration: ['p(95)<500'],\\n    http_req_failed: ['rate<0.01']\\n  }\\n};`. Monitorea memoria del server durante el test: `while true; do free -m >> memory.log; sleep 60; done`. Plotea uso de memoria over time: si la memoria incrementa linealmente, hay un leak. En Kubernetes, monitorea memoria de pod: `kubectl top pods -l app=api --containers | sort -k3 -h`. Detecta connection leaks: `SELECT count(*) FROM pg_stat_activity GROUP BY state` no debería incrementar over time. Detecta file descriptor leaks: `ls /proc/<pid>/fd | wc -l` debería estabilizarse. Detecta thread leaks: `ps -eLf | grep <process> | wc -l` no debería crecer unbounded. Usa custom metrics de k6 para trackear métricas server-side: `import { Counter, Gauge } from 'k6/metrics';\\nconst serverMemory = new Gauge('server_memory_mb');\\nexport default function () {\\n  const res = http.get('https://api.example.com/metrics');\\n  serverMemory.add(res.json('memory.used_mb'));\\n}`. Setea memory thresholds: `thresholds: {\\n  server_memory_mb: ['value<1024']\\n}`. Después del test, verifica que la memoria vuelve al baseline: si la memoria se queda elevada, hay un leak que no fue garbage collected.

### ¿Cómo testeo compression de response de API bajo carga?

Verifica comportamiento de compression gzip y brotli bajo carga. Testea con header Accept-Encoding: `export default function () {\\n  const res = http.get('https://api.example.com/users', {\\n    headers: { 'Accept-Encoding': 'gzip, br' }\\n  });\\n  check(res, {\\n    'content is compressed': (r) => r.headers['Content-Encoding'] === 'gzip' || r.headers['Content-Encoding'] === 'br',\\n    'response is smaller': (r) => r.headers['Content-Length'] < 10000\\n  });\\n}`. Compara compressed vs uncompressed: `const uncompressed = http.get('https://api.example.com/users', {\\n  headers: { 'Accept-Encoding': 'identity' }\\n});\\nconst compressed = http.get('https://api.example.com/users', {\\n  headers: { 'Accept-Encoding': 'gzip' }\\n});\\nconsole.log(`Uncompressed: ${uncompressed.headers['Content-Length']} bytes`);\\nconsole.log(`Compressed: ${compressed.headers['Content-Length']} bytes`);`. Mide overhead de compression: `check(compressed, {\\n  'compression faster than uncompressed': (r) => r.timings.duration < uncompressed.timings.duration\\n});`. Testea compression con diferentes tamaños de payload: payloads pequeños pueden ser más lentos con compression debido al overhead. Testea brotli vs gzip: brotli típicamente logra 15-20% mejor compression pero usa más CPU. Monitorea CPU del server durante tests de compression: si CPU excede 80%, considera deshabilitar compression para formatos ya comprimidos (images, videos). Testea conditional compression: `Accept-Encoding: gzip, deflate, br` debería negociar el mejor encoding disponible.

### ¿Cómo testeo connection pooling de API bajo carga?

Verifica comportamiento de connection pool bajo carga concurrente. Monitorea pool metrics: `SELECT count(*) as total, state FROM pg_stat_activity GROUP BY state;` durante el test. Testea pool exhaustion: `export const options = {\\n  vus: 500,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.01']\\n  }\\n};` y verifica no hay connection timeout errors. Testea configuration del pool: ajusta `max_connections` y `pool_size` para encontrar valores óptimos. En k6, controla HTTP connections: `import http from 'k6/http';\\nexport const options = {\\n  vus: 100,\\n  duration: '5m',\\n  noConnectionReuse: false,\\n};` para testear connection reuse. Testea con `noConnectionReuse: true` para comparar: `export const options = {\\n  vus: 100,\\n  duration: '5m',\\n  noConnectionReuse: true,\\n};` — esto fuerza una nueva conexión por request, simulando clients sin keep-alive. Monitorea por connection leaks: `netstat -an | grep ESTABLISHED | wc -l` debería estabilizarse, no crecer. Testea connection timeout: `export const options = {\\n  vus: 1000,\\n  duration: '3m',\\n};` con server `max_connections = 100` para verificar que la API queuea requests en lugar de crashear. Testea pool warm-up: `export function setup() {\\n  // Pre-warm connections\\n  for (let i = 0; i < 10; i++) {\\n    http.get('https://api.example.com/health');\\n  }\\n}`. Verifica que idle connections se cierran: `idle_timeout = 300s` debería cerrar conexiones no usadas.

### ¿Cómo testeo caching layers de API bajo carga?

Testea multi-layer caching (CDN, application, database) bajo carga. Testea cache invalidation: `// Write to API\\nhttp.post('https://api.example.com/users', { name: 'Test' });\\n// Read immediately - should reflect the write\\nconst res = http.get('https://api.example.com/users');\\ncheck(res, { 'reflects write': (r) => r.json('data.0.name') === 'Test' });`. Testea cache stampede: remueve cache y envía high concurrent reads: `export const options = {\\n  scenarios: {\\n    stampede: {\\n      executor: 'constant-arrival-rate',\\n      rate: 1000,\\n      timeUnit: '1s',\\n      duration: '30s',\\n      preAllocatedVUs: 2000\\n    }\\n  }\\n};`. Verifica cache warming: `export function setup() {\\n  http.get('https://api.example.com/users?warm=true');\\n}`. Testea TTL expiration: `// First request populates cache\\nhttp.get('https://api.example.com/users');\\n// Wait for TTL to expire\\nsleep(60);\\n// Second request should repopulate\\nhttp.get('https://api.example.com/users');`. Monitorea cache hit rate: `const cacheHits = new Counter('cache_hits');\\nconst cacheMisses = new Counter('cache_misses');\\nexport default function () {\\n  const res = http.get('https://api.example.com/users');\\n  if (res.headers['X-Cache'] === 'HIT') cacheHits.add(1);\\n  else cacheMisses.add(1);\\n}`. Testea cache con query parameters: `http.get('https://api.example.com/users?page=1&sort=name')` y `http.get('https://api.example.com/users?page=1&sort=email')` deberían cache separadamente. Testea Redis cache performance: monitorea `INFO stats` para `keyspace_hits` y `keyspace_misses` durante el test.

### ¿Cómo testeo idempotency de API bajo carga?

Verifica guarantees de idempotency bajo requests duplicados concurrentes. Testea duplicate POST requests: `const idempotencyKey = 'key-123';\\n// Send the same request twice concurrently\\nhttp.asyncPost('https://api.example.com/charges', {\\n  body: JSON.stringify({ amount: 100 }),\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});\\nhttp.asyncPost('https://api.example.com/charges', {\\n  body: JSON.stringify({ amount: 100 }),\\n  headers: { 'Idempotency-Key': idempotencyKey }\\n});` y verifica que solo un charge se crea. Testea con 100 duplicates concurrentes: `export const options = {\\n  vus: 100,\\n  duration: '10s',\\n};\\nexport default function () {\\n  http.post('https://api.example.com/charges', { amount: 100 }, {\\n    headers: { 'Idempotency-Key': 'same-key' }\\n  });\\n}` y verifica que la base de datos tiene exactamente un record. Testea expiración de idempotency key: después de que la key expira, un nuevo request con la misma key debería crear un nuevo resource. Testea idempotency con payloads diferentes: misma key con payload diferente debería retornar 422 o la response original. Monitorea por race conditions en idempotency storage: usa unique constraints de base de datos: `CREATE UNIQUE INDEX idx_idempotency_keys ON idempotency_records(key);`. Testea TTL de idempotency key: `EXPIRE idempotency:key-123 86400` debería expirar después de 24 horas. Verifica que idempotency funciona across retries: si el primer request timeout, el retry con la misma key no debería duplicar la operación.

### ¿Cómo testeo webhook delivery de API bajo carga?

Webhooks requieren testear tanto delivery reliability como retry logic. Simula webhook delivery: `export default function () {\\n  const payload = JSON.stringify({ event: 'order.created', data: { id: 1 } });\\n  const res = http.post('https://client.example.com/webhook', payload, {\\n    headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': 'sha256=abc123' }\\n  });\\n  check(res, {\\n    'webhook accepted': (r) => r.status === 200,\\n    'responded quickly': (r) => r.timings.duration < 5000\\n  });\\n}`. Testea retry logic de webhook: `// Simulate endpoint that fails first, succeeds on retry\\nlet res = http.post('https://client.example.com/webhook', payload);\\nif (res.status >= 500) {\\n  sleep(5); // exponential backoff\\n  res = http.post('https://client.example.com/webhook', payload);\\n  check(res, { 'retry succeeded': (r) => r.status === 200 });\\n}`. Testea webhook signing: verifica HMAC signature validation: `const crypto = require('k6/crypto');\\nconst signature = crypto.hmac('sha256', secret, payload, 'hex');\\nhttp.post('https://client.example.com/webhook', payload, {\\n  headers: { 'X-Webhook-Signature': `sha256=${signature}` }\\n});`. Testea webhook ordering: envía events out of order y verifica que el client los maneja correctamente. Monitorea webhook queue depth: si la queue crece unbounded, el consumer no puede mantenerse. Testea webhook timeout: `export const options = {\\n  vus: 50,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.05'],\\n    http_req_duration: ['p(95)<10000']\\n  }\\n};` para verificar que el sistema maneja webhook endpoints lentos. Testea dead letter queue: después de max retries, verifica que webhooks fallidos se almacenan para replay manual.

### ¿Cómo testeo GraphQL query complexity de API bajo carga?

GraphQL queries pueden variar en complexity y resource usage. Testea simple vs complex queries: `const simpleQuery = '{ user(id: 1) { name } }';\\nconst complexQuery = '{ user(id: 1) { name posts { title comments { text author { name } } } } }';\\nhttp.post('https://api.example.com/graphql', JSON.stringify({ query: simpleQuery }));\\nhttp.post('https://api.example.com/graphql', JSON.stringify({ query: complexQuery }));`. Mide query depth impact: `const depths = [1, 3, 5, 7, 10];\\nfor (const depth of depths) {\\n  const query = buildNestedQuery(depth);\\n  const res = http.post('https://api.example.com/graphql', JSON.stringify({ query }));\\n  console.log(`depth=${depth} duration=${res.timings.duration}ms`);\\n}`. Testea query complexity analysis: verifica que el server rechaza queries demasiado complejas: `check(res, {\\n  'complexity rejected': (r) => r.status === 400 && r.json('errors[0].message').includes('complexity')\\n});`. Testea batch queries: `const batch = [\\n  { query: '{ user(id: 1) { name } }' },\\n  { query: '{ user(id: 2) { name } }' },\\n  { query: '{ user(id: 3) { name } }' }\\n];\\nhttp.post('https://api.example.com/graphql', JSON.stringify(batch));`. Testea N+1 query detection: monitorea database query count por GraphQL request. Si una query para 10 users genera 10+1 database queries, hay un problema N+1. Usa DataLoader pattern para batch database calls. Testea persisted queries: `http.post('https://api.example.com/graphql', JSON.stringify({ extensions: { persistedQuery: { sha256Hash: 'abc123' } } }));`.

### ¿Cómo testeo rate limit headers y behavior de API bajo carga?

Verifica que rate limit headers están presentes y son accurate. Checkea standard headers: `check(res, {\\n  'has X-RateLimit-Limit': (r) => r.headers['X-RateLimit-Limit'] !== undefined,\\n  'has X-RateLimit-Remaining': (r) => r.headers['X-RateLimit-Remaining'] !== undefined,\\n  'has X-RateLimit-Reset': (r) => r.headers['X-RateLimit-Reset'] !== undefined\\n});`. Verifica que remaining count decrementa: `const res1 = http.get('https://api.example.com/data');\\nconst remaining1 = parseInt(res1.headers['X-RateLimit-Remaining']);\\nconst res2 = http.get('https://api.example.com/data');\\nconst remaining2 = parseInt(res2.headers['X-RateLimit-Remaining']);\\ncheck(remaining2, { 'decremented': (r) => r === remaining1 - 1 });`. Testea rate limit reset: `const resetTime = parseInt(res.headers['X-RateLimit-Reset']);\\nconst now = Math.floor(Date.now() / 1000);\\ncheck(resetTime, { 'reset is in future': (r) => r > now });`. Testea diferentes rate limit tiers: `// Free tier: 100 req/hour\\n// Pro tier: 1000 req/hour\\nconst freeToken = __ENV.FREE_TOKEN;\\nconst proToken = __ENV.PRO_TOKEN;\\n// Test free tier limit\\nfor (let i = 0; i < 101; i++) {\\n  const res = http.get('https://api.example.com/data', {\\n    headers: { Authorization: `Bearer ${freeToken}` }\\n  });\\n  if (i === 100) check(res, { 'free tier limited': (r) => r.status === 429 });\\n}`. Testea rate limit por IP: `// k6 does not support multiple source IPs natively\\n// Use k6 cloud or distributed runners for IP-based rate limit testing`. Testea rate limit bypass: verifica que usuarios autenticados obtienen límites más altos que usuarios anónimos.

### ¿Cómo testeo bulk operations de API bajo carga?

Bulk endpoints procesan múltiples items en un solo request, estresando code paths diferentes que operaciones single-item. Testea bulk create: `const items = [];\\nfor (let i = 0; i < 1000; i++) {\\n  items.push({ name: `item-${i}`, value: i });\\n}\\nconst res = http.post('https://api.example.com/items/bulk', JSON.stringify(items), {\\n  headers: { 'Content-Type': 'application/json' }\\n});\\ncheck(res, {\\n  'bulk created': (r) => r.status === 201,\\n  'all items created': (r) => r.json('created') === 1000\\n});`. Testea bulk update: `const updates = items.map(i => ({ id: i.id, name: `updated-${i.name}` }));\\nhttp.patch('https://api.example.com/items/bulk', JSON.stringify(updates));`. Testea bulk delete: `http.del('https://api.example.com/items/bulk', JSON.stringify({ ids: [1, 2, 3, 4, 5] }));`. Mide performance bulk vs single operation: `// Single: 100 individual requests\\nfor (let i = 0; i < 100; i++) {\\n  http.post('https://api.example.com/items', { name: `item-${i}` });\\n}\\n// Bulk: 1 request with 100 items\\nhttp.post('https://api.example.com/items/bulk', JSON.stringify(items));` — bulk debería ser 5-10x más rápido. Testea bulk size limits: `const sizes = [10, 100, 1000, 10000];\\nfor (const size of sizes) {\\n  const res = http.post('https://api.example.com/items/bulk', JSON.stringify(generateItems(size)));\\n  console.log(`size=${size} status=${res.status} duration=${res.timings.duration}ms`);\\n}`. Testea partial bulk failure: `const items = [\\n  { name: 'valid' },\\n  { name: '', }, // invalid\\n  { name: 'valid2' }\\n];\\nconst res = http.post('https://api.example.com/items/bulk', JSON.stringify(items));\\ncheck(res, {\\n  'partial success': (r) => r.status === 207,\\n  'has errors': (r) => r.json('errors').length > 0\\n});`. Monitorea comportamiento de database transaction: bulk operations deberían usar una sola transacción o transacciones batched.

### ¿Cómo testeo long polling y SSE de API bajo carga?

Server-Sent Events (SSE) y long polling mantienen conexiones persistentes, consumiendo recursos del server diferente que APIs request-response. Testea SSE connections: `import http from 'k6/http';\\nexport default function () {\\n  const res = http.get('https://api.example.com/events', {\\n    headers: { 'Accept': 'text/event-stream' }\\n  });\\n  check(res, {\\n    'SSE connected': (r) => r.status === 200,\\n    'has event-stream content type': (r) => r.headers['Content-Type'] === 'text/event-stream'\\n  });\\n}`. Testea connection duration: SSE connections se quedan abiertas, consumiendo una conexión del pool. Testea con 1000 concurrent SSE connections: `export const options = {\\n  vus: 1000,\\n  duration: '5m',\\n  thresholds: {\\n    http_req_failed: ['rate<0.01']\\n  }\\n};`. Monitorea file descriptors del server: `ls /proc/<pid>/fd | wc -l` no debería exceder `ulimit -n`. Testea long polling timeout: `export default function () {\\n  const res = http.get('https://api.example.com/poll?timeout=30');\\n  check(res, {\\n    'poll completed': (r) => r.status === 200,\\n    'response within timeout': (r) => r.timings.duration < 35000\\n  });\\n}`. Testea SSE reconnection: `// k6 does not natively support SSE reconnection\\n// Use browser-based testing with Playwright for SSE reconnection tests`. Testea event delivery latency: mide tiempo entre event generation y client receipt. Testea backpressure: envía events más rápido de lo que el client puede consumir y verifica que el server maneja backpressure gracefully. Monitorea memoria por conexión: SSE connections buffer events, así que memoria crece con connection count.

### ¿Cómo testeo observability de API bajo carga?

Verifica que logging, metrics, y tracing se mantienen funcionales bajo carga. Testea log volume: tráfico alto no debería causar log buffering o loss. Monitorea log aggregation: `Filebeat` o `Fluentd` debería mantenerse con el log volume durante el test. Testea metrics collection: verifica que Prometheus scrapes completan dentro del scrape interval: `scrape_duration_seconds < 15s`. Testea distributed tracing: verifica que trace sampling no dropea todos los traces bajo carga. En k6, inyecta trace headers: `http.get('https://api.example.com/users', {\\n  headers: { 'traceparent': '00-abcdef1234567890-1234567890abcdef-01' }\\n});`. Verifica trace propagation: checkea que el trace ID aparece en logs de downstream services. Testea alerting thresholds: verifica que alerts fire correctamente durante load spikes. Testea dashboard refresh: dashboards de Grafana deberían actualizar en real-time durante el test. Monitorea metrics cardinality: labels de high-cardinality (como user IDs) pueden causar memory issues de Prometheus bajo carga. Testea log structured output: `check(res, {\\n  'response has trace ID': (r) => r.headers['X-Trace-Id'] !== undefined\\n});`. Verifica audit logs: operaciones críticas deberían loguearse incluso bajo alta carga. Testea log rotation: verifica que log files rotan antes de llenar disk space. Monitorea APM agent overhead: si el APM agent añade más de 5% overhead, considera reducir instrumentation. Testea health check endpoint: `http.get('https://api.example.com/health')` debería retornar 200 durante todo el test.

### ¿Cómo testeo backward compatibility de API bajo carga?

Verifica que nuevas versiones de API no rompen clients existentes bajo carga. Testea version coexistence: `// v1 and v2 running simultaneously\\nhttp.get('https://api.example.com/v1/users');\\nhttp.get('https://api.example.com/v2/users');` con ambos endpoints manejando la misma carga. Testea deprecation headers: `check(res, {\\n  'has deprecation header': (r) => r.headers['Deprecation'] !== undefined || r.headers['Sunset'] !== undefined\\n});`. Testea backward-compatible schema changes: añade optional fields y verifica que clients viejos siguen funcionando. Testea field removal: `// v1 returns field 'name', v2 returns 'fullName'\\nconst v1Res = http.get('https://api.example.com/v1/users/1');\\nconst v2Res = http.get('https://api.example.com/v2/users/1');\\ncheck(v1Res, { 'has name': (r) => r.json('name') !== undefined });\\ncheck(v2Res, { 'has fullName': (r) => r.json('fullName') !== undefined });`. Testea response format changes: verifica que migración XML-to-JSON funciona bajo carga. Testea authentication changes: si v2 usa un auth scheme diferente, verifica que ambos schemes funcionan simultáneamente. Monitorea error rates por versión: si error rate de v1 spikea después del deploy de v2, puede haber un conflicto de resource compartido. Testea API gateway routing: verifica que el gateway rutea requests correctamente bajo carga a ambas versiones.

### ¿Cómo testeo content negotiation de API bajo carga?

Content negotiation permite a clients requestear diferentes formatos de response. Testea múltiples Accept headers: `const formats = ['application/json', 'application/xml', 'text/csv', 'application/yaml'];\\nfor (const format of formats) {\\n  const res = http.get('https://api.example.com/users', {\\n    headers: { Accept: format }\\n  });\\n  check(res, {\\n    'correct content type': (r) => r.headers['Content-Type'].includes(format.split('/')[1])\\n  });\\n}`. Testea formatos no soportados: `const res = http.get('https://api.example.com/users', {\\n  headers: { Accept: 'application/xml' }\\n});\\ncheck(res, { 'returns 406': (r) => r.status === 406 });` si XML no es soportado. Testea format-specific performance: JSON serialization puede ser más rápido que XML. Testea Accept-Language: `http.get('https://api.example.com/users', {\\n  headers: { 'Accept-Language': 'es-ES, en;q=0.8' }\\n});` y verifica responses localizadas. Testea content negotiation caching: `Accept: application/json` y `Accept: application/xml` deberían cache separadamente. Monitorea serialization overhead: `const jsonRes = http.get('https://api.example.com/users', { headers: { Accept: 'application/json' } });\\nconst xmlRes = http.get('https://api.example.com/users', { headers: { Accept: 'application/xml' } });\\nconsole.log(`JSON: ${jsonRes.timings.duration}ms, XML: ${xmlRes.timings.duration}ms`);`.

### ¿Cómo testeo configuration de CORS de API bajo carga?

Cross-Origin Resource Sharing (CORS) añade preflight OPTIONS requests que incrementan latency. Testea preflight caching: `// First request triggers preflight\\nhttp.options('https://api.example.com/users', {\\n  headers: {\\n    'Origin': 'https://app.example.com',\\n    'Access-Control-Request-Method': 'GET'\\n  }\\n});\\n// Second request should not trigger preflight if cached\\nhttp.get('https://api.example.com/users', {\\n  headers: { Origin: 'https://app.example.com' }\\n});`. Verifica CORS headers: `check(res, {\\n  'has Access-Control-Allow-Origin': (r) => r.headers['Access-Control-Allow-Origin'] !== undefined,\\n  'has Access-Control-Allow-Methods': (r) => r.headers['Access-Control-Allow-Methods'] !== undefined\\n});`. Testea wildcard vs specific origins: `Access-Control-Allow-Origin: *` no soporta credentials. Monitorea preflight overhead: cada preflight añade un round trip. Setea `Access-Control-Max-Age: 86400` para cachear preflight por 24 horas.

## Ver También

- [Integration Testing](/recipes/testing/integration-testing) — testing de interacciones entre servicios
- [Rate Limiting](/recipes/api/rate-limiting) — protección de APIs bajo tráfico intenso
- [Connection Pooling](/recipes/databases/database-connection-pooling) — manejo de conexiones concurrentes a base de datos
- [Caching Strategies](/recipes/performance/caching-strategies) — reducción de carga backend
- [API Documentation OpenAPI](/recipes/api/api-documentation-openapi) — documentación de contratos de API

---

*Última actualización: 2026-07-09*
