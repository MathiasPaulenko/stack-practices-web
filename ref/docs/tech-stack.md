# Stack Tecnologico — StackPractices

> Documento de referencia completo sobre el stack tecnologico, dependencias, configuracion de build y flujo de desarrollo.

---

## 1. Vision General

StackPractices es un sitio estatico (SSG) generado con Astro 5. No hay backend, no hay base de datos, no hay cuentas de usuario. Todo el contenido se compila a HTML estatico en build time.

**Filosofia:**
- Static-first: cero runtime en el servidor
- Fast: SSG + hosting en CDN (GitHub Pages)
- SEO-optimized: meta tags, structured data, sitemap multilingue
- Maintainable: arquitectura simple y escalable

---

## 2. Core Framework

### Astro 5.6.1

- **Rol:** Framework principal de SSG (Static Site Generation)
- **Output:** `static` (`output: 'static'` en `astro.config.mjs`)
- **Formato de build:** `directory` (cada pagina genera `index.html` en su propia carpeta)
- **Trailing slash:** `ignore` (las URLs funcionan con o sin `/` final, pero internamente normalizamos a `/`)

**Por que Astro:**
- Zero JS by default: solo envia JavaScript cuando se necesita interactividad (islas)
- File-based routing automatico via `src/pages/`
- Content Collections con schemas Zod para type safety
- Soporte nativo para Markdown con frontmatter
- Compatibilidad con componentes de otros frameworks (React, Vue, etc.) si se necesita en el futuro

### TypeScript 5.8.3

- Configuracion strict en `tsconfig.json`
- Path aliases configurados:
  - `@/*` -> `src/*`
  - `@components/*` -> `src/components/*`
  - `@layouts/*` -> `src/layouts/*`

---

## 3. Styling

### Tailwind CSS v4.1.3 (CSS-first)

A diferencia de Tailwind v3, la v4 usa configuracion CSS-first (no `tailwind.config.js`).

- **Entry point:** `src/styles/global.css`
- **Plugin Vite:** `@tailwindcss/vite`
- **Typography plugin:** `@tailwindcss/typography` para estilos de contenido Markdown (`prose`)

**Configuracion en `astro.config.mjs`:**
```js
vite: {
  plugins: [tailwindcss()],
  build: {
    cssCodeSplit: true,
    minify: true,
  },
}
```

### Tokens de tema (definidos en `global.css`)

Ver `docs/design-system.md` para el detalle completo de colores, tipografia y espaciado.

---

## 4. Search

### Pagefind 1.3.0+

- **Tipo:** Busqueda estatica, zero runtime cost
- **Workflow:** Se indexa el contenido en `postbuild`
- **Comando:** `pagefind --site dist`
- **UI:** Se carga via script desde `/pagefind/pagefind.js`

**Como funciona:**
1. Astro build genera todo el HTML en `dist/`
2. Pagefind parsea los HTML y crea un indice invertido
3. El indice se sirve estaticamente; la busqueda ocurre 100% en el cliente
4. Pagefind respeta `data-pagefind-ignore` y `data-pagefind-filter`

**Filtros configurados:**
- `lang[en]`, `lang[es]` para filtrar por idioma

---

## 5. Analytics & Monetizacion

### Google Analytics 4

- **Measurement ID:** `G-RBE12WJ5KZ`
- **Implementacion:** `gtag.js` inline en `BaseLayout.astro`
- **Consent Mode v2:** Implementado (ver `docs/adsense.md`)

### Google Tag Manager

- **Container ID:** `GTM-M66C9FWN`
- **Carga:** Inline script en `<head>` de `BaseLayout.astro`

### Google AdSense

- **Publisher ID:** `ca-pub-9762280383707953`
- **ads.txt:** Presente en `public/ads.txt`
- **Carga condicional:** Solo despues de consentimiento de publicidad (Consent Mode v2)

---

## 6. Dependencias

### Produccion (`dependencies`)

| Paquete | Version | Proposito |
|---------|---------|-----------|
| `astro` | `^5.6.1` | Framework SSG |

### Desarrollo (`devDependencies`)

| Paquete | Version | Proposito |
|---------|---------|-----------|
| `@astrojs/check` | `^0.9.4` | Type checking de archivos `.astro` |
| `@tailwindcss/typography` | `^0.5.16` | Estilos `prose` para contenido Markdown |
| `@tailwindcss/vite` | `^4.1.3` | Plugin Vite para Tailwind v4 |
| `front-matter` | `^4.0.2` | Parsing de frontmatter YAML en scripts Node |
| `pagefind` | `^1.3.0` | Busqueda estatica |
| `tailwindcss` | `^4.1.3` | Framework CSS utility-first |
| `typescript` | `^5.8.3` | Type checking |

### Nota sobre dependencias

