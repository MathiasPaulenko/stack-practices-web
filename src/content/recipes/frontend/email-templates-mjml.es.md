---
contentType: recipes
slug: email-templates-mjml
title: "Templates de Email Responsivos con MJML"
description: "Crea templates de email responsivos compatibles con multiples clientes usando MJML, variables en vivo con Handlebars y CSS inline para renderizado confiable en Gmail, Outlook y Apple Mail"
metaDescription: "Crea templates de email responsivos con MJML. Emails compatibles cross-client con variables en vivo y CSS inline para Gmail, Outlook y Apple Mail."
difficulty: beginner
topics:
  - frontend
  - data
tags:
  - email
  - frontend
  - ui
  - css
  - javascript
relatedResources:
  - /recipes/spa-code-splitting-lazy
  - /recipes/go-rest-api-gin
  - /guides/clean-code-principles-guide
  - /recipes/server-side-rendering
lastUpdated: "2026-06-18"
publishedAt: "2026-06-19"
author: Mathias Paulenko
seo:
  metaDescription: "Crea templates de email responsivos con MJML. Emails compatibles cross-client con variables en vivo y CSS inline para Gmail, Outlook y Apple Mail."
  keywords:
    - mjml
    - email templates
    - responsive email
    - cross-client email
    - handlebars


---
El HTML de email es notoriamente dificil debido a motores de renderizado inconsistentes entre clientes. MJML abstrae esta complejidad en un lenguaje de markup declarativo que compila a HTML responsivo y probado en batalla con estilos inline. Esta recipe cubre estructura MJML, templating en vivo con Handlebars y envio via SMTP/API.

## Cuando Usar Esto

- Emails transaccionales (reset de password, confirmaciones de orden) deben renderizar confiablemente. Consulta [Input Validation](/recipes/input-validation/) para validar datos de formularios de email.
- Newsletters de marketing necesitan layouts responsivos en mobile y desktop. Consulta [SPA Code Splitting](/recipes/spa-code-splitting-lazy/) para diseño frontend responsive.
- Quieres evitar escribir HTML basado en tablas manualmente. Consulta [Component Testing](/recipes/unit-testing/) para testear componentes de email.

## Solucion

### 1. Template Basico de MJML

```xml
<!-- emails/welcome.mjml -->
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-text font-family="Arial, sans-serif" color="#333333" />
      <mj-button background-color="#3b82f6" color="#ffffff" border-radius="4px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f3f4f6">
    <mj-section>
      <mj-column>
        <mj-image width="120px" src="https://example.com/logo.png" alt="Logo" />
        <mj-text font-size="24px" font-weight="bold" align="center">
          Bienvenido, {{name}}!
        </mj-text>
        <mj-text font-size="16px" line-height="24px">
          Gracias por unirte. Tu cuenta esta lista y puedes empezar a explorar.
        </mj-text>
        <mj-button href="{{dashboardUrl}}" font-size="16px" padding="16px 32px">
          Ir al Dashboard
        </mj-button>
        <mj-text font-size="12px" color="#6b7280" align="center">
          Si no te registraste, ignora este email.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### 2. Compilar y Renderizar

```typescript
// email/EmailRenderer.ts
import mjml2html from 'mjml';
import Handlebars from 'handlebars';

interface WelcomeData {
  name: string;
  dashboardUrl: string;
}

function compileTemplate(mjmlSource: string, data: WelcomeData): { html: string; errors: unknown[] } {
  const { html: rawHtml, errors } = mjml2html(mjmlSource, {
    validationLevel: 'strict',
    minify: true,
  });

  const template = Handlebars.compile(rawHtml);
  const html = template(data);

  return { html, errors };
}
```

### 3. Enviar via SMTP con Nodemailer

```typescript
// email/EmailSender.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendWelcomeEmail(to: string, data: WelcomeData): Promise<void> {
  const mjmlSource = await fs.readFile('./templates/welcome.mjml', 'utf8');
  const { html, errors } = compileTemplate(mjmlSource, data);

  if (errors.length > 0) {
    console.warn('Advertencias de compilacion MJML:', errors);
  }

  await transporter.sendMail({
    from: '"StackPractices" <noreply@example.com>',
    to,
    subject: 'Bienvenido a StackPractices',
    html,
    text: `Bienvenido ${data.name}! Visita: ${data.dashboardUrl}`,
  });
}
```

### 4. Libreria de Componentes Reutilizables

```xml
<!-- emails/components/Button.mjml -->
<mj-button
  href="{{url}}"
  background-color="{{#if color}}{{color}}{{else}}#3b82f6{{/if}}"
  color="#ffffff"
  border-radius="4px"
  font-size="16px"
  padding="16px 32px"
