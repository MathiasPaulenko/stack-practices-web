---
contentType: docs
slug: api-testing-strategy-template
title: "Plantilla de Estrategia de Testing de API"
description: "Una plantilla para planificar tests de contrato, integración y carga para APIs."
metaDescription: "Usa esta plantilla de estrategia de testing de API para planificar tests de contrato, integración, carga y experimentos de caos para tus APIs."
difficulty: intermediate
topics:
  - testing
tags:
  - testing
  - api
  - contract
  - integration
  - load
  - template
relatedResources:
  - /docs/load-test-report-template
  - /recipes/load-testing-k6
  - /docs/microservice-contract-template
  - /guides/cicd-pipeline-guide
  - /guides/test-driven-development-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de estrategia de testing de API para planificar tests de contrato, integración, carga y experimentos de caos para tus APIs."
  keywords:
    - testing
    - api
    - contrato
    - integración
    - carga
    - plantilla
---
## Visión General

Las APIs evolucionan continuamente. Un cambio en un endpoint puede romper consumidores, degradar rendimiento o introducir agujeros de seguridad. Una estrategia de testing por capas detecta estos problemas en diferentes etapas: los tests de contrato previenen cambios rotos, los tests de integración verifican comportamiento, y los tests de carga validan rendimiento bajo presión.

## Cuándo Usar

Usa este recurso cuando:
- Diseñas cobertura de testing para una nueva API o microservicio
- Auditas por qué bugs llegan a producción a pesar de tener unit tests
- Onboarding de un pipeline CI/CD que incluye gates de validación de API

## Solución

```markdown
# Estrategia de Testing de API: `<Nombre de la API>`

## 1. Pirámide de Testing para APIs

| Capa | Alcance | Ejemplos de Herramientas | Frecuencia | Responsable |
|------|---------|--------------------------|------------|-------------|
| Contrato | Schema de request/response | Pact, Spring Cloud Contract | Cada commit | Productor de API |
| Unitario | Funciones individuales del handler | Jest, pytest, JUnit | Cada commit | Desarrollador |
| Integración | API + base de datos + dependencias | Testcontainers, supertest | Cada PR | Desarrollador |
| E2E | Journey completo del usuario | Postman, Cypress | Nightly | QA |
| Carga | Rendimiento bajo tráfico | k6, Gatling, Locust | Semanal / release | SRE |
| Caos | Resiliencia ante fallas | Gremlin, Chaos Monkey | Mensual | Plataforma |

## 2. Tests de Contrato

### 2.1. Contratos Consumer-Driven

- [ ] Los tests del consumidor publican expectativas a un broker (Pact Broker)
- [ ] El proveedor verifica todos los contratos de consumidores en CI antes de mergear
- [ ] Los cambios rotos disparan un bump de versión mayor y notificación a consumidores
- [ ] La matriz de contratos está documentada: qué consumidor usa qué versión del proveedor

### 2.2. Validación de OpenAPI

- [ ] La especificación OpenAPI es la única fuente de verdad para schemas de request/response
- [ ] CI genera tests desde OpenAPI y valida contra la implementación
- [ ] Los cambios de schema requieren actualizar la spec primero, luego el código

## 3. Tests de Integración

### 3.1. Alcance del Test

- [ ] Happy path: request válido retorna respuesta esperada
- [ ] Paths de error: input inválido retorna 4xx correcto con mensaje útil
- [ ] Paths de auth: token ausente/inválido retorna 401, scope insuficiente retorna 403
- [ ] Dependencia de estado: testear con base de datos real (Testcontainers) o equivalente en memoria
- [ ] Idempotencia: repetir el mismo request produce el mismo resultado

### 3.2. Datos de Test

| Estrategia | Usar Cuando | Notas |
|------------|------------|-------|
| Factory pattern | La mayoría de casos | Generar entidades programáticamente, limpiar después del test |
| Snapshot fixtures | Datos de referencia estables | Versionar respuestas JSON esperadas |
| Base de staging compartida | Integración cross-team | Riesgo de tests flaky por mutación de datos |

## 4. Tests de Carga

### 4.1. Escenarios

| Escenario | Objetivo | Métrica |
|-----------|----------|---------|
| Línea base | Tráfico constante por 10 minutos | p95 latencia < presupuesto |
| Pico | 10x tráfico en 30 segundos | Sin errores, autoscaling dispara |
| Remojo | Tráfico sostenido por 2 horas | Memoria estable, sin leaks de conexiones |
| Estrés | Incrementar tráfico hasta falla | Identificar punto de ruptura de forma segura |

### 4.2. Checklist de Test de Carga

- [ ] El ambiente replica producción (mismos tamaños de instancia, specs de base de datos)
- [ ] El volumen de datos coincide con producción (o escalado proporcionalmente)
- [ ] Los scripts de test están parametrizados para evitar cache hits en requests idénticas
- [ ] Los dashboards de monitoreo están activos durante el test
- [ ] Plan de rollback si producción se ve accidentalmente impactada

## 5. Integración CI/CD

| Etapa | Tipo de Test | Condición de Gate |
|-------|--------------|-------------------|
| Pre-commit | Lint + unitarios | 100% pass, umbral de cobertura |
| Build de PR | Integración + contrato | 100% pass, sin nuevos tests flaky |
| Nightly | E2E + carga (línea base) | 100% pass, latencia dentro de 10% de línea base |
| Pre-release | Carga completa + remojo | 100% pass, SLOs cumplidos |
| Post-release | Smoke + sintéticos | 100% pass por 30 minutos |

## 6. Remediación de Tests Flaky

| Síntoma | Causa Probable | Solución |
|---------|----------------|----------|
| Fallos aleatorios a la misma hora diaria | Reset de base de staging compartida | Usar base de datos de test aislada |
| Timeouts en CI pero no localmente | CI más lento, falta retry | Aumentar timeout o mockear dependencia lenta |
| Pass/fail dependiente del orden | Efectos secundarios entre tests | Resetear estado antes de cada test |
| Heisenbug (desaparece al observarlo) | Race condition | Agregar sincronización o evitar estado mutable compartido |
```

