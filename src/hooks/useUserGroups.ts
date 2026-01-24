import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Database } from "@/integrations/supabase/types";

type Group = Database["public"]["Tables"]["groups"]["Row"];

interface UserGroupsResult {
  groups: Group[];
  isOrganizer: boolean;
}

export function useUserGroups() {
  const { user } = useAuth();

  const { data, isLoading: loading, refetch } = useQuery<UserGroupsResult>({
    queryKey: ["user-groups", user?.id],
    queryFn: async () => {
      if (!user) {
        return { groups: [], isOrganizer: false };
      }

      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching user groups:", error);
        return { groups: [], isOrganizer: false };
      }

      return {
        groups: data || [],
        isOrganizer: (data || []).length > 0,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });

  return {
    groups: data?.groups || [],
    loading,
    isOrganizer: data?.isOrganizer || false,
    refetch,
  };
}
