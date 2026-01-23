import { Badge } from "@/components/ui/badge";
import { Coins, Info, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface CreditsDisplayProps {
  credits: number;
  isLoading?: boolean;
  variant?: "compact" | "full";
}

export function CreditsDisplay({ 
  credits, 
  isLoading = false, 
  variant = "full" 
}: CreditsDisplayProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading credits...</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="secondary" 
              className="cursor-help gap-1.5 font-mono"
            >
              <Coins className="h-3.5 w-3.5" />
              ${credits.toFixed(2)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[250px]">
            <p className="text-xs">
              Credits earned from cancelled sessions. Use them to pay for future bookings.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 cursor-help transition-all hover:border-primary/40">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Available Credits</span>
              <Info className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="font-display font-bold text-xl text-primary">
              ${credits.toFixed(2)}
            </p>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="bottom" className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            How Credits Work
          </h4>
          <p className="text-sm text-muted-foreground">
            When you cancel a paid session, your payment is converted to credits instead of a refund. This helps avoid transaction fees and allows you to use the amount for future bookings.
          </p>
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Credits are automatically applied when you join a new session.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
