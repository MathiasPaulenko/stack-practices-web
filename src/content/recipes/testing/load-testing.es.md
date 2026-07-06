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
lastUpdated: "2026-06-13"
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

**P: ¿Cuántos virtual users necesito para simular tráfico real?**
R: Modela usuarios concurrentes, no usuarios totales. Si tienes 10,000 usuarios diarios pero solo 500 activos en cualquier momento, testea con 500 VUs (más un margen de seguridad).

**P: ¿Cuál es la diferencia entre load testing y stress testing?**
R: El load testing valida comportamiento en niveles de tráfico esperados. El stress testing empuja más allá de los niveles esperados para encontrar el punto de ruptura y observar comportamiento de recuperación.

**P: ¿Puedo ejecutar load tests en CI/CD?**
R: Sí. k6 y Artillery están diseñados para esto. Corre smoke tests nocturnos (carga pequeña) y tests de regresión pre-release (carga completa) en tu pipeline.

**P: ¿Debería testear producción directamente?**
R: Solo con extrema precaución. Usa transacciones sintéticas, endpoints read-only y horas de menor tráfico. Prefiere staging para tests destructivos o write-heavy.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
