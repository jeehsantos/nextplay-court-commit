import { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportIcon } from "@/components/ui/sport-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Loader2,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Court = Database["public"]["Tables"]["courts"]["Row"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];

export default function ManagerCourts() {
  const { venueId } = useParams<{ venueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "indoor" | "outdoor">("all");

  useEffect(() => {
    if (venueId && user) {
      fetchData();
    }
  }, [venueId, user]);

  const fetchData = async () => {
    try {
      // Fetch venue
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .eq("owner_id", user?.id)
        .single();

      if (venueError) throw venueError;
      setVenue(venueData);

      // Fetch courts
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("*")
        .eq("venue_id", venueId)
        .order("name");

      if (courtsError) throw courtsError;
      setCourts(courtsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      navigate("/manager/venues");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!confirm("Are you sure you want to delete this court?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("courts")
        .delete()
        .eq("id", courtId);

      if (error) throw error;
      
      toast({ title: "Court deleted successfully" });
      setCourts(courts.filter(c => c.id !== courtId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete court",
        variant: "destructive",
      });
    }
  };

  // Get unique sport types from courts
  const sportTypes = useMemo(() => {
    const uniqueSports = [...new Set(courts.map(c => c.sport_type).filter(Boolean))] as string[];
    return uniqueSports.sort();
  }, [courts]);

  // Filter courts based on search and filters
  const filteredCourts = useMemo(() => {
    return courts.filter(court => {
      const matchesSearch = 
        court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        court.sport_type?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSport = 
        sportFilter === "all" || court.sport_type === sportFilter;
      
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "active" && court.is_active) ||
        (statusFilter === "inactive" && !court.is_active);
      
      const matchesLocation = 
        locationFilter === "all" ||
        (locationFilter === "indoor" && court.is_indoor) ||
        (locationFilter === "outdoor" && !court.is_indoor);

      return matchesSearch && matchesSport && matchesStatus && matchesLocation;
    });
  }, [courts, searchQuery, sportFilter, statusFilter, locationFilter]);

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/manager/venues")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{venue?.name}</h1>
              <p className="text-muted-foreground">
                {filteredCourts.length} court{filteredCourts.length !== 1 ? "s" : ""} found
              </p>
            </div>
            <Link to={`/manager/venues/${venueId}/courts/new`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Court
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search courts by name or sport type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground">✕</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap gap-2">
              {/* Sport Type Filter */}
              {sportTypes.length > 0 && (
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue>
                      <span className="text-sm capitalize">
                        {sportFilter === "all" ? "All Sports" : sportFilter}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border shadow-lg">
                    <SelectItem value="all">All Sports</SelectItem>
                    {sportTypes.map((sport) => (
                      <SelectItem key={sport} value={sport} className="capitalize">
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as "all" | "active" | "inactive")}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{statusFilter === "all" ? "📋" : statusFilter === "active" ? "✅" : "⏸️"}</span>
                      <span className="text-sm">
                        {statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg">
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>📋</span>
                      <span>All Status</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <span>✅</span>
                      <span>Active</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <span>⏸️</span>
                      <span>Inactive</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={(val) => setLocationFilter(val as "all" | "indoor" | "outdoor")}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span>{locationFilter === "all" ? "🏟️" : locationFilter === "indoor" ? "🏠" : "🌤️"}</span>
                      <span className="text-sm capitalize">
                        {locationFilter === "all" ? "All Locations" : locationFilter}
                      </span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border shadow-lg">
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>🏟️</span>
                      <span>All Locations</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="indoor">
                    <div className="flex items-center gap-2">
                      <span>🏠</span>
                      <span>Indoor</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="outdoor">
                    <div className="flex items-center gap-2">
                      <span>🌤️</span>
                      <span>Outdoor</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Courts List */}
        {courts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                🏟️
              </div>
              <h3 className="font-semibold text-lg mb-2">No courts yet</h3>
              <p className="text-muted-foreground mb-4">
                Add courts to start publishing availability and receiving bookings.
              </p>
              <Link to={`/manager/venues/${venueId}/courts/new`}>
                <Button>Add Your First Court</Button>
              </Link>
            </CardContent>
          </Card>
        ) : filteredCourts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                🏟️
              </div>
              <h3 className="font-semibold text-lg mb-2">No courts found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setSportFilter("all");
                  setStatusFilter("all");
                  setLocationFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourts.map((court) => (
              <Card key={court.id}>
                <div className="aspect-video bg-muted relative">
                  {court.photo_url ? (
                    <img 
                      src={court.photo_url} 
                      alt={court.name}
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center rounded-t-lg">
                      <SportIcon sport={court.sport_type} className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 capitalize">
                    {court.sport_type}
                  </Badge>
                  {!court.is_active && (
                    <Badge variant="secondary" className="absolute top-2 right-2">
                      Inactive
                    </Badge>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-2">{court.name}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {court.capacity}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${court.hourly_rate}/hr
                    </span>
                    <span>{court.is_indoor ? "Indoor" : "Outdoor"}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link to={`/manager/venues/${venueId}/courts/${court.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteCourt(court.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
