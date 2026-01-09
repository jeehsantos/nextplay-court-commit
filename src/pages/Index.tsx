import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import Landing from "./Landing";

const Index = () => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect court managers to their dashboard
    if (!isLoading && user && userRole === "court_manager") {
      navigate("/manager", { replace: true });
    }
    // Redirect players/organizers to courts page
    if (!isLoading && user && (userRole === "player" || userRole === "organizer")) {
      navigate("/courts", { replace: true });
    }
  }, [user, userRole, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show landing page for non-authenticated users
  if (!user) {
    return <Landing />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
