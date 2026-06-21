---
contentType: docs
slug: microservice-contract-template
title: "Plantilla de Contrato de Microservicios"
description: "Una plantilla para definir contratos de servicio y acuerdos de API entre microservicios."
metaDescription: "Usa esta plantilla de contrato de microservicios para documentar acuerdos de API, SLAs, políticas de versionado y procedimientos de cambios incompatibles."
difficulty: intermediate
topics:
  - architecture
tags:
  - architecture
  - microservices
  - api
  - contract
  - template
relatedResources:
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
  - /guides/rest-api-design-guide
  - /guides/microservices-architecture-guide
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de contrato de microservicios para documentar acuerdos de API, SLAs, políticas de versionado y procedimientos de cambios incompatibles."
  keywords:
    - arquitectura
    - microservicios
    - api
    - contrato
    - plantilla
---

## Visión General

Los microservicios dependen de contratos explícitos para comunicarse de forma confiable. Sin un acuerdo escrito, los equipos realizan cambios incompatibles que rompen consumidores en tiempo de ejecución. Esta plantilla documenta límites de API, SLAs, reglas de versionado y procedimientos de cambios incompatibles entre servicios.

## Cuándo Usar

Usa este recurso cuando:
- Un nuevo servicio necesita exponer una API a otros servicios internos
- Dos equipos acuerdan un punto de integración y quieren formalizar expectativas
- Revisar o renegociar un límite de servicio existente

## Solución

```markdown
# Contrato de Microservicios: `<Consumidor>` ↔ `<Proveedor>`

## 1. Partes

| Rol | Servicio | Equipo | Contacto |
|-----|----------|--------|----------|
| Proveedor | `nombre-servicio` | `@equipo` | `email / slack` |
| Consumidor | `nombre-consumidor` | `@equipo` | `email / slack` |

## 2. Especificación de API

- **Protocolo**: REST / gRPC / GraphQL / Cola de Mensajes
- **URL Base / Tema**: `https://api.internal/...` o `kafka://events/...`
- **Enlace OpenAPI / Esquema**: `link-to-spec`
- **Autenticación**: mTLS / JWT / API Key / Ninguna

## 3. Endpoints / Operaciones

| Nombre | Método / Operación | Ruta / Tema | Propósito |
|--------|--------------------|-------------|-----------|
| GetUser | GET | `/users/{id}` | Recuperar perfil de usuario |
| CreateOrder | POST | `/orders` | Enviar un nuevo pedido |
| OrderCreated | Evento | `orders.created` | Notificar sistemas downstream |

## 4. Acuerdo de Nivel de Servicio

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Disponibilidad | 99.9% | Tiempo activo mensual |
| Latencia p95 | < 200ms | Por endpoint |
| Tasa de Error | < 0.1% | Ratio 5xx / timeout |
| RPO | 1 hora | Pérdida de datos máxima aceptable |
| RTO | 30 minutos | Tiempo máximo de recuperación |

## 5. Política de Versionado

- **Versión Actual**: `v2`
- **Estrategia**: Ruta URL (`/v1/`, `/v2/`) / Header / Negociación de contenido
- **Ventana de Deprecación**: 6 meses después del lanzamiento de nueva versión
- **Aviso de Cierre**: 30 días antes de la eliminación

## 6. Cambios Incompatibles

Un cambio es incompatible si:
- Elimina un campo o endpoint
- Cambia el tipo o formato de un campo
- Ajusta reglas de validación
- Modifica la estructura de respuesta de error

**Procedimiento**:
1. Notificar a consumidores 30 días de anticipación
2. Lanzar nueva versión junto a la versión anterior
3. Monitorear uso de la versión anterior
4. Eliminar versión anterior después de la ventana de deprecación

## 7. Manejo de Errores

| Código de Error | HTTP / gRPC | Significado | Reintentable |
|-----------------|-------------|-------------|--------------|
| 400 / INVALID_ARGUMENT | Error de cliente | No |
| 429 / RESOURCE_EXHAUSTED | Límite de tasa excedido | Sí (con backoff) |
| 500 / INTERNAL | Error de servidor | Sí (con backoff) |

## 8. Escalamiento

- **P1 (interrupción)**: Llamar on-call dentro de 15 minutos
- **P2 (degradado)**: Alerta en canal de Slack, responder dentro de 1 hora
- **P3 (pregunta)**: Abrir ticket, responder dentro de 1 día hábil
```

## Explicación

El contrato actúa como una **fuente de verdad compartida** entre los equipos proveedor y consumidor. Elimina ambigüedad sobre quién es responsable de qué, qué tan rápido debe responder y qué ocurre cuando algo falla. La política de versionado evita eliminaciones sorpresa. El SLA establece expectativas medibles. El procedimiento de cambios incompatibles da tiempo a los consumidores para migrar.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Servicios internos | Markdown ligero | Almacenar en repo compartido, revisión por PR para cambios |
| Socios externos | Apéndice legal de SLA | Puede requerir firmas formales |
| Event-driven | Registro de esquemas async | Usar Avro / JSON Schema con reglas de compatibilidad |

## Mejores Prácticas

1. Almacenar contratos en control de versiones y requerir revisión por PR para cambios
2. Enlazar contratos a pruebas de API automatizadas y validación de esquemas
3. Revisar SLAs trimestralmente y ajustar según métricas observadas
4. Mantener un changelog de versiones de contrato con guías de migración
5. Usar registros de esquemas (Confluent, AWS Glue) para contratos orientados a eventos

## Errores Comunes

1. Tratar APIs internas como "siempre compatibles" y omitir contratos
2. Cambiar semántica de campos sin cambiar el nombre del campo
3. No monitorear uso de consumidores antes de eliminar endpoints deprecados
4. Establecer SLAs poco realistas que el proveedor no puede cumplir
5. Almacenar contratos en wikis privadas donde los consumidores no pueden encontrarlos

## Preguntas Frecuentes

### ¿Quién es dueño del contrato cuando múltiples consumidores usan la misma API?

El proveedor es dueño del contrato pero debe recopilar input de todos los consumidores antes de cambios incompatibles. Considera un consejo de consumidores para APIs de alto tráfico.

### ¿Los contratos deben cubrir detalles de implementación interna?

No. Los contratos deben especificar solo la interfaz pública (endpoints, esquemas, SLAs). Los esquemas internos de base de datos o detalles de despliegue están fuera de alcance.

### ¿Cómo hago cumplir un contrato en código?

Usa Pact o Spring Cloud Contract para pruebas de contrato orientadas al consumidor. Estas herramientas verifican que la implementación del proveedor coincida con el contrato acordado en cada build.
