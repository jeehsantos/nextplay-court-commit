import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Save,
} from "lucide-react";

type SportType = "futsal" | "tennis" | "volleyball" | "basketball" | "turf_hockey" | "badminton" | "other";

const sports: { value: SportType; label: string; emoji: string }[] = [
  { value: "futsal", label: "Futsal", emoji: "⚽" },
  { value: "basketball", label: "Basketball", emoji: "🏀" },
  { value: "tennis", label: "Tennis", emoji: "🎾" },
  { value: "volleyball", label: "Volleyball", emoji: "🏐" },
  { value: "badminton", label: "Badminton", emoji: "🏸" },
  { value: "turf_hockey", label: "Turf Hockey", emoji: "🏑" },
  { value: "other", label: "Other", emoji: "🎯" },
];

interface ProfileData {
  full_name: string;
  phone: string;
  city: string;
  avatar_url: string;
  preferred_sports: SportType[];
}

export default function ProfileEdit() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: "",
    phone: "",
    city: "",
    avatar_url: "",
    preferred_sports: [],
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          city: data.city || "",
          avatar_url: data.avatar_url || "",
          preferred_sports: (data.preferred_sports as SportType[]) || [],
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          city: profileData.city,
          preferred_sports: profileData.preferred_sports,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
      navigate("/profile");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleSport = (sport: SportType) => {
    setProfileData((prev) => ({
      ...prev,
      preferred_sports: prev.preferred_sports.includes(sport)
        ? prev.preferred_sports.filter((s) => s !== sport)
        : [...prev.preferred_sports, sport],
    }));
  };

  const getInitials = () => {
    if (profileData.full_name) {
      return profileData.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <MobileLayout showHeader={false} showBottomNav={false}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display font-semibold">Edit Profile</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Save className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6 max-w-2xl mx-auto lg:p-6">
          {/* Avatar Section */}
          <Card>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profileData.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Tap to change photo
              </p>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  placeholder="Enter your first and last name"
                  value={profileData.full_name}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  This name will be shown to other players in games
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Enter your city"
                  value={profileData.city}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferred Sports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferred Sports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <Badge
                    key={sport.value}
                    variant={
                      profileData.preferred_sports.includes(sport.value)
                        ? "default"
                        : "outline"
                    }
                    className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${
                      profileData.preferred_sports.includes(sport.value)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => toggleSport(sport.value)}
                  >
                    <span className="mr-1.5">{sport.emoji}</span>
                    {sport.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Select sports you enjoy playing
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            className="w-full btn-athletic" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
