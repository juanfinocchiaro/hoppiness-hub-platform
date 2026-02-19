

# Fix: Sidebar Auto-Collapse + Layout Consistency

## Issue 1: Sidebar sections don't collapse when navigating away

**Root cause**: In `WorkSidebar.tsx`, `NavSectionGroup` has a `useEffect` that only handles `forceOpen === true`. When you navigate to a different section, `forceOpen` becomes `false` but nothing collapses the old section.

**Fix**: Replace the current useEffect with one that syncs `isOpen` to `forceOpen` in both directions -- open when entering, close when leaving.

```
// Current (broken):
useEffect(() => {
  if (forceOpen && !isOpen) setIsOpen(true);
}, [forceOpen, isOpen]);

// Fixed:
useEffect(() => {
  setIsOpen(forceOpen);
}, [forceOpen]);
```

This means: when a section has an active child, it opens. When the user navigates away, it closes automatically. Users can still manually toggle sections open/closed, but navigation will always sync.

**File**: `src/components/layout/WorkSidebar.tsx` (1 file, ~3 lines changed)

---

## Issue 2: Layout/title positioning inconsistency

Several pages still have redundant padding and/or manual headers that were missed in the previous audit pass. These cause:
- Double padding (the page adds `p-4 md:p-6` or `p-6` on top of WorkShell's `p-6`)
- Different title sizes and icon placement vs the `PageHeader` standard

**Pages to fix** (remove redundant padding wrapper, migrate to `PageHeader`):

| Page | Current Issues |
|---|---|
| `RequestsPage.tsx` | Manual `h1` with icon; should use `PageHeader` |
| `LiquidacionPage.tsx` | Has `p-4 md:p-6` (double padding) + manual `h1` |

**File changes**: 2 files, replacing manual headers with `PageHeader` and removing redundant padding divs.

---

## Summary

| File | Change |
|---|---|
| `src/components/layout/WorkSidebar.tsx` | Fix useEffect to sync `isOpen` with `forceOpen` (collapse on navigate away) |
| `src/pages/local/RequestsPage.tsx` | Replace manual `h1` + icon with `PageHeader` |
| `src/pages/local/LiquidacionPage.tsx` | Remove redundant `p-4 md:p-6`, replace manual `h1` with `PageHeader` |

No business logic, APIs, or state management changes. Strictly UI behavior and layout consistency.

