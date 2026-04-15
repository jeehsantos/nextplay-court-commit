import { Button } from "@/components/ui/button";
import { X, Eye } from "lucide-react";
import { useDemoContext } from "./DemoContext";
import { useTranslation } from "react-i18next";

export function DemoBanner() {
  const { demoRole, exitDemo } = useDemoContext();
  const { t } = useTranslation("landing");

  const label = demoRole === "player" ? t("demo.playerView") : t("demo.managerView");

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-primary px-4 py-2.5 text-primary-foreground">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4" />
        <span>{t("demo.demoBanner")} — {label}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-primary-foreground hover:bg-primary-foreground/20"
        onClick={exitDemo}
      >
        <X className="h-3.5 w-3.5" />
        {t("demo.exitDemo")}
      </Button>
    </div>
  );
}