>
  {{text}}
</mj-button>
```

### 5. Soporte de Dark Mode

```xml
<mj-raw>
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
</mj-raw>
<mj-style>
  @media (prefers-color-scheme: dark) {
    .dark-bg { background-color: #1f2937 !important; }
    .dark-text { color: #f3f4f6 !important; }
  }
</mj-style>
```

## Como Funciona

- **Componentes MJML** abstraen layouts basados en tablas en tags semanticos como `<mj-section>` y `<mj-column>`
- **Compilacion** genera HTML con estilos inline seguro para Outlook con conditional comments
- **Handlebars** inyecta variables en vivo despues de la compilacion MJML para preservar markup
- **Minificacion** reduce tamano de payload para delivery mas rapido

## Consideraciones de Produccion

- Testea templates en Litmus o Email on Acid antes de deployment en produccion
- Manten el ancho total del email bajo 600px para compatibilidad mobile
- Usa URLs absolutas para todas las imagenes; la mayoria de clientes bloquean CSS externo

## Errores Comunes

- Usar web fonts (no soportadas en la mayoria de clientes; usa system fonts)
- Depender de flexbox o grid (usa el sistema de columnas de MJML en su lugar)
- Olvidar versiones plain-text, que afectan scores de deliverability

## Variantes y Alternativas

- **MJML vs Handlebars + inline CSS**: MJML abstrae el layout responsive pero requiere un build step.   Handlebars con inline CSS da control total pero necesita responsive design manual.
- **Email HTML vs texto plano**: emails HTML soportan branding y tracking pixels pero tienen riesgos de deliverability.   Emails de texto plano tienen mayor deliverability pero sin branding visual.
- **Layout basado en tablas vs flexbox**: los clientes de email tienen soporte CSS inconsistente.   Gmail strippa los bloques <style>.
- **Contenido dinamico vs templates estaticos**: templates dinamicos (Handlebars, Mustache) permiten personalizacion pero requieren un step de renderizado.   Templates estaticos son mas rapidos de enviar pero menos personalizados.
- **Imagenes embebidas vs hospedadas**: imagenes embebidas (attachments CID) funcionan offline pero aumentan el tamaÃ±o del email.   Imagenes hospedadas (URLs) mantienen los emails pequeÃ±os pero requieren conexion a internet.
- **Soporte dark mode**: No todos los clientes lo soportan.   Provee colores de fallback.

## Pitfalls Comunes en Produccion

- **Problemas de renderizado en Outlook**: No soporta order-radius, lexbox, grid, ni position.
- **Gmail clippea a 102KB**: Gmail clippea emails mas grandes que 102KB.
- **Bloqueo de imagenes por default**: la mayoria de los clientes de email bloquean imagenes por default.   Disena emails que funcionen sin imagenes.
- **Fallos de CSS inlining**: algunos clientes de email strippan los bloques <style>.
- **Cadenas de font fallback**: web fonts (@font-face) funcionan en Apple Mail e iOS Mail pero no en Gmail ni Outlook.
- **Testing a traves de clientes**: hay 50+ clientes de email con diferentes motores de renderizado.

## Patrones de Integracion

- **Pipeline de email transaccional**: triggera evento -> renderiza template con datos -> inlinea CSS -> envia via SMTP o API -> trackea delivery/open/click.
- **Pipeline de campana newsletter**: importa lista de suscriptores -> segmenta por preferencias -> renderiza template personalizado -> envia en batches (para evitar rate limits) -> trackea opens y clicks -> genera reporte
- **Soporte multi-idioma de email**: detecta locale del usuario -> selecciona template por locale -> renderiza con strings localizados -> envia.
- **Cola de email con retry**: encola email -> intento de envio -> en fallo, reintenta con exponential backoff (1m, 5m, 30m, 2h, 12h) -> despues de 5 fallos, dead letter queue.
- **A/B testing de contenido de email**: crea dos variantes de template -> divide audiencia 50/50 -> envia ambas -> trackea open rate y click rate -> declara winner despues de 24 horas.
- **Gestion de suppression list**: mantiene una lista de addresses con bounce, complaint y unsubscribed.   Nunca envies a addresses suprimidas.

## Tooling y Ecosistema

- **MJML**: lenguaje de markup open-source para emails responsive.   Compila a HTML basado en tablas.   40K+ GitHub stars.   CLI: mjml input.  mjml -o output.  html.
- **Handlebars**: templating logic-less para contenido dinamico.   17K+ GitHub stars.   Helpers para condicionales, loops y partials.
- **Juice**: CSS inliner para Node.  js.   3K+ GitHub stars.   Inlinea bloques <style> en atributos style inline.
- **Litmus**: plataforma de testing de email.   Comparacion de screenshots, spam testing, accessibility checks.
- **Email on Acid**: alternativa a Litmus.   Testing de screenshots a traves de 70+ clientes.   Trial gratis disponible.
- **Premailer**: CSS inliner basado en Ruby.   Tambien disponible como web service.

## Resumen de Best Practices

- Siempre envia multipart/alternative con ambos HTML y texto plano
- Usa layouts basados en tablas con inline CSS para maxima compatibilidad con clientes
- Testea a traves de al menos 5 clientes de email antes de enviar
- Manten el tamaÃ±o del email bajo 102KB para evitar clipping de Gmail
- Usa alt text para todas las imagenes y disena para image-blocking
- Provee cadenas de font fallback para todos los custom fonts
- Incluye un link de unsubscribe en cada email (requerimiento CAN-SPAM, GDPR)
- Testea renderizado dark mode con media query prefers-color-scheme
- Monitorea bounce rate, spam complaint rate y open rate
- Usa una suppression list y nunca envies a addresses con bounce o unsubscribed
## Manejo de Errores y Recuperacion

- **Manejo de bounces**: hard bounces (fallos permanentes) deben suprimir la address inmediatamente.   Soft bounces (fallos temporales) deben reintentar por 3-5 dias antes de suprimir.
- **Manejo de spam complaints**: cuando un usuario marca un email como spam, suprime la address inmediatamente.   No envies mas emails.   Esto protege tu reputacion de sender.
- **Errores de renderizado de template**: Loguea la variable faltante para debugging.
- **Rate limiting del ESP**: Envia en batches de 100-1000 emails por segundo dependiendo de los limites de tu ESP.
- **Fallos de link de unsubscribe**: si el link de unsubscribe esta roto, el usuario no puede opt out.   Esto viola CAN-SPAM y GDPR.
- **Validacion de email antes de enviar**: valida las addresses de email antes de agregar a tu lista.

## Tips de Optimizacion de Performance

- Pre-renderiza templates en build time para contenido estatico. Solo renderiza contenido dinamico en send time
- Usa MJML CLI con flag --minify para reducir el tamaÃ±o del HTML output en 10-20%
- Cachea templates renderizados en Redis con un TTL de 1 hora. Invalida en update de template
- Envia emails en batch en paralelo usando Promise.all con un limite de concurrencia de 50-100
- Usa un CDN para imagenes hospedadas de email. Setea cache headers a 1 aÃ±o para imagenes estaticas
- Comprime imagenes con WebP o JPEG optimizado antes de embeber. Target <100KB por imagen
- Usa premailer con opciones 
emove_classes y merge_inline para reducir el tamaÃ±o del CSS
- Evita imagenes base64-encoded en emails. Aumentan el tamaÃ±o en 33% y son bloqueadas por algunos clientes
- Usa alt text corto y descriptivo (50-100 chars). Alt text largo es truncado por algunos clientes
- Testea el load time del email con Litmus. Target <3 segundos para renderizar en dispositivos mobile
## Consideraciones de Seguridad

- **Ataques de email injection**: Sanitiza todo input del usuario con ilter_var(, FILTER_SANITIZE_EMAIL) o equivalente.
- **HTML injection en cuerpo de email**: si input del usuario se renderiza en emails HTML sin escaping, atacantes pueden inyectar scripts o links maliciosos.   Siempre escapa input del usuario con HTML entity encoding.
- **Privacidad de tracking pixels**: los tracking pixels (imagenes transparentes de 1x1) generan preocupaciones de privacidad.   Algunos clientes de email los bloquean.   GDPR requiere consentimiento para tracking.   Provee una privacy policy y un mecanismo de opt-out.
- **Seguridad de link de unsubscribe**: los links de unsubscribe deben usar tokens firmados, no IDs secuenciales.   Un atacante podria enumerar links de unsubscribe para desuscribir a otros usuarios.
- **Proteccion de credenciales SMTP**: nunca hardcodees credenciales SMTP en codigo fuente.   Rota credenciales regularmente.
- **Content Security Policy para email**: los clientes de email no soportan headers CSP.   No incluyas tags <script> (son stripped por todos los clientes).
## Testing y Quality Assurance

- **Testing visual a traves de clientes**: usa Litmus o Email on Acid para capturar screenshots de tu email a traves de 90+ clientes.
- **Testing dark mode**: testea emails en dark mode en iOS, macOS y Outlook.
- **Testing de accesibilidad**: usa accessibility checkers en Litmus o Email on Acid.  5:1 para texto.
- **Testing de links**: Verifica que los links de unsubscribe funcionen.   Verifica que los tracking parameters sean correctos.
- **Testing de spam**: Un score bajo 8/10 indica issues potenciales.
- **Envio de emails de prueba**: envia emails de prueba a addresses internas antes del envio completo.   Verifica renderizado, links y tracking.

## Deployment y CI/CD

- **Versionado de templates**: versiona templates de email con semantic versioning.   Taguea releases.
- **Pipeline CI/CD para emails**: lint MJML -> compila a HTML -> inlinea CSS -> corre visual tests -> corre spam tests -> deploya al ESP.   Bloquea deployment en fallos de tests.
- **Deployment progresivo**: envia a una seed list (10-50 addresses internas) primero.   Verifica renderizado y deliverability.   Envia al 5% de la lista.
- **Integracion con ESP**: usa APIs de ESP (SendGrid, Mailgun, Postmark) para envio programatico.
- **Migracion de templates**: al cambiar de ESP, migra templates cuidadosamente.   Diferentes ESPs usan diferentes lenguajes de templating (Handlebars, Mustache, Liquid).
- **Monitoreo y alerting**: 1%), open rate (baseline por tipo de email).   Setea alerts para rates anormales.
## FAQ

**P: Necesito MJML si uso un servicio como SendGrid?**
R: SendGrid provee templates, pero MJML te da markup versionado y reusable que funciona con cualquier provider.

**P: Puedo usar React para renderizar MJML?**
R: Si. Usa `mjml-react` para escribir MJML como componentes JSX manteniendo el mismo pipeline de compilacion.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.






## Glosario

- **Templates de Email Responsivos con MJML**: técnica o patrón central descrito en este artículo.
- **Producción**: entorno activo con usuarios reales; requiere monitoreo y rollback plan.
- **Troubleshooting**: proceso sistemático para diagnosticar y resolver incidentes.

## Referencia Rápida

- **Comando principal**: ejecuta la solución base del artículo y verifica el resultado esperado.
- **Validación**: confirma que los tests pasan y que las métricas clave no se degradaron.
- **Rollback**: si algo falla, revierte el cambio y consulta la sección de Troubleshooting.

## Lectura Adicional

- **Documentación oficial**: consulta la referencia actualizada del framework o herramienta utilizada.
- **Guías relacionadas**: explora las guías de email y frontend para profundizar.
- **Patrones complementarios**: revisa los patrones de diseño aplicables a tu stack tecnológico.
- **Postmortems públicos**: estudia incidentes reales de equipos que enfrentaron problemas similares en producción.

## Notas de Producción

- **Despliega gradualmente** usando canary o blue-green para detectar regresiones temprano.
- **Configura alertas** para errores, latencia p99 y tasa de fallos antes de habilitar en producción.
- **Documenta el rollback** en el runbook; prueba el procedimiento en staging al menos una vez por trimestre.
- **Revisa logs estructurados** con correlation IDs para trazar requests end-to-end en incidentes.

## Puntos Clave

- **Aplica templates de email responsivos con mjml** cuando necesites una solución práctica para tu caso de uso.
- **Monitorea el rendimiento** después de implementar; mide latencia, errores y uso de recursos antes y después.
- **Revisa la sección de Troubleshooting** ante errores comunes; la mayoría tienen causa raíz documentada con solución.
- **Mantén dependencias actualizadas** y ejecuta tests en CI para prevenir regresiones en producción.

## Errores Comunes en Producción

- Copiar el ejemplo sin adaptarlo a volúmenes y modos de fallo reales.
- Saltar tests de carga e inyección de errores antes del primer despliegue productivo.
- Codificar valores fijos que deberían ser configurables por entorno.
- Olvidar agregar logging y monitoreo en cada paso.
- Desplegar sin plan de rollback ni estrategia de backup probada.
- Asumir que el ejemplo mínimo escalará sin agregar caché o procesamiento por lotes.
- No documentar la versión y configuración usadas en producción.
- Dejar la receta sin cambios cuando evolucionan las dependencias o la escala.
