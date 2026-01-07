import { Link, useLocation } from "react-router-dom";
import { Home, Users, Search, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Users, label: "Groups", path: "/groups" },
  { icon: Search, label: "Discover", path: "/discover" },
  { icon: Calendar, label: "Games", path: "/games" },
  { icon: User, label: "Profile", path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-bottom lg:left-auto lg:right-auto lg:bottom-auto lg:top-0 lg:border-t-0 lg:border-b lg:bg-transparent lg:backdrop-blur-none">
      {/* Mobile bottom nav */}
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto lg:hidden">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Desktop sidebar nav - hidden on mobile, shown on lg+ */}
      <div className="hidden lg:flex lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-64 lg:flex-col lg:border-r lg:border-border/50 lg:bg-card lg:p-4">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">N</span>
          </div>
          <div>
            <span className="font-display font-bold text-xl">NextPlay</span>
            <p className="text-xs text-muted-foreground">No pay = No play</p>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 space-y-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
