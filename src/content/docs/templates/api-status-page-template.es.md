---
contentType: docs
slug: api-status-page-template
templateType: api-status-page
title: "Plantilla de Página de Estado de API"
description: "Una plantilla para una página de estado de API pública que comunica uptime, incidentes y ventanas de mantenimiento a los consumidores."
metaDescription: "Plantilla de página de estado de API con comunicación de incidentes, ventanas de mantenimiento, definiciones de SLA y lo que funciona en reporte transparente."
difficulty: beginner
topics:
  - api
  - devops
tags:
  - api
  - status-page
  - template
  - uptime
  - incident-communication
  - sla
  - transparency
  - devops
relatedResources:
  - /docs/incident-communication-template
  - /docs/api/api-deprecation-notice-template
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Plantilla de página de estado de API con comunicación de incidentes, ventanas de mantenimiento, definiciones de SLA y lo que funciona en reporte transparente."
  keywords:
    - template
    - api
    - status-page
    - uptime
    - incident-communication

---

## Resumen

Una página de estado pública les dice a los consumidores de tu API qué está pasando antes de que abran un ticket de soporte. Reduce las solicitudes entrantes durante caídas y genera confianza a través de transparencia. Esta plantilla cubre la estructura, contenido y prácticas operacionales para mantener una página de estado que realmente ayude.

La plantilla cubre:

1. **Estructura de página** — qué secciones incluir y cómo organizarlas
2. **Comunicación de incidentes** — plantillas para incidentes activos y actualizaciones post-incidente
3. **Definiciones de severidad** — niveles estandarizados para que los consumidores entiendan el impacto
4. **Reporte de SLA** — cómo presentar métricas de uptime y tiempo de respuesta
5. **Ventanas de mantenimiento** — cómo programar y comunicar downtime planificado

## Plantilla de Estructura de Página

```html
<!-- Layout de Página de Estado -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estado de [Producto]</title>
    <!-- Debe estar en un dominio/infraestructura separada -->
</head>
<body>
    <header>
        <h1>Estado de [Producto]</h1>
        <p>Estado en tiempo real de los servicios y APIs de [Producto].</p>
        <!-- Botones de suscripción: Email, RSS, Slack, Webhook -->
        <nav>
            <a href="#current">Estado Actual</a>
            <a href="#history">Historial de Incidentes</a>
            <a href="#uptime">Métricas de Uptime</a>
            <a href="#maintenance">Mantenimiento Programado</a>
        </nav>
    </header>

    <main>
        <!-- Sección de Estado Actual -->
        <section id="current">
            <h2>Estado Actual</h2>
            <!-- Banner de estado general -->
            <div class="status-banner operational">
                Todos los sistemas operacionales
            </div>
            <!-- Estado por servicio -->
            <div class="service-list">
                <div class="service">
                    <span class="name">API Gateway</span>
                    <span class="status operational">Operacional</span>
                </div>
                <div class="service">
                    <span class="name">Servicio de Autenticación</span>
                    <span class="status operational">Operacional</span>
                </div>
                <div class="service">
                    <span class="name">Base de Datos (Primaria)</span>
                    <span class="status operational">Operacional</span>
                </div>
                <div class="service">
                    <span class="name">Dashboard Web</span>
                    <span class="status operational">Operacional</span>
                </div>
            </div>
        </section>

        <!-- Sección de Métricas de Uptime -->
        <section id="uptime">
            <h2>Uptime (90 días)</h2>
            <div class="uptime-grid">
                <!-- 90 barras diarias, coloreadas por estado -->
                <div class="uptime-bar operational" title="2026-07-04: 100% uptime"></div>
                <div class="uptime-bar operational" title="2026-07-03: 100% uptime"></div>
                <div class="uptime-bar degraded" title="2026-07-02: 99.2% uptime"></div>
                <!-- ... 87 barras más ... -->
            </div>
            <table class="uptime-table">
                <tr><th>Servicio</th><th>Uptime 90 días</th><th>SLA objetivo</th></tr>
                <tr><td>API Gateway</td><td>99.98%</td><td>99.9%</td></tr>
                <tr><td>Autenticación</td><td>99.99%</td><td>99.95%</td></tr>
                <tr><td>Base de Datos</td><td>99.97%</td><td>99.9%</td></tr>
            </table>
        </section>

        <!-- Sección de Historial de Incidentes -->
        <section id="history">
            <h2>Historial de Incidentes</h2>
            <article class="incident resolved">
                <h3>Pico de latencia en base de datos</h3>
                <p class="date">2 de Julio, 2026 — Resuelto</p>
                <p class="severity">Severidad: Media</p>
                <div class="updates">
                    <div class="update">
                        <time>14:32 UTC</time>
                        <p>Investigando latencia elevada en base de datos del cluster primario.</p>
                    </div>
                    <div class="update">
                        <time>14:45 UTC</time>
                        <p>Causa identificada: query analítica de larga duración bloqueando escrituras.</p>
                    </div>
                    <div class="update">
                        <time>15:10 UTC</time>
                        <p>Terminada la query bloqueante. Latencia volviendo a la normalidad.</p>
                    </div>
                    <div class="update">
                        <time>15:30 UTC</time>
                        <p>Resuelto. Latencia de vuelta al baseline. Agregando timeout de query para prevenir recurrencia.</p>
                    </div>
                </div>
            </article>
        </section>

        <!-- Sección de Mantenimiento Programado -->
        <section id="maintenance">
            <h2>Mantenimiento Programado</h2>
            <article class="maintenance upcoming">
                <h3>Migración de base de datos a v16</h3>
                <p class="date">15 de Julio, 2026, 02:00–04:00 UTC</p>
                <p>Impacto: Errores breves de API durante failover (esperado < 2 minutos).</p>
                <p>Haremos failover a la réplica, upgrade del primario, luego failback.</p>
            </article>
        </section>
    </main>
</body>
</html>
```

