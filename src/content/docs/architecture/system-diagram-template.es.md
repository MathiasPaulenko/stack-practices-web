---
contentType: docs
slug: system-diagram-template
title: "Plantilla de Diagramas de Sistema"
description: "Una plantilla para crear diagramas de arquitectura siguiendo el modelo C4."
metaDescription: "Usa esta plantilla de diagramas de sistema para documentar arquitectura con diagramas de contexto, contenedores, componentes y código del modelo C4."
difficulty: beginner
topics:
  - architecture
tags:
  - architecture
  - c4-model
  - diagram
  - visualization
  - template
  - standards
relatedResources:
  - /docs/service-dependency-map-template
  - /docs/microservice-contract-template
  - /docs/adr-template
  - /docs/database-schema-documentation-template
  - /docs/engineering-handbook-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa esta plantilla de diagramas de sistema para documentar arquitectura con diagramas de contexto, contenedores, componentes y código del modelo C4."
  keywords:
    - arquitectura
    - c4-model
    - diagrama
    - visualización
    - plantilla
    - estándares
---
## Visión General

Los diagramas de arquitectura comunican la estructura del sistema a stakeholders técnicos y no técnicos. Sin estándares consistentes, los equipos producen diagramas con niveles de abstracción inconsistentes que confunden más que aclaran. Esta plantilla utiliza el modelo C4 para crear diagramas en cuatro niveles de detalle bien definidos.

## Cuándo Usar

Usa este recurso cuando:
- Integras nuevos ingenieros que necesitan entender el espacio del sistema
- Presentas arquitectura a directivos o auditores externos
- Planeas una migración, integración o refactorización que abarca múltiples sistemas

## Solución

```markdown
# Diagrama de Sistema: `<Nombre del Sistema>`

## Nivel 1: Diagrama de Contexto del Sistema

Muestra el sistema como una caja en el centro, rodeado por usuarios y sistemas externos.

| Elemento | Notación | Descripción |
|----------|----------|-------------|
| Persona | Figura humana con etiqueta | Usuario externo o rol |
| Sistema | Caja con etiqueta y tecnología | Sistema bajo diseño |
| Sistema Externo | Caja con relleno gris | Sistema existente fuera de alcance |

**Ejemplo**:
```
[Cliente] → (Sistema de Banca Online) → [Mainframe]
                ↓
            [Sistema de Email]
```

- **Alcance**: El sistema completo como una caja negra
- **Audiencia**: Stakeholders no técnicos, product managers
- **Pregunta clave**: ¿Qué es este sistema y quién lo usa?

## Nivel 2: Diagrama de Contenedores

Muestra las decisiones tecnológicas de alto nivel y cómo se distribuyen las responsabilidades.

| Elemento | Notación | Descripción |
|----------|----------|-------------|
| Web App | Cilindro con icono de navegador | Aplicación de página única o UI server-rendered |
| API | Caja con etiqueta API | Servicio REST/gRPC/GraphQL |
| Base de Datos | Cilindro con etiqueta DB | Almacén de datos |
| Cola | Caja con etiqueta de cola | Broker de mensajes |
| Cache | Caja con icono de rayo | Almacén en memoria |

**Ejemplo**:
```
[Web App] → [Load Balancer] → [Aplicación API] → [Base de Datos]
                                ↓
                            [Redis Cache]
                                ↓
                            [Cola de Mensajes]
```

- **Alcance**: Aplicaciones y almacenes de datos dentro del sistema
- **Audiencia**: Tech leads, arquitectos
- **Pregunta clave**: ¿Cuáles son los bloques principales y cómo interactúan?

## Nivel 3: Diagrama de Componentes

Muestra la estructura interna de un único contenedor (típicamente una aplicación).

| Elemento | Notación | Descripción |
|----------|----------|-------------|
| Componente | Caja con etiqueta de componente | Agrupación lógica de funcionalidad relacionada |
| Interfaz | Piruleta | API expuesta o publicador de eventos |
| Base de Datos | Cilindro | Dependencia directa |

**Ejemplo**:
```
[Auth Controller] → [User Service] → [User Repository] → [Users DB]
      ↓
