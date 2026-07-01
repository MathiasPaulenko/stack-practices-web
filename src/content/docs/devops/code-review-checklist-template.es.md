---
contentType: docs
slug: code-review-checklist-template
title: "Plantilla de Checklist para Code Review"
description: "Una checklist estructurada para realizar revisiones de codigo consistentes y exhaustivas que detecten bugs, mejoren la legibilidad y compartan conocimiento entre el equipo."
metaDescription: "Estandariza las revisiones de codigo con esta checklist. Cubre logica, seguridad, rendimiento, tests y estilo para feedback consistente y de alta calidad."
difficulty: beginner
topics:
  - devops
  - testing
tags:
  - code-review
  - checklist
  - quality-assurance
  - team-process
  - pull-request
relatedResources:
  - /docs/devops/engineering-handbook-template
  - /docs/devops/git-branching-strategy-document
  - /docs/devops/onboarding-checklist-backend-engineer
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Estandariza las revisiones de codigo con esta checklist. Cubre logica, seguridad, rendimiento, tests y estilo para feedback consistente y de alta calidad."
  keywords:
    - checklist de code review
    - revision de pull request
    - plantilla de calidad de codigo
    - estandares de revision
    - checklist de desarrollador
---

## Descripcion General

Las revisiones de codigo son la puerta de calidad mas util en la entrega de software, pero solo cuando son consistentes. Sin una checklist, los revisores se enfocan en lo que les importa personalmente: un ingeniero verifica inyeccion SQL, otro se obsesiona con nombres de variables, y un tercero solo mira cobertura de tests. Una checklist compartida asegura que cada revision cubra las dimensiones que importan al equipo, dejando espacio para el juicio humano en diseno y arquitectura.

## Cuando Usar

Usa esta plantilla cuando:
- Quieras estandarizar que significa "listo" para la revision de codigo en el equipo
- Nuevos revisores no esten seguros de que buscar en un pull request
- Las revisiones tarden demasiado porque los revisores no conocen el alcance
- Estes integrando un nuevo equipo y necesitas establecer estandares compartidos rapidamente
- Quieras reducir defectos post-merge e incidentes en produccion

## Prerrequisitos

Antes de adoptar esta checklist:
- [ ] El equipo acuerda que items son obligatorios vs. opcionales
- [ ] CI esta configurado para detectar problemas automaticos (linting, formato, type checks)
- [ ] Los revisores entienden que las checklists complementan el juicio; no lo reemplazan
- [ ] Existe una ruta documentada para escalar desacuerdos entre autor y revisor
- [ ] La checklist esta almacenada donde los revisores puedan consultarla facilmente (plantilla de PR, wiki, o mensaje fijado)

## Solucion

```markdown
# Checklist de Code Review

> Revisor: ______ | Autor: ______ | PR: ______ | Fecha: ______

## 1. Logica y Correctitud
- [ ] El codigo hace lo que la descripcion del PR dice que hace
- [ ] Los casos borde estan manejados (entradas vacias, nulos, timeouts, fallas)
- [ ] No hay errores off-by-one, condiciones de carrera, o bucles infinitos
- [ ] Los caminos de error son explicitos y no silencian excepciones
- [ ] La logica de negocio coincide con la especificacion o requerimiento del ticket

## 2. Seguridad
- [ ] No hay secretos, tokens, o credenciales en el codigo
- [ ] Las entradas de usuario son validadas y sanitizadas
- [ ] Existen verificaciones de autorizacion para operaciones protegidas
- [ ] No hay vulnerabilidades de inyeccion SQL, XSS, o command injection
- [ ] Las dependencias agregadas son verificadas y de fuentes confiables

## 3. Rendimiento
- [ ] No hay consultas N+1 o ineficiencias algoritmicas obvias
- [ ] Conjuntos grandes de datos estan paginados o transmitidos en stream
- [ ] No hay llamadas de red innecesarias ni I/O bloqueante en caminos calientes
- [ ] Caching se utiliza apropiadamente donde sea aplicable
- [ ] Se previenen fugas de recursos (conexiones, manejadores de archivos, memoria)

## 4. Testing
- [ ] Los unit tests cubren la logica nueva o modificada
- [ ] Los integration tests cubren dependencias externas y limites
- [ ] Casos borde y caminos de falla estan probados, no solo caminos felices
- [ ] Los tests son deterministicos y no dependen de tiempo ni orden
- [ ] Los nombres de los tests describen comportamiento, no implementacion

## 5. Mantenibilidad y Estilo
- [ ] El codigo es legible sin necesidad de preguntarle al autor
- [ ] Los nombres de variables y funciones son descriptivos y consistentes
- [ ] No hay logica duplicada que podria extraerse o reutilizarse
- [ ] Los comentarios explican "por que", no "que" (el codigo muestra el que)
- [ ] La complejidad es apropiada; se senala la sobre-ingenieria

## 6. Documentacion
- [ ] Las APIs publicas tienen documentacion actualizada o specs OpenAPI
- [ ] El README o runbooks se actualizan si el comportamiento cambio
- [ ] Los breaking changes se destacan explicitamente en la descripcion del PR
- [ ] Los pasos de migracion estan documentados si cambio el esquema o config

## 7. Despliegue y Operaciones
- [ ] Feature flags se usan para cambios riesgosos o irreversibles
- [ ] Monitoreo y alertas se agregan o actualizan para nuevos caminos
- [ ] El procedimiento de rollback es entendido y probado
- [ ] Las migraciones de base de datos son compatibles hacia atras o tienen un plan

---

## Notas de Revision

| Linea / Archivo | Problema | Severidad | Accion |
|-----------------|----------|-----------|--------|
| ______ | ______ | Nit / Sugerencia / Bloqueador | ______ |

**Veredicto general:** Aprobar / Solicitar cambios / Comentar
**Preparacion para merge:** Listo / Necesita trabajo / Bloqueado
```

