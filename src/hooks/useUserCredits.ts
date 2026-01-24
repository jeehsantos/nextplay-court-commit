import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useUserCredits() {
  const { user } = useAuth();

  const { data: credits = 0, isLoading, refetch } = useQuery({
    queryKey: ["user-credits", user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data, error } = await supabase.rpc("get_user_credits", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching credits:", error);
        return 0;
      }

      return Number(data) || 0;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - credits don't change often
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
  });

  return { credits, isLoading, refetch };
}
