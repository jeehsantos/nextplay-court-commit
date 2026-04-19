// Mock quick challenges for src/hooks/useQuickChallenges.ts
import { DEMO_AVATARS, DEMO_NAMES, DEMO_VENUE_PHOTOS } from "./shared";

const today = new Date();
const dayStr = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

const player = (
  challengeId: string,
  slot: number,
  team: "left" | "right",
  nameIdx: number,
  paid = true
) => ({
  id: `${challengeId}-p${slot}`,
  challenge_id: challengeId,
  user_id: `demo-user-${nameIdx}`,
  team,
  slot_position: slot,
  payment_status: paid ? "paid" : "pending",
  joined_at: today.toISOString(),
  paid_at: paid ? today.toISOString() : null,
  profiles: {
    full_name: DEMO_NAMES[nameIdx % DEMO_NAMES.length],
    avatar_url: DEMO_AVATARS[nameIdx % DEMO_AVATARS.length],
    city: "Auckland",
    nationality_code: "NZ",
  },
});

const sportMeta = (id: string, name: string, display: string, icon: string) => ({
  id,
  name,
  display_name: display,
  icon,
});

const venueMeta = (id: string, name: string, city: string, photoIdx: number) => ({
  id,
  name,
  address: "Demo St",
  city,
  photo_url: DEMO_VENUE_PHOTOS[photoIdx % DEMO_VENUE_PHOTOS.length],
});

const courtMeta = (id: string, name: string, photoIdx: number) => ({
  id,
  name,
  photo_url: DEMO_VENUE_PHOTOS[photoIdx % DEMO_VENUE_PHOTOS.length],
  ground_type: "hard",
  payment_timing: "at_booking",
  payment_hours_before: null,
});

const ch = (
  id: string,
  sport: { name: string; display: string; icon: string },
  game_mode: string,
  total_slots: number,
  filled: number,
  scheduled_date: string,
  scheduled_time: string,
  price: number,
  city: string,
  venueName: string,
  courtName: string
) => {
  const players = Array.from({ length: filled }, (_, i) =>
    player(id, i + 1, i % 2 === 0 ? "left" : "right", i + parseInt(id.slice(-1) || "0"))
  );
  return {
    id,
    sport_category_id: sport.name,
    game_mode,
    status: filled === total_slots ? "full" : "open",
    venue_id: `v-${id}`,
    court_id: `c-${id}`,
    scheduled_date,
    scheduled_time,
    price_per_player: price,
    total_slots,
    payment_type: "split",
    created_by: "demo-organizer",
    created_at: today.toISOString(),
    sport_categories: sportMeta(sport.name, sport.name, sport.display, sport.icon),
    venues: venueMeta(`v-${id}`, venueName, city, parseInt(id.slice(-2)) || 0),
    courts: courtMeta(`c-${id}`, courtName, parseInt(id.slice(-2)) || 0),
    quick_challenge_players: players,
  };
};

const TENNIS = { name: "tennis", display: "Tennis", icon: "🎾" };
const PADEL = { name: "padel", display: "Padel", icon: "🏓" };
const BASKET = { name: "basketball", display: "Basketball", icon: "🏀" };
const VOLLEY = { name: "volleyball", display: "Volleyball", icon: "🏐" };
const FUTSAL = { name: "futsal", display: "Futsal", icon: "⚽" };

export const DEMO_QUICK_CHALLENGES = [
  ch("qc-01", PADEL, "2vs2", 4, 3, dayStr(0), "18:30", 15, "Auckland", "Westgate Padel Club", "Padel Court 1"),
  ch("qc-02", TENNIS, "1vs1", 2, 1, dayStr(0), "19:00", 22, "Auckland", "Auckland Tennis Centre", "Centre Court"),
  ch("qc-03", BASKET, "5vs5", 10, 7, dayStr(1), "20:00", 8, "Auckland", "Eden Park Indoor Sports", "Indoor Court A"),
  ch("qc-04", VOLLEY, "4vs4", 8, 6, dayStr(1), "17:30", 10, "Auckland", "Mission Bay Beach Volleyball", "Beach Court 1"),
  ch("qc-05", FUTSAL, "5vs5", 10, 10, dayStr(1), "21:00", 12, "Auckland", "Kingsland Futsal Arena", "Futsal Pitch"),
  ch("qc-06", PADEL, "2vs2", 4, 4, dayStr(2), "18:00", 16, "Wellington", "Te Aro Padel Hub", "Glass Court"),
  ch("qc-07", TENNIS, "2vs2", 4, 2, dayStr(2), "19:30", 14, "Wellington", "Wellington Racquets Club", "Court 1"),
  ch("qc-08", BASKET, "3vs3", 6, 4, dayStr(3), "19:00", 9, "Wellington", "Kilbirnie Recreation Centre", "Main Court"),
  ch("qc-09", VOLLEY, "2vs2", 4, 3, dayStr(3), "16:00", 7, "Wellington", "Oriental Bay Beach Courts", "Beach Court"),
  ch("qc-10", PADEL, "2vs2", 4, 2, dayStr(4), "18:30", 18, "Christchurch", "Riccarton Padel Centre", "Court 1"),
  ch("qc-11", TENNIS, "1vs1", 2, 1, dayStr(4), "08:00", 20, "Christchurch", "Christchurch Tennis Club", "Centre Court"),
  ch("qc-12", FUTSAL, "5vs5", 10, 5, dayStr(5), "19:00", 11, "Christchurch", "Cashmere Sports Hub", "Multi-sport Hall"),
];