El proyecto mantiene un numero minimo de dependencias. No se usa:
- React/Vue/Preact (a menos que se necesiten islas interactivas)
- Ningun framework CSS aparte de Tailwind
- Ninguna libreria de iconos (se usan SVG inline o Lucide si se importa)
- Ningun CMS headless

---

## 7. Scripts de npm (`package.json`)

| Script | Comando | Descripcion |
|--------|---------|-------------|
| `dev` | `astro dev` | Servidor de desarrollo en `localhost:4321` |
| `start` | `astro dev` | Alias de `dev` |
| `build` | `astro build` | Build de produccion + SSG |
| `postbuild` | `pagefind --site dist` | Indexado de busqueda (corre automaticamente despues de `build`) |
| `preview` | `astro preview` | Servidor de preview del build |
| `check` | `astro check` | Type checking de todos los archivos `.astro` |
| `sync` | `astro sync` | Sincroniza tipos de content collections |
| `sitemap` | `node scripts/generate-sitemap.cjs` | Genera `public/sitemap.xml` |
| `content:index` | `node .agents/.../generate-content-index.cjs` | Genera indices JSON de contenido |
| `content:validate` | `node .agents/.../validate-content.cjs` | Valida frontmatter y estructura |
| `content:quality` | `node .agents/.../content-quality-validator.cjs` | Valida calidad de contenido |
| `content:links` | `node .agents/.../check-broken-links.cjs` | Verifica links rotos |

---

## 8. Configuracion de Build

### `astro.config.mjs`

```js
export default defineConfig({
  site: 'https://stackpractices.com',
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  build: {
    format: 'directory',
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      minify: true,
    },
  },
});
```

**Decisiones clave:**
- `site`: URL canonica para generacion de sitemaps y meta tags
- `output: 'static'`: Sin SSR, sin funciones edge
- `trailingSlash: 'ignore'`: Compatible con GitHub Pages
- `compressHTML: true`: Minificacion de HTML en build
- `format: 'directory'`: Cada ruta genera `index.html` en su carpeta (ej. `/about/index.html`)
- `shikiConfig.theme: 'github-dark'`: Syntax highlighting oscuro para code blocks

---

## 9. Flujo de Desarrollo

### Setup inicial

```bash
git clone <repo>
cd stack-practices-web
npm install
```

### Desarrollo local

```bash
npm run dev
# http://localhost:4321
```

### Type checking

```bash
npm run check
```

### Build completo

```bash
npm run build
# Genera dist/ + index Pagefind
```

### Preview del build

```bash
npm run preview
# Sirve dist/ en localhost para verificar antes de deploy
```

### Generar sitemap manualmente

```bash
npm run sitemap
# Actualiza public/sitemap.xml basado en contenido actual
```

---

## 10. Estructura de Archivos Relevante

```
stack-practices-web/
├── astro.config.mjs          # Configuracion Astro
├── package.json              # Dependencias y scripts
├── tsconfig.json             # Configuracion TypeScript strict
├── public/                   # Assets estaticos (copiados a dist/)
│   ├── ads.txt
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── favicon.svg
│   └── og-image.png
├── src/
│   ├── components/           # Componentes Astro reutilizables
│   ├── config/site.ts        # Configuracion central del sitio
│   ├── content/              # Content Collections (Markdown)
│   ├── content.config.ts     # Schemas Zod
│   ├── layouts/              # Layouts de pagina
│   ├── lib/                  # Utilidades (schema, content)
│   ├── pages/                # File-based routing
│   └── styles/               # CSS global y tokens
├── scripts/
│   └── generate-sitemap.cjs  # Script de generacion de sitemap
└── .github/workflows/
    └── deploy.yml            # CI/CD para GitHub Pages
```

---

## 11. Notas de Mantenimiento

### Actualizacion de Astro

```bash
npm update astro
npm run check
npm run build
```

Verificar breaking changes en el changelog de Astro antes de actualizar versiones mayores.

### Actualizacion de Tailwind

Tailwind v4 usa CSS-first configuration. Los tokens estan en `src/styles/global.css` dentro del bloque `@theme`. No hay `tailwind.config.js`.

### Pagefind

Si se cambian los selectores de contenido (ej. `data-pagefind-body`), reconstruir el indice:
```bash
npm run build
```

---

## 12. Troubleshooting

### `astro check` falla despues de cambiar content collections

```bash
npm run sync
npm run check
```

### Pagefind no indexa contenido nuevo

Asegurarse de que los elementos de contenido tengan `data-pagefind-body`. El build debe completarse exitosamente; Pagefind corre en `postbuild`.

### Tailwind classes no se aplican

- Verificar que el archivo `global.css` se importa en `BaseLayout.astro`
- Tailwind v4 no requiere `@tailwind` directives; usa `@import "tailwindcss"`

### Links a `/es/` duplicados

En paginas ES, el `path` prop de `Seo.astro` debe ser sin prefijo `/es`. Ver `docs/seo.md` para detalles.
