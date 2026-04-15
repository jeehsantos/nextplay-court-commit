import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DemoRolePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemoRolePickerDialog({ open, onOpenChange }: DemoRolePickerDialogProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("landing");

  const pick = (role: "player" | "manager") => {
    onOpenChange(false);
    navigate(`/demo/${role}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("demo.chooseRole")}</DialogTitle>
          <DialogDescription>{t("demo.chooseRoleDesc")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <Card
            className="cursor-pointer border-2 border-transparent hover:border-primary/40 transition-colors"
            onClick={() => pick("player")}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Users className="h-7 w-7" />
              </div>
              <span className="font-semibold text-sm text-center">{t("demo.playerRole")}</span>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 border-transparent hover:border-primary/40 transition-colors"
            onClick={() => pick("manager")}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Building2 className="h-7 w-7" />
              </div>
              <span className="font-semibold text-sm text-center">{t("demo.managerRole")}</span>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
