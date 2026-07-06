---
contentType: docs
slug: accessibility-audit-checklist
title: "Accessibility Audit Checklist"
description: "A WCAG 2.2 compliance checklist covering perceivable, operable, understandable, and robust criteria with testing tools and remediation steps."
metaDescription: "Use this WCAG 2.2 accessibility audit checklist to verify perceivable, operable, understandable, and robust criteria with testing tools and fixes."
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
  - /docs/frontend/frontend-performance-budget-template
  - /docs/frontend/component-api-documentation-template
  - /docs/frontend/browser-support-matrix-template
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
seo:
  metaDescription: "Use this WCAG 2.2 accessibility audit checklist to verify perceivable, operable, understandable, and robust criteria with testing tools and fixes."
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

WCAG 2.2 defines accessibility guidelines across four principles: perceivable, operable, understandable, and robust (POUR). This checklist translates those guidelines into testable criteria with specific tools and remediation steps. Use it to audit existing applications or verify new features before release.

## When to Use

- Pre-release accessibility verification
- Quarterly accessibility audits
- Compliance preparation (ADA, Section 508, EN 301 549)
- Onboarding new components to a design system
- Responding to accessibility-related user complaints

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
| axe DevTools | Automated | Browser extension for automated scans |
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
| 1.1.1 Non-text Content | A | ✅ | axe + manual | All images have alt text; decorative images use alt="" |
| Images with text | — | ✅ | Manual | No images containing text (use CSS text instead) |
| Complex images | — | ✅ | Manual | Charts have descriptive alt text or adjacent text description |
| CAPTCHA | — | N/A | — | No CAPTCHA used |

### 1.2 Time-based Media

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.2.1 Audio-only and Video-only | A | N/A | — | No audio-only or video-only content |
| 1.2.2 Captions (Prerecorded) | A | ✅ | Manual | All videos have VTT captions |
| 1.2.3 Audio Description or Media Alternative | A | ✅ | Manual | Videos have audio description track |
| 1.2.4 Captions (Live) | AA | N/A | — | No live streaming |
| 1.2.5 Audio Description (Prerecorded) | AA | ✅ | Manual | Audio description provided for informational videos |
| 1.2.6 Sign Language | AAA | N/A | — | Not targeting AAA |
| 1.2.7 Extended Audio Description | AAA | N/A | — | Not targeting AAA |
| 1.2.8 Media Alternative | AAA | N/A | — | Not targeting AAA |
| 1.2.9 Audio-only (Live) | AAA | N/A | — | Not targeting AAA |

### 1.3 Adaptable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.3.1 Info and Relationships | A | ⚠️ | axe + manual | Some form labels not programmatically associated |
| 1.3.2 Meaningful Sequence | A | ✅ | Manual | DOM order matches visual order |
| 1.3.3 Sensory Characteristics | A | ✅ | Manual | Instructions don't rely solely on shape/size/position |
| 1.3.4 Orientation | AA | ✅ | Manual | Content works in both portrait and landscape |
| 1.3.5 Identify Input Purpose | AA | ✅ | Manual | Input fields use autocomplete attributes |
| 1.3.6 Identify Purpose | AAA | N/A | — | Not targeting AAA |

### 1.4 Distinguishable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 1.4.1 Use of Color | A | ✅ | Manual | Color is not sole indicator of information |
| 1.4.2 Audio Control | A | N/A | — | No auto-playing audio |
| 1.4.3 Contrast (Minimum) | AA | ⚠️ | CCA | Some gray text on white fails 4.5:1 ratio |
| 1.4.4 Resize Text | AA | ✅ | Manual | Text resizable to 200% without loss |
| 1.4.5 Images of Text | A | ✅ | Manual | No images of text (logos excepted) |
| 1.4.6 Contrast (Enhanced) | AAA | N/A | — | Not targeting AAA |
| 1.4.7 Low or No Background Audio | AAA | N/A | — | Not targeting AAA |
| 1.4.8 Visual Presentation | AAA | N/A | — | Not targeting AAA |
| 1.4.9 Images of Text (No Exception) | AAA | N/A | — | Not targeting AAA |
| 1.4.10 Reflow | AA | ✅ | Manual | Content reflows at 320px width without horizontal scroll |
| 1.4.11 Non-text Contrast | AA | ⚠️ | CCA | Some UI component borders fail 3:1 ratio |
| 1.4.12 Text Spacing | AA | ✅ | Manual | Text spacing overrides don't break layout |
| 1.4.13 Content on Hover or Focus | A | ✅ | Manual | Hover/focus content dismissable, hoverable, persistent |

