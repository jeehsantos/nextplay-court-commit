import { useState } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { CourtCardAirbnb } from "./CourtCardAirbnb";
import type { Database } from "@/integrations/supabase/types";

type Court = Database["public"]["Tables"]["courts"]["Row"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];

interface CourtWithVenue extends Court {
  venues: Venue | null;
}

interface MobileCourtSheetProps {
  courts: CourtWithVenue[];
  loading: boolean;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  highlightedCourtId: string | null;
  onHighlight: (id: string | null) => void;
}

const sportFilters = ["all", "futsal", "basketball", "tennis", "volleyball", "badminton", "turf_hockey"] as const;

const sportData: Record<string, { emoji: string; label: string }> = {
  all: { emoji: "🎯", label: "All" },
  futsal: { emoji: "⚽", label: "Futsal" },
  basketball: { emoji: "🏀", label: "Basketball" },
  tennis: { emoji: "🎾", label: "Tennis" },
  volleyball: { emoji: "🏐", label: "Volleyball" },
  badminton: { emoji: "🏸", label: "Badminton" },
  turf_hockey: { emoji: "🏑", label: "Hockey" },
};

export function MobileCourtSheet({
  courts,
  loading,
  selectedSport,
  onSportChange,
  highlightedCourtId,
  onHighlight,
}: MobileCourtSheetProps) {
  const [snap, setSnap] = useState<number | string | null>(0.55);

  return (
    <DrawerPrimitive.Root 
      open={true} 
      modal={false}
      dismissible={false}
      snapPoints={[0.25, 0.55, 0.92]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Content 
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[20px] bg-background border-t border-border focus:outline-none"
          style={{ 
            height: typeof snap === 'number' ? `${snap * 100}vh` : '55vh',
            maxHeight: '92vh'
          }}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 mb-2 h-1.5 w-12 shrink-0 rounded-full bg-muted" />
          
          {/* Header with court count */}
          <div className="px-4 pb-3 border-b border-border">
            <p className="text-center font-semibold text-sm">
              {courts.length} court{courts.length !== 1 ? "s" : ""} available
            </p>
          </div>

          {/* Sport filter pills - horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide border-b border-border flex-shrink-0">
            {sportFilters.map((sport) => {
              const isActive = selectedSport === sport;
              const data = sportData[sport];
              
              return (
                <button
                  key={sport}
                  onClick={() => onSportChange(sport)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0 transition-all ${
                    isActive
                      ? "bg-foreground text-background"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <span>{data.emoji}</span>
                  <span>{data.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scrollable cards list */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 space-y-4 pb-24">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courts.map((court) => (
                    <CourtCardAirbnb
                      key={court.id}
                      court={court}
                      onHover={onHighlight}
                      isHighlighted={court.id === highlightedCourtId}
                    />
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