## Plantillas de Actualización de Incidentes

### Incidente activo — post inicial

```markdown
## [Título del Incidente]

**Severidad:** [Crítica / Alta / Media / Baja]
**Inicio:** [timestamp UTC]
**Servicios afectados:** [lista]

Estamos investigando [breve descripción del problema]. [Qué están experimentando los usuarios].

Próxima actualización: [hora, típicamente 15-30 minutos desde ahora].
```

### Incidente activo — actualización de investigación

```markdown
**Actualización [N]** — [timestamp UTC]

[Lo que sabemos hasta ahora]. [Lo que estamos haciendo al respecto]. [Tiempo de resolución esperado si se conoce, o "sin ETA aún"].

Próxima actualización: [hora].
```

### Incidente activo — resolución

```markdown
**Resuelto** — [timestamp UTC]

[Qué pasó]. [Qué hicimos para arreglarlo]. [Qué estamos haciendo para prevenir recurrencia].

Un postmortem completo se publicará en [3-5 días hábiles] en [link].
```

## Definiciones de Severidad

| Severidad | Significado | Impacto en usuarios | Tiempo de respuesta | Frecuencia de update |
|-----------|-------------|---------------------|---------------------|----------------------|
| Crítica | Caída mayor | Servicio no disponible o pérdida de datos para todos | Inmediato | Cada 15 minutos |
| Alta | Degradación significativa | Feature principal roto o muy lento para muchos | < 15 minutos | Cada 30 minutos |
| Media | Degradación parcial | Feature no crítico lento o no disponible, workaround existe | < 1 hora | Cada 1 hora |
| Baja | Issue menor | Problema cosmético o edge-case, impacto mínimo | < 4 horas | Al resolver |

## Definiciones de SLA

```markdown
## Acuerdos de Nivel de Servicio

### API Gateway
- **Objetivo de uptime:** 99.9% mensual (~43 minutos de downtime permitido)
- **Objetivo de tiempo de respuesta:** p95 < 200ms, p99 < 500ms
- **Medición:** Checks sintéticos cada 60 segundos desde 3 regiones

### Servicio de Autenticación
- **Objetivo de uptime:** 99.95% mensual (~22 minutos de downtime permitido)
- **Objetivo de tiempo de respuesta:** p95 < 150ms
- **Medición:** Checks sintéticos de login cada 30 segundos

### Base de Datos
- **Objetivo de uptime:** 99.9% mensual
- **Objetivo de lag de replicación:** < 1 segundo sostenido, < 5 segundos burst
- **Medición:** Monitoreo continuo via pg_stat_replication

### Excluido del SLA
- Ventanas de mantenimiento planificado anunciadas con 7+ días de anticipación
- Eventos de fuerza mayor (caída de región del cloud provider)
- Issues causados por errores de configuración del lado del cliente
```

## Lo que funciona

