import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";
import Landing from "./Landing";
import Home from "./Home";

const Index = () => {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect court managers to their dashboard
    if (!isLoading && user && userRole === "court_manager") {
      navigate("/manager", { replace: true });
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

  // Show Home (Court Discovery) for players
  if (userRole === "player" || userRole === "organizer") {
    return <Home />;
  }

  // Show loading while redirecting managers
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