## 2. Operable (WCAG 2.2)

### 2.1 Keyboard Accessible

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.1.1 Keyboard | A | ✅ | Keyboard | All functionality accessible via keyboard |
| 2.1.2 No Keyboard Trap | A | ✅ | Keyboard | Focus can move away from all components |
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
| 2.3.1 Three Flashes or Below | A | ✅ | Manual | No content flashes more than 3 times per second |
| 2.3.2 Three Flashes | AAA | N/A | — | Not targeting AAA |
| 2.3.3 Animation from Interactions | AAA | N/A | — | Not targeting AAA |

### 2.4 Navigable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.4.1 Bypass Blocks | A | ✅ | Manual | Skip-to-content link present |
| 2.4.2 Page Titled | A | ✅ | Manual | Each page has unique, descriptive title |
| 2.4.3 Focus Order | A | ⚠️ | Keyboard | Focus order illogical in modal dialogs |
| 2.4.4 Link Purpose (In Context) | A | ✅ | Manual | Link text or context describes destination |
| 2.4.5 Multiple Ways | AA | ✅ | Manual | Navigation + search + sitemap available |
| 2.4.6 Headings and Labels | AA | ⚠️ | Manual | Some section headings missing or vague |
| 2.4.7 Focus Visible | AA | ✅ | Keyboard | Focus indicator visible on all interactive elements |
| 2.4.8 Location | AAA | N/A | — | Not targeting AAA |
| 2.4.9 Link Purpose (Link Only) | AAA | N/A | — | Not targeting AAA |
| 2.4.10 Section Headings | AAA | N/A | — | Not targeting AAA |
| 2.4.11 Focus Not Obscured (Minimum) | AA | ✅ | Manual | Focused element not fully hidden by sticky headers |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | N/A | — | Not targeting AAA |
| 2.4.13 Focus Appearance | AAA | N/A | — | Not targeting AAA |

### 2.5 Input Modalities

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 2.5.1 Pointer Gestures | A | ✅ | Manual | Multi-point gestures have single-point alternatives |
| 2.5.2 Pointer Cancellation | A | ✅ | Manual | Down-event does not execute; up-event triggers action |
| 2.5.3 Label in Name | A | ⚠️ | Manual | Some icon buttons lack accessible names |
| 2.5.4 Motion Actuation | A | N/A | — | No motion-activated functionality |
| 2.5.5 Target Size (Enhanced) | AAA | N/A | — | Not targeting AAA |
| 2.5.6 Concurrent Input Mechanisms | AAA | N/A | — | Not targeting AAA |
| 2.5.7 Dragging Movements | AA | ✅ | Manual | Drag-and-drop has keyboard alternative |
| 2.5.8 Target Size (Minimum) | AA | ⚠️ | Manual | Some inline links smaller than 24x24 CSS pixels |

## 3. Understandable (WCAG 2.2)

### 3.1 Readable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 3.1.1 Language of Page | A | ✅ | Validator | html lang attribute set |
| 3.1.2 Language of Parts | AA | ✅ | Manual | Language changes marked with lang attribute |
| 3.1.3 Unusual Words | AAA | N/A | — | Not targeting AAA |
| 3.1.4 Abbreviations | AAA | N/A | — | Not targeting AAA |
| 3.1.5 Reading Level | AAA | N/A | — | Not targeting AAA |
| 3.1.6 Pronunciation | AAA | N/A | — | Not targeting AAA |

