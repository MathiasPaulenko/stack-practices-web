---
contentType: docs
slug: pen-test-scope-template
title: "Plantilla de Alcance de Prueba de Penetracion"
description: "Una plantilla para definir los limites, objetivos, reglas y entregables de una prueba de penetracion."
metaDescription: "Define los limites de una prueba de penetracion con esta plantilla. Cubre objetivos, exclusiones, reglas de juego, entregables y cronograma."
difficulty: intermediate
topics:
  - security
  - testing
tags:
  - penetration-test
  - security-assessment
  - scope
  - red-team
  - compliance
relatedResources:
  - /docs/devops/container-security-baseline-template
  - /docs/devops/network-segmentation-policy-template
  - /docs/devops/compliance-gap-analysis-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Define los limites de una prueba de penetracion con esta plantilla. Cubre objetivos, exclusiones, reglas de juego, entregables y cronograma."
  keywords:
    - alcance de prueba de penetracion
    - evaluacion de seguridad
    - reglas de juego
    - plantilla de pen test
    - evaluacion de vulnerabilidades
---

## Descripcion General

Una Plantilla de Alcance de Prueba de Penetracion define que se probara, que no se probara, como se conducira la prueba y que espera recibir la organizacion. Un alcance claro protege a la organizacion de interrupciones no deseadas, previene problemas legales para los probadores y asegura que el compromiso entregue valor accionable.

## Cuando Usar

- Contratar una firma de seguridad externa para una prueba de penetracion.
- Ejecutar un ejercicio interno de red team o purple team.
- Cumplir requisitos de pruebas anuales para cumplimiento.
- Despues de un cambio mayor de arquitectura o lanzamiento de producto.
- Definir el alcance de un programa de bug bounty o pruebas crowdsourced.

## Prerequisitos

- Un inventario de sistemas, aplicaciones y rangos de red.
- Aprobacion legal y de cumplimiento para realizar la prueba.
- Una lista de contactos para escalamiento de emergencias.
- Conocimiento de la metodologia de prueba, como OWASP o PTES.

## Solucion

### Plantilla

#### 1. Detalles del Compromiso

| Campo | Descripcion | Valor |
|-------|-------------|-------|
| Organizacion | Entidad a probar | Acme Corp |
| Tipo de compromiso | Caja negra, gris o blanca | Caja gris |
| Fecha de inicio | Cuando comienza la prueba | 2026-07-01 |
| Fecha de fin | Cuando termina la prueba | 2026-07-15 |
| Ventana de prueba | Horarios permitidos | 08:00 - 18:00 UTC |
| Contacto de emergencia | Contacto 24/7 para hallazgos criticos | security@example.com |
| Fecha de entrega del informe | Cuando se entregan los hallazgos | 2026-07-22 |

#### 2. Objetivos en Alcance

| Objetivo | Tipo | Ambiente | URL / Rango IP | Notas |
|----------|------|----------|----------------|-------|
| app.example.com | Aplicacion web | Produccion | 203.0.113.10 | Publica |
| api.example.com | API | Produccion | 203.0.113.11 | Protegida con OAuth2 |
| Cluster k8s | Infraestructura cloud | Staging | 10.0.0.0/16 | Credenciales solo lectura |
| Portal admin | Aplicacion web | Produccion | admin.example.com | MFA habilitado |

#### 3. Elementos Fuera de Alcance

| Elemento | Razon |
|----------|-------|
| Proveedores SaaS de terceros | Fuera del control organizacional |
| Seguridad fisica | No incluido en este compromiso |
| Ingenieria social | Excluido por solicitud legal |
| Ataques de denegacion de servicio | Riesgo para disponibilidad de produccion |
| Dispositivos personales de empleados | Limites de privacidad y legales |
| Escrituras en base de datos de produccion | Podrian corromper datos de clientes |

#### 4. Reglas de Juego

