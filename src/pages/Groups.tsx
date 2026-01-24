import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { GroupCard } from "@/components/cards/GroupCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Group = Database["public"]["Tables"]["groups"]["Row"];

interface GroupWithMemberCount extends Group {
  memberCount: number;
}

const getDayName = (dayOfWeek: number): string => {
  const days = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  return days[dayOfWeek] || "";
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

export default function Groups() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Optimized query with single database call using aggregation
  const { data: myGroups = [], isLoading: loading } = useQuery<GroupWithMemberCount[]>({
    queryKey: ["my-groups", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch groups where user is organizer
      const { data: organizerGroups, error: organizerError } = await supabase
        .from("groups")
        .select("*")
        .eq("organizer_id", user.id)
        .eq("is_active", true);

      if (organizerError) throw organizerError;

      // Fetch groups where user is a member
      const { data: membershipData, error: memberError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const memberGroupIds = membershipData?.map(m => m.group_id) || [];
      
      let memberGroups: Group[] = [];
      if (memberGroupIds.length > 0) {
        const { data, error } = await supabase
          .from("groups")
          .select("*")
          .in("id", memberGroupIds)
          .neq("organizer_id", user.id)
          .eq("is_active", true);
        
        if (error) throw error;
        memberGroups = data || [];
      }

      // Combine and deduplicate
      const allGroups = [...(organizerGroups || []), ...memberGroups];
      const uniqueGroups = allGroups.filter((group, index, self) =>
        index === self.findIndex(g => g.id === group.id)
      );

      // Fetch member counts in a single query using aggregation
      const groupIds = uniqueGroups.map(g => g.id);
      
      if (groupIds.length === 0) return [];

      const { data: memberCounts, error: countError } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);

      if (countError) throw countError;

      // Count members per group
      const countsMap = new Map<string, number>();
      memberCounts?.forEach(member => {
        const currentCount = countsMap.get(member.group_id) || 0;
        countsMap.set(member.group_id, currentCount + 1);
      });

      // Add counts to groups (+1 for organizer)
      return uniqueGroups.map(group => ({
        ...group,
        memberCount: (countsMap.get(group.id) || 0) + 1,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 3, // 3 minutes
    refetchOnWindowFocus: true,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MobileLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">My Groups</h1>
          <Link to="/groups/create">
            <Button size="sm" className="btn-athletic">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </Link>
        </div>

        {/* Groups list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : myGroups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {myGroups.map((group) => (
              <GroupCard
                key={group.id}
                id={group.id}
                name={group.name}
                sport={group.sport_type}
                city={group.city}
                memberCount={group.memberCount}
                schedule={`${getDayName(group.default_day_of_week)} at ${formatTime(group.default_start_time)}`}
                isPublic={group.is_public || false}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">
                No groups yet
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Book a court to create your first group, or join an existing group via invite link
              </p>
              <Link to="/courts">
                <Button className="btn-athletic">
                  Browse Courts
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}