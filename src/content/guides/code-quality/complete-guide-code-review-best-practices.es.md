---
contentType: guides
slug: complete-guide-code-review-best-practices
title: "Code Reviews: Reviewer Mindset, Feedback, Automation"
description: "Dominá code review best practices: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing y cómo construir una strong review culture."
metaDescription: "Dominá code review: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing y cómo construir una strong review culture en teams."
difficulty: intermediate
topics:
  - testing
tags:
  - guide
  - code-review
  - code-quality
  - best-practices
  - feedback
  - automation
  - pull-requests
  - team-collaboration
relatedResources:
  - /guides/code-quality/complete-guide-clean-code-principles
  - /guides/code-quality/complete-guide-refactoring-techniques
  - /guides/code-quality/complete-guide-technical-debt-management
lastUpdated: "2026-07-05"
author: "Mathias Paulenko"
estimatedReadTime: 18
seo:
  metaDescription: "Dominá code review: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing y cómo construir una strong review culture en teams."
  keywords:
    - code review
    - reviewer mindset
    - constructive feedback
    - review checklist
    - automated checks
    - pull requests
    - review culture
---

## Introducción

Code review es la practice de tener a otro developer examinar tu code antes de que merge. Catchea bugs, improve quality, share knowledge y build shared code ownership. A continuación: reviewer mindset, constructive feedback, review checklists, automated checks, PR sizing y cómo construir una strong review culture.

## Reviewer Mindset

### Revieweá el code, no la person

```markdown
# BAD: personal attack
"¿Por qué lo hiciste así? Esto está obviamente wrong."

# GOOD: focus en el code
"Este approach tiene un potential issue con concurrent access.
Considerá usar un mutex acá. ¿Qué pensás?"
```

### Preguntá, no dés orders

```markdown
# BAD: dictatorial
"Cambiá esto para usar un Map en vez."

# GOOD: collaborative
"¿Un Map sería más efficient acá? El approach actual
itera el array en every lookup, lo que podría ser slow
con large datasets."
```

### Asumí competence

```markdown
# BAD: condescending
"Probablemente no sabés esto, pero necesitás handle null acá."

# GOOD: respectful
"Veo que este value puede ser null en edge cases. ¿Deberíamos
addear un null check o usar un Optional?"
```

### Sé specific

```markdown
# BAD: vague
"Este code es messy."

# GOOD: specific
"La `processData` function handlea validation, transformation
y database insertion. Extractear la validation en un separate
function haría cada responsibility clearer y easier de test."
```

## Review Checklist

```markdown
## Code Review Checklist

### Functionality
- [ ] ¿El code hace lo que el PR description dice?
- [ ] ¿Edge cases están handled (null, empty, boundary values)?
- [ ] ¿Error cases están covered con appropriate handling?
- [ ] ¿El code handlea concurrent access si es needed?

### Design
- [ ] ¿El change sigue existing patterns en el codebase?
- [ ] ¿El change está en el right level de abstraction?
- [ ] ¿New dependencies están justified?
- [ ] ¿El change está over-engineered o under-engineered?

### Readability
- [ ] ¿Names son clear y intention-revealing?
- [ ] ¿Functions son small y focused?
- [ ] ¿El code está organized lógicamente?
- [ ] ¿Comments explainan por qué, no qué?

### Testing
- [ ] ¿Hay tests para la new functionality?
- [ ] ¿Tests coveren edge cases y error paths?
- [ ] ¿Tests son meaningful (no solo assertear true)?
- [ ] ¿Tests corren fast enough para el CI pipeline?

### Security
- [ ] ¿User input está validated y sanitized?
- [ ] ¿Hay SQL injection o XSS risks?
- [ ] ¿Secrets y credentials están handled securely?
- [ ] ¿Permissions están checked correctamente?

### Performance
- [ ] ¿Hay obvious performance issues (N+1 queries, unnecessary loops)?
- [ ] ¿El change es efficient para large inputs?
- [ ] ¿Database queries están optimized?
- [ ] ¿Caching está usado donde es appropriate?

### Documentation
- [ ] ¿El PR description es clear y complete?
- [ ] ¿Public APIs están documented?
- [ ] ¿Breaking changes están noted?
- [ ] ¿Changelog está updated si es needed?
```

## PR Sizing

```
PR Size          Review Time    Review Quality
─────────        ───────────    ──────────────
< 50 lines       10-15 min      Excellent
50-100 lines     15-30 min      Good
100-300 lines    30-60 min      Fair
300-500 lines    60-90 min      Poor (fatigue)
500+ lines       2+ hours       Bad (skimming)

Mantené PRs under 300 lines para thorough reviews.
```

### Breakear large changes en smaller PRs

```markdown
# En vez de un 1000-line PR: "Add order export feature"

## PR 1: Add export service interface y types (50 lines)
## PR 2: Implement CSV export strategy (120 lines)
## PR 3: Implement PDF export strategy (150 lines)
## PR 4: Add export API endpoint (80 lines)
## PR 5: Add export UI button y modal (100 lines)
## PR 6: Add integration tests para export flow (200 lines)

Cada PR es independently reviewable y testable.
```

## Automated Checks

Automatizá lo que puedas para que reviewers focuseen en lo que matters.