| Regla | Descripcion |
|-------|-------------|
| Prueba autorizada | Solo se pueden probar los objetivos listados |
| Comunicacion | Los hallazgos criticos se reportan inmediatamente |
| Manejo de datos | Sin exfiltracion de datos de clientes a menos que sea aprobada |
| Herramientas | Herramientas comerciales y open source permitidas; sin auto-explotacion en produccion |
| Evidencia | Se requieren capturas de pantalla y logs para todos los hallazgos |
| Confidencialidad | Resultados almacenados cifrados y compartidos solo con destinatarios nombrados |
| Limpieza | El probador debe remover cualquier persistencia o cuenta creada durante la prueba |

#### 5. Metodologia de Prueba

| Fase | Actividades | Entregable |
|------|-------------|------------|
| Reconocimiento | Recopilar informacion publica y mapear objetivos | Inventario de objetivos |
| Escaneo | Escaneo de vulnerabilidades y configuraciones | Salida de escaneo |
| Explotacion | Intentar validar vulnerabilidades | Evidencia de explotacion |
| Post-explotacion | Evaluar impacto y movimiento lateral | Analisis de impacto |
| Reporte | Documentar hallazgos, riesgo y remediacion | Informe final |
| Re-test | Verificar correcciones despues de remediacion | Informe de re-test |

#### 6. Criterios de Exito

| Criterio | Objetivo |
|----------|----------|
| Cobertura | 100% de los objetivos en alcance probados |
| Hallazgos criticos | Reportados dentro de 24 horas de descubrimiento |
| Calidad del informe | Incluye calificacion de riesgo, evidencia y pasos de remediacion |
| Re-test | Todos los hallazgos altos y criticos remediados y re-testeados |
| Debrief | Sesiones ejecutivas y tecnicas entregadas |

## Explicacion

La plantilla de alcance alinea a la organizacion y a los probadores antes de enviar cualquier trafico. Reduce el riesgo legal, previene interrupciones en produccion y asegura que los hallazgos sean relevantes. Las reglas de juego son especialmente importantes porque separan la prueba autorizada de actividad criminal bajo leyes de fraude informatico.

## Variantes

- **Prueba de penetracion de aplicacion web**: Enfocada en pruebas OWASP Top 10 para una sola app.
- **Prueba de penetracion cloud**: Apunta a configuraciones e IAM de AWS, Azure o GCP.
- **Ejercicio de red team**: Alcance mas amplio con objetivos de sigilo y mayor duracion.
- **Alcance de bug bounty**: Objetivos publicos con lenguaje de safe harbor y reglas de recompensa.
- **Prueba de red interna**: Asume una perspectiva de insider o endpoint comprometido.

## Mejores Practicas

- Obtener autorizacion escrita antes de comenzar cualquier prueba.
- Incluir a duenos tecnicos y de negocio en la definicion del alcance.
- Definir contactos de emergencia y rutas de escalamiento.
- Excluir sistemas de terceros a menos que se obtenga permiso explicito.
- Requerir evidencia de prueba de concepto para cada hallazgo.
- Programar re-test para validar la remediacion.
- Almacenar hallazgos de forma segura y limitar la distribucion.

## Errores Comunes

- Definir un alcance demasiado estrecho para encontrar riesgos reales.
- Olvidar incluir APIs, microservicios y backends moviles.
- No proporcionar credenciales de prueba para pruebas autenticadas.
- Permitir pruebas en produccion sin un plan de rollback.
- Saltarse el re-test y asumir que las correcciones estan completas.
- No informar al SOC o NOC que ocurrira la prueba.

## FAQs

### Que es una prueba de caja gris?

Una prueba de caja gris proporciona al probador algo de conocimiento interno, como credenciales, diagramas de arquitectura o codigo fuente, mientras simula un atacante con acceso limitado.

### Podemos probar sistemas de produccion?

Las pruebas en produccion estan permitidas si estan explicitamente incluidas en el alcance, durante ventanas acordadas y con planes de rollback. Muchas organizaciones prefieren probar staging primero.

### Que debe incluir un informe?

Como minimo: resumen ejecutivo, metodologia, alcance, hallazgos calificados por riesgo, evidencia, impacto, pasos de remediacion y resultados de re-test. Incluye cronogramas y puntajes CVSS cuando aplique.