### 3.2 Predictable

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 3.2.1 On Focus | A | ✅ | Keyboard | Focus does not trigger unexpected context changes |
| 3.2.2 On Input | A | ✅ | Manual | Form submission requires explicit action |
| 3.2.3 Consistent Navigation | AA | ✅ | Manual | Navigation consistent across pages |
| 3.2.4 Consistent Identification | AA | ✅ | Manual | Components with same function have same label |
| 3.2.5 Change on Request | AAA | N/A | — | Not targeting AAA |
| 3.2.6 Consistent Help | A | ✅ | Manual | Help mechanism in consistent location across pages |

### 3.3 Input Assistance

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 3.3.1 Error Identification | A | ⚠️ | Manual | Some form errors not announced to screen readers |
| 3.3.2 Labels or Instructions | A | ⚠️ | Manual | Some inputs lack visible labels |
| 3.3.3 Error Suggestion | AA | ⚠️ | Manual | Error messages lack specific fix suggestions |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | ✅ | Manual | Checkout confirmation step present |
| 3.3.5 Help | AAA | N/A | — | Not targeting AAA |
| 3.3.6 Error Prevention (All) | AAA | N/A | — | Not targeting AAA |
| 3.3.7 Redundant Entry | A | ✅ | Manual | Previously entered data auto-populated or re-confirmable |
| 3.3.8 Accessible Authentication (Minimum) | AA | ✅ | Manual | Login does not require cognitive function test |

## 4. Robust (WCAG 2.2)

### 4.1 Compatible

| Criterion | Level | Status | Test Method | Notes |
|-----------|-------|--------|-------------|-------|
| 4.1.1 Parsing | A | N/A | — | Deprecated in WCAG 2.2 (removed) |
| 4.1.2 Name, Role, Value | A | ⚠️ | axe + NVDA | Custom widgets missing ARIA roles |
| 4.1.3 Status Messages | AA | ⚠️ | NVDA | Toast notifications not announced via aria-live |

## 5. Failed Criteria Summary

