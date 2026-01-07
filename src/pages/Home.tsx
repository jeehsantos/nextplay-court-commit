import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SportIcon } from "@/components/ui/sport-icon";
import { 
  Loader2, 
  Search, 
  MapPin, 
  DollarSign,
  Star,
  ChevronRight,
  List,
  Map as MapIcon,
  Filter
} from "lucide-react";

type SportType = "futsal" | "tennis" | "volleyball" | "basketball" | "turf_hockey" | "badminton" | "hockey" | "other";

interface Court {
  id: string;
  name: string;
  venueName: string;
  address: string;
  city: string;
  sport: SportType;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  isIndoor: boolean;
  latitude: number;
  longitude: number;
}

// Demo court data
const courtsData: Court[] = [
  {
    id: "c1",
    name: "Court A - Indoor Futsal",
    venueName: "Auckland Sports Center",
    address: "123 Sports Ave",
    city: "Auckland CBD",
    sport: "futsal",
    hourlyRate: 85,
    rating: 4.8,
    reviewCount: 124,
    imageUrl: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=400&h=300&fit=crop",
    isIndoor: true,
    latitude: -36.8485,
    longitude: 174.7633,
  },
  {
    id: "c2",
    name: "Tennis Court 1",
    venueName: "Takapuna Tennis Club",
    address: "45 Beach Road",
    city: "Takapuna",
    sport: "tennis",
    hourlyRate: 40,
    rating: 4.6,
    reviewCount: 89,
    imageUrl: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=300&fit=crop",
    isIndoor: false,
    latitude: -36.7880,
    longitude: 174.7740,
  },
  {
    id: "c3",
    name: "Basketball Court",
    venueName: "Albany Recreation Center",
    address: "78 Albany Highway",
    city: "Albany",
    sport: "basketball",
    hourlyRate: 60,
    rating: 4.5,
    reviewCount: 67,
    imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop",
    isIndoor: true,
    latitude: -36.7270,
    longitude: 174.6980,
  },
  {
    id: "c4",
    name: "Volleyball Hall",
    venueName: "North Shore Sports Hub",
    address: "22 Stadium Drive",
    city: "North Shore",
    sport: "volleyball",
    hourlyRate: 55,
    rating: 4.7,
    reviewCount: 45,
    imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=300&fit=crop",
    isIndoor: true,
    latitude: -36.7650,
    longitude: 174.7550,
  },
  {
    id: "c5",
    name: "Badminton Courts",
    venueName: "Parnell Badminton Club",
    address: "15 Parnell Rise",
    city: "Parnell",
    sport: "badminton",
    hourlyRate: 35,
    rating: 4.9,
    reviewCount: 156,
    imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&h=300&fit=crop",
    isIndoor: true,
    latitude: -36.8550,
    longitude: 174.7780,
  },
  {
    id: "c6",
    name: "Outdoor Futsal Pitch",
    venueName: "Mission Bay Sports",
    address: "88 Tamaki Drive",
    city: "Mission Bay",
    sport: "futsal",
    hourlyRate: 65,
    rating: 4.4,
    reviewCount: 78,
    imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400&h=300&fit=crop",
    isIndoor: false,
    latitude: -36.8480,
    longitude: 174.8180,
  },
];

const sports = [
  { value: "all", label: "All", emoji: "🎯" },
  { value: "futsal", label: "Futsal", emoji: "⚽" },
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "tennis", label: "Tennis", emoji: "🎾" },
  { value: "volleyball", label: "Volleyball", emoji: "🏐" },
  { value: "badminton", label: "Badminton", emoji: "🏸" },
];

