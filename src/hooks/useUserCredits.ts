import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useUserCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(0);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("get_user_credits", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching credits:", error);
        setCredits(0);
      } else {
        setCredits(Number(data) || 0);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return { credits, isLoading, refetch: fetchCredits };
}
