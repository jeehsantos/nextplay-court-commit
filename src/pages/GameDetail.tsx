import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SessionBadge } from "@/components/ui/session-badge";
import { PlayerCount } from "@/components/ui/player-count";
import { SportIcon, getSportLabel } from "@/components/ui/sport-icon";
import { 
  Loader2, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
  Users,
  CheckCircle2,
  XCircle,
  Share2,
  MessageCircle
} from "lucide-react";
import { format, addDays, subDays, isPast } from "date-fns";

type SessionState = "protected" | "rescue" | "released";
type SportType = "futsal" | "tennis" | "volleyball" | "basketball" | "turf_hockey" | "badminton" | "other";

interface Player {
  id: string;
  name: string;
  avatar?: string;
  isPaid: boolean;
  isConfirmed: boolean;
}

interface GameData {
  id: string;
  groupName: string;
  sport: SportType;
  courtName: string;
  venueName: string;
  venueAddress: string;
  date: Date;
  time: string;
  duration: number;
  price: number;
  currentPlayers: number;
  minPlayers: number;
  maxPlayers: number;
  state: SessionState;
  isPaid: boolean;
  notes?: string;
  players: Player[];
}

// Demo data
const gamesData: Record<string, GameData> = {
  "1": {
    id: "1",
    groupName: "Wednesday Legends",
    sport: "futsal",
    courtName: "Court A",
    venueName: "Auckland Sports Center",
    venueAddress: "123 Sports Ave, Auckland CBD",
    date: addDays(new Date(), 2),
    time: "7:00 PM",
    duration: 60,
    price: 12.5,
    currentPlayers: 8,
    minPlayers: 10,
    maxPlayers: 14,
    state: "protected",
    isPaid: false,
    notes: "Bring your own water bottle. Bibs will be provided.",
    players: [
      { id: "p1", name: "John Smith", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p2", name: "Mike Johnson", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p3", name: "David Lee", avatar: "", isPaid: false, isConfirmed: true },
      { id: "p4", name: "Chris Wong", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p5", name: "Alex Chen", avatar: "", isPaid: false, isConfirmed: true },
      { id: "p6", name: "Sam Wilson", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p7", name: "Tom Brown", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p8", name: "James Taylor", avatar: "", isPaid: false, isConfirmed: true },
    ],
  },
  "2": {
    id: "2",
    groupName: "Sunday Smashers",
    sport: "badminton",
    courtName: "Hall 2",
    venueName: "North Shore Badminton",
    venueAddress: "45 Racket Road, Takapuna",
    date: addDays(new Date(), 5),
    time: "2:00 PM",
    duration: 90,
    price: 8.0,
    currentPlayers: 8,
    minPlayers: 8,
    maxPlayers: 8,
    state: "protected",
    isPaid: true,
    players: [
      { id: "p1", name: "Sarah Kim", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p2", name: "Emily Zhang", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p3", name: "Lisa Park", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p4", name: "Anna Lee", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p5", name: "Grace Wu", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p6", name: "Mia Chen", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p7", name: "Olivia Tan", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p8", name: "Sophie Lin", avatar: "", isPaid: true, isConfirmed: true },
    ],
  },
  "p1": {
    id: "p1",
    groupName: "Wednesday Legends",
    sport: "futsal",
    courtName: "Court A",
    venueName: "Auckland Sports Center",
    venueAddress: "123 Sports Ave, Auckland CBD",
    date: subDays(new Date(), 5),
    time: "7:00 PM",
    duration: 60,
    price: 12.5,
    currentPlayers: 12,
    minPlayers: 10,
    maxPlayers: 14,
    state: "protected",
    isPaid: true,
    players: [
      { id: "p1", name: "John Smith", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p2", name: "Mike Johnson", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p3", name: "David Lee", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p4", name: "Chris Wong", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p5", name: "Alex Chen", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p6", name: "Sam Wilson", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p7", name: "Tom Brown", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p8", name: "James Taylor", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p9", name: "Ryan Park", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p10", name: "Kevin Ng", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p11", name: "Brian Kim", avatar: "", isPaid: true, isConfirmed: true },
      { id: "p12", name: "Eric Liu", avatar: "", isPaid: true, isConfirmed: true },
    ],
  },
};

export default function GameDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id) {
      // Simulate API call
      setTimeout(() => {
        setGame(gamesData[id] || null);
        setLoading(false);
      }, 300);
    }
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (!game) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <h2 className="text-xl font-semibold mb-2">Game not found</h2>
          <p className="text-muted-foreground mb-4">This game doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/games")}>Back to Games</Button>
        </div>
      </MobileLayout>
    );
  }

  const isGamePast = isPast(game.date);
  const paidCount = game.players.filter(p => p.isPaid).length;

  return (
    <MobileLayout showHeader={false} showBottomNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display font-semibold">Game Details</h1>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-4xl mx-auto lg:p-6 lg:space-y-6">
          {/* Game Header Card */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SportIcon sport={game.sport} size="lg" />
                  <div>
                    <h2 className="font-display text-xl lg:text-2xl font-bold">{game.groupName}</h2>
                    <p className="text-muted-foreground">{getSportLabel(game.sport)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SessionBadge state={game.state} />
                  {isGamePast && (
                    <Badge variant="secondary">Completed</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Date & Time */}
            <Card>
              <CardContent className="p-4 lg:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-semibold">{format(game.date, "EEEE, MMMM d, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-semibold">{game.time} ({game.duration} min)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Venue */}
            <Card>
              <CardContent className="p-4 lg:p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Venue</p>
                    <p className="font-semibold">{game.venueName}</p>
                    <p className="text-sm text-muted-foreground">{game.courtName}</p>
                    <p className="text-sm text-muted-foreground mt-1">{game.venueAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price & Payment Status */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price per player</p>
                    <p className="text-2xl font-bold">${game.price.toFixed(2)}</p>
                  </div>
                </div>
                {!isGamePast && (
                  game.isPaid ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Paid & Confirmed</span>
                    </div>
                  ) : (
                    <Button className="btn-athletic">
                      Pay Now - ${game.price.toFixed(2)}
                    </Button>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Player Count */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold">Players</span>
                </div>
                <Badge variant="outline">
                  {paidCount}/{game.players.length} paid
                </Badge>
              </div>
              <PlayerCount
                current={game.currentPlayers}
                min={game.minPlayers}
                max={game.maxPlayers}
              />
            </CardContent>
          </Card>

          {/* Players List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {isGamePast ? "Players who attended" : "Confirmed Players"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 pt-2">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {game.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={player.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {player.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.name}</p>
                      <div className="flex items-center gap-1">
                        {player.isPaid ? (
                          <span className="text-xs text-success flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        ) : (
                          <span className="text-xs text-warning flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {game.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 lg:p-6 pt-2">
                <p className="text-muted-foreground">{game.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {!isGamePast && (
            <div className="flex gap-3 pb-4">
              <Button variant="outline" className="flex-1">
                <MessageCircle className="h-4 w-4 mr-2" />
                Group Chat
              </Button>
              <Button variant="destructive" className="flex-1">
                Leave Game
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
