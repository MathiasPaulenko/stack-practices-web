---
contentType: recipes
slug: real-user-monitoring
title: "Monitoreo de Usuarios Reales (RUM)"
description: "Monitorea experiencias reales de usuarios con Core Web Vitals, session replay y análisis de performance para identificar cuellos de botella del mundo real."
metaDescription: "Monitoreo de usuarios reales RUM: Core Web Vitals, session replay, análisis de performance, tracking de errores JavaScript y optimización de experiencia de usuario."
difficulty: intermediate
topics:
  - observability
tags:
  - real-user-monitoring
  - observability
  - performance
  - frontend
relatedResources:
  - /recipes/grafana-dashboards-observability
  - /recipes/prometheus-monitoring-alerts
  - /recipes/distributed-tracing
  - /recipes/log-aggregation
  - /recipes/metrics-collection
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Monitoreo de usuarios reales RUM: Core Web Vitals, session replay, análisis de performance, tracking de errores JavaScript y optimización de experiencia de usuario."
  keywords:
    - real-user-monitoring
    - observability
    - performance
    - frontend
---
## Visión General

Real User Monitoring (RUM) captura datos de performance de sesiones reales de browser — no tests sintéticos ni métricas server-side. Revela cómo [Core Web Vitals](/recipes/performance/web-performance), errores JavaScript y latencias de API varían a través de dispositivos, redes y geografías. A diferencia de tests de lab que corren en condiciones ideales, RUM expone la experiencia de usuarios en redes 3G, dispositivos de gama baja y browsers antiguos.

## Cuándo Usar

Usa este recurso cuando:
- Los scores de Lighthouse basados en lab no coinciden con [quejas de performance](/recipes/performance/web-performance) del mundo real
- Necesitas correlacionar métricas de negocio (conversión, bounce rate) con velocidad de página
- Debuggeas issues de performance que solo afectan browsers o regiones específicas
- Priorizas esfuerzos de optimización basados en impacto de usuario real, no suposiciones

## Solución

### Web Vitals Library (JavaScript)

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    id: metric.id,
    rating: metric.rating, // 'good', 'needs-improvement', 'poor'
    delta: metric.delta,
    navigationType: metric.navigationType,
    page: window.location.pathname
  });

  // Usar navigator.sendBeacon para confiabilidad durante unload de página
  (navigator.sendBeacon && navigator.sendBeacon('/analytics/vitals', body)) ||
    fetch('/analytics/vitals', { body, method: 'POST', keepalive: true });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Session Replay Integration (Sentry)

```javascript
import * as Sentry from '@sentry/browser';
import { Replay } from '@sentry/replay';

Sentry.init({
  dsn: 'https://abc@sentry.io/1',
  integrations: [
    new Replay({
      maskAllText: true,      // Mask text sensible
      blockAllMedia: true,    // Bloquear imágenes/videos
    })
  ],
  tracesSampleRate: 0.1,    // 10% de transacciones
  replaysSessionSampleRate: 0.01, // 1% de sesiones
  replaysOnErrorSampleRate: 1.0   // 100% de sesiones con error
});
```

### Custom Performance Observer

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('TTFB:', entry.responseStart);
      console.log('FCP:', entry.responseEnd);
      console.log('DOM Ready:', entry.domContentLoadedEventEnd);
    }
    
    if (entry.entryType === 'resource') {
      if (entry.duration > 1000) {
        console.warn('Recurso lento:', entry.name, entry.duration);
      }
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'resource', 'paint'] });
```

## Explicación

**RUM vs. monitoreo sintético**:

| Aspecto | RUM | Sintético |
|---------|-----|-----------|
| Fuente de datos | Usuarios reales | Bots programados |
| Red | Variable (3G a 5G) | Controlada (rápida) |
| Diversidad de dispositivo | Rango completo | Usualmente desktop |
| Geográfico | Ubicaciones reales de usuarios | Data center |
| Caso de uso | Entender la realidad | Detección de regresión baseline |

**Métricas clave**:
- **LCP**: Elemento visible más grande — hero image, heading
- **INP**: Latencia de interacción — click de botón a update visual
- **CLS**: Layout shifts — ads, imágenes, fonts causando saltos
- **TTFB**: Tiempo de respuesta del servidor — hosting + backend performance. Consulta [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
- **FCP**: First content paint — primer texto o imagen visible

## Variantes

| Herramienta | Tipo | Features Destacadas |
|-------------|------|---------------------|
| Google CrUX | Solo Chrome | Dataset real-world más grande; field data |
| New Relic Browser | Comercial | Session traces; tracking de errores JS |
| Datadog RUM | Comercial | Correlación con APM; session replay |
| Sentry | Open source | Error + performance + replay combinados |
| SpeedCurve | Comercial | Benchmarking competitivo; filmstrips |
| web-vitals.js | Open source | Implementación de referencia de Google |

## Mejores Prácticas

- **Samplea inteligentemente**: 100% de sampling sobrecarga backends; 5-10% es usualmente suficiente
- **Captura contexto**: Tipo de dispositivo, velocidad de conexión y país explican variación
- **Alerta en percentiles, no promedios**: El performance P95 es lo que experimentan usuarios frustrados
- **Correlaciona con métricas de negocio**: Grafica tasa de conversión vs. LCP para justificar budgets de optimización. Consulta [recolección de métricas](/recipes/observability/metrics-collection).
- **Respeta privacidad**: Mask PII en session replay; cumple con GDPR/CCPA para telemetría

## Errores Comunes

1. **Solo monitorear homepage**: Las páginas de producto y checkout a menudo tienen peor performance
2. **Ignorar navegaciones SPA**: Las single-page apps necesitan medición custom de LCP/FID para cambios de ruta. Considera [server-side rendering](/recipes/performance/spa-code-splitting-lazy).
3. **Sin correlación con errores**: Una página lenta que también tira errores JS necesita priorización diferente. Consulta [manejo de errores](/recipes/api/handle-errors).
4. **Alertar en promedios**: Un LCP promedio de 2s oculta que 20% de usuarios ven cargas de 8s+
5. **Sin acción sobre datos**: Coleccionar RUM sin sprints de optimización desperdicia el esfuerzo de instrumentación

## Preguntas Frecuentes

**P: ¿RUM ralentiza mi sitio?**
R: Negligiblemente. La librería web-vitals es <1KB. Los beacons se envían después de que la página es interactiva.

**P: ¿Debería usar RUM o monitoreo sintético?**
R: Ambos. Sintético para detección de regresión baseline. RUM para entender la [experiencia real de usuario](/recipes/performance/web-performance).

**P: ¿Cómo manejo ad blockers?**
R: Sirve RUM desde tu propio dominio (first-party), no de terceros. Los ad blockers targetean dominios de analytics conocidos.
