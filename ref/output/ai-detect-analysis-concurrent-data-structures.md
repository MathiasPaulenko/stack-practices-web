# AI-Detection Analysis — `concurrent-data-structures`

**Prompt:** `ref/prompts/ai-detect-analysis.md`

**Files audited:**

- `src/content/recipes/concurrency/concurrent-data-structures.md` (EN)
- `src/content/recipes/concurrency/concurrent-data-structures.es.md` (ES)

---

## Results

| Model | Initial | Final | Patterns fixed |
| --- | --- | --- | --- |
| **EN desklib** | 39.8% AI | **35.3% AI** | `missing_contraction` (5 findings → 0) |
| **ES desklib** | 34.7% AI | **28.7% AI** | 0 findings → 0 findings |

Both versions end below the 40% threshold and have **0 pattern findings**.

---

## Main changes

### English

- Rewrote the language-availability sentence and the `Further Reading` list as prose.
- Removed inline code backticks from sentences where the cleaner stripped the method name (`computeIfAbsent`, `merge`, `ConcurrentHashMap`, `synchronizedMap`, `asyncio.Queue`, `queue.Queue`, `ConcurrentModificationException`, `task_done`, `join`).
- Combined short, high-probability standalone sentences in `Key Takeaways` and FAQ answers.
- Fixed a corrupted `Key Takeaways` line that had duplicated trailing text.
- Added natural contractions and split long parallel phrases.

### Spanish

- Applied the same structural and phrasing changes in Spanish.
- Adjusted idiomatic wording for `computeIfAbsent`, `ConcurrentModificationException`, `task_done`, `join`, and queue/map explanations.
- Reworded the `Lecturas adicionales` paragraph to avoid `Véase también:` and bullet-style link lists.

---

## Validation

- `npm run content:quality` → 0 errors / 0 warnings
- `npm run content:links` → 0 broken related resources
- `npm run content:validate` → 0 errors / 74 pre-existing warnings
- `npm run check` → 0 errors / 0 warnings / 84 hints
- `npm run build` → 3,242 pages, successful
- `npm run sitemap` → regenerated

---

## Verdict

**AI-detection risk is now well below the 40% threshold for both EN and ES. The recipe is ready to keep its checklist item marked as done.**
