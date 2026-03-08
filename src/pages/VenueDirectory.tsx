import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ArrowRight } from "lucide-react";

export default function VenueDirectory() {
  const { data: venues, isLoading } = useQuery({
    queryKey: ["venue-directory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venues")
        .select("id, name, slug, city, suburb, description, photo_url, amenities")
        .eq("is_active", true)
        .not("slug", "is", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Venues</h1>
          <p className="text-muted-foreground mt-2">
            Browse our partner venues and book courts directly.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-lg" />
            ))}
          </div>
        ) : venues && venues.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Link key={venue.id} to={`/venue/${venue.slug}`}>
                <Card className="overflow-hidden hover:shadow-md hover:border-primary/50 transition-all h-full">
                  {venue.photo_url ? (
                    <div className="h-40 overflow-hidden">
                      <img
                        src={venue.photo_url}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                      <MapPin className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-2">
                    <h2 className="font-semibold text-lg">{venue.name}</h2>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {venue.city}
                        {venue.suburb ? `, ${venue.suburb}` : ""}
                      </span>
                    </div>
                    {venue.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {venue.description}
                      </p>
                    )}
                    {venue.amenities && venue.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {venue.amenities.slice(0, 3).map((a: string) => (
                          <Badge key={a} variant="secondary" className="text-xs capitalize">
                            {a}
                          </Badge>
                        ))}
                        {venue.amenities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{venue.amenities.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-primary font-medium pt-1">
                      View venue <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MapPin className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-semibold text-lg mb-1">No venues available yet</h2>
            <p className="text-muted-foreground">Check back soon for new venue listings.</p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
