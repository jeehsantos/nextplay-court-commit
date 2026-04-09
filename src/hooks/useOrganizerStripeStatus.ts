import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useUserGroups } from "@/hooks/useUserGroups";

interface OrganizerStripeStatus {
  isOrganizer: boolean;
  isConnected: boolean;
  detailsSubmitted: boolean;
  isLoading: boolean;
}

export function useOrganizerStripeStatus(): OrganizerStripeStatus {
  const { user } = useAuth();
  const { isOrganizer, loading: groupsLoading } = useUserGroups();

  const { data, isLoading: statusLoading } = useQuery({
    queryKey: ["organizer-stripe-status", user?.id],
    queryFn: async () => {
      if (!user) return { connected: false, details_submitted: false };

      try {
        const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
          body: { venueId: null },
        });
        if (error) throw error;
        return data as { connected: boolean; details_submitted: boolean };
      } catch {
        return { connected: false, details_submitted: false };
      }
    },
    enabled: !!user && isOrganizer,
    staleTime: 2 * 60 * 1000,
  });

  return {
    isOrganizer,
    isConnected: data?.connected ?? false,
    detailsSubmitted: data?.details_submitted ?? false,
    isLoading: groupsLoading || statusLoading,
  };
}
