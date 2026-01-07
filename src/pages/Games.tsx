import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { GameCard } from "@/components/cards/GameCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Search } from "lucide-react";
import { addDays, subDays } from "date-fns";

// Demo data
const upcomingGames = [
  {
    id: "1",
    groupName: "Wednesday Legends",
    sport: "futsal" as const,
    courtName: "Court A",
    venueName: "Auckland Sports Center",
    date: addDays(new Date(), 2),
    time: "7:00 PM",
    price: 12.5,
    currentPlayers: 8,
    minPlayers: 10,
    maxPlayers: 14,
    state: "protected" as const,
    isPaid: false,
  },
  {
    id: "2",
    groupName: "Sunday Smashers",
    sport: "badminton" as const,
    courtName: "Hall 2",
    venueName: "North Shore Badminton",
    date: addDays(new Date(), 5),
    time: "2:00 PM",
    price: 8.0,
    currentPlayers: 8,
    minPlayers: 8,
    maxPlayers: 8,
    state: "protected" as const,
    isPaid: true,
  },
];

const pastGames = [
  {
    id: "p1",
    groupName: "Wednesday Legends",
    sport: "futsal" as const,
    courtName: "Court A",
    venueName: "Auckland Sports Center",
    date: subDays(new Date(), 5),
    time: "7:00 PM",
    price: 12.5,
    currentPlayers: 12,
    minPlayers: 10,
    maxPlayers: 14,
    state: "protected" as const,
    isPaid: true,
  },
];

export default function Games() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MobileLayout>
      <div className="px-4 py-4 space-y-4 max-w-6xl mx-auto lg:px-6 lg:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold">My Games</h1>
            <p className="text-muted-foreground text-sm">
              Track your upcoming and past games
            </p>
          </div>
          <Link to="/discover">
            <Button className="btn-athletic w-full sm:w-auto gap-2">
              <Search className="h-4 w-4" />
              Find Games
            </Button>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {upcomingGames.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingGames.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            ) : (
              <Card className="max-w-md mx-auto">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-2">
                    No upcoming games
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Join a group or find a rescue game
                  </p>
                  <Link to="/discover">
                    <Button className="btn-athletic gap-2">
                      <Search className="h-4 w-4" />
                      Find Games
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {pastGames.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pastGames.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No past games yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