- **Actualiza cada 15-30 minutos durante incidentes activos** — El silencio hace que los consumidores asuman lo peor
- **Publica mantenimientos programados con 7 días de anticipación** — Da tiempo a los consumidores para preparar alternativas
- **Usa un dominio separado** — `status.example.com` no debe depender de la API que monitorea. Consulta [Circuit Breaker](/patterns/design/circuit-breaker-pattern) para patrones de resiliencia.
- **Ofrece suscripciones RSS / email / Slack** — Permite que los consumidores elijan cómo recibir actualizaciones
- **Muestra uptime histórico** — Un gráfico de 30 o 90 días genera confianza
- **Sé honesto sobre rendimiento degradado** — No marques un servicio como "operacional" cuando la latencia es 10x la normal. Consulta [Performance Optimization](/guides/performance/performance-optimization-guide) para métricas de monitoreo.
- **Enlaza a [postmortems de incidentes](/docs/templates/incident-postmortem-template)** — La transparencia después de la resolución genera confianza a largo plazo
- **Define niveles de severidad públicamente** — Los consumidores necesitan entender qué significa "severidad alta" para su integración
- **Incluye estado por servicio, no solo general** — Un banner único de "todo operacional" oculta degradaciones parciales
- **Timestamp en cada actualización en UTC** — Los consumidores en distintas timezones necesitan una referencia consistente

## Errores Comunes

- Usar la misma infraestructura que la API para la página de estado — si la API cae, la página de estado también
- Marcar incidentes como resueltos demasiado pronto — espera hasta que las métricas confirmen recuperación por al menos 10 minutos
- Borrar o editar el historial de incidentes resueltos — los consumidores necesitan referenciar incidentes pasados
- Actualizaciones vagas como "estamos investigando" — comparte lo que sabes y lo que no sabes
- No definir niveles de severidad — los consumidores no pueden evaluar el impacto sin definiciones claras
- Esperar que nadie note — los consumidores monitorean tu API con sus propios checks; lo sabrán
- Olvidar postear el link del postmortem después de la resolución — el follow-through importa
- No testear la página de estado durante drills — si nunca la usaste bajo presión, fallará cuando la necesites

## Variantes

### Páginas de estado hospedadas (Statuspage.io, BetterStack, Instatus)

Servicios hospedados manejan la infraestructura, monitoreo de uptime y gestión de suscriptores. Cuestan dinero pero eliminan el riesgo de que tu página de estado caiga con tu API. Úsalos si no quieres construir y mantener infraestructura separada.

### Self-hosted (Cachet, Upptime)

Opciones self-hosted como [Cachet](https://cachethq.io) o [Upptime](https://upptime.js.org) corren en GitHub Pages o un host estático simple. Son gratuitas pero requieren setup y mantenimiento. Upptime usa GitHub Actions para monitoreo y almacena historial en el repositorio.

### Páginas de estado solo internas

Para servicios internos, usa una página más simple sin suscripciones ni historial público de incidentes. Un canal de Slack con alertas automatizadas suele bastar. Consulta la [Guía de Alert Management](/guides/observability/alert-management-guide) para estrategias de alerting.

## Preguntas Frecuentes

### ¿La página de estado debería ser pública o solo interna?

Pública para APIs orientadas a clientes. Solo interna para servicios puramente internos. Las páginas de estado públicas reducen tickets de soporte y demuestran madurez operacional.

### ¿Con qué frecuencia debo actualizar durante un incidente?

Cada 15-30 minutos, incluso si no hay información nueva. Un mensaje como "Seguimos investigando la causa raíz, próxima actualización a las 15:00 UTC" es mejor que silencio.

### ¿Qué debo hacer si un incidente excede el SLA?

Comunícate proactivamente. No esperes a que los clientes se quejen. Consulta la [Plantilla de Comunicación de Incidentes](/docs/templates/incident-postmortem-template) para actualizaciones estructuradas. Emite un resumen explicando qué pasó, por qué excedió el SLA y qué medidas se están tomando para prevenir recurrencias. Algunas empresas ofrecen créditos de servicio por incumplimientos de SLA.

### ¿Debería mostrar métricas de tiempo de respuesta en la página de estado?

Sí, si tu API tiene SLAs de latencia. Muestra tiempos de respuesta p95 y p99 junto al uptime. La degradación de latencia afecta a los consumidores incluso cuando la API técnicamente está "arriba".

### ¿Cómo manejo estado multi-región?

Lista cada región por separado (us-east, eu-west, ap-southeast) con su propio indicador de estado. Un incidente en una región no debería mostrar todo el servicio como caído. Los consumidores que usan una región específica necesitan saber si su región está afectada.

### ¿Qué pasa si la página de estado misma cae?

Usa un canal de estado secundario (ej: una cuenta dedicada de Twitter/X o un canal de Slack) como fallback. Documenta la URL de fallback en la página de estado principal y en tu documentación de API. El fallback debe estar en infraestructura completamente separada.

### ¿Debería publicar ventanas de mantenimiento incluso para deployments zero-downtime?

Sí. Incluso los deployments zero-downtime pueden causar picos breves de latencia o errores menores. Publicar una ventana de mantenimiento con "impacto esperado: ninguno" establece expectativas y da a los consumidores una ventana para evitar deployear sus propios cambios simultáneamente.