// Lazy loading image component
function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden bg-muted ${className}`}>
      {isInView && (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      )}
    </div>
  );
}

// Court Card Component
function CourtCard({ 
  court, 
  isSelected, 
  onSelect, 
  onViewDetails 
}: { 
  court: Court; 
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected 
          ? "ring-2 ring-primary shadow-lg" 
          : "hover:shadow-md"
      }`}
      onClick={onSelect}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <LazyImage
          src={court.imageUrl}
          alt={court.name}
          className="h-32 sm:h-auto sm:w-40 lg:w-48 shrink-0"
        />
        
        {/* Content */}
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <SportIcon sport={court.sport} size="sm" />
                <Badge variant="secondary" className="text-xs">
                  {court.isIndoor ? "Indoor" : "Outdoor"}
                </Badge>
              </div>
              <h3 className="font-display font-semibold text-base truncate">
                {court.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate">
                {court.venueName}
              </p>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{court.address}, {court.city}</span>
          </div>

          {/* Rating & Price */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="font-semibold text-sm">{court.rating}</span>
              <span className="text-xs text-muted-foreground">({court.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-primary font-bold">
              <DollarSign className="h-4 w-4" />
              <span>{court.hourlyRate}</span>
              <span className="text-xs font-normal text-muted-foreground">/hr</span>
            </div>
          </div>

          {/* CTA */}
          <Button 
            className="w-full mt-3 btn-athletic"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
          >
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

// Simple Map Component (placeholder - can be replaced with actual map library)
function MapView({ 
  courts, 
  selectedCourtId, 
  onMarkerClick 
}: { 
  courts: Court[]; 
  selectedCourtId: string | null;
  onMarkerClick: (courtId: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);

  // Calculate center based on selected court or all courts
  const selectedCourt = courts.find(c => c.id === selectedCourtId);
  
  return (
    <div ref={mapRef} className="relative w-full h-full bg-muted rounded-lg overflow-hidden">
      {/* Map background placeholder */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20">
        {/* Grid pattern for map feel */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Map markers */}
      <div className="absolute inset-0 p-4">
        {courts.map((court, index) => {
          // Position markers in a grid pattern for demo
          const row = Math.floor(index / 3);
          const col = index % 3;
          const top = 15 + row * 35;
          const left = 15 + col * 30;
          
          const isSelected = court.id === selectedCourtId;
          
          return (
            <button
              key={court.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                isSelected ? "z-20 scale-125" : "z-10 hover:scale-110"
              }`}
              style={{ top: `${top}%`, left: `${left}%` }}
              onClick={() => onMarkerClick(court.id)}
            >
              <div className={`relative ${isSelected ? "animate-bounce" : ""}`}>
                {/* Marker pin */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-white text-foreground border-2 border-primary"
                }`}>
                  <span className="text-sm font-bold">${court.hourlyRate}</span>
                </div>
                {/* Pin point */}
                <div className={`absolute left-1/2 -bottom-1 w-0 h-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent ${
                  isSelected ? "border-t-primary" : "border-t-white"
                }`} />
              </div>
              
              {/* Tooltip on hover/select */}
              {isSelected && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-popover text-popover-foreground rounded-lg shadow-lg whitespace-nowrap text-sm z-30">
                  <p className="font-semibold">{court.name}</p>
                  <p className="text-xs text-muted-foreground">{court.venueName}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Map attribution */}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
        Interactive Map
      </div>
    </div>
  );
}

export default function Home() {
  const { user, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "list" | "map">("split");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth", { replace: true });
    }
    // Redirect court managers to their dashboard
    if (!isLoading && user && userRole === "court_manager") {
      navigate("/manager", { replace: true });
    }
  }, [user, userRole, isLoading, navigate]);

  // Filter courts
  const filteredCourts = courtsData.filter((court) => {
    const matchesSport = selectedSport === "all" || court.sport === selectedSport;
    const matchesSearch = searchQuery === "" || 
      court.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.venueName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      court.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSport && matchesSearch;
  });

  const handleCourtSelect = useCallback((courtId: string) => {
    setSelectedCourtId(courtId);
    
    // Scroll to the card in the list
    const cardElement = document.getElementById(`court-card-${courtId}`);
    if (cardElement && listRef.current) {
      cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleViewDetails = useCallback((courtId: string) => {
    navigate(`/courts/${courtId}`);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="px-4 py-3 lg:px-6">
          {/* Logo & Title */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">N</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-lg">Find Courts</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Discover and book sports courts near you</p>
              </div>
            </div>
            
            {/* View toggle - mobile only */}
            <div className="flex items-center gap-1 lg:hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("map")}
              >
                <MapIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courts, venues, or locations..."
              className="pl-10 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Sport filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-3 -mx-4 px-4 pb-1">
            {sports.map((sport) => (
              <Badge
                key={sport.value}
                variant={selectedSport === sport.value ? "default" : "outline"}
                className={`cursor-pointer whitespace-nowrap px-3 py-1.5 text-sm transition-all shrink-0 ${
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
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Court List */}
        <div 
          ref={listRef}
          className={`flex-1 overflow-y-auto ${
            viewMode === "map" ? "hidden lg:block" : ""
          } ${viewMode === "split" ? "lg:w-1/2 lg:max-w-2xl" : ""}`}
        >
          <div className="p-4 space-y-3">
            {/* Results count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredCourts.length} court{filteredCourts.length !== 1 ? "s" : ""} found
              </p>
            </div>

            {/* Court cards */}
            {filteredCourts.length > 0 ? (
              filteredCourts.map((court) => (
                <div key={court.id} id={`court-card-${court.id}`}>
                  <CourtCard
                    court={court}
                    isSelected={selectedCourtId === court.id}
                    onSelect={() => handleCourtSelect(court.id)}
                    onViewDetails={() => handleViewDetails(court.id)}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No courts found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or search query
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => {
                    setSelectedSport("all");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Map View */}
        <div 
          className={`flex-1 ${
            viewMode === "list" ? "hidden lg:block" : ""
          } ${viewMode === "split" ? "hidden lg:block lg:w-1/2" : "h-[50vh] lg:h-auto"}`}
        >
          <div className="h-full p-4 lg:pl-0">
            <MapView
              courts={filteredCourts}
              selectedCourtId={selectedCourtId}
              onMarkerClick={handleCourtSelect}
            />
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t safe-bottom lg:hidden">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          <button
            onClick={() => navigate("/")}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full text-primary"
          >
            <Search className="h-5 w-5 stroke-[2.5]" />
            <span className="text-xs font-medium">Discover</span>
          </button>
          <button
            onClick={() => navigate("/groups")}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full text-muted-foreground hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs font-medium">Groups</span>
          </button>
          <button
            onClick={() => navigate("/games")}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full text-muted-foreground hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium">Games</span>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full text-muted-foreground hover:text-foreground"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r bg-card p-4 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">N</span>
          </div>
          <div>
            <span className="font-display font-bold text-xl">NextPlay</span>
            <p className="text-xs text-muted-foreground">No pay = No play</p>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 space-y-1">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-3 rounded-lg w-full bg-primary/10 text-primary font-semibold"
          >
            <Search className="h-5 w-5 stroke-[2.5]" />
            <span>Discover</span>
          </button>
          <button
            onClick={() => navigate("/groups")}
            className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Groups</span>
          </button>
          <button
            onClick={() => navigate("/games")}
            className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Games</span>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-3 px-3 py-3 rounded-lg w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile</span>
          </button>
        </div>
      </nav>

      {/* Desktop content offset */}
      <style>{`
        @media (min-width: 1024px) {
          main {
            margin-left: 16rem;
          }
          header {
            margin-left: 16rem;
          }
        }
      `}</style>
    </div>
  );
}
