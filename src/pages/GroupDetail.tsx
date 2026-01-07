import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SportIcon, getSportLabel } from "@/components/ui/sport-icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
  Users,
  Share2,
  Crown,
  UserPlus,
  CalendarDays
} from "lucide-react";
import { format, addDays } from "date-fns";

type SportType = "futsal" | "tennis" | "volleyball" | "basketball" | "turf_hockey" | "badminton" | "other";

interface Member {
  id: string;
  name: string;
  avatar?: string;
  isAdmin: boolean;
  joinedAt: Date;
}

interface UpcomingSession {
  id: string;
  date: Date;
  time: string;
  courtName: string;
  confirmedPlayers: number;
  maxPlayers: number;
  price: number;
}

interface GroupData {
  id: string;
  name: string;
  sport: SportType;
  city: string;
  description: string;
  memberCount: number;
  schedule: string;
  defaultDay: string;
  defaultTime: string;
  defaultVenue: string;
  weeklyPrice: number;
  isPublic: boolean;
  photoUrl?: string;
  members: Member[];
  upcomingSessions: UpcomingSession[];
}

// Demo data
const groupsData: Record<string, GroupData> = {
  "5": {
    id: "5",
    name: "Tennis Tuesdays",
    sport: "tennis",
    city: "Takapuna",
    description: "A friendly group of tennis enthusiasts who meet every Tuesday evening for doubles matches. All skill levels welcome! We rotate partners each week to keep things interesting.",
    memberCount: 24,
    schedule: "Tuesdays at 6:00 PM",
    defaultDay: "Tuesday",
    defaultTime: "6:00 PM",
    defaultVenue: "Takapuna Tennis Club",
    weeklyPrice: 15.0,
    isPublic: true,
    members: [
      { id: "m1", name: "Rachel Green", avatar: "", isAdmin: true, joinedAt: new Date("2024-01-15") },
      { id: "m2", name: "Monica Geller", avatar: "", isAdmin: true, joinedAt: new Date("2024-01-15") },
      { id: "m3", name: "Ross Geller", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-01") },
      { id: "m4", name: "Chandler Bing", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-10") },
      { id: "m5", name: "Joey Tribbiani", avatar: "", isAdmin: false, joinedAt: new Date("2024-03-01") },
      { id: "m6", name: "Phoebe Buffay", avatar: "", isAdmin: false, joinedAt: new Date("2024-03-15") },
    ],
    upcomingSessions: [
      { id: "s1", date: addDays(new Date(), 2), time: "6:00 PM", courtName: "Court 1 & 2", confirmedPlayers: 6, maxPlayers: 8, price: 15.0 },
      { id: "s2", date: addDays(new Date(), 9), time: "6:00 PM", courtName: "Court 1 & 2", confirmedPlayers: 4, maxPlayers: 8, price: 15.0 },
    ],
  },
  "6": {
    id: "6",
    name: "Volleyball Vibes",
    sport: "volleyball",
    city: "Auckland CBD",
    description: "Weekend volleyball sessions for players of all levels. We play indoor volleyball with a focus on fun and fitness. Great way to meet new people and stay active!",
    memberCount: 32,
    schedule: "Saturdays at 10:00 AM",
    defaultDay: "Saturday",
    defaultTime: "10:00 AM",
    defaultVenue: "Auckland Recreation Center",
    weeklyPrice: 12.0,
    isPublic: true,
    members: [
      { id: "m1", name: "Michael Scott", avatar: "", isAdmin: true, joinedAt: new Date("2024-01-01") },
      { id: "m2", name: "Jim Halpert", avatar: "", isAdmin: true, joinedAt: new Date("2024-01-01") },
      { id: "m3", name: "Pam Beesly", avatar: "", isAdmin: false, joinedAt: new Date("2024-01-15") },
      { id: "m4", name: "Dwight Schrute", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-01") },
      { id: "m5", name: "Angela Martin", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-15") },
      { id: "m6", name: "Kevin Malone", avatar: "", isAdmin: false, joinedAt: new Date("2024-03-01") },
      { id: "m7", name: "Oscar Martinez", avatar: "", isAdmin: false, joinedAt: new Date("2024-03-10") },
      { id: "m8", name: "Stanley Hudson", avatar: "", isAdmin: false, joinedAt: new Date("2024-03-20") },
    ],
    upcomingSessions: [
      { id: "s1", date: addDays(new Date(), 4), time: "10:00 AM", courtName: "Main Hall", confirmedPlayers: 10, maxPlayers: 12, price: 12.0 },
      { id: "s2", date: addDays(new Date(), 11), time: "10:00 AM", courtName: "Main Hall", confirmedPlayers: 8, maxPlayers: 12, price: 12.0 },
    ],
  },
  "3": {
    id: "3",
    name: "Hoops After Work",
    sport: "basketball",
    city: "Albany",
    description: "After-work basketball sessions for professionals who want to stay active. Competitive but friendly atmosphere. We run 5v5 full court games.",
    memberCount: 18,
    schedule: "Thursdays at 6:30 PM",
    defaultDay: "Thursday",
    defaultTime: "6:30 PM",
    defaultVenue: "Albany Basketball Courts",
    weeklyPrice: 10.0,
    isPublic: true,
    members: [
      { id: "m1", name: "LeBron James", avatar: "", isAdmin: true, joinedAt: new Date("2024-01-01") },
      { id: "m2", name: "Stephen Curry", avatar: "", isAdmin: false, joinedAt: new Date("2024-01-15") },
      { id: "m3", name: "Kevin Durant", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-01") },
      { id: "m4", name: "Giannis A.", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-15") },
    ],
    upcomingSessions: [
      { id: "s1", date: addDays(new Date(), 1), time: "6:30 PM", courtName: "Outdoor Court", confirmedPlayers: 5, maxPlayers: 10, price: 10.0 },
    ],
  },
  "4": {
    id: "4",
    name: "Friday Night Futsal",
    sport: "futsal",
    city: "Auckland CBD",
    description: "End your week with some futsal action! We play fast-paced indoor soccer every Friday night. All skill levels welcome.",
    memberCount: 20,
    schedule: "Fridays at 8:00 PM",
    defaultDay: "Friday",
    defaultTime: "8:00 PM",
    defaultVenue: "City Futsal",
    weeklyPrice: 15.0,
    isPublic: true,
    members: [
      { id: "m1", name: "Lionel Messi", avatar: "", isAdmin: true, joinedAt: new Date("2024-01-01") },
      { id: "m2", name: "Cristiano Ronaldo", avatar: "", isAdmin: false, joinedAt: new Date("2024-01-10") },
      { id: "m3", name: "Neymar Jr", avatar: "", isAdmin: false, joinedAt: new Date("2024-02-01") },
    ],
    upcomingSessions: [
      { id: "s1", date: addDays(new Date(), 3), time: "8:00 PM", courtName: "Indoor Arena", confirmedPlayers: 7, maxPlayers: 12, price: 15.0 },
    ],
  },
};

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id) {
      // Simulate API call
      setTimeout(() => {
        setGroup(groupsData[id] || null);
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

  if (!group) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <h2 className="text-xl font-semibold mb-2">Group not found</h2>
          <p className="text-muted-foreground mb-4">This group doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/discover")}>Back to Discover</Button>
        </div>
      </MobileLayout>
    );
  }

  const admins = group.members.filter(m => m.isAdmin);
  const regularMembers = group.members.filter(m => !m.isAdmin);

  return (
    <MobileLayout showHeader={false} showBottomNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header Image */}
        <div className="relative h-48 lg:h-64 bg-gradient-to-br from-primary/30 to-primary/10">
          {group.photoUrl && (
            <img
              src={group.photoUrl}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          {/* Back button */}
          <div className="absolute top-4 left-4 right-4 flex justify-between">
            <Button variant="secondary" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-4xl mx-auto lg:p-6 lg:space-y-6 -mt-16 relative">
          {/* Group Header Card */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SportIcon sport={group.sport} size="lg" />
                  <div>
                    <h1 className="font-display text-xl lg:text-2xl font-bold">{group.name}</h1>
                    <p className="text-muted-foreground">{getSportLabel(group.sport)}</p>
                  </div>
                </div>
                <Badge variant={group.isPublic ? "secondary" : "outline"}>
                  {group.isPublic ? "Public Group" : "Private Group"}
                </Badge>
              </div>
              
              <p className="mt-4 text-muted-foreground">{group.description}</p>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{group.memberCount}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">${group.weeklyPrice}</p>
                  <p className="text-xs text-muted-foreground">Per Session</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{group.upcomingSessions.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-4 lg:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Regular Schedule</p>
                    <p className="font-semibold">{group.schedule}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 lg:p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Default Venue</p>
                    <p className="font-semibold">{group.defaultVenue}</p>
                    <p className="text-sm text-muted-foreground">{group.city}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Sessions and Members */}
          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sessions">
                <CalendarDays className="h-4 w-4 mr-2" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="mt-4 space-y-3">
              {group.upcomingSessions.length > 0 ? (
                group.upcomingSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-card-hover transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{format(session.date, "EEEE, MMM d")}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.courtName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold">${session.price.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.confirmedPlayers}/{session.maxPlayers} players
                            </p>
                          </div>
                          <Button size="sm">Join</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No upcoming sessions scheduled</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="members" className="mt-4 space-y-4">
              {/* Admins */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Crown className="h-4 w-4 text-warning" />
                    Organizers
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {admins.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-warning/20 text-warning font-semibold">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {format(member.joinedAt, "MMM yyyy")}
                          </p>
                        </div>
                        <Crown className="h-4 w-4 text-warning" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Regular Members */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Members ({regularMembers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {regularMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {format(member.joinedAt, "MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Join Button */}
          {!isMember && (
            <div className="sticky bottom-4 pb-4">
              <Button 
                className="w-full btn-athletic h-12 text-base"
                onClick={() => setIsMember(true)}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Join Group - ${group.weeklyPrice}/session
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
