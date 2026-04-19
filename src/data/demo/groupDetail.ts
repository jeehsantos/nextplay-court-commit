// Mock data for src/pages/GroupDetail.tsx
import { DEMO_AVATARS, DEMO_NAMES, DEMO_VENUE_PHOTOS } from "./shared";
import { DEMO_GROUPS } from "./groups";

const NOW = new Date().toISOString();
const DEMO_USER = "demo-current-user";

const futureDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

const sportPhoto: Record<string, string> = {
  tennis: DEMO_VENUE_PHOTOS[0],
  padel: DEMO_VENUE_PHOTOS[1],
  basketball: DEMO_VENUE_PHOTOS[2],
  volleyball: DEMO_VENUE_PHOTOS[3],
  futsal: DEMO_VENUE_PHOTOS[4],
};

const venueByCity: Record<string, { name: string; address: string }> = {
  Auckland: { name: "Auckland Tennis Centre", address: "1 Stanley St, Parnell" },
  Wellington: { name: "Te Aro Padel Hub", address: "150 Cuba St" },
  Christchurch: { name: "Cashmere Sports Hub", address: "85 Cashmere Rd" },
};

export function getDemoGroupDetail(groupId: string) {
  const base = DEMO_GROUPS.find((g) => g.id === groupId) || DEMO_GROUPS[0];
  const photo = sportPhoto[base.sport_category_id] || DEMO_VENUE_PHOTOS[0];
  const venueInfo = venueByCity[base.city] || venueByCity.Auckland;

  const group = {
    id: base.id,
    name: base.name,
    description: `A friendly ${base.sport_category_id} group meeting weekly in ${base.city}. All skill levels welcome.`,
    city: base.city,
    sport_category_id: base.sport_category_id,
    organizer_id: DEMO_USER, // current user is the organizer for demos
    organizer_plays: true,
    default_court_id: "demo-court",
    default_day_of_week: base.default_day_of_week,
    default_start_time: base.default_start_time,
    default_duration_minutes: base.default_duration_minutes,
    weekly_court_price: base.weekly_court_price,
    payment_deadline_hours: base.payment_deadline_hours,
    min_players: base.min_players,
    max_players: base.max_players,
    is_active: true,
    is_public: base.is_public,
    photo_url: photo,
    created_at: NOW,
    updated_at: NOW,
  };

  const members = Array.from({ length: base.memberCount }).map((_, i) => ({
    id: `demo-member-${groupId}-${i}`,
    group_id: groupId,
    user_id: i === 0 ? DEMO_USER : `demo-user-${i}`,
    is_admin: i === 0 || i === 1,
    joined_at: NOW,
    profile: {
      id: `demo-profile-${i}`,
      user_id: i === 0 ? DEMO_USER : `demo-user-${i}`,
      full_name: DEMO_NAMES[i % DEMO_NAMES.length],
      avatar_url: DEMO_AVATARS[i % DEMO_AVATARS.length],
      city: base.city,
      gender: null,
      phone: null,
      nationality_code: "NZ",
      preferred_sports: [base.sport_category_id],
      referral_code: null,
      stripe_account_id: null,
      created_at: NOW,
      updated_at: NOW,
    },
  }));

  const buildSession = (offsetDays: number, idSuffix: number) => ({
    id: `demo-session-${groupId}-${idSuffix}`,
    group_id: groupId,
    court_id: "demo-court",
    session_date: futureDate(offsetDays),
    start_time: base.default_start_time,
    duration_minutes: base.default_duration_minutes,
    court_price: base.weekly_court_price,
    min_players: base.min_players,
    max_players: base.max_players,
    state: "protected" as const,
    is_cancelled: false,
    is_rescue_open: false,
    payment_deadline: NOW,
    payment_type: "split" as const,
    session_type: "casual" as const,
    sport_category_id: base.sport_category_id,
    notes: null,
    organizer_user_id: DEMO_USER,
    organizer_fee_cents: 0,
    organizer_payout_amount_cents: 0,
    organizer_payout_status: "NOT_APPLICABLE",
    organizer_stripe_transfer_id: null,
    created_at: NOW,
    updated_at: NOW,
    courts: {
      id: "demo-court",
      name: "Court 1",
      venue_id: "demo-venue",
      hourly_rate: base.weekly_court_price,
      ground_type: "hard",
      is_indoor: false,
      is_active: true,
      capacity: base.max_players,
      photo_url: photo,
      photo_urls: [photo],
      allowed_sports: [base.sport_category_id],
      rules: null,
      is_multi_court: false,
      parent_court_id: null,
      payment_timing: "at_booking",
      payment_hours_before: 24,
      created_at: NOW,
      updated_at: NOW,
      venues: {
        id: "demo-venue",
        name: venueInfo.name,
        address: venueInfo.address,
        city: base.city,
        country: "New Zealand",
        owner_id: "demo-owner",
        is_active: true,
        suburb: null,
        description: null,
        amenities: ["Parking", "Showers", "Café"],
        photo_url: photo,
        banner_url: null,
        latitude: null,
        longitude: null,
        email: null,
        phone: null,
        slug: null,
        max_booking_minutes: 240,
        slot_interval_minutes: 30,
        created_at: NOW,
        updated_at: NOW,
      },
    },
    playerCount: Math.min(base.max_players, base.min_players + idSuffix),
    userJoined: idSuffix === 0,
  });

  const sessions = [
    buildSession(2, 0),
    buildSession(9, 1),
    buildSession(16, 2),
  ];

  return { group, members, sessions };
}
