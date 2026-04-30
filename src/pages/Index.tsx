import { forwardRef, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import Landing from "./Landing";

const Index = forwardRef<HTMLDivElement>((_props, ref) => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [waitingForRole, setWaitingForRole] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/") return;
    
    if (!isLoading && user && userRole === "court_manager") {
      navigate("/manager", { replace: true });
    }
    else if (!isLoading && user && userRole === "venue_staff") {
      navigate("/manager/availability", { replace: true });
    }
    else if (!isLoading && user && userRole === "admin") {
      navigate("/admin", { replace: true });
    }
    else if (!isLoading && user && (userRole === "player" || userRole === "organizer")) {
      navigate("/courts", { replace: true });
    }
  }, [user, userRole, isLoading, navigate, location.pathname]);

  // Safety: if user is logged in but role is null for >3s, redirect to courts
  useEffect(() => {
    if (!isLoading && user && !userRole) {
      setWaitingForRole(true);
      const timer = setTimeout(() => {
        navigate("/courts", { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setWaitingForRole(false);
    }
  }, [isLoading, user, userRole, navigate]);

  if (isLoading || (user && !userRole)) {
    return (
      <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <div ref={ref} className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
});

Index.displayName = "Index";

export default Index;
