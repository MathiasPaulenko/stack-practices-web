---




contentType: guides
slug: code-review-best-practices-guide
title: "Lo que Funciona en Code Review — Para Autores y Revisores"
description: "Una guía práctica para revisiones de código útiles: cómo escribir código revisable, dar feedback constructivo y mantener las revisiones rápidas y enfocadas."
metaDescription: "Lo que funciona en code review para autores y revisores. Aprende a escribir código revisable, dar feedback constructivo y mantener revisiones rápidas."
difficulty: beginner
topics:
  - design
  - devops
tags:
  - calidad
  - code-review
  - devops
  - guia
  - practicas-equipo
  - pull-request
relatedResources:
  - /guides/design-patterns-guide
  - /guides/testing-strategy-guide
  - /guides/cicd-pipeline-guide
  - /docs/pull-request-template
  - /guides/clean-code-principles-guide
  - /guides/technical-documentation-strategy-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Lo que funciona en code review para autores y revisores. Aprende a escribir código revisable, dar feedback constructivo y mantener revisiones rápidas."
  keywords:
    - lo que funciona code review
    - revision pull request
    - checklist code review
    - revision entre pares
    - feedback constructivo codigo




---

# Lo que Funciona en Code Review

## Introducción

La revisión de código es una de las actividades con mayor retorno en el desarrollo de software. Detecta bugs temprano, comparte conocimiento entre el equipo y mantiene la calidad del código consistente. A continuación: prácticas tanto para autores (quienes envían código) como para revisores (quienes lo evalúan).

## Para Autores: Haciendo tu Código Revisable

### 1. Mantén los PRs Pequeños

Apunta a **200-400 líneas de código cambiadas** por PR. Los PRs grandes abruman a los revisores y aumentan la probabilidad de que los bugs pasen desapercibidos.

```bash
# Mal: 2000 líneas en 15 archivos
# Bien: 150 líneas en 3 archivos relacionados
```

**Estrategias para PRs pequeños:**
- Divide capacidades grandes en PRs apilados
- Extrae refactoring en PRs separados
- Usa feature flags para mergear incrementalmente

### 2. Escribe una Descripción Clara

Una buena descripción de PR responde:

- **Qué** cambió y **por qué**
- **Cómo** probarlo
- Links a tickets, diseños, o PRs relacionados
- Screenshots para cambios de UI

```markdown
## Qué
Agrega validación de email al formulario de registro de usuarios.

## Por qué
Actualmente los emails inválidos pasan y causan errores de
procesamiento downstream en el pipeline de automatización de marketing.

## Cómo probar
1. Ir a /register
2. Ingresar "no-es-email" — debería mostrar error de validación
3. Ingresar "user@example.com" — debería pasar

## Relacionado
Fixes #142
```

### 3. Auto-Revisa Antes de Enviar

Revisa tu propio PR primero. Vas a detectar:
- Código de debug residual (`console.log`, `print`)
- Cambios no intencionales
- Tests o documentación faltantes
- Bugs de nivel de typo

### 4. Responde al Feedback Constructivamente

- Asume intenciones positivas de los revisores
- Haz preguntas aclaratorias en lugar de defenderte
- Separa "debe arreglarse" de "sería bueno tener" sugerencias
- Actualiza el PR prontamente después del feedback

## Para Revisores: Dando Feedback Útil

### 1. Revisa Dentro de 24 Horas

Una respuesta rápida mantiene al autor en contexto y previene trabajo bloqueado. Si no puedes revisar en 24 horas, delega o avisa al equipo.

### 2. Usa un Checklist de Revisión

Las revisiones sistemáticas son más exhaustivas:

| Categoría | Preguntas |
|-----------|-----------|
| **Funcionalidad** | ¿Hace lo que el PR dice? ¿Maneja casos edge? |
| **Tests** | ¿Hay tests para la nueva lógica? ¿Los tests existentes siguen pasando? |
| **Legibilidad** | ¿Los nombres son claros? ¿La complejidad está justificada? |
| **Seguridad** | ¿Las entradas están validadas? ¿Hay secretos expuestos? | [validación de datos](/recipes/security/data-validation-zod) |
| **Performance** | ¿Hay [queries N+1](/recipes/performance/database-indexing)? ¿Asignaciones innecesarias? |
| **Mantenibilidad** | ¿Hay código duplicado? ¿Será difícil de cambiar? |

