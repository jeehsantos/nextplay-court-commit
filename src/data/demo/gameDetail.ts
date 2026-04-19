// Mock GameData for src/pages/GameDetail.tsx in demo mode.
import { DEMO_MY_GAMES } from "./bookings";

const NAMES = ["Liam Walker", "Olivia Hughes", "Noah Patel", "Ava Smith", "Mason Lee", "Sophia Brown", "Ethan Wilson", "Mia Thompson", "Lucas Davis", "Charlotte Wright", "Benjamin Clark", "Amelia Scott"];

const buildPlayer = (sessionId: string, idx: number, isPaid: boolean) => ({
  id: `${sessionId}-p${idx}`,
  session_id: sessionId,
  user_id: `demo-user-${idx}`,
  joined_at: new Date(Date.now() - idx * 3600_000).toISOString(),
  confirmed_at: new Date().toISOString(),
  is_confirmed: true,
  is_from_rescue: false,
  isPaid,
  isWaitingList: false,
  profile: {
    id: `demo-profile-${idx}`,
    user_id: `demo-user-${idx}`,
    full_name: NAMES[idx % NAMES.length],
    avatar_url: null,
    phone: null,
    city: "Auckland",
    gender: null,
    nationality_code: "NZ",
    preferred_sports: [],
    referral_code: null,
    stripe_account_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any,
});

export function getDemoGameData(id: string, currentUserId: string) {
  const game = DEMO_MY_GAMES.find((g) => g.id === id);
  if (!game) return null;

  const dateStr = game.date.toISOString().split("T")[0];
  const groupId = `demo-group-${id}`;

  const session: any = {
    id,
    group_id: groupId,
    court_id: `demo-court-${id}`,
    sport_category_id: game.sportCategory?.id || null,
    session_date: dateStr,
    start_time: `${game.time}:00`,
    duration_minutes: game.durationMinutes,
    court_price: game.price * game.currentPlayers,
    min_players: game.minPlayers,
    max_players: game.maxPlayers,
    state: game.state,
    payment_type: game.isPaid ? "single" : "split",
    payment_deadline: new Date(game.date.getTime() - 86400_000).toISOString(),
    is_cancelled: false,
    is_rescue_open: game.state === "rescue",
    notes: null,
    organizer_fee_cents: 0,
    organizer_payout_amount_cents: 0,
    organizer_payout_status: "pending",
    organizer_stripe_transfer_id: null,
    organizer_user_id: currentUserId,
    session_type: "casual",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const group: any = {
    id: groupId,
    name: game.groupName,
    organizer_id: currentUserId,
    sport_category_id: game.sportCategory?.id || "",
    city: "Auckland",
    description: "Demo group for showcase recording.",
    default_court_id: session.court_id,
    default_day_of_week: game.date.getDay(),
    default_duration_minutes: game.durationMinutes,
    default_start_time: `${game.time}:00`,
    is_active: true,
    is_public: true,
    max_players: game.maxPlayers,
    min_players: game.minPlayers,
    organizer_plays: true,
    payment_deadline_hours: 24,
    photo_url: null,
    weekly_court_price: game.price * game.currentPlayers,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const court: any = {
    id: session.court_id,
    name: game.courtName,
    venue_id: `demo-venue-${id}`,
    capacity: game.maxPlayers,
    hourly_rate: game.price,
    is_active: true,
    is_indoor: true,
    is_multi_court: false,
    parent_court_id: null,
    allowed_sports: [game.sport],
    ground_type: "hard",
    payment_hours_before: 24,
    payment_timing: "at_booking",
    photo_url: null,
    photo_urls: [],
    rules: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    venues: {
      id: `demo-venue-${id}`,
      name: game.venueName,
      address: "123 Demo St",
      city: "Auckland",
      country: "New Zealand",
      owner_id: "demo-owner",
      suburb: "CBD",
      latitude: -36.85,
      longitude: 174.76,
      amenities: [],
      banner_url: null,
      description: null,
      email: null,
      phone: null,
      photo_url: null,
      is_active: true,
      slot_interval_minutes: 30,
      max_booking_minutes: 180,
      slug: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  const players = Array.from({ length: game.currentPlayers }, (_, i) =>
    buildPlayer(id, i, game.isPaid || i % 2 === 0)
  );
  // Make first player the current user so the page renders "you"
  if (players.length > 0) {
    players[0].user_id = currentUserId;
    players[0].profile.user_id = currentUserId;
    players[0].profile.full_name = "You";
  }

  return {
    session,
    group,
    sportCategory: game.sportCategory,
    court,
    players,
    waitingList: [],
    courtManagerId: "demo-owner",
    courtManagerProfile: { full_name: "Venue Manager", phone: "+64 21 555 0100" },
  };
}
