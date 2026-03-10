

## Fix: MobileCourtSheet Scroll & Drag Issues

### Problems Identified

1. **Hard to drag to max snap (0.85)** — The large `pb-10` on the handle area and the scroll container fighting with vaul's drag gesture makes it difficult to reach the top snap point.
2. **Scrolling up at bottom of list collapses drawer** — When the user reaches the end of the scroll content and tries to scroll back up, the upward touch gesture is captured by vaul as a "drag down" instead of scrolling the inner content, causing the drawer to collapse.

### Root Cause

Vaul's gesture system intercepts touch events on the scrollable area. When `scrollTop` is at 0 (or near the bottom where overscroll triggers), upward/downward swipes get interpreted as drawer drag gestures rather than scroll actions. The current `touchAction: "pan-y"` on the scroll container isn't sufficient to prevent this conflict.

### Solution

1. **Increase max snap point** from `0.85` to `0.92` — gives the drawer more room to expand, making the top position easier to reach.

2. **Add `onPointerDownCapture` handler on the scroll container** — When the scroll container has scrollable content (scrollTop > 0), prevent vaul from capturing the pointer event. This ensures scrolling up works without collapsing the drawer.

3. **Add `data-vaul-no-drag` attribute** to the scroll container — Vaul respects this attribute to skip drag handling on marked elements, letting native scroll work uninterrupted.

4. **Reduce handle area padding** from `pb-10` to `pb-4` — The excessive padding makes the drag target area too large and wastes vertical space.

### Changes

**File: `src/components/courts/MobileCourtSheet.tsx`**

- Change snap points from `["180px", 0.5, 0.85]` to `["180px", 0.5, 0.92]`
- Add `data-vaul-no-drag` attribute to the scroll container div (line 97)
- Add `onPointerDownCapture` handler to the scroll container that calls `e.stopPropagation()` when `scrollTop > 0` — this prevents vaul from hijacking scroll-up gestures
- Reduce handle area bottom padding from `pb-10` to `pb-4`

