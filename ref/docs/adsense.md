# AdSense & Monetizacion — StackPractices

> Estrategia de monetizacion, cumplimiento de Google AdSense, Consent Mode v2, y politicas legales.

---

## 1. Estrategia de Monetizacion

| Fase | Fuente | Estado |
|------|--------|--------|
| 0-1 | Ninguna | Completado |
| 2 | Google AdSense | Implementado, pendiente aprobacion |
| 3 | Affiliate Marketing | Planificado |
| 4 | Donaciones (Ko-fi) | Activo |
| Futuro | Templates, ebooks | Exploracion |

**Regla:** UX siempre prioridad sobre monetizacion.

---

## 2. AdSense Setup

- **Publisher ID:** `ca-pub-9762280383707953`
- **ads.txt:** `public/ads.txt`
- **GTM Container:** `GTM-M66C9FWN`
- **GA4 ID:** `G-RBE12WJ5KZ`

---

## 3. Google Consent Mode v2

### 3.1 Parametros

| Parametro | Significado |
|-----------|-------------|
| `ad_storage` | Cookies de publicidad |
| `analytics_storage` | Cookies de analiticas |
| `ad_user_data` | Datos de usuario para ads |
| `ad_personalization` | Personalizacion de anuncios |

### 3.2 Implementacion en BaseLayout.astro

**Paso 1 — Default Denied (primero en `<head>`):**
```js
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'analytics_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'wait_for_update': 500
});
```

**Paso 2 — GTM carga despues.**

**Paso 3 — gtag.js para GA4.**

**Paso 4 — AdSense condicional:**
```js
window.spConsent = {
  STORAGE_KEY: 'sp-cookie-consent',
  getStoredConsent() { /* lee localStorage */ },
  loadAdSense() { /* inyecta script adsbygoogle */ }
};
// Solo carga si consent previo tiene ad_storage === 'granted'
```

### 3.3 CookieBanner.astro

Ofrece 3 botones: Decline / Manage / Accept All.

**Modal de preferencias:**
- Essential: siempre on, disabled
- Analytics: toggle independiente
- Advertising: toggle independiente

Al guardar: `gtag('consent', 'update', {...})` + carga AdSense si `ad_storage === 'granted'`.

### 3.4 Formato de Storage

```json
{
  "analytics_storage": "granted|denied",
  "ad_storage": "granted|denied",
  "ad_user_data": "granted|denied",
  "ad_personalization": "granted|denied"
}
```

Clave: `localStorage['sp-cookie-consent']`

---

## 4. Paginas Legales

Todas existen en EN + ES:

| Pagina | EN | ES | Estado |
|--------|-----|-----|--------|
| Privacy Policy | `/privacy` | `/es/privacy` | Creada |
| Terms of Service | `/terms` | `/es/terms` | Creada |
| Cookie Policy | `/cookies` | `/es/cookies` | Creada |
| Legal Notice | `/legal-notice` | `/es/legal-notice` | Creada |
| Affiliate Disclosure | `/affiliate-disclosure` | `/es/affiliate-disclosure` | Creada |
| Editorial Policy | `/editorial-policy` | `/es/editorial-policy` | Creada |

---

## 5. Auditoria de Cumplimiento

Ver `ref/adsense-compliance-audit.md` para auditoria detallada.

**Estado resumen:**

| Categoria | Estado |
|-----------|--------|
| Paginas legales | Completas |
| ads.txt | Presente |
| robots.txt / sitemap | OK |
| Cookie consent (v2) | Implementado |
| Contenido prohibido | Limpio |
| Thin content | Pendiente (alta prioridad) |
| E-E-A-T | Reforzandose |
| Editorial policy | Creada |

---

## 6. Aplicacion a AdSense

**Publisher ID:** ya en ads.txt.
**Estado:** pendiente de aplicacion o aprobacion.

**Pre-requisitos antes de aplicar:**
- [x] ads.txt valido
- [x] Cookie consent v2 implementado
- [x] Paginas legales completas
- [x] Editorial policy creada
- [ ] Thin content resuelto (meta descripciones unicas, >1000 palabras)
- [ ] E-E-A-T reforzado (pagina /authors con bio detallada)
