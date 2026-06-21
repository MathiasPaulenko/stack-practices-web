---
contentType: docs
slug: bug-triage-template
title: "Plantilla de Triaje de Bugs"
description: "Plantilla para clasificar y enrutar reportes de bugs por severidad e impacto."
metaDescription: "Usa esta plantilla de triaje de bugs para clasificar reportes por severidad, asignar prioridad y enrutarlos al equipo de ingeniería correcto."
difficulty: beginner
topics:
  - devops
tags:
  - devops
  - bug
  - triage
  - severity
  - operations
  - template
relatedResources:
  - /docs/runbook-template
  - /docs/auto-scaling-policy-template
  - /docs/backup-and-restore-template
  - /docs/cloud-cost-allocation-template
  - /docs/cross-region-failover-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de triaje de bugs para clasificar reportes por severidad, asignar prioridad y enrutarlos al equipo de ingeniería correcto."
  keywords:
    - devops
    - bug
    - triaje
    - severidad
    - operaciones
    - plantilla
---
## Visión General

No todos los bugs son iguales. Un problema cosmético en un interruptor de modo oscuro no es lo mismo que un bug de pérdida de datos en un flujo de pago. Sin un sistema de triaje, los problemas críticos se acumulan en backlogs mientras los ingenieros persiguen ruido de baja prioridad. Esta plantilla crea un sistema de clasificación y enrutamiento repetible para que los bugs correctos lleguen a los equipos correctos con la prioridad adecuada.

## Cuándo Usar

Usa este recurso cuando:
- Tu backlog de bugs crece más rápido de lo que tu equipo puede cerrar ítems
- Los problemas críticos de producción están enterrados bajo solicitudes de características menores
- Múltiples equipos comparten una cola de bugs y la propiedad no está clara

## Solución

```markdown
# Triaje de Bugs: `<Proyecto / Producto>`

## 1. Clasificación por Severidad

| Severidad | Impacto | Ejemplos | Tiempo de Respuesta | Objetivo de Resolución |
|-----------|---------|----------|---------------------|------------------------|
| S1 — Crítico | Servicio inutilizable o pérdida de datos | Pago fallando, login roto, corrupción de datos | 15 min | 4 horas |
| S2 — Alto | Característica principal rota; existe workaround | Búsqueda caída, exportación de informes falla | 2 horas | 24 horas |
| S3 — Medio | Característica degradada pero funcional | Páginas lentas, ordenamiento incorrecto | 24 horas | 1 semana |
| S4 — Bajo | Cosmético o inconveniente menor | Botón desalineado, typo, color incorrecto | 1 semana | Próximo sprint |

## 2. Preguntas de Triaje

Responde estas preguntas para cada reporte de bug entrante:

1. **Reproducibilidad**
   - [ ] ¿El bug puede reproducirse consistentemente?
   - [ ] Si es intermitente, ¿cuál es la frecuencia aproximada?
   - [ ] ¿Afecta a un segmento específico de usuarios, dispositivo o navegador?

2. **Impacto**
   - [ ] ¿Bloquea un recorrido principal del usuario (registro, compra, login)?
   - [ ] ¿Afecta a un solo usuario, un subconjunto o todos?
   - [ ] ¿Existe un workaround? ¿Qué tan difícil es?

3. **Regulatorio / Seguridad**
   - [ ] ¿Expone PII o datos sensibles?
   - [ ] ¿Viola un requisito de cumplimiento (PCI, SOC 2, GDPR)?

4. **Recencia**
   - [ ] ¿Apareció este bug después de un release reciente?
   - [ ] ¿Es una regresión de un issue previamente corregido?

## 3. Reglas de Enrutamiento

| Severidad | Asignado | Canal | Escalamiento |
|-----------|----------|-------|--------------|
| S1 | Ingeniero de guardia + Líder de equipo | Página + Sala de guerra | VP de Ingeniería después de 1 hora |
| S2 | Líder de equipo | Slack #incidents | Manager después de 4 horas |
| S3 | Siguiente ingeniero disponible | JIRA / Linear | Líder de equipo si no se resuelve en 3 días |
| S4 | Backlog | JIRA / Linear | Re-evaluar si se acumulan duplicados |

## 4. Registro de Triaje

| Fecha | ID de Bug | Reportado Por | Severidad Inicial | Severidad Final | Responsable | Razón del Cambio |
|-------|-----------|---------------|-------------------|-----------------|-------------|------------------|
| | | | | | | |

## 5. Detección de Duplicados

| Verificación | Método |
|--------------|--------|
| Búsqueda por palabras clave | Buscar en JIRA con mensaje de error / componente |
| Coincidencia de stack trace | Comparar firmas de stack trace |
| Superposición de impacto | Verificar si múltiples reportes referencian el mismo flujo |
| Correlación con release | Filtrar bugs reportados dentro de 48h de un despliegue |
```

