---


contentType: docs
slug: accessibility-audit-checklist
title: "Checklist de Auditoría de Accesibilidad"
description: "Un checklist de cumplimiento WCAG 2.2 cubriendo criterios perceivable, operable, understandable y robust con herramientas y pasos de remediación."
metaDescription: "Usá este checklist de auditoría WCAG 2.2 para verificar criterios perceivable, operable, understandable y robust con herramientas y fixes."
difficulty: intermediate
topics:
  - testing
tags:
  - frontend
  - accessibility
  - wcag
  - audit
  - checklist
  - a11y
  - compliance
relatedResources:
  - /docs/frontend-performance-budget-template
  - /docs/component-api-documentation-template
  - /docs/browser-support-matrix-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Usá este checklist de auditoría WCAG 2.2 para verificar criterios perceivable, operable, understandable y robust con herramientas y fixes."
  keywords:
    - accessibility audit
    - wcag 2.2
    - a11y checklist
    - compliance
    - web accessibility
    - screen reader
    - keyboard navigation


---

## Overview

WCAG 2.2 define accessibility guidelines across four principles: perceivable, operable, understandable y robust (POUR). Este checklist translate esas guidelines en testable criteria con specific tools y remediation steps. Usalo para auditar existing applications o verify new features antes de release.

## When to Use


- For alternatives, see [Security Audit Checklist](/es/docs/security-audit-checklist/).

- Pre-release accessibility verification
- Quarterly accessibility audits
- Compliance preparation (ADA, Section 508, EN 301 549)
- Onboardéando new components a un design system
- Respondiendo a accessibility-related user complaints

## Solution