| # | Criterion | Severity | Page | Issue | Remediation | Effort |
|---|-----------|----------|------|-------|-------------|--------|
| 1 | 1.3.1 Info and Relationships | High | Checkout | Form labels not associated with inputs via for/id | Add for/id association | 2h |
| 2 | 1.4.3 Contrast (Minimum) | Medium | Global | Gray text (#999) on white = 2.8:1 ratio | Change to #767676 (4.5:1) | 1h |
| 3 | 1.4.11 Non-text Contrast | Medium | Global | UI borders (#ddd) on white = 1.4:1 ratio | Change to #949494 (3:1) | 1h |
| 4 | 2.4.3 Focus Order | High | Modals | Focus trapped in modal, not returning to trigger | Implement focus management in modal | 4h |
| 5 | 2.4.6 Headings and Labels | Medium | Dashboard | Section headings missing on data tables | Add h3 headings per section | 2h |
| 6 | 2.5.3 Label in Name | Medium | Global | Icon-only buttons lack aria-label | Add aria-label to icon buttons | 2h |
| 7 | 2.5.8 Target Size (Minimum) | Low | Blog | Inline text links < 24px height | Add padding to links | 1h |
| 8 | 3.3.1 Error Identification | High | Forms | Errors shown visually but not announced | Add aria-live + role=alert to error regions | 3h |
| 9 | 3.3.2 Labels or Instructions | Medium | Search | Search input has placeholder but no label | Add visually-hidden label | 1h |
| 10 | 4.1.2 Name, Role, Value | High | Custom tabs | Tab widget missing ARIA roles | Add role=tablist, role=tab, aria-selected | 4h |
| 11 | 4.1.3 Status Messages | Medium | Global | Toast notifications not announced | Add aria-live=polite to toast container | 2h |

## 6. Remediation Plan

| Priority | Criteria | Effort | Owner | Due Date |
|----------|----------|--------|-------|----------|
| P1 | #1, #4, #8, #10 | 13h | Frontend team | 2026-07-12 |
| P2 | #2, #3, #5, #6, #9, #11 | 9h | Frontend team | 2026-07-19 |
| P3 | #7 | 1h | Frontend team | 2026-07-26 |
```

## Explanation

The checklist follows the WCAG 2.2 structure: four principles (perceivable, operable, understandable, robust), each broken into guidelines and success criteria. Each criterion is tested with a specific method: automated tools (axe, Lighthouse) for mechanical checks, manual testing for visual and interaction checks, and screen reader testing for semantic checks.

Automated tools catch about 30-40% of accessibility issues. They're good at detecting missing alt text, label associations, and ARIA misuse. They can't detect whether alt text is meaningful, whether color-only indicators are used, or whether focus order is logical. Manual testing is required for the remaining 60-70%.

Screen reader testing is essential. NVDA on Windows and VoiceOver on macOS are the most common screen readers. Testing with them reveals issues that neither automated tools nor manual visual inspection can catch: unannounced dynamic content, missing landmarks, confusing reading order.

The failed criteria summary prioritizes issues by severity and maps each to a specific remediation with effort estimate. This feeds directly into sprint planning. P1 issues (high severity, user-blocking) should be fixed first. P3 issues (low severity, minor inconvenience) can be batched into a later sprint.

## Variants

| Context | Approach | Notes |
|---------|----------|-------|
| Mobile app | Use WCAG 2.2 + platform guidelines | iOS HIG, Android Accessibility |
| Single-page app | Focus on dynamic content, ARIA live regions | Route changes, focus management |
| Content site | Focus on headings, alt text, reading order | Content authors need training |
| Enterprise app | Focus on keyboard navigation, complex widgets | Data tables, tree views, dialogs |
| E-commerce | Focus on checkout flow, form errors | Cart, payment, confirmation |

## What Works

1. Test with real screen readers — automated tools miss semantic issues
2. Test with keyboard only — reveals focus order and trap issues
3. Test at 320px width — catches reflow problems
4. Test with 200% zoom — catches text resize issues
5. Use axe DevTools for quick scans — catches mechanical issues fast
6. Involve users with disabilities — nothing replaces real user feedback
7. Audit early and often — fixing a11y in design is cheaper than in code

## Common Mistakes

1. Relying only on automated tools — they catch 30-40% of issues
2. Adding ARIA without testing — incorrect ARIA is worse than no ARIA
3. Using placeholder text as labels — placeholders disappear on input
4. Removing focus outlines — visible focus is a WCAG requirement
5. Testing only in Chrome — screen readers behave differently across browsers
6. Ignoring color contrast — gray text is the most common contrast failure
7. Not testing dynamic content — SPAs need aria-live for status updates

## Frequently Asked Questions

### How long does a full accessibility audit take?

For a 12-page application targeting WCAG 2.2 AA: 2-3 days for automated + manual testing, 1-2 days for screen reader testing, 1 day for reporting. Plan for a full week for a thorough audit. Smaller sites (3-5 pages) take 2-3 days.

### What is the difference between WCAG 2.1 and 2.2?

WCAG 2.2 adds 9 new success criteria: focus not obscured (2.4.11), dragging movements (2.5.7), target size minimum (2.5.8), consistent help (3.2.6), redundant entry (3.3.7), accessible authentication (3.3.8), and three AAA criteria. It also removes 4.1.1 Parsing. If you comply with 2.1, you need to check the 9 new criteria for 2.2 compliance.

### Should we target Level A or AA?

Level AA is the standard for most organizations. ADA compliance in the US typically references WCAG 2.1 AA. Section 508 requires WCAG 2.0 AA. EN 301 549 in Europe requires WCAG 2.1 AA. Target AA unless you have specific legal requirements for A only.

### Can we use overlays (accessibility widgets) instead of fixing code?

No. Overlays (like AccessiBe, UserWay) do not make sites compliant. They can interfere with screen readers, introduce their own accessibility bugs, and create a false sense of compliance. The W3C, WebAIM, and disability advocates recommend against overlays. Fix the code instead.

### How do we maintain accessibility over time?

Integrate accessibility checks into CI (axe-core in tests), train the team on WCAG criteria, include accessibility in code review checklists, and audit quarterly. Accessibility is not a one-time project — it's an ongoing practice.