```yaml
# .github/workflows/pr-checks.yml — Automated PR checks
name: PR Checks
on: pull_request

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run type-check

  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --coverage
      - run: |
          COVERAGE=$(node -e "console.log(require('./coverage/coverage-summary.json').total.lines.pct)")
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - name: Check bundle size
        run: |
          SIZE=$(du -s dist/ | cut -f1)
          if [ $SIZE -gt 500000 ]; then
            echo "Bundle size $SIZE KB exceeds 500 MB limit"
            exit 1
          fi
```

## Review Workflow

```typescript
// Review process para un PR
const reviewWorkflow = [
  // 1. Leé el PR description
  'Understand qué el PR hace y por qué',

  // 2. Revieweá tests first
  '¿Los tests coveren el described behavior?',
  '¿Edge cases están tested?',
  '¿Los test names son descriptive?',

  // 3. Revieweá el implementation
  'Leé el code top to bottom',
  'Checkeá bugs y edge cases',
  'Evaluá design y patterns',
  'Checkeá naming y readability',

  // 4. Revieweá automated checks
  '¿CI checks están passing?',
  '¿Coverage está maintained o improved?',
  '¿Hay new lint warnings?',

  // 5. Dejá feedback
  'Approveá si no hay blocking issues',
  'Requesteá changes para blocking issues',
  'Dejá suggestions como comments (non-blocking)',
];
```

## Feedback Templates

### Approveando

```markdown
LGTM! El implementation es clean y los tests son thorough.
Un few non-blocking suggestions abajo — feel free de addressar
en un follow-up PR.

Suggestion: El `formatDate` helper podría ser extracted en
un shared utils module ya que se usa en multiple places now.
```

### Requesteando changes

```markdown
Encontré un couple de issues que necesitan ser addressed antes de merge:

1. **Blocking: SQL injection risk**
   En `getUserById`, el `id` parameter se interpola directamente
   en el query string. Usá parameterized queries en vez:
   `db.query('SELECT * FROM users WHERE id = ?', [id])`

2. **Blocking: Missing error handling**
   La `fetchUserData` function no handlea network errors.
   Si el API está down, el app crashea. Addeá un try-catch con
   un fallback.

3. **Suggestion: Test coverage**
   El happy path está tested pero el error path no. Considerá
   addear un test para el API failure case.
```

### Commenteando (non-blocking)

```markdown
Buen work! El approach makes sense y el code está well-structured.

Un few thoughts para future consideration:

- La `processOrder` function tiene 80 lines. Podría benefit de
  extractear los validation y calculation steps en separate
  functions. No blocking para este PR.

- El `OrderStatus` enum tiene 12 values pero solo 4 se usan en
  este PR. ¿Los others son needed para upcoming work?

- Considerá addear un JSDoc comment a `calculateDiscount` explainando
  el VIP tier logic, ya que no es obvious desde el code.
```

## Best Practices

- Revieweá dentro de 24 hours — blocked PRs slow el whole team down
- Mantené PRs small — under 300 lines para thorough reviews
- Revieweá tests first — si tests son wrong, el implementation no matter
- Usá un checklist — no relies en memory para security, performance, edge cases
- Separá blocking de non-blocking — no blockees por style preferences
- Automatizá lo que puedas — linting, formatting, type checking, coverage
- Dejá positive feedback — acknowledgé good work, no solo problems
- Preguntá — encouraged al author a explain su reasoning
- No reviewees tu own code — even un quick review por un peer catchea issues
- Revieweá en person para complex changes — pair review para 500+ line PRs
- Seteá review expectations — definí qué "ready for review" means
- Trackeá review metrics — time-to-review, PR size, defect escape rate

## Common Mistakes

- **Nitpicking style**: automated linters handlean formatting. No blockees PRs por missing spaces.
- **Bike-shedding**: gastar 30 minutes debatiendo variable names mientras ignorás architectural issues.
- **Rubber-stamping**: approvear sin leer el code. "LGTM" sin review es worse que no review.
- **Blocking en preferences**: "Yo habría usado un Map" no es blocking. "Esto tiene un race condition" sí.
- **Reviewear too much a la vez**: 500-line PRs se skimmean, no se reviewean. Breakéalos up.
- **No response a feedback**: author pushea changes sin responder a comments. Acknowledgé cada comment.

## FAQ

### ¿Cuánto debería tomar un code review?

Para un 100-line PR, 15-30 minutes. Para un 300-line PR, 30-60 minutes. Si toma más, el PR es too large. Breakéalo en smaller PRs. No reviewees por más de 60 minutes seguidos — fatigue causa missed issues.

### ¿Qué debería hacer si disagree con un reviewer?

Respondé con tu reasoning. Si no podés agree, involucrá un third reviewer o tech lead. No blockees el PR indefinidamente por un non-blocking suggestion. Para blocking issues, explainá tu approach y pedí alternatives.

### ¿Cuántos reviewers debería tener un PR?

Un thorough review es better que three rubber stamps. Para critical changes (security, payments, migrations), requerí two approvals. Para routine changes, uno es sufficient.

### ¿Debería reviewear tests o implementation first?

Tests first. Si los tests no coveren el right behavior, el implementation está testing contra wrong expectations. Good tests también sirven como documentation para qué el code debería hacer.

### ¿Cómo handleo un PR que es too large?

Pedile al author que lo breakee en smaller PRs. Si no es possible, hacé un first pass focuseando en el overall structure y design, luego un second pass focuseando en details. Usá el PR description para entender el scope antes de divear en el code.