```markdown
# Accessibility Audit Checklist — `<Project Name>`

## Audit Information

| Field | Value |
|-------|-------|
| Project | Example Web App |
| Auditor | <Name> |
| Date | 2026-07-05 |
| WCAG Version | 2.2 |
| Conformance Target | AA |
| Pages Audited | 12 |
| Total Criteria | 86 |
| Passed | 71 |
| Failed | 10 |
| Not Applicable | 5 |

## Testing Tools

| Tool | Type | Purpose |
|------|------|---------|
| axe DevTools | Automated | Browser extension para automated scans |
| Lighthouse | Automated | Chrome DevTools accessibility audit |
| WAVE | Automated | Web accessibility evaluation tool |
| NVDA | Screen reader | Windows screen reader testing |
| VoiceOver | Screen reader | macOS/iOS screen reader testing |
| Keyboard only | Manual | Tab navigation testing |
| Colour Contrast Analyser | Manual | Color contrast verification |
| W3C Validator | Automated | HTML validation |

## 1. Perceivable (WCAG 2.2)

### 1.1 Text Alternatives

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.1.1 Non-text Content | A | ✅ | axe + manual | All images tienen alt text; decorative images usan alt="" |
| Images with text | — | ✅ | Manual | No images conteniendo text (usá CSS text en vez) |
| Complex images | — | ✅ | Manual | Charts tienen descriptive alt text o adjacent text description |
| CAPTCHA | — | N/A | — | No CAPTCHA used |

### 1.2 Time-based Media

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.2.1 Audio-only and Video-only | A | N/A | — | No audio-only o video-only content |
| 1.2.2 Captions (Prerecorded) | A | ✅ | Manual | All videos tienen VTT captions |
| 1.2.3 Audio Description or Media Alternative | A | ✅ | Manual | Videos tienen audio description track |
| 1.2.4 Captions (Live) | AA | N/A | — | No live streaming |
| 1.2.5 Audio Description (Prerecorded) | AA | ✅ | Manual | Audio description provided para informational videos |
| 1.2.6 Sign Language | AAA | N/A | — | Not targeting AAA |
| 1.2.7 Extended Audio Description | AAA | N/A | — | Not targeting AAA |
| 1.2.8 Media Alternative | AAA | N/A | — | Not targeting AAA |
| 1.2.9 Audio-only (Live) | AAA | N/A | — | Not targeting AAA |

### 1.3 Adaptable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.3.1 Info and Relationships | A | ⚠️ | axe + manual | Algunos form labels no programmaticamente associated |
| 1.3.2 Meaningful Sequence | A | ✅ | Manual | DOM order matchea visual order |
| 1.3.3 Sensory Characteristics | A | ✅ | Manual | Instructions no rely solely en shape/size/position |
| 1.3.4 Orientation | AA | ✅ | Manual | Content funciona en both portrait y landscape |
| 1.3.5 Identify Input Purpose | AA | ✅ | Manual | Input fields usan autocomplete attributes |
| 1.3.6 Identify Purpose | AAA | N/A | — | Not targeting AAA |

### 1.4 Distinguishable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.4.1 Use of Color | A | ✅ | Manual | Color no es sole indicator de information |
| 1.4.2 Audio Control | A | N/A | — | No auto-playing audio |
| 1.4.3 Contrast (Minimum) | AA | ⚠️ | CCA | Algunos gray text en white fail 4.5:1 ratio |
| 1.4.4 Resize Text | AA | ✅ | Manual | Text resizable a 200% sin loss |
| 1.4.5 Images of Text | A | ✅ | Manual | No images de text (logos excepted) |
| 1.4.6 Contrast (Enhanced) | AAA | N/A | — | Not targeting AAA |
| 1.4.7 Low or No Background Audio | AAA | N/A | — | Not targeting AAA |
| 1.4.8 Visual Presentation | AAA | N/A | — | Not targeting AAA |
| 1.4.9 Images of Text (No Exception) | AAA | N/A | — | Not targeting AAA |
| 1.4.10 Reflow | AA | ✅ | Manual | Content reflowa a 320px width sin horizontal scroll |
| 1.4.11 Non-text Contrast | AA | ⚠️ | CCA | Algunos UI component borders fail 3:1 ratio |
| 1.4.12 Text Spacing | AA | ✅ | Manual | Text spacing overrides no breakean layout |
| 1.4.13 Content on Hover or Focus | A | ✅ | Manual | Hover/focus content dismissable, hoverable, persistent |

## 2. Operable (WCAG 2.2)

### 2.1 Keyboard Accessible

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.1.1 Keyboard | A | ✅ | Keyboard | All functionality accessible via keyboard |
| 2.1.2 No Keyboard Trap | A | ✅ | Keyboard | Focus puede move away de all components |
| 2.1.3 Keyboard (No Exception) | AAA | N/A | — | Not targeting AAA |
| 2.1.4 Character Key Shortcuts | A | ✅ | Manual | No single-character shortcuts |

### 2.2 Enough Time

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.2.1 Timing Adjustable | A | ✅ | Manual | Session timeout extendable |
| 2.2.2 Pause, Stop, Hide | A | ✅ | Manual | Auto-updating content pausable |
| 2.2.3 No Timing | AAA | N/A | — | Not targeting AAA |
| 2.2.4 Interruptions | AAA | N/A | — | Not targeting AAA |
| 2.2.5 Re-authenticating | AAA | N/A | — | Not targeting AAA |
| 2.2.6 Timeouts | AAA | N/A | — | Not targeting AAA |

### 2.3 Seizures and Physical Reactions

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.3.1 Three Flashes or Below | A | ✅ | Manual | No content flashea more de 3 times per second |
| 2.3.2 Three Flashes | AAA | N/A | — | Not targeting AAA |
| 2.3.3 Animation from Interactions | AAA | N/A | — | Not targeting AAA |

### 2.4 Navigable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.4.1 Bypass Blocks | A | ✅ | Manual | Skip-to-content link present |
| 2.4.2 Page Titled | A | ✅ | Manual | Cada page tiene unique, descriptive title |
| 2.4.3 Focus Order | A | ⚠️ | Keyboard | Focus order illogical en modal dialogs |
| 2.4.4 Link Purpose (In Context) | A | ✅ | Manual | Link text o context describe destination |
| 2.4.5 Multiple Ways | AA | ✅ | Manual | Navigation + search + sitemap available |
| 2.4.6 Headings and Labels | AA | ⚠️ | Manual | Algunos section headings missing o vague |
| 2.4.7 Focus Visible | AA | ✅ | Keyboard | Focus indicator visible en all interactive elements |
| 2.4.8 Location | AAA | N/A | — | Not targeting AAA |
| 2.4.9 Link Purpose (Link Only) | AAA | N/A | — | Not targeting AAA |
| 2.4.10 Section Headings | AAA | N/A | — | Not targeting AAA |
| 2.4.11 Focus Not Obscured (Minimum) | AA | ✅ | Manual | Focused element no fully hidden por sticky headers |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | N/A | — | Not targeting AAA |
| 2.4.13 Focus Appearance | AAA | N/A | — | Not targeting AAA |

### 2.5 Input Modalities

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.5.1 Pointer Gestures | A | ✅ | Manual | Multi-point gestures tienen single-point alternatives |
| 2.5.2 Pointer Cancellation | A | ✅ | Manual | Down-event no execute; up-event triggerea action |
| 2.5.3 Label in Name | A | ⚠️ | Manual | Algunos icon buttons les falta accessible names |
| 2.5.4 Motion Actuation | A | N/A | — | No motion-activated functionality |
| 2.5.5 Target Size (Enhanced) | AAA | N/A | — | Not targeting AAA |
| 2.5.6 Concurrent Input Mechanisms | AAA | N/A | — | Not targeting AAA |
| 2.5.7 Dragging Movements | AA | ✅ | Manual | Drag-and-drop tiene keyboard alternative |
| 2.5.8 Target Size (Minimum) | AA | ⚠️ | Manual | Algunos inline links smaller que 24x24 CSS pixels |

## 3. Understandable (WCAG 2.2)

### 3.1 Readable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 3.1.1 Language of Page | A | ✅ | Validator | html lang attribute set |
| 3.1.2 Language of Parts | AA | ✅ | Manual | Language changes marked con lang attribute |
| 3.1.3 Unusual Words | AAA | N/A | — | Not targeting AAA |
| 3.1.4 Abbreviations | AAA | N/A | — | Not targeting AAA |
| 3.1.5 Reading Level | AAA | N/A | — | Not targeting AAA |
| 3.1.6 Pronunciation | AAA | N/A | — | Not targeting AAA |

### 3.2 Predictable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 3.2.1 On Focus | A | ✅ | Keyboard | Focus no triggerea unexpected context changes |
| 3.2.2 On Input | A | ✅ | Manual | Form submission require explicit action |
| 3.2.3 Consistent Navigation | AA | ✅ | Manual | Navigation consistent across pages |
| 3.2.4 Consistent Identification | AA | ✅ | Manual | Components con same function tienen same label |
| 3.2.5 Change on Request | AAA | N/A | — | Not targeting AAA |
| 3.2.6 Consistent Help | A | ✅ | Manual | Help mechanism en consistent location across pages |

### 3.3 Input Assistance

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 3.3.1 Error Identification | A | ⚠️ | Manual | Algunos form errors no announced a screen readers |
| 3.3.2 Labels or Instructions | A | ⚠️ | Manual | Algunos inputs les falta visible labels |
| 3.3.3 Error Suggestion | AA | ⚠️ | Manual | Error messages les falta specific fix suggestions |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | ✅ | Manual | Checkout confirmation step present |
| 3.3.5 Help | AAA | N/A | — | Not targeting AAA |
| 3.3.6 Error Prevention (All) | AAA | N/A | — | Not targeting AAA |
| 3.3.7 Redundant Entry | A | ✅ | Manual | Previously entered data auto-populated o re-confirmable |
| 3.3.8 Accessible Authentication (Minimum) | AA | ✅ | Manual | Login no require cognitive function test |

## 4. Robust (WCAG 2.2)

### 4.1 Compatible

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 4.1.1 Parsing | A | N/A | — | Deprecated en WCAG 2.2 (removed) |
| 4.1.2 Name, Role, Value | A | ⚠️ | axe + NVDA | Custom widgets les falta ARIA roles |
| 4.1.3 Status Messages | AA | ⚠️ | NVDA | Toast notifications no announced via aria-live |

## 5. Failed Criteria Summary

| # | Criterion | Severity | Page | Issue | Remediation | Effort |
|---|-----------|----------|------|-------|-------------|--------|
| 1 | 1.3.1 Info and Relationships | High | Checkout | Form labels no associated con inputs via for/id | Addeá for/id association | 2h |
| 2 | 1.4.3 Contrast (Minimum) | Medium | Global | Gray text (#999) en white = 2.8:1 ratio | Cambiá a #767676 (4.5:1) | 1h |
| 3 | 1.4.11 Non-text Contrast | Medium | Global | UI borders (#ddd) en white = 1.4:1 ratio | Cambiá a #949494 (3:1) | 1h |
| 4 | 2.4.3 Focus Order | High | Modals | Focus trapped en modal, no returning a trigger | Implementá focus management en modal | 4h |
| 5 | 2.4.6 Headings and Labels | Medium | Dashboard | Section headings missing en data tables | Addeá h3 headings per section | 2h |
| 6 | 2.5.3 Label in Name | Medium | Global | Icon-only buttons les falta aria-label | Addeá aria-label a icon buttons | 2h |
| 7 | 2.5.8 Target Size (Minimum) | Low | Blog | Inline text links < 24px height | Addeá padding a links | 1h |
| 8 | 3.3.1 Error Identification | High | Forms | Errors shown visualmente pero no announced | Addeá aria-live + role=alert a error regions | 3h |
| 9 | 3.3.2 Labels or Instructions | Medium | Search | Search input tiene placeholder pero no label | Addeá visually-hidden label | 1h |
| 10 | 4.1.2 Name, Role, Value | High | Custom tabs | Tab widget les falta ARIA roles | Addeá role=tablist, role=tab, aria-selected | 4h |
| 11 | 4.1.3 Status Messages | Medium | Global | Toast notifications no announced | Addeá aria-live=polite a toast container | 2h |

## 6. Remediation Plan

| Priority | Criteria | Effort | Owner | Due Date |
|----------|----------|--------|-------|----------|
| P1 | #1, #4, #8, #10 | 13h | Frontend team | 2026-07-12 |
| P2 | #2, #3, #5, #6, #9, #11 | 9h | Frontend team | 2026-07-19 |
| P3 | #7 | 1h | Frontend team | 2026-07-26 |
```

