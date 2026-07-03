---
contentType: guides
slug: threat-modeling-guide
title: "Modelado de Amenazas — Guía Práctica para Equipos de Desarrollo"
description: "Guía paso a paso de modelado de amenazas: STRIDE, árboles de ataque, diagramas de flujo de datos e integración de revisión de diseño de seguridad en tu proceso de desarrollo."
metaDescription: "Aprende modelado de amenazas con STRIDE, árboles de ataque y diagramas de flujo de datos. Integra revisión de diseño de seguridad en tu proceso de desarrollo."
difficulty: intermediate
topics:
  - security
  - architecture
  - design
tags:
  - threat-modeling
  - stride
  - attack-trees
  - data-flow-diagrams
  - security-design
  - risk-assessment
  - guia
relatedResources:
  - /guides/owasp-top-10-guide
  - /guides/secure-coding-guide
  - /guides/zero-trust-architecture-guide
lastUpdated: "2026-06-24"
author: "StackPractices"
seo:
  metaDescription: "Aprende modelado de amenazas con STRIDE, árboles de ataque y diagramas de flujo de datos. Integra revisión de diseño de seguridad en tu proceso de desarrollo."
  keywords:
    - threat-modeling
    - stride
    - attack-trees
    - data-flow-diagrams
    - security-design
    - risk-assessment
    - guia
---

## Overview

El modelado de amenazas es el proceso de identificar, comunicar y gestionar amenazas de seguridad en un sistema antes de escribir una sola línea de código. Al analizar la arquitectura y los flujos de datos, los equipos pueden anticipar ataques y construir mitigaciones en el diseño. Es una de las actividades de seguridad más útiles porque corregir vulnerabilidades en diseño es órdenes de magnitud más barato que corregirlas en producción.

## When to Use

- Estás diseñando un nuevo sistema o característica principal
- Estás revisando una arquitectura existente en busca de brechas de seguridad
- Necesitas comunicar riesgos de seguridad a stakeholders no técnicos
- Te preparas para una auditoría de seguridad o revisión de cumplimiento

## El Proceso de Modelado de Amenazas

### Paso 1: Descomponer la Aplicación

Crear un Diagrama de Flujo de Datos (DFD) mostrando cómo los datos se mueven a través del sistema.

```
┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
│ Usuario │─────▶│   WAF   │─────▶│   API   │─────▶│   BD    │
│ Navegador│      │ / CDN   │      │ Gateway │      │         │
└─────────┘      └─────────┘      └─────────┘      └─────────┘
      │                │                │                │
      │                │                │                │
   Entidad         Entidad            Proceso          Almacén
   Externa        Externa             Interno          de Datos
      │                │                │                │
      ▼                ▼                ▼                ▼
   Confianza:        Confianza:        Confianza:       Confianza:
   Ninguna           Baja              Alta             Alta
```

Elementos a identificar:
- **Entidades externas:** Usuarios, sistemas de terceros, navegadores
- **Procesos:** Aplicaciones, servicios, funciones
- **Almacenes de datos:** Bases de datos, cachés, sistemas de archivos
- **Flujos de datos:** HTTP, gRPC, colas de mensajes, llamadas API internas
- **Límites de confianza:** Donde cambian los niveles de confianza (ej. internet pública a VPC)

### Paso 2: Identificar Amenazas con STRIDE

| Amenaza | Descripción | Ejemplo |
|---------|-------------|---------|
| **S**uplantación | Hacerse pasar por otra persona | Credenciales robadas, JWT forjado |
| **T**ampering | Modificar datos o código | Ataque MitM, envenenamiento de cadena de suministro |
| **R**epudio | Negar una acción | Sin logs de auditoría para eliminaciones |
| **I**nformación | Exponer datos a partes no autorizadas | Mensajes de error verbosos, fugas de buckets S3 |
| **D**enegación | Hacer el sistema no disponible | DDoS, agotamiento de recursos |
| **E**scalación | Obtener acceso no autorizado | Explotar un bug para convertirse en admin |

