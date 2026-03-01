
Implementation plan to fix the mobile `/courts` drawer regression (last card details clipped + pagination space):

1) Update `src/components/courts/MobileCourtSheet.tsx` layout math
- Replace hardcoded bottom-spacing assumptions with safe-area-aware offsets.
- Lift the drawer content above the mobile bottom nav using:
  - `bottom: calc(4rem + env(safe-area-inset-bottom, 0px))`
  - matching `height/maxHeight` so the top still starts below header and does not overflow.
- Remove the current fixed numeric padding logic (`BOTTOM_NAV_HEIGHT`, `PAGINATION_HEIGHT`) that is causing clipping regressions on different viewport heights.

2) Make pagination controls permanently visible and non-overlapping
- Move pagination controls out of the scrolled list area into a dedicated footer section in the drawer (`shrink-0`, bordered top, safe-area-aware padding).
- Keep only cards in the scroll container.
- Add scroll container bottom padding that matches only the footer height (not nav guesses), so the last card can always fully scroll into view.

3) Preserve mobile gesture behavior
- Keep current `WebkitOverflowScrolling`, `overscrollBehaviorY`, and `touchAction` settings on the card list container to avoid regressing drag/scroll UX.

4) Add small state safety for pagination
- Clamp/reset `currentPage` when filtered court count changes so page state cannot land on an invalid page and hide expected items.

5) Verify on actual mobile viewport cases
- Case A: 1 page (2 courts): fully show last card name, city, and price.
- Case B: multiple pages: show last card details and keep page buttons visible without overlap.
- Case C: with and without bottom safe-area inset.
- Case D: drag between snap points and confirm no clipping at expanded/collapsed states.

Technical details
- Files to update:
  - `src/components/courts/MobileCourtSheet.tsx` (primary fix)
- Exact behavior target:
  - Last card’s metadata (court name, location, price) must remain visible above bottom navigation.
  - Pagination controls must remain visible and tappable, not hidden behind nav.
  - No hardcoded pixel-only assumptions for bottom spacing; safe-area-aware spacing required.