## Explanation

El checklist sigue el WCAG 2.2 structure: four principles (perceivable, operable, understandable, robust), cada uno broken en guidelines y success criteria. Cada criterion se testea con un specific method: automated tools (axe, Lighthouse) para mechanical checks, manual testing para visual y interaction checks, y screen reader testing para semantic checks.

Automated tools catchean about 30-40% de accessibility issues. Son good detectando missing alt text, label associations y ARIA misuse. No pueden detectar si alt text es meaningful, si color-only indicators se usan o si focus order es logical. Manual testing es required para el remaining 60-70%.

Screen reader testing es essential. NVDA en Windows y VoiceOver en macOS son los most common screen readers. Testear con ellos reveala issues que ni automated tools ni manual visual inspection pueden catchear: unannounced dynamic content, missing landmarks, confusing reading order.

El failed criteria summary prioriza issues por severity y mapea cada uno a un specific remediation con effort estimate. Esto feedea directamente a sprint planning. P1 issues (high severity, user-blocking) deberían fixearse first. P3 issues (low severity, minor inconvenience) pueden batchearse en un later sprint.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Mobile app | Usá WCAG 2.2 + platform guidelines | iOS HIG, Android Accessibility |
| Single-page app | Focus en dynamic content, ARIA live regions | Route changes, focus management |
| Content site | Focus en headings, alt text, reading order | Content authors necesitan training |
| Enterprise app | Focus en keyboard navigation, complex widgets | Data tables, tree views, dialogs |
| E-commerce | Focus en checkout flow, form errors | Cart, payment, confirmation |

