import { Sparkles } from "lucide-react";
import { isDemoMode } from "@/lib/demo-mode";

/**
 * Thin top banner that makes Demo Mode obvious during recording.
 * Hidden automatically when VITE_DEMO_MODE !== 'true'.
 */
export function DemoModeBanner() {
  if (!isDemoMode()) return null;

  return (
    <div className="sticky top-0 z-[100] w-full bg-gradient-to-r from-primary/90 via-primary to-primary/90 text-primary-foreground text-xs sm:text-sm py-1.5 px-4 flex items-center justify-center gap-2 shadow-md">
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="font-medium tracking-wide">
        DEMO MODE — showing mock data. Set <code className="font-mono bg-black/20 px-1 rounded">VITE_DEMO_MODE=false</code> to disable.
      </span>
    </div>
  );
}