### 3. Categoriza el Feedback

Usa niveles de severidad para ayudar a los autores a priorizar:

| Nivel | Significado | Ejemplo |
|-------|-------------|---------|
| **Bloqueante** | Debe arreglarse antes del merge | "Este query carece de índice; escaneará la tabla entera" |
| **Sugerencia** | Considerarlo | "Podrías simplificar esto con `map` en lugar de `for`" |
| **Nitpick** | Preferencia personal | "Prefiero comillas simples para strings" |

### 4. Pregunta, No Dicta

**En lugar de:** "Cambia esto para usar un diccionario."

**Pregunta:** "¿Un diccionario haría la búsqueda más rápida aquí?"

Las preguntas fomentan la discusión y ayudan al autor a aprender, mientras que las órdenes generan resistencia.

### 5. Aprueba con Comentarios

Si el código es aceptable pero tienes sugerencias menores, aprueba el PR y deja que el autor decida si atenderlas. No bloquees merges por nits.

## Patrones de Revisión que Funcionan

### Revisión en Par

Dos revisores alternan: uno lee la lógica, el otro lee los tests. Detectan diferentes categorías de problemas.

### Revisión Asistida por Herramientas

Deja que la automatización maneje lo aburrido:
- **Linters** (ESLint, Black, Prettier) para estilo
- **Análisis estático** (SonarQube, CodeClimate) para complejidad
- **Scanners de seguridad** (Snyk, CodeQL) para vulnerabilidades
- **Tests de CI** para regresiones

Reserva la revisión humana para arquitectura, lógica e intención.

### Ruleta de Revisores

Rota revisores para que el conocimiento se distribuya equitativamente. Evita que solo ingenieros senior revisen todo.

## Métricas a Seguir

| Métrica | Objetivo | Por qué |
|---------|----------|---------|
| **Tamaño de PR** | <400 líneas | La calidad de revisión cae bruscamente por encima de esto |
| **Tiempo de respuesta de revisión** | <24 horas | Previene pérdida de contexto y trabajo bloqueado |
| **Tasa de escape de defectos** | Decreciente | Bugs encontrados en producción vs. revisión |
| **Participación en revisiones** | >80% del equipo | Compartir conocimiento |

## Errores Comunes

- **Bike-shedding**: Gastar tiempo de revisión en problemas triviales de estilo mientras se pasan bugs reales
- **Rubber-stamping**: Aprobar sin leer porque "nunca se equivocan"
- **Gatekeeping**: Usar el poder de revisión para imponer preferencias personales
- **Feedback retrasado**: Esperar días para revisar, forzando al autor a re-aprender contexto
- **Sin seguimiento**: Sugerir cambios pero nunca verificar si se hicieron

## Preguntas Frecuentes

**P: ¿Cómo reviso código en un lenguaje o dominio desconocido?**
R: Enfócate en lo que puedes evaluar: cobertura de tests, nombres de variables, errores de lógica obvios, y claridad de documentación. Pregunta a expertos del dominio por los matices técnicos.

**P: ¿Qué pasa si el autor no está de acuerdo con mi feedback?**
R: Discútelo. Si es un issue bloqueante y no pueden ponerse de acuerdo, escala al tech lead. Para sugerencias, deja que el autor decida y sigue adelante.

**P: ¿Debería bloquear un PR por falta de tests?**
R: Sí, si el PR agrega lógica que puede ser testeada. No, si es un refactor puro con cobertura existente, o cambios de UI que requieren tests E2E a cargo de otro equipo.

### ¿Cómo empiezo con esto en un proyecto existente?

Empieza con una parte pequeña y aislada de tu codebase. Aplica los conceptos de esta guía a un módulo o servicio. Mide el impacto, luego expande a otras áreas.

### ¿Qué herramientas necesito?

