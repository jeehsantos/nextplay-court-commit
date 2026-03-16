import { forwardRef, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Download, CheckCircle2, ChevronDown, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface GuestNavbarProps {
  className?: string;
}

export const GuestNavbar = forwardRef<HTMLElement, GuestNavbarProps>(({ className }, ref) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useTranslation("common");
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();

  const navLinks = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.ourStory"), href: "/about" },
    { label: t("nav.venues"), href: "/courts" },
    { label: t("nav.contact"), href: "/contact" },
  ];

  const openDropdown = () => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setGetStartedOpen(true);
  };
  const closeDropdown = () => {
    dropdownTimeout.current = setTimeout(() => setGetStartedOpen(false), 150);
  };

  return (
    <header ref={ref} className={cn("fixed top-0 left-0 right-0 z-50 border-b border-border/70 bg-background/75 backdrop-blur-md", className)}>
      <div className="mx-auto flex h-20 w-full items-center px-4 sm:px-8 lg:px-12 xl:px-16 2xl:px-20">
        <Link to="/" className="flex items-center lg:flex-1" aria-label="Sport Arena home">
          <img src="/sportarena-logo.png" alt="Sport Arena logo" className="h-14 w-auto object-contain" />
        </Link>

        <nav className="hidden items-center justify-center gap-8 text-sm font-medium text-muted-foreground md:flex lg:flex-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "transition-colors hover:text-primary",
                  isActive && "text-primary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:flex-1 lg:justify-end">
          <Link to="/auth" className="hidden sm:block">
            <Button variant="ghost" className="font-semibold text-foreground">
              {t("nav.signIn")}
            </Button>
          </Link>

          {/* Desktop Get Started dropdown */}
          <div
            className="relative hidden sm:block"
            onMouseEnter={openDropdown}
            onMouseLeave={closeDropdown}
          >
            <Button
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
              onClick={() => setGetStartedOpen(!getStartedOpen)}
            >
              {t("nav.getStarted")}
              <ChevronDown className={cn("ml-1 h-4 w-4 transition-transform", getStartedOpen && "rotate-180")} />
            </Button>

            {getStartedOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <Link
                  to="/auth?tab=signup&role=player"
                  onClick={() => setGetStartedOpen(false)}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t("nav.startAsPlayer")}</p>
                    <p className="text-xs text-muted-foreground">{t("nav.startAsPlayerDesc")}</p>
                  </div>
                </Link>
                <Link
                  to="/auth?tab=signup&role=court_manager"
                  onClick={() => setGetStartedOpen(false)}
                  className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t("nav.startAsManager")}</p>
                    <p className="text-xs text-muted-foreground">{t("nav.startAsManagerDesc")}</p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label={t("nav.openMenu")} className="ml-auto">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="mt-10 flex flex-col gap-5">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      "text-base font-medium text-foreground transition-colors hover:text-primary",
                      location.pathname.startsWith(link.href) && link.href !== "/" && "text-primary",
                      location.pathname === "/" && link.href === "/" && "text-primary"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="my-1 border-border" />
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    {t("nav.signIn")}
                  </Button>
                </Link>

                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("nav.getStarted")}</p>
                <Link to="/auth?tab=signup&role=player" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div className="text-left">
                      <span className="block text-sm font-semibold">{t("nav.startAsPlayer")}</span>
                      <span className="block text-xs text-muted-foreground">{t("nav.startAsPlayerDesc")}</span>
                    </div>
                  </Button>
                </Link>
                <Link to="/auth?tab=signup&role=court_manager" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-3">
                    <Building2 className="h-5 w-5 text-green-600" />
                    <div className="text-left">
                      <span className="block text-sm font-semibold">{t("nav.startAsManager")}</span>
                      <span className="block text-xs text-muted-foreground">{t("nav.startAsManagerDesc")}</span>
                    </div>
                  </Button>
                </Link>

                {(canInstall || isInstalled) && (
                  <>
                    <hr className="my-1 border-border" />
                    <Button
                      variant={isInstalled ? "ghost" : "outline"}
                      className="w-full justify-start gap-3"
                      onClick={() => {
                        if (canInstall) promptInstall();
                      }}
                      disabled={isInstalled}
                    >
                      {isInstalled ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          App Installed
                        </>
                      ) : (
                        <>
                          <Download className="h-5 w-5" />
                          Install App
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
});

GuestNavbar.displayName = "GuestNavbar";
