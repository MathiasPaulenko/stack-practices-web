# Accesibilidad (a11y) — StackPractices

> Estrategia, implementacion y checklist de accesibilidad siguiendo WCAG 2.2.

---

## 1. Estrategia de Accesibilidad

StackPractices se compromete a cumplir **WCAG 2.2 Nivel AA** como minimo. Esto beneficia:
- Usuarios con discapacidad visual (screen readers)
- Usuarios con discapacidad motora (navegacion por teclado)
- Usuarios con dificultades cognitivas (contenido claro y estructurado)
- Todos los usuarios (accesibilidad mejora UX general)

---

## 2. Estructura Semantica

### 2.1 HTML Semantico

- `<header>` para navegacion principal
- `<main id="main">` para contenido principal
- `<article>` para articulos de contenido
- `<nav>` para menus de navegacion
- `<footer>` para pie de pagina
- `<section>` con headings para agrupar contenido
- `<time>` para fechas

### 2.2 Headings Jerarquicos

- H1: unico por pagina (titulo del articulo)
- H2: secciones principales
- H3: subsecciones
- No saltarse niveles

### 2.3 Landmarks ARIA

```html
<header role="banner">
<nav role="navigation">
<main id="main" role="main">
<footer role="contentinfo">
```

---

## 3. Navegacion por Teclado

### 3.1 Skip Link

Componente `SkipLink.astro` permite saltar navegacion:

```html
<a href="#main" class="skip-link">Skip to main content</a>
```

Visible solo al recibir focus (teclado).

### 3.2 Focus Visible

```css
:focus-visible {
  outline: 2px solid var(--color-brand-600);
  outline-offset: 2px;
}
```

Nunca ocultar focus outline. Los usuarios de teclado necesitan ver donde estan.

### 3.3 Tab Order

- Tab order logico (top -> bottom, left -> right)
- No traps de focus (especialmente en modales)
- Cookie banner modal maneja focus correctamente

---

## 4. Imagenes y Media

### 4.1 Alt Text

Todas las imagenes deben tener `alt` descriptivo:

```html
<!-- Informativa -->
<img src="diagram.png" alt="Diagrama del patron Factory mostrando las relaciones entre Creator, Product y ConcreteProduct" />

<!-- Decorativa -->
<img src="hero-bg.png" alt="" role="presentation" />
```

### 4.2 SVG

Los SVG decorativos usan `aria-hidden="true"`:

```html
<svg aria-hidden="true" focusable="false">...</svg>
```

---

## 5. Color y Contraste

### 5.1 Paleta Accesible

Todos los pares de color del design system pasan WCAG AA:

| Par | Ratio WCAG | Nivel |
|-----|------------|-------|
| slate-900 (texto) sobre white | 15.3:1 | AAA |
| white sobre slate-900 | 15.3:1 | AAA |
| brand-600 sobre white | 5.3:1 | AA |
| slate-600 sobre slate-50 | 7.1:1 | AA |

### 5.2 No Depender Solo del Color

- Links tienen underline o cambio de color + cursor pointer
- Errores usan texto + icono, no solo color rojo
- Estados activos usan combinacion de color + forma

---

## 6. Animacion y Movimiento

### 6.1 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .hero-animated-bg::before,
  .hero-animated-bg::after,
  .hero-dot,
  .hero-code-symbol {
    animation: none !important;
  }
}
```

Todos los elementos animados respetan `prefers-reduced-motion`.

---

## 7. Formularios (Cuando Apliquen)

### 7.1 Labels

```html
<label for="email">Email address</label>
<input id="email" type="email" name="email" required />
```

### 7.2 Estados de Error

```html
<input aria-invalid="true" aria-describedby="email-error" />
<span id="email-error" role="alert">Please enter a valid email.</span>
```

---

## 8. Aria y Roles

### 8.1 Banner de Cookies

```html
<div role="dialog" aria-modal="true" aria-labelledby="cookie-title">
  <h2 id="cookie-title">Cookie Preferences</h2>
</div>
```

### 8.2 Toggle Switches

```html
<button role="switch" aria-checked="false" aria-label="Enable analytics">
  <span>Off</span>
  <span>On</span>
</button>
```

---

## 9. Checklist WCAG 2.2 AA

### Perceptible
- [ ] Texto alternativo en imagenes (1.1.1)
- [ ] Videos con subtitulos (1.2.2)
- [ ] Contraste minimo 4.5:1 (1.4.3)
- [ ] Texto redimensionable hasta 200% (1.4.4)
- [ ] No depender solo de color (1.4.1)

### Operable
- [ ] Todo funciona con teclado (2.1.1)
- [ ] No traps de focus (2.1.2)
- [ ] Skip links presentes (2.4.1)
- [ ] Titulos de pagina descriptivos (2.4.2)
- [ ] Orden de focus logico (2.4.3)
- [ ] Objetivos de tamano minimo 24x24px (2.5.5)

### Comprensible
- [ ] Idioma de pagina declarado (3.1.1)
- [ ] Expansiones de abreviaturas (3.1.4)
- [ ] Labels y instrucciones (3.3.2)
- [ ] Sugerencias de error (3.3.3)

### Robusto
- [ ] HTML valido (4.1.1)
- [ ] Nombre y rol de componentes (4.1.2)
- [ ] Mensajes de estado anunciados (4.1.3)

---

## 10. Herramientas de Testing

| Herramienta | Uso |
|-------------|-----|
| axe DevTools | Auditoria automatica en browser |
| Lighthouse a11y | Reporte integrado |
| NVDA / JAWS | Screen reader testing |
| Tab navigation | Test manual con solo teclado |
| WAVE | Analisis visual de errores |

---

## 11. Progreso Actual

**Implementado:**
- Skip link
- Focus visible
- Semantic HTML
- Reduced motion media query
- Alt text en imagenes
- ARIA en cookie banner

**Pendiente:**
- [ ] Test con screen reader
- [ ] Verificar tab order en cookie banner modal
- [ ] Anadir aria-live para copy-to-clipboard
- [ ] Audit completo con axe
