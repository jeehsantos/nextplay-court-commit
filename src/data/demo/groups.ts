// Mock groups for src/pages/Groups.tsx
// Shape matches `GroupWithMemberCount` (Group row + memberCount).

const NOW = new Date().toISOString();

interface DemoGroup {
  id: string;
  name: string;
  description: string | null;
  city: string;
  sport_category_id: string;
  organizer_id: string;
  organizer_plays: boolean;
  default_court_id: string | null;
  default_day_of_week: number;
  default_start_time: string;
  default_duration_minutes: number;
  weekly_court_price: number;
  payment_deadline_hours: number;
  min_players: number;
  max_players: number;
  is_active: boolean | null;
  is_public: boolean | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  memberCount: number;
}

const g = (overrides: Partial<DemoGroup> & Pick<DemoGroup, "id" | "name" | "city" | "default_day_of_week" | "default_start_time" | "memberCount">): DemoGroup => ({
  description: null,
  sport_category_id: "tennis",
  organizer_id: "demo-organizer",
  organizer_plays: true,
  default_court_id: null,
  default_duration_minutes: 90,
  weekly_court_price: 60,
  payment_deadline_hours: 24,
  min_players: 4,
  max_players: 8,
  is_active: true,
  is_public: true,
  photo_url: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

export const DEMO_GROUPS: DemoGroup[] = [
  g({ id: "group-1", name: "Auckland Tennis Tuesday", city: "Auckland", sport_category_id: "tennis", default_day_of_week: 2, default_start_time: "18:30", memberCount: 10, max_players: 8 }),
  g({ id: "group-2", name: "Padel Crew Wellington", city: "Wellington", sport_category_id: "padel", default_day_of_week: 4, default_start_time: "19:00", memberCount: 8, max_players: 4 }),
  g({ id: "group-3", name: "Sunday Hoops Mt Eden", city: "Auckland", sport_category_id: "basketball", default_day_of_week: 0, default_start_time: "10:00", memberCount: 12, max_players: 10 }),
  g({ id: "group-4", name: "Beach Volley Mission Bay", city: "Auckland", sport_category_id: "volleyball", default_day_of_week: 6, default_start_time: "16:00", memberCount: 9, max_players: 12 }),
  g({ id: "group-5", name: "Christchurch Futsal Friday", city: "Christchurch", sport_category_id: "futsal", default_day_of_week: 5, default_start_time: "20:00", memberCount: 11, max_players: 10 }),
  g({ id: "group-6", name: "Wellington Padel Pros", city: "Wellington", sport_category_id: "padel", default_day_of_week: 3, default_start_time: "19:30", memberCount: 8, max_players: 4 }),
];
