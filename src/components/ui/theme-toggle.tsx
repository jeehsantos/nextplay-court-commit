import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ 
  variant = "ghost", 
  size = "icon",
  className = "",
  showLabel = false
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size="default"
        onClick={toggleTheme}
        className={className}
      >
        {theme === 'dark' ? (
          <>
            <Sun className="h-4 w-4 mr-2" />
            Light Mode
          </>
        ) : (
          <>
            <Moon className="h-4 w-4 mr-2" />
            Dark Mode
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`h-9 w-9 ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