## Explicación

Los tests de contrato son el **ciclo de retroalimentación más rápido** para cambios de API porque se ejecutan en milisegundos y detectan inconsistencias de schema antes del despliegue. Los tests de integración verifican que tu código funciona con dependencias reales (base de datos, cola de mensajes) sin la sobrecarga de un suite E2E completo. Los tests de carga no se tratan de pasar un número; revelan fugas de recursos, agotamiento de conexiones y misconfiguraciones de autoscaling que solo aparecen bajo carga sostenida.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Serverless | Enfatizar cold start + tests de concurrencia | Localstack o ambiente dev en la nube |
| Event-driven / async | Testear productor + consumidor por separado | Usar bus de mensajes de test, verificar consistencia eventual |
| Monolito legacy | Envolver API en tests de contrato antes de refactorizar | Pact con monolito como proveedor |

## Mejores Prácticas

1. Tratar tests de contrato fallidos como fallos de build, no como advertencias
2. Ejecutar tests de integración contra la misma versión de base de datos usada en producción
3. Parametrizar tests de carga con distribuciones reales de requests, no tráfico uniforme
4. Etiquetar tests flaky y repararlos dentro de un sprint; no dejarlos acumularse
5. Almacenar resultados de tests y líneas base de rendimiento en una base de datos time-series para análisis de tendencias

## Errores Comunes

1. Testear solo el happy path y asumir que los errores "simplemente funcionan"
2. Ejecutar tests de carga en ambientes que difieren de producción
3. Usar datos de producción en tests sin anonimizar
4. Permitir que tests dependan de servicios externos fuera de tu control
5. Saltear tests de contrato porque "ambos equipos están en la misma sala"

## Preguntas Frecuentes

### ¿Cuánta cobertura de test es suficiente?

100% de cobertura de tests de contrato. 80%+ de cobertura de integración para paths críticos. Test de carga para todos los endpoints que reciben > 1% del tráfico. Test E2E para los 3 user journeys principales. No persigas 100% de cobertura de líneas a expensas de aserciones significativas.

### ¿Debería mockear todos los servicios externos?

Mockea servicios que no poseas o controles (pasarelas de pago, APIs de terceros). Usa instancias reales para servicios que poseas que sean rápidos y confiables (servicio interno de auth, base de datos local). Esto da confianza sin flakiness.

### ¿Cuál es la diferencia entre tests de contrato e integración?

Los tests de contrato verifican que el schema de request/response coincide con el acuerdo entre consumidor y proveedor. Los tests de integración verifican que tu código de aplicación funciona correctamente con dependencias reales. Los tests de contrato son rápidos y enfocados en schema; los de integración son más lentos y enfocados en comportamiento.