## Explicación

La plantilla fuerza una **clasificación estructurada** antes del enrutamiento. Muchos equipos omiten el triaje y asignan bugs a quien esté disponible, lo que significa que los issues críticos esperan detrás de tickets de baja prioridad. La matriz de severidad usa **impacto en el usuario** y **riesgo para el negocio** como ejes principales, no solo "qué tan difícil es arreglarlo". Un cambio de CSS de una línea que bloquea el checkout es S1; una fuga de memoria compleja que afecta al 0.1% de usuarios es S3. Las reglas de enrutamiento evitan que los bugs de alta severidad se traten como trabajo normal de backlog.

## Variantes

| Contexto | Enfoque de Clasificación | Enfoque de Enrutamiento |
|----------|-------------------------|------------------------|
| Aplicación móvil | Versión de SO, modelo de dispositivo, reseñas de tienda | Crashlytics agrupa automáticamente por stack trace |
| API / backend | Endpoint, tasa de error, pico de latencia | Alert manager enruta por propietario del servicio |
| SaaS B2B | Tamaño de tenant, valor de contrato, SLA | Éxito del cliente marca bugs de clientes de alto valor |
| Juego / consumidor | Impacto en monetización, segmento de jugador | Equipo de live ops triaja durante eventos |
| Bug de seguridad | Puntaje CVSS, explotabilidad, exposición | Directo al equipo de seguridad; omite la cola estándar |

## Mejores Prácticas

1. Triajea cada bug nuevo dentro de 24 horas de reportado; triaje viejo es triaje fallido
2. Usa una única fuente de verdad (JIRA, Linear, GitHub Issues) para que los duplicados sean detectables
3. Requiere un caso de prueba reproducible antes de aceptar S2 o mayor; bugs críticos no confirmados desperdician tiempo de ingeniería
4. Re-evalúa la severidad si emerge nueva información (por ejemplo, "afecta a todos los usuarios" y no "a algunos")
5. Cierra bugs "no se arreglará" explícitamente con una justificación; el silencio crea backlogs de tickets zombie

## Errores Comunes

1. Clasificar bugs por esfuerzo en lugar de impacto (arreglo fácil ≠ alta prioridad)
2. Dejar que los reportadores establezcan su propia severidad; los usuarios siempre piensan que su bug es crítico
3. No rastrear decisiones de triaje, llevando a los mismos debates cada semana
4. Enrutar bugs de seguridad a través de la cola estándar en lugar de directamente a seguridad
5. Ignorar duplicados; diez reportes del mismo bug parecen diez problemas separados

## Preguntas Frecuentes

### ¿Qué pasa si un reporte de bug es vago o le faltan pasos de reproducción?

Solicita la información estándar: pasos para reproducir, comportamiento esperado vs real, entorno (navegador, SO, versión), capturas de pantalla o grabaciones, y logs de error. Si el reportador no puede proporcionar esto dentro de 48 horas, reduce a S4 o cierra como "necesita info". No dejes que reportes incompletos bloqueen el triaje de bugs accionables.

### ¿Cómo evito que el triaje se convierta en un cuello de botella?

Rota un ingeniero de "deber de triaje" cada semana. Esta persona revisa todos los bugs entrantes durante 30 minutos cada mañana, clasifica, enruta y solicita información faltante. El deber de triaje no debe ser la misma persona que el de guardia. Con el tiempo, automatiza: usa reportes de crashes para pre-clasificar por stack trace, y reglas de bots para auto-enrutar a propietarios conocidos de componentes.

### ¿Deben las solicitudes de características ser triajeadas junto con bugs?

No. Mantén bugs y solicitudes de características en colas separadas con objetivos de SLA distintos. Las solicitudes de características requieren input de producto; los bugs requieren input de ingeniería. Mezclarlos genera confusión sobre propiedad y prioridad. Si un usuario reporta un bug que en realidad es una característica faltante, re-etiquétalo y muévelo al backlog de producto con una explicación clara.
