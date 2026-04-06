import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export function useCourtFavorites() {
  const { user } = useAuth();
  const [favoriteCourtIds, setFavoriteCourtIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoriteCourtIds(new Set());
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("court_favorites")
        .select("court_id")
        .eq("user_id", user.id);

      if (!error && data) {
        setFavoriteCourtIds(new Set(data.map((f) => f.court_id)));
      }
      setLoading(false);
    };

    fetchFavorites();
  }, [user]);

  const toggleFavorite = useCallback(
    async (courtId: string) => {
      if (!user) return;

      const isFav = favoriteCourtIds.has(courtId);

      // Optimistic update
      setFavoriteCourtIds((prev) => {
        const next = new Set(prev);
        if (isFav) {
          next.delete(courtId);
        } else {
          next.add(courtId);
        }
        return next;
      });

      if (isFav) {
        const { error } = await supabase
          .from("court_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("court_id", courtId);

        if (error) {
          // Revert on error
          setFavoriteCourtIds((prev) => new Set(prev).add(courtId));
        }
      } else {
        const { error } = await supabase
          .from("court_favorites")
          .insert({ user_id: user.id, court_id: courtId });

        if (error) {
          // Revert on error
          setFavoriteCourtIds((prev) => {
            const next = new Set(prev);
            next.delete(courtId);
            return next;
          });
        }
      }
    },
    [user, favoriteCourtIds]
  );

  const isFavorite = useCallback(
    (courtId: string) => favoriteCourtIds.has(courtId),
    [favoriteCourtIds]
  );

  return { favoriteCourtIds, isFavorite, toggleFavorite, loading };
}