## Explicacion

La checklist esta organizada por preocupacion en lugar de por tipo de archivo. Esto evita que los revisores se pierdan leyendo diff linea por linea y en su lugar evaluen el cambio contra las dimensiones que importan al equipo: correctitud, seguridad, rendimiento, testing, mantenibilidad, documentacion y operaciones. Separar las preocupaciones automaticas (linting, formato) de las humanas (diseno, legibilidad) mantiene las revisiones enfocadas en lo que los humanos hacen mejor.

## Variantes

| Contexto | Ajustes | Notas |
|----------|---------|-------|
| Codigo frontend / UI | Agregar accesibilidad, diseno responsivo, y compatibilidad de navegador | Los cambios visuales necesitan verificacion manual |
| Data pipelines | Agregar verificaciones de calidad de datos, compatibilidad de esquema, y consideraciones de backfill | Los cambios de datos son mas dificiles de deshacer que los de codigo |
| Infraestructura / Terraform | Agregar seguridad de estado, revision de plan, y evaluacion de radio de impacto | Una mala configuracion puede caer produccion |
| Codigo critico de seguridad | Hacer la seccion de seguridad obligatoria y requerir aprobacion del equipo de seguridad | Finanzas, salud, y sistemas de autenticacion |
| Hotfix / respuesta a incidente | Acortar la checklist a seguridad, correctitud, y rollback solamente | La velocidad importa; documenta lo que se omitio y por que |

## Lo que funciona

1. Mantente la checklist visible. Embebela en la plantilla de PR para que los revisores la vean automaticamente
2. Distingue nits de bloqueadores. No cada problema impide el merge; usa etiquetas de severidad para mantener las revisiones fluidas
3. Rota revisores. Las checklists reducen la brecha de experiencia, facilitando distribuir la carga de revision
4. Revisa la checklist trimestralmente. Elimina items que ahora son automaticos; agrega items que siguen escapandose
5. Limita el tiempo de revision. Si una revision toma mas de 30 minutos, el PR probablemente es demasiado grande

## Errores Comunes

1. Tratar la checklist como sustituto del pensamiento. La checklist atrapa omissiones comunes, no fallas de diseno
2. Hacer cada item obligatorio. Esto ralentiza las revisiones sin mejorar la calidad; solo bloquea en correctitud, seguridad y tests
3. No actualizar la checklist. A medida que las herramientas mejoran, las verificaciones manuales deberian automatizarse
4. Revisar solo. Las revisiones en pareja en cambios criticos atrapan problemas que los revisores solitarios omiten
5. Enfocarse solo en el diff. Los revisores tambien deberian verificar que la descripcion del PR, tests, y documentacion sean consistentes

## Preguntas Frecuentes

### Cuanto deberia durar una revision de codigo?

PRs pequenos (menos de 200 lineas) deberian revisarse en pocas horas. PRs grandes deberian dividirse o revisarse por etapas. Si una revision consistentemente toma mas de 30 minutos, el equipo deberia investigar si los PRs son demasiado grandes o la checklist es demasiado amplia.

### Deberian ingenieros junior revisar codigo de ingenieros senior?

Si. La revision de codigo es una oportunidad de aprendizaje tanto como una puerta de calidad. Los revisores junior detectan problemas de claridad que los senior pasan por alto porque ya comparten las suposiciones del autor. La checklist nivela el campo de juego al indicarle a todos que verificar.

### Que pasa si el autor no esta de acuerdo con un comentario de revision?

Discutanlo. Si la conversacion se estanca, escale a un tech lead o al desempatador documentado del equipo. La checklist existe para reducir debates subjetivos haciendo las expectativas explicitas, pero no puede eliminar todo desacuerdo.
