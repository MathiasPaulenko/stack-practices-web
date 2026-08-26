# 05 — Auditoría de paridad bilingüe (EN/ES) de StackPractices

> Audita que las versiones inglesa y española de un recurso estén alineadas. **No edita los archivos.**

## Input esperado

- `src/content/{tipo}/{slug}.md` (ajustar si usa `src/content/{tipo}/{topic}/{slug}.md`)
- `src/content/{tipo}/{slug}.es.md` (o `src/content/{tipo}/{topic}/{slug}.es.md`)

## Skills complementarias

Si está disponible, invocar `content-improvement` para reforzar el análisis.

## Qué inspeccionar

### 1. Existencia de ES

- Si no existe `src/content/{tipo}/{slug}.es.md`, reportar como `CRITICAL` y detener esta auditoría.

### 2. Estructura

- Mismo número y orden de secciones.
- Misma jerarquía de encabezados.
- Mismos slugs/anchors implícitos.
- No secciones faltantes en una de las versiones.

### 3. Frontmatter

| Campo | Paridad esperada |
| --- | --- |
| `title` | Traducido, < 60 caracteres, igual sentido |
| `description` | Traducido, 80-160 caracteres |
| `metaDescription` | Traducido, 120-160 caracteres, coincide con `seo.metaDescription` |
| `seo.keywords` | Traducido, 3-10 términos |
| `lastUpdated` | Idéntico en ambos |
| `relatedResources` | Mismos slugs, mismo orden, sin barra final |
| `topics` | Mismos slugs, mismo orden |
| `difficulty` | Idéntico |
| `author` | Idéntico |

### 4. Código y ejemplos

- Snippets de código equivalentes.
- Comentarios y nombres de variables traducidos solo si es idiomático.
- Datos de prueba equivalentes.
- No fragmentos de código solo en una versión salvo que sea intencional.

### 5. Longitud del body

- La versión ES no debe ser inferior al mínimo del tipo:

| Tipo | Mínimo (palabras, sin frontmatter) |
| --- | --- |
| `recipes` | >= 1300 |
| `patterns` | >= 1500 |
| `guides` | >= 3000 |
| `docs` | >= 3000 |

### 6. Anglicismos en ES

Revisa que no haya anglicismos crudos donde haya alternativa idiomática:

- `stream` → `streaming` / `flujo`
- `match` → `coincidir`
- `baseline` → `línea base`
- `setup` → `configuración` / `preparación`
- `run the tests` → `ejecutar las pruebas`

Salvo que el término esté asentado técnicamente (`recipe`, `pattern`, `API`, `CI/CD`).

### 7. Enlaces

- Mismos enlaces internos con anclas descriptivas.
- Mismos `relatedResources`.
- URLs de imágenes/diagramas referenciadas igual.

### 8. Imágenes y alt text

- Si hay diagramas o imágenes, el `alt` text debe estar traducido.
- Mismas referencias a `/assets/images/diagrams/...`.

## Output obligatorio

```text
## Auditoría de paridad bilingüe

### Existe archivo ES
`YES / NO` (si NO, `CRITICAL`)

### Paridad de estructura
`PASS / WARNING / FAIL`

### Paridad de frontmatter
| Campo | EN | ES | OK |
| --- | --- | --- | --- |
| title | ... | ... | Sí/No |
| description | ... | ... | Sí/No |
| metaDescription | ... | ... | Sí/No |
| lastUpdated | ... | ... | Sí/No |
| relatedResources | ... | ... | Sí/No |

### Longitud del body
- EN: X caracteres
- ES: X caracteres
`PASS / WARNING / FAIL`

### Paridad de ejemplos de código
`PASS / WARNING / FAIL`

### Anglicismos en ES
- Lista de términos a revisar.

### Puntaje paridad bilingüe
`PUNTAJE PARIDAD BILINGÜE: X/10`

### Top 5 arreglos de paridad
1. ...
2. ...
3. ...
4. ...
5. ...
```

## Reglas

- No crees ni traduzcas la versión ES sin aprobación explícita del usuario.
- Si falta ES, solo reporta; no continúes con el resto de esta auditoría.
- Todo el output debe estar en español.
