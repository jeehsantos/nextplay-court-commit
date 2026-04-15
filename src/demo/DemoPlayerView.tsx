import { useState } from "react";
import { DemoProvider } from "./DemoContext";
import { DemoBanner } from "./DemoBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Activity, CreditCard, Star, Trophy, Calendar, Search } from "lucide-react";
import { CourtCard } from "@/components/courts/CourtCard";
import { GroupCard } from "@/components/cards/GroupCard";
import { GameCard } from "@/components/cards/GameCard";
import { CreditsDisplay } from "@/components/profile/CreditsDisplay";
import { demoCourtsForCards, demoGroupCards, demoGameCards, demoProfile } from "./demoData";

function PlayerContent() {
  const [tab, setTab] = useState("courts");

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6 max-w-lg">
            <TabsTrigger value="courts">Courts</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="games">My Games</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Courts Tab — uses real CourtCard */}
          <TabsContent value="courts">
            <div className="space-y-4">
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold">Find a Court</h1>
                <p className="text-muted-foreground text-sm">Browse available courts near you</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {demoCourtsForCards.map((court) => (
                  <div key={court.id} className="pointer-events-none">
                    <CourtCard court={court} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Groups Tab — uses real GroupCard */}
          <TabsContent value="groups">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold">My Groups</h1>
                <Button size="sm" className="btn-athletic pointer-events-none">
                  <Users className="h-4 w-4 mr-1" />
                  New Group
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {demoGroupCards.map((group) => (
                  <div key={group.id} className="pointer-events-none">
                    <GroupCard {...group} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Games Tab — uses real GameCard */}
          <TabsContent value="games">
            <div className="space-y-4">
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold">My Games</h1>
                <p className="text-muted-foreground text-sm">Your upcoming and past sessions</p>
              </div>
              <Tabs defaultValue="upcoming">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                <TabsContent value="upcoming" className="mt-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {demoGameCards.map((game) => (
                      <div key={game.id} className="pointer-events-none">
                        <GameCard {...game} />
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="past" className="mt-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No past sessions yet</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          {/* Profile Tab — mirrors real Profile layout */}
          <TabsContent value="profile">
            <div className="space-y-4 max-w-2xl">
              {/* Profile header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold font-display">
                        {demoProfile.avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-display text-2xl font-bold">{demoProfile.fullName}</h2>
                      <p className="text-sm text-muted-foreground">{demoProfile.email}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5" /> {demoProfile.city}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Activity className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold font-display text-primary">{demoProfile.gamesPlayed}</p>
                      <p className="text-xs text-muted-foreground">Games Played</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Users className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold font-display text-primary">{demoProfile.groupCount}</p>
                      <p className="text-xs text-muted-foreground">Groups</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                        <Star className="h-4 w-4" />
                      </div>
                      <p className="text-2xl font-bold font-display text-primary">{demoProfile.showRate}%</p>
                      <p className="text-xs text-muted-foreground">Show Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credits */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-semibold">Platform Credits</h3>
                  </div>
                  <p className="text-3xl font-bold font-display text-primary">${demoProfile.credits.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Available balance for bookings</p>
                </CardContent>
              </Card>

              {/* Preferred Sports */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" /> Preferred Sports
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {demoProfile.preferredSports.map((s) => (
                      <Badge key={s} variant="secondary" className="text-sm">{s}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
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