Las herramientas mencionadas throughout esta guía se listan en cada sección. La mayoría son open-source y ampliamente adoptadas. Consulta los recursos relacionados para instrucciones de setup.

### ¿Cómo mido el éxito después de implementar esto?

Define métricas claras antes de empezar: benchmarks de rendimiento, tasas de error o indicadores de mantenibilidad. Compara antes y después. Itera basándote en datos, no en suposiciones.


## Temas Avanzados

### Escenario: Checklist de Revision para Servicio de Pagos

```text
Servicio: Microservicio de procesamiento de pagos
Riesgo: Alto (transacciones financieras, PII)
Revisores: 2 requeridos (1 senior + 1 peer)

Checks automatizados pre-revision:
  [x] Linter pasa (ESLint + Prettier)
  [x] Type checker pasa (tsc --noEmit)
  [x] Tests unitarios pasan (>90% cobertura en lineas cambiadas)
  [x] SAST scan limpio (Semgrep)
  [x] Sin secrets en el diff (trufflehog)
  [x] Audit de dependencias limpio (npm audit)

Checklist de revision (reviewer completa):
  Seguridad:
  [ ] Validacion de input en todos los endpoints (Zod)
  [ ] Sin SQL injection (queries parametrizadas)
  [ ] Sin secrets o API keys hardcodeados
  [ ] PII no se loguea (enmascarar tarjetas, emails)
  [ ] Checks de auth presentes en cada ruta
  [ ] Rate limiting en endpoints sensibles

  Correccion:
  [ ] Limites de transaccion correctos (ACID)
  [ ] Manejo de errores cubre casos edge
  [ ] Idempotencia en operaciones de pago
  [ ] Aritmetica decimal (no floating point para dinero)
  [ ] Checks de null/undefined en datos externos
  [ ] Condiciones de carrera abordadas

  Diseno:
  [ ] Responsabilidad unica por funcion
  [ ] Sin God classes o funciones > 50 lineas
  [ ] Dependencias inyectadas (testeable)
  [ ] Sin imports circulares
  [ ] Contrato API coincide con OpenAPI spec

  Testing:
  [ ] Happy path cubierto
  [ ] Paths de error cubiertos
  [ ] Valores limite testeados (0, negativo, max)
  [ ] Integration test para operaciones DB
  [ ] Mock de servicios externos (Stripe, API bancaria)
  [ ] Sin tests flaky (timeouts, random data)

  Performance:
  [ ] Queries N+1 eliminadas
  [ ] Sin I/O sincrono en hot paths
  [ ] Indices existen para queries nuevas
  [ ] Paginacion en endpoints de lista
  [ ] Sin datos innecesarios (SELECT * evitado)

  Documentacion:
  [ ] JSDoc en funciones exportadas
  [ ] README actualizado si cambio el setup
  [ ] Entrada en changelog
  [ ] Breaking changes documentados

Formato de comentarios:
  [blocking] Debe arreglarse antes de merge
  [suggestion] Considera este enfoque
  [question] Por que esta decision de diseno?
  [nit] Preferencia menor de estilo

Metricas tracked:
  | Metrica | Objetivo |
  |---------|----------|
  | Tiempo de revision | < 4 horas |
  | Tasa de defectos escapados | < 5% |
  | Carga de reviewer | < 5 PRs/dia |
  | Tamano de PR | < 400 lineas cambiadas |
  | Densidad de comentarios | 2-5 por PR |

Lecciones:
  - Checks automatizados reducen carga del reviewer
  - Checklists aseguran consistencia entre reviewers
  - PRs pequenos reciben mejores revisiones
  - [blocking] vs [suggestion] aclara intencion
  - Trackea metricas para mejorar el proceso
```

### Como manejo PRs grandes que son dificiles de revisar?

Pide al autor que divida en PRs mas pequenos. Si no se puede dividir, pide un walkthrough (screen share o descripcion detallada). Revisa por chunks: primero el diseno, luego los tests, luego la implementacion. Usa diff tools que permitan comentar lineas especificas. PRs grandes (> 400 lineas) consistentemente reciben revisiones de menor calidad.















End of document. Review and update quarterly.