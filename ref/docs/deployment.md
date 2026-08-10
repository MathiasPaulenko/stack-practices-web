# Deployment & CI/CD — StackPractices

> Como se construye, testea y despliega el sitio automaticamente.

---

## 1. Hosting

- **Proveedor:** GitHub Pages
- **Dominio:** `stackpractices.com`
- **Tipo:** Static Site Hosting (CDN global)
- **HTTPS:** Automatico via Let's Encrypt

---

## 2. Pipeline de CI/CD

Archivo: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

### 2.1 Flujo

1. Push a `main` o manual (`workflow_dispatch`)
2. Checkout del codigo
3. Setup Node.js 20 con cache de npm
4. `npm ci` (instalacion limpia)
5. `npm run build` (Astro build + Pagefind index)
6. Upload artifact `dist/` a GitHub Pages
7. Deploy automatico

### 2.2 Tiempo Tipico

- Build Astro: ~5-8 minutos
- Pagefind index: ~1-2 minutos
- Total pipeline: ~10 minutos

---

## 3. Estructura de Build Output

```
dist/
├── index.html                          # Home EN
├── es/
│   └── index.html                      # Home ES
├── recipes/
│   ├── index.html                      # Listado recipes
│   └── data/
│       └── parse-json/
│           └── index.html              # Detalle recipe
├── patterns/
│   └── ...
├── docs/
│   └── ...
├── guides/
│   └── ...
├── about/
│   └── index.html
├── contact/
│   └── index.html
├── privacy/
│   └── index.html
├── terms/
│   └── index.html
├── cookies/
│   └── index.html
├── legal-notice/
│   └── index.html
├── affiliate-disclosure/
│   └── index.html
├── editorial-policy/
│   └── index.html
├── authors/
│   └── index.html
├── tags/
│   └── [tag]/
│       └── index.html
├── topics/
│   └── [topic]/
│       └── index.html
├── rss.xml                             # Feed RSS EN
├── es/
│   └── rss.xml                         # Feed RSS ES
├── search/
│   └── index.html
├── pagefind/                           # Busqueda estatica
│   ├── pagefind.js
│   ├── pagefind-ui.js
│   ├── pagefind-ui.css
│   └── ...
├── sitemap.xml                         # Sitemap
├── robots.txt                          # Robots
├── ads.txt                             # AdSense
├── favicon.svg
├── og-image.png
└── assets/
    └── content/                        # Indices JSON de contenido
```

---

## 4. Pre-Deploy Checklist

Antes de mergear a `main`:

```bash
npm run check      # Type checking
npm run build      # Build completo
npm run preview    # Verificar visualmente
npm run sitemap    # Actualizar sitemap
```

### 4.1 Checklist Manual

- [ ] `astro check` pasa sin errores
- [ ] `npm run build` exitoso
- [ ] Nuevas paginas aparecen en `dist/`
- [ ] Sitemap actualizado (si se anadio contenido)
- [ ] Meta tags correctos en HTML generado
- [ ] Hreflang presentes en paginas bilingues
- [ ] Canonical URLs sin duplicacion `/es/es/`
- [ ] Pagefind indexa nuevo contenido

---

## 5. Rollback

GitHub Pages no soporta rollback directo. Estrategias:

1. **Reverter commit:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Force push a commit anterior:**
   ```bash
   git reset --hard <commit-hash>
   git push --force origin main
   ```

3. **Usar workflow_dispatch:**
   Se puede desplegar manualmente desde cualquier branch.

---

## 6. Dominio Personalizado

GitHub Pages soporta dominios custom via CNAME:

1. En repo settings > Pages > Custom domain: `stackpractices.com`
2. En DNS del dominio:
   - A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - O CNAME: `<username>.github.io`

El archivo `public/.nojekyll` desactiva el procesamiento de Jekyll de GitHub Pages.

---

## 7. Monitoring Post-Deploy

### 7.1 Google Search Console

- Verificar propiedad: `stackpractices.com`
- Sitemap: `https://stackpractices.com/sitemap.xml`
- Revisar: Coverage, Core Web Vitals, Mobile Usability

### 7.2 Google Analytics 4

- Property: StackPractices
- Measurement ID: `G-RBE12WJ5KZ`
- Monitorear: trafico, engagement, bounce rate, paths populares

### 7.3 PageSpeed Insights

Verificar periodicamente:
- LCP (Largest Contentful Paint)
- INP (Interaction to Next Paint)
- CLS (Cumulative Layout Shift)

---

## 8. Troubleshooting de Deploy

### Build falla en CI pero funciona local

- Verificar Node version (CI usa 20)
- Verificar que `package-lock.json` esta commitado
- Verificar que no hay archivos `.astro` con errores de type

### Pagefind no indexa

- Asegurar que `data-pagefind-body` esta presente
- Verificar que el build genera HTML valido

### 404 en rutas ES

- Verificar que `src/pages/es/` tiene los archivos correspondientes
- Verificar que `getStaticPaths` genera paths ES correctamente

### CSS no aplica

- Verificar que `global.css` se importa en `BaseLayout.astro`
- Tailwind v4 usa `@import "tailwindcss"` (no `@tailwind` directives)
