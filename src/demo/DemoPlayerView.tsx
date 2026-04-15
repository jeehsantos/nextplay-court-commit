import { useState } from "react";
import { DemoProvider } from "./DemoContext";
import { DemoBanner } from "./DemoBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Clock, Users, DollarSign, Star, Trophy, CreditCard } from "lucide-react";
import { demoCourts, demoGroups, demoGames, demoProfile } from "./demoData";

function getStateColor(status: "protected" | "rescue" | "released") {
  switch (status) {
    case "protected": return "bg-blue-500/10 text-blue-600 border-blue-200";
    case "rescue": return "bg-amber-500/10 text-amber-600 border-amber-200";
    case "released": return "bg-red-500/10 text-red-600 border-red-200";
    default: return "bg-muted text-muted-foreground";
  }
}

function PlayerContent() {
  const [tab, setTab] = useState("courts");

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="courts">Courts</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="games">My Games</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Courts Tab */}
          <TabsContent value="courts">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {demoCourts.map((court) => (
                <Card key={court.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img src={court.photoUrl} alt={court.name} className="h-full w-full object-cover" />
                    {court.isIndoor && (
                      <Badge className="absolute top-2 right-2 bg-background/80 text-foreground text-[10px]">Indoor</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm">{court.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {court.venueName}, {court.city}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {court.sports.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                      <span className="text-sm font-bold text-primary">${court.hourlyRate}/hr</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" /> Up to {court.capacity} players
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoGroups.map((group) => (
                <Card key={group.id} className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img src={group.photoUrl} alt={group.name} className="h-full w-full object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm">{group.name}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1">{group.sport}</Badge>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {group.memberCount}/{group.maxPlayers} members</p>
                      <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {group.day}s at {group.time}</p>
                      <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {group.city}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games">
            <div className="space-y-3">
              {demoGames.map((game) => (
                <Card key={game.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm truncate">{game.groupName}</h3>
                          <Badge className={`${getStateColor(game.status)} text-[10px]`}>
                            {game.status === "protected" ? "Confirmed" : game.status === "rescue" ? "Rescue Mode" : game.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{game.sport}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold">${game.pricePerPlayer.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">per player</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {game.date} at {game.time}</p>
                      <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {game.courtName}</p>
                      <p className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {game.playersConfirmed}/{game.maxPlayers} players</p>
                      <p className="flex items-center gap-1.5 text-muted-foreground">{game.venueName}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{demoProfile.avatarInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-bold">{demoProfile.fullName}</h2>
                    <p className="text-sm text-muted-foreground">{demoProfile.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> Details</h3>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {demoProfile.city}</p>
                      <p className="flex items-center gap-2"><Trophy className="h-3.5 w-3.5 text-muted-foreground" /> {demoProfile.gender}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Credits</h3>
                    <p className="text-2xl font-bold text-primary">${demoProfile.credits.toFixed(2)}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-sm mb-2">Preferred Sports</h3>
                  <div className="flex gap-2 flex-wrap">
                    {demoProfile.preferredSports.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function DemoPlayerView() {
  return (
    <DemoProvider role="player">
      <PlayerContent />
    </DemoProvider>
  );
}
