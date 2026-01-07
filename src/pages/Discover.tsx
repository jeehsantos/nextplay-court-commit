import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { GameCard } from "@/components/cards/GameCard";
import { GroupCard } from "@/components/cards/GroupCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { addDays } from "date-fns";

type SportType = "futsal" | "tennis" | "volleyball" | "basketball" | "turf_hockey" | "badminton" | "other";

// Demo data
const rescueGames = [
  {
    id: "3",
    groupName: "Hoops After Work",
    sport: "basketball" as SportType,
    courtName: "Outdoor Court",
    venueName: "Albany Basketball",
    date: addDays(new Date(), 1),
    time: "6:30 PM",
    price: 10.0,
    currentPlayers: 5,
    minPlayers: 8,
    maxPlayers: 10,
    state: "rescue" as const,
  },
  {
    id: "4",
    groupName: "Friday Night Futsal",
    sport: "futsal" as SportType,
    courtName: "Indoor Arena",
    venueName: "City Futsal",
    date: addDays(new Date(), 3),
    time: "8:00 PM",
    price: 15.0,
    currentPlayers: 7,
    minPlayers: 10,
    maxPlayers: 12,
    state: "rescue" as const,
  },
  {
    id: "7",
    groupName: "Tennis Mix-In",
    sport: "tennis" as SportType,
    courtName: "Court 3",
    venueName: "Remuera Tennis Club",
    date: addDays(new Date(), 2),
    time: "5:00 PM",
    price: 0,
    currentPlayers: 2,
    minPlayers: 4,
    maxPlayers: 4,
    state: "rescue" as const,
  },
  {
    id: "8",
    groupName: "Volleyball Open",
    sport: "volleyball" as SportType,
    courtName: "Beach Court",
    venueName: "Mission Bay",
    date: addDays(new Date(), 4),
    time: "4:00 PM",
    price: 0,
    currentPlayers: 4,
    minPlayers: 6,
    maxPlayers: 12,
    state: "rescue" as const,
  },
];

const publicGroups = [
  {
    id: "5",
    name: "Tennis Tuesdays",
    sport: "tennis" as SportType,
    city: "Takapuna",
    memberCount: 24,
    schedule: "Tuesdays at 6:00 PM",
    isPublic: true,
    weeklyPrice: 15.0,
  },
  {
    id: "6",
    name: "Volleyball Vibes",
    sport: "volleyball" as SportType,
    city: "Auckland CBD",
    memberCount: 32,
    schedule: "Saturdays at 10:00 AM",
    isPublic: true,
    weeklyPrice: 12.0,
  },
  {
    id: "9",
    name: "Basketball Legends",
    sport: "basketball" as SportType,
    city: "Albany",
    memberCount: 18,
    schedule: "Wednesdays at 7:00 PM",
    isPublic: true,
    weeklyPrice: 10.0,
  },
  {
    id: "10",
    name: "Futsal Fanatics",
    sport: "futsal" as SportType,
    city: "Newmarket",
    memberCount: 28,
    schedule: "Sundays at 6:00 PM",
    isPublic: true,
    weeklyPrice: 0,
  },
  {
    id: "11",
    name: "Badminton Club",
    sport: "badminton" as SportType,
    city: "Parnell",
    memberCount: 16,
    schedule: "Thursdays at 7:30 PM",
    isPublic: true,
    weeklyPrice: 8.0,
  },
];

const sports = [
  { value: "all", label: "All Sports", emoji: "🎯" },
  { value: "futsal", label: "Futsal", emoji: "⚽" },
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "tennis", label: "Tennis", emoji: "🎾" },
  { value: "volleyball", label: "Volleyball", emoji: "🏐" },
  { value: "badminton", label: "Badminton", emoji: "🏸" },
];

export default function Discover() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("filter") === "rescue" ? "rescue" : "groups"
  );
  const [selectedSport, setSelectedSport] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Filter rescue games based on sport and search
  const filteredRescueGames = useMemo(() => {
    return rescueGames.filter((game) => {
      const matchesSport = selectedSport === "all" || game.sport === selectedSport;
      const matchesSearch = searchQuery === "" || 
        game.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.sport.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSport && matchesSearch;
    });
  }, [selectedSport, searchQuery]);

  // Filter public groups based on sport and search
  const filteredGroups = useMemo(() => {
    return publicGroups.filter((group) => {
      const matchesSport = selectedSport === "all" || group.sport === selectedSport;
      const matchesSearch = searchQuery === "" || 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.sport.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSport && matchesSearch;
    });
  }, [selectedSport, searchQuery]);

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
      <div className="px-4 py-4 space-y-4 max-w-6xl mx-auto lg:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold">Discover</h1>
            <p className="text-muted-foreground text-sm">
              Find games and groups near you
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by sport, venue, or location..."
            className="pl-10 h-11"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sport filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap">
          {sports.map((sport) => (
            <Badge
              key={sport.value}
              variant={selectedSport === sport.value ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap px-3 py-1.5 text-sm transition-all ${
                selectedSport === sport.value 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-muted"
              }`}
              onClick={() => setSelectedSport(sport.value)}
            >
              <span className="mr-1.5">{sport.emoji}</span>
              {sport.label}
            </Badge>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rescue" className="relative">
              Rescue Games
              {filteredRescueGames.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-warning text-warning-foreground rounded-full text-xs font-bold">
                  {filteredRescueGames.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="groups">Public Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="rescue" className="mt-4">
            {filteredRescueGames.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRescueGames.map((game) => (
                  <GameCard key={game.id} {...game} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">No rescue games found</p>
                <p className="text-sm mt-1">
                  {selectedSport !== "all" 
                    ? `Try selecting a different sport or clear filters`
                    : "Check back later for new games"}
                </p>
                {selectedSport !== "all" && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSelectedSport("all")}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            {filteredGroups.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map((group) => (
                  <GroupCard key={group.id} {...group} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 opacity-50" />
                </div>
                <p className="font-medium">No groups found</p>
                <p className="text-sm mt-1">
                  {selectedSport !== "all" 
                    ? `Try selecting a different sport or clear filters`
                    : "Check back later for new groups"}
                </p>
                {selectedSport !== "all" && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setSelectedSport("all")}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
