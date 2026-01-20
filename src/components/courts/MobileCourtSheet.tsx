import { useState, useRef, useEffect } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { CourtCard } from "./CourtCard";
import type { Database } from "@/integrations/supabase/types";
import "./MobileCourtSheet.css";

type Court = Database["public"]["Tables"]["courts"]["Row"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];

interface CourtWithVenue extends Court {
  venues: Venue | null;
}

interface MobileCourtSheetProps {
  courts: CourtWithVenue[];
  loading: boolean;
  highlightedCourtId: string | null;
  onHighlight: (id: string | null) => void;
}

export function MobileCourtSheet({
  courts,
  loading,
  highlightedCourtId,
  onHighlight,
}: MobileCourtSheetProps) {
  const [snap, setSnap] = useState<number | string | null>(0.15);

  // refs to help with gesture handling
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  // touch state stored in a ref to avoid re-renders
  const touchState = useRef({
    startY: 0,
    isScrolling: false,
    allowDrag: false,
  });

  // Reset touch state on unmount
  useEffect(() => {
    return () => {
      touchState.current = { startY: 0, isScrolling: false, allowDrag: false };
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchState.current.startY = t.clientY;

    const target = e.target as Element | null;
    const scrollEl = scrollRef.current;

    // If starting on the visible handle, allow drag
    const startedOnHandle = handleRef.current && (handleRef.current === target || handleRef.current.contains(target));
    if (startedOnHandle) {
      touchState.current.allowDrag = true;
      touchState.current.isScrolling = false;
      return;
    }

    // If the touch started inside the scrollable list and it can scroll, treat this as inner scroll
    if (scrollEl && target && scrollEl.contains(target)) {
      const canScroll = scrollEl.scrollHeight > scrollEl.clientHeight;
      if (canScroll) {
        touchState.current.isScrolling = true;
        touchState.current.allowDrag = false;
        return;
      }
    }

    // default: be conservative and do not allow drag unless the handle was used
    touchState.current.allowDrag = false;
    touchState.current.isScrolling = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    const deltaY = t.clientY - touchState.current.startY;

    // If user is scrolling inside the list, prevent the event from bubbling to the parent sheet
    if (touchState.current.isScrolling) {
      e.stopPropagation();
      // Do not preventDefault so native momentum scrolling still works.
      return;
    }

    // If we haven't allowed drag (didn't start on handle), block small vertical moves from starting a sheet drag.
    if (!touchState.current.allowDrag) {
      // If the user intentionally swipes enough, we might allow (optional). For now, block small accidental moves.
      if (Math.abs(deltaY) < 12) {
        e.stopPropagation();
      } else {
        // large moves that didn't start on handle — keep preventing to avoid accidental sheet movement
        e.stopPropagation();
      }
    }

    // if allowDrag === true, let the event bubble to the sheet so the library handles it
  };

  const onTouchEnd = () => {
    touchState.current.isScrolling = false;
    touchState.current.allowDrag = false;
    touchState.current.startY = 0;
  };

  // Calculate safe snap points - minimum visible, half, and max (below search header ~80px from top)
  // We use fixed pixel values for smaller screens to ensure visibility
  return (
    <DrawerPrimitive.Root open={true} modal={false} dismissible={false} snapPoints={["180px", 0.5, 0.85]} activeSnapPoint={snap} setActiveSnapPoint={setSnap}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-transparent pointer-events-none" style={{ zIndex: 1 }} />
        <DrawerPrimitive.Content
          className="fixed left-0 right-0 flex flex-col rounded-t-[20px] bg-background border-t border-border shadow-2xl focus:outline-none"
          style={{
            zIndex: 1,
            bottom: "0px",
            height: "calc(100dvh - 40px)",
            maxHeight: "calc(100dvh - 40px)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* Drag handle area - only when user starts here we allow sheet drag */}
          <div
            ref={handleRef}
            className="sheet-drag-handle flex flex-col items-center pt-3 pb-10 cursor-grab active:cursor-grabbing shrink-0"
            role="button"
            aria-label="Drag handle"
            // keep handle touch-action none so the library can detect the drag when started on the handle
            style={{ touchAction: "none" }}
          >
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">
              {courts.length >= 100 ? `Over ${Math.floor(courts.length / 100) * 100}` : courts.length} court{courts.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">Drag up to explore</p>
          </div>

          {/* Scrollable cards list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto sheet-scrollable min-h-0"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="p-4 space-y-4 pb-6">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-muted rounded-xl mb-3" />
                    <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ))
              ) : courts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No courts found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {courts.map((court) => (
                    <CourtCard key={court.id} court={court} onHover={onHighlight} isHighlighted={court.id === highlightedCourtId} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
