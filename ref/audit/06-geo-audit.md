# 06 — Auditoría GEO / AI Search de StackPractices

> Audita si el recurso es fácilmente recuperable, entendible y citable por motores de respuesta de IA. **No edita los archivos.**

## Input esperado

- `src/content/{tipo}/{slug}.md` (ajustar si usa `src/content/{tipo}/{topic}/{slug}.md`)
- `src/content/{tipo}/{slug}.es.md` (o `src/content/{tipo}/{topic}/{slug}.es.md`)

## Skills complementarias

Si están disponibles, invocar `ai-seo` o `seo-geo` para reforzar el análisis.

## Qué inspeccionar

### 1. Claridad de entidades

¿Un modelo de IA puede responder estas preguntas con confianza?

- ¿De qué trata esta página?
- ¿Qué pregunta responde?
- ¿Qué hechos proporciona?
- ¿Para quién es este contenido?
- ¿Puede un modelo citar este recurso?

### 2. Definiciones directas

- ¿Hay una definición clara del concepto principal?
- ¿Las definiciones están cerca del inicio?
- ¿Evitan jerga innecesaria?

### 3. Hechos y afirmaciones

- ¿Las afirmaciones son verificables?
- ¿Hay fuentes, versiones o referencias oficiales?
- ¿Evita afirmaciones vagas como `many tools` sin nombres?

### 4. Citas y fuentes

- ¿Se mencionan fuentes primarias (RFC, docs oficiales del lenguaje/framework, Docker/Kubernetes docs, MDN, OWASP para temas de seguridad)?
- ¿Los enlaces externos son funcionales y autorizados?
- ¿No hay `example.com` salvo que se indique placeholder?

### 5. Pasajes extraíbles

- ¿Hay bloques de respuesta clara que un sistema RAG pueda recuperar?
- ¿Las listas, tablas y ejemplos son autocontenidos?
- ¿Cada sección tiene una idea principal?

### 6. Relaciones explícitas

- ¿Se explican relaciones entre conceptos?
- ¿Hay comparaciones, trade-offs o decisiones claras?
- ¿El vocabulario es consistente a lo largo del recurso?

### 7. Estructura para IA

- Headings descriptivos.
- Párrafos no excesivamente largos.
- Listas y tablas con contexto.
- FAQ con preguntas y respuestas directas (para `FAQPage` schema).
- Código con lenguaje y explicación.
- `inLanguage` y `educationalLevel` presentes en JSON-LD y mapeados desde `difficulty`.
- Si aplica, datos `speakable` que marquen pasajes citables.

### 8. Multilingüe

- ¿La versión ES transmite los mismos hechos?
- ¿Las entidades clave son consistentes en ambos idiomas?

### 9. Paridad GEO bilingüe

- ¿Ambas versiones definen las mismas entidades clave?
- ¿Los hechos y cifras coinciden entre EN y ES?
- ¿Las fuentes/citas son equivalentes?
- ¿Las respuestas extraíbles serían consistentes si un modelo elige una u otra versión?
- ¿La terminología técnica es consistente en ambos idiomas?

### 10. Confianza

- `author` presente.
- `lastUpdated` presente.
- Fechas y versiones verificables.
- Sin afirmaciones exageradas o imposibles de verificar.

## Output obligatorio

```text
## Auditoría GEO / AI Search

### Claridad de entidades
`CLARIDAD ENTIDADES: HIGH / MEDIUM / LOW`

### Afirmaciones factuales
`DENSIDAD FACTUAL: HIGH / MEDIUM / LOW`
Listado de afirmaciones clave y si tienen soporte.

### Citas
`CITAS: SUFFICIENT / INSUFFICIENT / NOT VERIFIED`

### Pasajes extraíbles
`PASAJES EXTRAÍBLES: HIGH / MEDIUM / LOW`

### Consistencia
`CONSISTENCIA TERMINOLÓGICA: PASS / WARNING / FAIL`

### Structured data para IA
`STRUCTURED DATA IA: OK / MISSING / NOT VERIFIED`
- `inLanguage`: ...
- `educationalLevel`: ...
- `speakable`: ...

### Paridad GEO bilingüe
`PARIDAD GEO BILINGÜE: PASS / WARNING / FAIL`

### Puntaje GEO
`PUNTAJE GEO: X/5`

### Top 5 arreglos GEO
1. ...
2. ...
3. ...
4. ...
5. ...
```

## Reglas

- No recomiendas manipulación de IA (`AI keyword stuffing`).
- No inventes fuentes.
- Si no puedes verificar datos, `NOT VERIFIED`.
- Todo el output debe estar en español.