## What Works

1. Testeá con real screen readers — automated tools missean semantic issues
2. Testeá con keyboard only — reveala focus order y trap issues
3. Testeá a 320px width — catchea reflow problems
4. Testeá con 200% zoom — catchea text resize issues
5. Usá axe DevTools para quick scans — catchea mechanical issues fast
6. Involucrá users con disabilities — nada reemplaza real user feedback
7. Auditá early y often — fixear a11y en design es cheaper que en code

## Common Mistakes

1. Rely solo en automated tools — catchean 30-40% de issues
2. Addear ARIA sin testear — incorrect ARIA es worse que no ARIA
3. Usar placeholder text como labels — placeholders desaparecen on input
4. Remover focus outlines — visible focus es un WCAG requirement
5. Testear solo en Chrome — screen readers behavean differently across browsers
6. Ignorar color contrast — gray text es la most common contrast failure
7. No testear dynamic content — SPAs necesitan aria-live para status updates

## Frequently Asked Questions

### ¿Cuánto toma un full accessibility audit?

Para una 12-page application targeting WCAG 2.2 AA: 2-3 days para automated + manual testing, 1-2 days para screen reader testing, 1 day para reporting. Planificá un full week para un thorough audit. Smaller sites (3-5 pages) toman 2-3 days.

### ¿Cuál es la difference entre WCAG 2.1 y 2.2?

WCAG 2.2 addea 9 new success criteria: focus not obscured (2.4.11), dragging movements (2.5.7), target size minimum (2.5.8), consistent help (3.2.6), redundant entry (3.3.7), accessible authentication (3.3.8) y three AAA criteria. También remueve 4.1.1 Parsing. Si complís con 2.1, necesitás checkear los 9 new criteria para 2.2 compliance.

### ¿Deberíamos targetear Level A o AA?

Level AA es el standard para most organizations. ADA compliance en el US típicamente references WCAG 2.1 AA. Section 508 require WCAG 2.0 AA. EN 301 549 en Europe require WCAG 2.1 AA. Targeteá AA a menos que tengas specific legal requirements para A only.

### ¿Podemos usar overlays (accessibility widgets) en vez de fixear code?

No. Overlays (como AccessiBe, UserWay) no hacen sites compliant. Pueden interferir con screen readers, introducir su own accessibility bugs y crear un false sense de compliance. El W3C, WebAIM y disability advocates recomiendan against overlays. Fixeá el code en vez.

### ¿Cómo mantenemos accessibility over time?

Integrá accessibility checks en CI (axe-core en tests), entrená al team en WCAG criteria, incluí accessibility en code review checklists y auditá quarterly. Accessibility no es un one-time project — es un ongoing practice.
