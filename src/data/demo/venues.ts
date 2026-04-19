// Mock courts + venues for the Discover Courts page.
// Shape matches `CourtWithVenue` in src/pages/Courts.tsx (Court row + nested venues).
import { DEMO_VENUE_PHOTOS } from "./shared";

interface DemoVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string | null;
  suburb: string | null;
  description: string | null;
  amenities: string[] | null;
  photo_url: string | null;
  banner_url: string | null;
  latitude: number | null;
  longitude: number | null;
  email: string | null;
  phone: string | null;
  slug: string | null;
  owner_id: string;
  is_active: boolean | null;
  max_booking_minutes: number;
  slot_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

interface DemoCourt {
  id: string;
  name: string;
  venue_id: string;
  venues: DemoVenue;
  hourly_rate: number;
  ground_type: string | null;
  is_indoor: boolean | null;
  is_active: boolean | null;
  is_multi_court: boolean | null;
  parent_court_id: string | null;
  allowed_sports: string[] | null;
  capacity: number;
  rules: string | null;
  photo_url: string | null;
  photo_urls: string[] | null;
  payment_timing: "at_booking" | "deferred" | null;
  payment_hours_before: number | null;
  created_at: string;
  updated_at: string;
}

const NOW = new Date().toISOString();

const v = (
  id: string,
  overrides: Partial<DemoVenue> & Pick<DemoVenue, "name" | "city" | "address">
): DemoVenue => ({
  id,
  country: "New Zealand",
  suburb: null,
  description: null,
  amenities: ["Parking", "Showers", "Changing rooms", "Café"],
  photo_url: DEMO_VENUE_PHOTOS[0],
  banner_url: null,
  latitude: null,
  longitude: null,
  email: "info@demo.nz",
  phone: "+64 9 555 0100",
  slug: null,
  owner_id: "demo-owner",
  is_active: true,
  max_booking_minutes: 240,
  slot_interval_minutes: 30,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

const c = (
  id: string,
  venue: DemoVenue,
  overrides: Partial<DemoCourt> & Pick<DemoCourt, "name" | "hourly_rate" | "allowed_sports">
): DemoCourt => ({
  id,
  venue_id: venue.id,
  venues: venue,
  ground_type: "hard",
  is_indoor: false,
  is_active: true,
  is_multi_court: false,
  parent_court_id: null,
  capacity: 4,
  rules: null,
  photo_url: venue.photo_url,
  photo_urls: venue.photo_url ? [venue.photo_url] : null,
  payment_timing: "at_booking",
  payment_hours_before: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

// 12 venues across NZ
const venues: DemoVenue[] = [
  v("venue-1", { name: "Auckland Tennis Centre", city: "Auckland", address: "1 Stanley St, Parnell", photo_url: DEMO_VENUE_PHOTOS[0], amenities: ["Parking", "Pro shop", "Showers", "Café", "Coaching"] }),
  v("venue-2", { name: "Westgate Padel Club", city: "Auckland", address: "30 Maki St, Westgate", photo_url: DEMO_VENUE_PHOTOS[1], amenities: ["Parking", "Showers", "Lockers", "Equipment hire"] }),
  v("venue-3", { name: "Eden Park Indoor Sports", city: "Auckland", address: "Reimers Ave, Mt Eden", photo_url: DEMO_VENUE_PHOTOS[2], amenities: ["Parking", "Café", "Air conditioning", "Spectator seating"] }),
  v("venue-4", { name: "Mission Bay Beach Volleyball", city: "Auckland", address: "Tamaki Dr, Mission Bay", photo_url: DEMO_VENUE_PHOTOS[3], amenities: ["Beach access", "Showers", "Equipment hire"] }),
  v("venue-5", { name: "Kingsland Futsal Arena", city: "Auckland", address: "12 New North Rd, Kingsland", photo_url: DEMO_VENUE_PHOTOS[4], amenities: ["Parking", "Café", "Lockers", "Spectator area"] }),
  v("venue-6", { name: "Wellington Racquets Club", city: "Wellington", address: "10 Hataitai Rd", photo_url: DEMO_VENUE_PHOTOS[5], amenities: ["Pro shop", "Coaching", "Café", "Showers"] }),
  v("venue-7", { name: "Te Aro Padel Hub", city: "Wellington", address: "150 Cuba St", photo_url: DEMO_VENUE_PHOTOS[7], amenities: ["Equipment hire", "Showers", "Lounge"] }),
  v("venue-8", { name: "Kilbirnie Recreation Centre", city: "Wellington", address: "Coutts St, Kilbirnie", photo_url: DEMO_VENUE_PHOTOS[2], amenities: ["Parking", "Café", "Lockers", "Spectator seating"] }),
  v("venue-9", { name: "Oriental Bay Beach Courts", city: "Wellington", address: "Oriental Parade", photo_url: DEMO_VENUE_PHOTOS[3], amenities: ["Beach access", "Showers"] }),
  v("venue-10", { name: "Christchurch Tennis Club", city: "Christchurch", address: "Wilding Park, Hagley Ave", photo_url: DEMO_VENUE_PHOTOS[0], amenities: ["Pro shop", "Coaching", "Café"] }),
  v("venue-11", { name: "Riccarton Padel Centre", city: "Christchurch", address: "200 Riccarton Rd", photo_url: DEMO_VENUE_PHOTOS[1], amenities: ["Parking", "Equipment hire", "Lockers"] }),
  v("venue-12", { name: "Cashmere Sports Hub", city: "Christchurch", address: "85 Cashmere Rd", photo_url: DEMO_VENUE_PHOTOS[4], amenities: ["Parking", "Café", "Showers", "Air conditioning"] }),
];

export const DEMO_COURTS: DemoCourt[] = [
  c("court-1", venues[0], { name: "Centre Court", hourly_rate: 45, ground_type: "hard", is_indoor: false, allowed_sports: ["tennis"] }),
  c("court-2", venues[1], { name: "Padel Court 1", hourly_rate: 60, ground_type: "turf", is_indoor: true, allowed_sports: ["padel"] }),
  c("court-3", venues[2], { name: "Indoor Court A", hourly_rate: 80, ground_type: "hard", is_indoor: true, allowed_sports: ["basketball", "volleyball"] }),
  c("court-4", venues[3], { name: "Beach Court 1", hourly_rate: 25, ground_type: "sand", is_indoor: false, allowed_sports: ["volleyball"] }),
  c("court-5", venues[4], { name: "Futsal Pitch", hourly_rate: 70, ground_type: "turf", is_indoor: true, allowed_sports: ["futsal"] }),
  c("court-6", venues[5], { name: "Court 1", hourly_rate: 50, ground_type: "clay", is_indoor: false, allowed_sports: ["tennis"] }),
  c("court-7", venues[6], { name: "Glass Court", hourly_rate: 65, ground_type: "turf", is_indoor: true, allowed_sports: ["padel"] }),
  c("court-8", venues[7], { name: "Main Court", hourly_rate: 75, ground_type: "hard", is_indoor: true, allowed_sports: ["basketball", "volleyball", "futsal"] }),
  c("court-9", venues[8], { name: "Beach Court", hourly_rate: 20, ground_type: "sand", is_indoor: false, allowed_sports: ["volleyball"] }),
  c("court-10", venues[9], { name: "Centre Court", hourly_rate: 40, ground_type: "grass", is_indoor: false, allowed_sports: ["tennis"] }),
  c("court-11", venues[10], { name: "Court 1", hourly_rate: 55, ground_type: "turf", is_indoor: true, allowed_sports: ["padel"] }),
  c("court-12", venues[11], { name: "Multi-sport Hall", hourly_rate: 70, ground_type: "hard", is_indoor: true, allowed_sports: ["basketball", "volleyball", "futsal"] }),
];

export const DEMO_CITIES = ["Auckland", "Wellington", "Christchurch"];