Para cada elemento en el DFD, pregúntate: ¿cómo podría aplicarse STRIDE aquí?

### Paso 3: Determinar Mitigaciones

| Amenaza | Mitigación |
|---------|------------|
| Suplantación | MFA, certificate pinning, autenticación fuerte |
| Tampering | TLS, firma de código, validación de entrada |
| Repudio | Logs de auditoría inmutables, firmas digitales |
| Información | Encriptación, privilegio mínimo, sanitización de errores |
| Denegación | Rate limiting, CDN, auto-escalado |
| Escalación | RBAC, sandboxing, principio de privilegio mínimo |

### Paso 4: Validar e Iterar

- Revisar el modelo con el equipo completo (seguridad, desarrolladores, operaciones)
- Revisitar el modelo cuando la arquitectura cambia
- Rastrear mitigaciones como tareas de ingeniería en tu backlog

## Árboles de Ataque

Los árboles de ataque descomponen un objetivo de ataque de alto nivel en sub-objetivos, ayudando a identificar el camino de menor resistencia para los atacantes.

```
Objetivo: Robar datos de clientes
│
├── Comprometer servidor de aplicación
│   ├── Explotar vulnerabilidad conocida (CVE)
│   │   └── Mitigación: Parchear dentro de 24h
│   ├── Inyección SQL
│   │   └── Mitigación: Consultas parametrizadas
│   └── Contraseña de admin débil
│       └── Mitigación: Hacer cumplir MFA
│
├── Acceder a base de datos directamente
│   ├── Puerto de base de datos expuesto
│   │   └── Mitigación: Security groups, sin acceso público
│   └── Credenciales robadas
│       └── Mitigación: Vault, credenciales de corta duración
│
└── Amenaza interna
    └── Mitigación: Logs de auditoría, principio de privilegio mínimo
```

## Herramientas y Plantillas

| Herramienta | Propósito |
|-------------|-----------|
| Microsoft Threat Modeling Tool | Crear DFDs y aplicar STRIDE automáticamente |
| OWASP Threat Dragon | Modelado de amenazas open-source con colaboración de equipo |
| PyTM | Modelado de amenazas basado en Python para generación programática |
| Mermaid / Diagrams.net | Crear DFDs y árboles de ataque |

## Integración en el Desarrollo

### Sprint 0: Revisión de Arquitectura

Conducir modelado de amenazas durante la fase de diseño, antes de que comience la implementación.

### Definición de Hecho

- [ ] DFD creado y revisado
- [ ] Amenazas STRIDE identificadas para cada límite de confianza
- [ ] Mitigaciones documentadas y agregadas al backlog
- [ ] Pruebas de seguridad definidas para cada mitigación

### Revisión Continua

Revisitar el modelo de amenazas cuando:
- Se agregan nuevas integraciones o APIs
- Cambian los límites de confianza (ej. nueva región, nuevo proveedor)
- Se descubre una vulnerabilidad en un sistema similar

## Errores Comunes

- **Modelar amenazas demasiado tarde** — después de escribir código, las correcciones son caras
- **Solo el equipo de seguridad participa** — los desarrolladores conocen mejor el sistema
- **Tratar el modelo como documento único** — las arquitecturas evolucionan; las amenazas también
- **Ignorar amenazas internas** — no todos los atacantes son externos
- **Enfocarse solo en software** — la ingeniería social y el acceso físico son amenazas válidas

## FAQ

**¿Cuánto tiempo toma el modelado de amenazas?**
Una sesión enfocada para un solo servicio toma 2-4 horas. Los sistemas complejos pueden necesitar múltiples sesiones.

**¿Necesito un experto en seguridad para facilitar?**
Útil pero no requerido. Un desarrollador entrenado en STRIDE puede liderar la sesión. Consultores externos pueden validar hallazgos.

**¿Cómo priorizo amenazas?**
Usa una matriz de riesgo: probabilidad × impacto. Aborda primero las amenazas de alta probabilidad y alto impacto. Documenta los riesgos aceptados para los elementos de baja prioridad.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.
