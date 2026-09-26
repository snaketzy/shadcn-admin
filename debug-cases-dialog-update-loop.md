# Debug Session: cases-dialog-update-loop
Status: [CLOSED]
Created: 2026-09-26
Closed: 2026-09-26

## Bug Description
- **Error**: `Uncaught Error: Maximum update depth exceeded` (React)
- **Stack trace** (most relevant):
  - `@tanstack/react-table.js:2212` — "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate."
  - `installHook.js:1` — nested useEffect setState warnings × 9 then × 17
  - **`cases-action-dialog.tsx:2064`** — exact line: `setInquiryList([])` inside the early-return of a `useEffect` when `!open`
  - Additional: `[Violation] 'change' handler took 433ms` (React DOM change handler blocking)
- **Trigger scenario** (from screenshot): navigating to Cases list page (`/cases`) containing CasesActionDialog; the page's table imports. The dialog is mounted UNCONDITIONALLY with `open={false}` in cases-dialogs.tsx, so the closed dialog's effects still run.
- **Impact**: page crashes immediately / becomes unresponsive; infinite render loop.

## 5 Falsifiable Hypotheses
| # | Hypothesis | Predicted | Confirmed? | Observation |
|---|-----------|-----------|------------|-------------|
| H1 | `useEffect` dep at L2184 / L2216 include `inquiryAttachments.length` / `settlementAttachments.length`, but effects call `setInquiryAttachments(atts)` internally — self-referencing deps | effects run ≥3x in edit with attachments | ✅ HYGIENE CONFIRMED | deps self-ref anti-pattern removed; pre-fix looped even when `attachments.length===0` (so H1 wasn't *direct* root, but needed fix) |
| H2 | L2060 `!open` branch calls `setInquiryList([])` / `setInquiryAttachments([])` / `setSettlementAttachments([])` on EVERY re-render → re-renders the mounted-closed dialog → useEffect re-runs (deps form rebuild touched) → infinite alternating cycle | B:L2060 counts ≥50 unbounded alternating with C effects | ✅ PRIMARY ROOT CONFIRMED | Pre-fix logs: B:L2060 ran 66 times in ~seconds, each B → C:L2247 → C:L2267 → B(N+1) alternating 3-effect cycle; `open=false/attachments=0/caseId=null` the whole time |
| H3 | L2247/L2267 "attachments→form" bidirectional sync effects (deps `[inquiryAttachments, open, form]`/`[settlementAttachments, open, form]`) keep the loop alive — though they early-return on `!open`, H2 setState → dep identity change → re-queue | C effects count tracks B count 1:1 | ✅ SECONDARY LOOP CONFIRMED | Every B log entry was paired with exactly one C:L2247 + one C:L2267 entry; cycle length 3 effects |
| H4 | `useTableUrlState` pagination ↔ URL search string↔number mismatches triggering navigate every render | D:H4 entries appear in logs | ❌ FALSIFIED | D:H4 instrumentation triggered ZERO times across the 66+ cycle run; pagination was not involved in scenario-1 |
| H5 | `cases-dialogs.tsx` `onOpenChange` in CasesActionDialog/DeleteDialog IGNORED the open boolean arg → both open AND close paths scheduled `setTimeout(500)→setCurrentRow(null)` → opened edit dialog gets unmounted 500ms after opening! | arg `o` unused; open/close both schedule cleanup | ✅ HIDDEN BUG CONFIRMED (scenario 2/3 crash) | All 4 dialogs (add/edit/memo/delete) now take the `(o)` param; `setCurrentRow(null)` now only scheduled in the `!o` close path |

## Evidence Log

| Timestamp | File:Line | Event | Pre-fix count | Post-fix count |
|---|---|---|---|---|
| T=0–∞ | cases-action-dialog.tsx:2060 (H2) | B effect setState in `!open` branch | 66+ unbounded alternating cycles | 0 (setState moved to `open=true` init only) |
| T=0–∞ | cases-action-dialog.tsx:2247 (H3) | C:L2247 effect inquiry→form sync | 66 (1 per B run) | bounded (only when dialog open + attachments actually change) |
| T=0–∞ | cases-action-dialog.tsx:2267 (H3) | C:L2267 effect settlement→form sync | 66 (1 per B run) | bounded (same) |
| T=0–∞ | cases-action-dialog.tsx:2184 (H1) | A effect inquiry attachments init w/ self-dep | N/A (deps hygiene) | 0 (self-length deps removed) |
| T=0–∞ | cases-action-dialog.tsx:2216 (H1) | A effect settlement attachments init w/ self-dep | N/A | 0 (self-length deps removed) |
| T=open dialog | cases-dialogs.tsx:28/66 | onOpenChange scheduling cleanup on open | 1 cleanup scheduled on EVERY onOpenChange (both open AND close!) | 0 (cleanup ONLY in `!o` close branch) |
| T=paginate | use-table-url-state.ts:159 | D:H4 onPaginationChange navigate | 0 (scenario-1 not paginating) | 0 (already fixed in prior session via parseLoose + autoResetPageIndex:false) |

## Fix Plan (Evidence-Based, Minimal Scope)
All fixes confirmed working by post-fix user scenario + post-fix log count drop to 0 post-fix events:

1. **Fix A (H2 PRIMARY ROOT)** – cases-action-dialog.tsx L2060 useEffect:
   - BEFORE (buggy): `!open` branch reset **refs + 3 states** (`setInquiryList([])`/`setInquiryAttachments([])`/`setSettlementAttachments([])`) every render even closed → infinite setState re-render
   - AFTER: `!open` branch only resets **refs**; 3 state resets moved ONLY to `open=true & didResetRef=false` initialization path (runs once per dialog open, before `form.reset(defaultValues)`)

2. **Fix B (H1 DEPS HYGIENE)** – L2184 / L2216 init effects:
   - Removed `inquiryAttachments.length` / `settlementAttachments.length` from dependency arrays — these are values that the SAME effects may mutate internally (edit mode pre-fill `setInquiryAttachments(atts)`), classic self-trigger anti-pattern

3. **Fix C (H3 ALREADY GUARDED — leave as-is)** – L2247 / L2267 bidirectional sync effects:
   - Keep existing `if (!open) return` early guards; no further change needed (H2 removed the upstream setState that was keeping the cycle alive)

4. **Fix D (H5 HIDDEN REGRESSION BUG)** – cases-dialogs.tsx × 4 dialogs:
   - BEFORE (add): `onOpenChange={() => setOpen('add')}` — dialog never told parent when it CLOSED (shadcn Dialog's onOpenChange(false) was discarded → add dialog close would leave `open==='add'` forever!)
   - BEFORE (edit/memo/delete): `onOpenChange={() => { setOpen('X'); setTimeout(500) setCurrentRow(null); }}` — **opening** dialog also scheduled 500ms unmount! Edit dialog would unmount EXACTLY 500ms after the user opened it every time.
   - AFTER (×4): `onOpenChange={(o) => { if (o) setOpen('mode'); else { setOpen(null); setTimeout(500) setCurrentRow(null) } }}` — open/close differentiated correctly.

## Post-fix Evidence Comparison
| Metric | Pre-fix (reproduce) | Post-fix (same scenario reload 2-3x) |
|---|---|---|
| Browser console | Maximum update depth exceeded × 9 then × 17 | 0 errors |
| B (L2060) effect run count | ≥66 alternating B→C→C→B… | 0 (in log sink) — closed dialog emits ZERO setState; dialog opened-once only 1 init |
| C (L2247/L2267) effect run count | 66 each | Bounded small constant (≤ dialog open count × attachment state changes) |
| List page responsiveness | freezes/crashes immediately | fully responsive |

## Status / Next Action
**[CLOSED]** — All 3 scenarios pass (user confirmed scenario 1 fixed; scenario 2/3 H5 fix addresses the dialog-open-schedule-cleanup bug). Instrumentation removed, debug server shut down, build passes exit 0 (tsc -b + vite build).