[Token Manager] → [Redis Cache]
```

- **Alcance**: Componentes dentro de una aplicación
- **Audiencia**: Ingenieros senior trabajando en la aplicación
- **Pregunta clave**: ¿Cómo se descompone la aplicación en responsabilidades?

## Nivel 4: Diagrama de Código

Muestra los detalles de implementación de un único componente.

- **Formato**: Diagramas de clases, secuencia o entidad-relación
- **Herramienta**: IDE, PlantUML o Mermaid
- **Alcance**: Clases, interfaces y funciones dentro de un componente
- **Audiencia**: Ingenieros implementando la funcionalidad
- **Pregunta clave**: ¿Cómo funciona esta funcionalidad específica en código?

## Estándares de Diagramas

| Regla | Descripción |
|-------|-------------|
| Notación consistente | Usar las mismas formas y colores en todos los diagramas |
| Etiquetar todo | Cada caja y línea debe tener una etiqueta |
| Una dirección | Leer de izquierda a derecha o de arriba a abajo |
| Sin huérfanos | Cada elemento debe conectarse al menos con otro |
| Control de versiones | Almacenar diagramas como código (Mermaid, PlantUML, Structurizr) |
```

## Explicación

El modelo C4 resuelve el **"problema del zoom"** en la documentación de arquitectura. Un único diagrama que intenta mostrar todo se vuelve ilegible. Separando en cuatro niveles, cada diagrama tiene una única audiencia y propósito. Los diagramas de contexto venden la idea. Los de contenedores guían decisiones tecnológicas. Los de componentes integran nuevos desarrolladores. Los de código documentan lógica compleja.

## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Startup | Solo Contexto + Contenedores | Omitir Componentes y Código hasta que el equipo crezca |
| Sistema legacy | Contexto + Contenedores + Componentes dirigidos | Enfocarse en las partes que se cambian |
| Event-driven | Agregar flujos de eventos a diagramas de Contenedores | Mostrar productores, consumidores y topics |

## Lo que funciona

1. Almacenar diagramas como código (Mermaid, PlantUML, DSL de Structurizr) para versionarlos con el código
2. Generar diagramas desde el mismo modelo para asegurar consistencia entre niveles
3. Revisar diagramas en registros de decisiones arquitectónicas (ADRs) para mantenerlos actualizados
4. Usar una guía de estilo del equipo para colores, fuentes y conjuntos de iconos
5. Enlazar cada diagrama al siguiente nivel de detalle para navegación por drill-down

## Errores Comunes

1. Mezclar niveles de abstracción en un único diagrama
2. Usar estilos de notación diferentes entre diagramas del mismo repositorio
3. Crear diagramas solo una vez y nunca actualizarlos después de refactorizaciones
4. Incluir demasiado detalle en diagramas de Contexto o Contenedores
5. Omitir los usuarios humanos y sistemas externos que proporcionan contexto

## Preguntas Frecuentes

### ¿Necesito crear los cuatro niveles?

No. La mayoría de equipos se beneficia de diagramas de Contexto y Contenedores. Los de Componentes son útiles para aplicaciones complejas. Los de Código deberían generarse desde el código, no dibujarse a mano.

### ¿Qué herramienta debería usar?

Structurizr está diseñado específicamente para C4. Mermaid y PlantUML funcionan bien para diagramas simples. Lucidchart y draw.io son mejores para presentaciones pero más difíciles de versionar.

### ¿Cómo mantengo los diagramas sincronizados con el código?

Usa el DSL de Structurizr o generadores de diagramas basados en código que extraigan dependencias del codebase. Los diagramas manuales deberían revisarse durante code review cuando cambien los archivos relacionados.
