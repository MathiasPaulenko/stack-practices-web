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
  'src/content/recipes/data/batch-processing-patterns.es.md': `## Visión General

El procesamiento por lotes es la columna vertebral de pipelines de datos, flujos de trabajo ETL y generación de reportes. A diferencia del procesamiento de streams, los trabajos por lotes procesan conjuntos de datos acotados en chunks, lo que los hace más simples de razonar pero requieren atención cuidadosa a la idempotencia, tolerancia a fallos y observabilidad.

## Cuándo Usar

Usa este recurso cuando:
- Procesas grandes datasets que no caben en memoria
- Construyes pipelines ETL para data warehouses
- Generas reportes o agregaciones nocturnas
- Migras datos entre sistemas con ventanas de mantenimiento

## Solución

### Pipeline Resiliente de Procesamiento por Lotes (Python)

\`\`\`python
import logging
from typing import Callable, List, Iterator

class BatchProcessor:
    def __init__(self, batch_size: int = 1000, max_retries: int = 3):
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.processed = 0
        self.failed = []

    def process(
        self,
        items: Iterator[dict],
        handler: Callable[[List[dict]], None]
    ) -> dict:
        batch = []
        for item in items:
            batch.append(item)
            if len(batch) >= self.batch_size:
                self._execute(batch, handler)
                batch = []

        if batch:
            self._execute(batch, handler)

        return {"processed": self.processed, "failed": len(self.failed)}

    def _execute(self, batch: List[dict], handler: Callable):
        for attempt in range(self.max_retries):
            try:
                handler(batch)
                self.processed += len(batch)
                return
            except Exception as e:
                logging.warning(f"Batch fallido (intento {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:
                    self.failed.extend(batch)
\`\`\`

### Seguimiento Idempotente de Trabajos (SQL)

\`\`\`sql
CREATE TABLE job_runs (
    job_id VARCHAR(64) PRIMARY KEY,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('running', 'completed', 'failed')),
    checksum VARCHAR(64)
);

-- Antes de comenzar, verifica si ya está completado
SELECT * FROM job_runs WHERE job_id = 'daily_report_2025_01_15' AND status = 'completed';
\`\`\`

## Explicación

Un pipeline de producción por lotes necesita tres propiedades:

1. **Idempotencia**: Ejecutar el mismo trabajo dos veces debe producir el mismo resultado. Usa IDs de trabajo y checksums para saltar trabajo ya procesado.
2. **Tolerancia a fallos**: Fallos individuales de batch no deben crashear todo el trabajo. Implementa reintentos con backoff exponencial y una cola de mensajes fallidos.
3. **Observabilidad**: Rastrea progreso, throughput y errores. Emite métricas para items procesados, latencia y tasas de fallo.

**Estrategia de chunking**: Ajusta el tamaño de batches para balancear uso de memoria y throughput. Demasiado pequeño = overhead; demasiado grande = riesgo de OOM.

## Variantes

| Patrón | Caso de Uso | Compromiso |
|--------|-------------|------------|
| Procesamiento por chunks | Archivos grandes, límites de memoria | Más simple, mayor latencia |
| Workers paralelos | Transformaciones CPU-bound | Complejo, necesita coordinación |
| MapReduce | Agregación distribuida | Escala horizontalmente |
| Change Data Capture | Sincronización incremental | Requiere soporte de la fuente |

## Mejores Prácticas

- **Diseña para idempotencia**: Cada trabajo debe ser seguro de reintentar
- **Registra todo**: Inicio de trabajo, fin, y resultado de cada batch
- **Usa transacciones**: Envuelve escrituras de batch en transacciones de base de datos
- **Monitorea profundidad de cola**: Alerta cuando batches pendientes excedan umbrales
- **Implementa circuit breakers**: Detén reintentos si el downstream está unhealthy

## Errores Comunes

1. **No manejar fallos parciales**: Un batch de 1000 donde 1 falla necesita reintento individual
2. **Ignorar límites de memoria**: Cargar datasets enteros en RAM crashea el proceso
3. **Faltar checkpointing**: Un trabajo de 6 horas que falla a las 5:55 debe reiniciar desde cero
4. **Pérdida silenciosa de datos**: Errores logueados pero no visibles para operadores
5. **Sin estrategia de rollback**: Trabajos fallidos dejan la base de datos en estado inconsistente

## Preguntas Frecuentes

**P: ¿Qué tan grande debería ser cada batch?**
R: Comienza con 100-1000 items. Haz benchmark con tus datos y restricciones de memoria.

**P: ¿Debería usar una cola de trabajos como Celery o un cron job?**
R: Usa Celery/Redis para sistemas distribuidos y cron para pipelines simples de un solo nodo.

**P: ¿Cómo manejo cambios de schema en medio del pipeline?**
R: Versiona tu lógica de trabajo y schemas de datos. Ejecuta versiones viejas y nuevas en paralelo durante la migración.
`,

  'src/content/recipes/observability/prometheus-api-monitoring.es.md': `## Visión General

Prometheus es el estándar de facto para recolección de métricas en entornos cloud-native. Al instrumentar tu API con contadores, histograms y gauges personalizados, ganas visibilidad en tiempo real sobre latencia de requests, tasas de error, throughput y métricas de nivel de negocio.

## Cuándo Usar

Usa este recurso cuando:
- Configuras monitoreo para APIs REST o gRPC
- Definies SLOs y SLIs para microservicios
- Creas dashboards de Grafana para salud de API
- Alertas sobre picos de latencia p99 o tasas de error

## Solución

### Instrumentación con Cliente Prometheus (Node.js)

\`\`\`javascript
const client = require('prom-client');

// Counter: requests totales
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Número total de requests HTTP',
  labelNames: ['method', 'route', 'status_code']
});

// Histogram: duración de requests
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Gauge: conexiones activas
const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Número de conexiones HTTP activas'
});

// Middleware
app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer();

  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path || 'unknown' });
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || 'unknown',
      status_code: res.statusCode
    });
    activeConnections.dec();
  });

  next();
});
\`\`\`

### Reglas de Alertamiento

\`\`\`yaml
# prometheus-alerts.yml
groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Tasa de error alta detectada"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
\`\`\`

## Explicación

Prometheus sigue un modelo de pull:

1. **Instrumentación**: Tu aplicación expone un endpoint /metrics
2. **Scraping**: El servidor de Prometheus hace polling a este endpoint periódicamente (default 15s)
3. **Almacenamiento**: Los datos de series temporales se almacenan localmente con compresión
4. **Consulta**: Queries PromQL agregan métricas en tiempo real
5. **Alertamiento**: Alertmanager enruta alertas a Slack, PagerDuty, email

**Tipos de métricas**:
- **Counter**: Incrementa monotónicamente (requests, errores)
- **Histogram**: Observaciones en buckets + suma + conteo (latencia)
- **Gauge**: Puede subir o bajar (conexiones, profundidad de cola)
- **Summary**: Cuantiles pre-calculados (usa histograms en su lugar cuando sea posible)

## Variantes

| Lenguaje | Librería | Notas |
|----------|----------|-------|
| Node.js | prom-client | Más popular; registro built-in |
| Go | prometheus/client_golang | Oficial; mejor performance |
| Python | prometheus_client | Middleware Flask/Django disponible |
| Java | Micrometer | Integración Spring Boot |
| Rust | prometheus | Compatible con async |

## Mejores Prácticas

- **Usa labels con moderación**: Alta cardinalidad (combinaciones únicas de labels) degrada performance
- **Prefiere histograms sobre summaries**: Los histograms permiten agregación across instances
- **Instrumenta métricas de negocio**: No solo métricas técnicas (registros, revenue por endpoint)
- **Ajusta retención sabiamente**: Default 15 días; incrementa para tendencias a largo plazo
- **Ejecuta Prometheus en modo HA**: Usa Thanos o Cortex para agregación multi-cluster

## Errores Comunes

1. **Alta cardinalidad de labels**: IDs de usuario o sesión como labels crashean Prometheus
2. **Faltar sufijos de unidades**: Usa _seconds, _bytes, _total según convenciones de nombrado
3. **No instrumentar fallos**: Solo trackear éxitos enmascara detección de outage
4. **Demasiados buckets**: 100+ buckets de histogram desperdicia almacenamiento y CPU
5. **Ignorar errores de scraping**: Errores del endpoint /metrics significan puntos ciegos

## Preguntas Frecuentes

**P: ¿Cuánta memoria necesita Prometheus?**
R: ~1-3KB por serie temporal. Una API típica con 100 endpoints y 5 labels necesita 2-4GB RAM.

**P: ¿Puede Prometheus manejar datos de logs?**
R: No. Usa Loki para logs, Jaeger para trazas, y Prometheus para métricas. El stack de Grafana los unifica.

**P: ¿Cuál es la diferencia entre histogram y summary?**
R: Los histograms agrupan datos y permiten agregación. Los summaries precalculan cuantiles pero no pueden agregarse across instances.
`,

  'src/content/recipes/security/hmac-request-signing.es.md': `## Visión General

HMAC (Hash-based Message Authentication Code) es el estándar de la industria para firmar requests de APIs. Al combinar un secreto compartido con el payload del request y un hash criptográfico, tanto emisor como receptor pueden verificar la integridad y autenticidad del mensaje sin transmitir el secreto por la red.

## Cuándo Usar

Usa este recurso cuando:
- Autenticas llamadas API de servicio a servicio
- Aseguras que payloads de webhooks no han sido alterados
- Implementas autenticación de API keys sin la complejidad de OAuth
- Verificas integridad de requests a través de redes no confiables

## Solución

### Firma HMAC-SHA256 (Node.js)

\`\`\`javascript
const crypto = require('crypto');

function signRequest(method, path, body, timestamp, secret) {
  const payload = method.toUpperCase() + path + timestamp + JSON.stringify(body);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequest(method, path, body, timestamp, signature, secret) {
  const expected = signRequest(method, path, body, timestamp, secret);
  // Comparación en tiempo constante
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
\`\`\`

### Ejemplo Cliente-Servidor (Python)

\`\`\`python
import hmac
import hashlib
import time

def sign_request(method: str, path: str, body: bytes, secret: str) -> str:
    timestamp = str(int(time.time()))
    message = f"{method.upper()}{path}{timestamp}{body.decode()}"
    signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature, timestamp

# Cliente
signature, ts = sign_request("POST", "/api/orders", b'{"id":1}', "my-secret")
headers = {"X-Signature": signature, "X-Timestamp": ts}

# Servidor
def verify(signature: str, timestamp: str, method, path, body, secret):
    # Rechazar requests antiguos (protección contra replay)
    if abs(int(time.time()) - int(timestamp)) > 300:
        return False
    expected, _ = sign_request(method, path, body, secret)
    return hmac.compare_digest(signature, expected)
\`\`\`

## Explicación

La seguridad de HMAC se basa en tres propiedades:

1. **Clave secreta**: Nunca transmitida; compartida out-of-band durante el onboarding
2. **Cobertura del mensaje**: La firma debe cubrir method, path, timestamp y body
3. **Protección contra replay**: Ventanas de tiempo previenen que atacantes reutilicen requests antiguos

**¿Por qué no SHA-256 plano?**
SHA-256 sin HMAC es vulnerable a ataques de extensión de longitud. HMAC usa dos pasadas anidadas de hashing que previenen esto.

## Variantes

| Algoritmo | Hash | Fortaleza | Notas |
|-----------|------|-----------|-------|
| HMAC-SHA256 | SHA-256 | 128-bit | Recomendado por defecto |
| HMAC-SHA384 | SHA-384 | 192-bit | Mayor margen de seguridad |
| HMAC-SHA512 | SHA-512 | 256-bit | Más lento; usar en contextos de alta seguridad |
| HMAC-Blake3 | Blake3 | 256-bit | Rápido; alternativa moderna |

## Mejores Prácticas

- **Incluye timestamp**: Rechaza requests más antiguos que 5 minutos para prevenir ataques de replay
- **Firma todo el request**: Method + path + timestamp + body (headers ordenados si se incluyen)
- **Usa comparación en tiempo constante**: timingSafeEqual previene ataques de timing
- **Rota secretos regularmente**: Usa versionado de claves (v1, v2) en el header de firma
- **Nunca loguees el secreto**: Loguea firmas y claves, nunca el secreto raw

## Errores Comunes

1. **Firmar solo el body**: Un atacante puede replayar un body válido con un endpoint diferente
2. **Faltar protección contra replay**: Sin timestamps, requests interceptados son válidos para siempre
3. **Usar MD5 o SHA-1**: Criptográficamente rotos; usar mínimo SHA-256
4. **Comparación de strings en lugar de timingSafeEqual**: Vulnerable a ataques de timing
5. **Almacenar secretos en variables de entorno sin encriptar**: Usa un secret manager

## Preguntas Frecuentes

**P: ¿Es HMAC mejor que JWT para auth de servicio a servicio?**
R: HMAC es más simple y stateless para servicios internos. JWT es mejor cuando necesitas claims de identidad y verificación por terceros.

**P: ¿Cómo manejo desviación de reloj entre servicios?**
R: Permite una ventana de 5 minutos y sincroniza con NTP. Rechaza requests fuera de la ventana.

**P: ¿Puedo usar el mismo secreto para múltiples clientes?**
R: No. Cada cliente debería tener un secreto único para poder revocar uno sin afectar a otros.
`
};

for (const [filePath, body] of Object.entries(articles)) {
  fillBody(filePath, body);
}

console.log('ES part 2 done.');
