// Mock rescue/community games for src/pages/Discover.tsx
// Shape matches the local DiscoverGame interface in Discover.tsx.

const future = (offsetDays: number, time: string): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

export interface DemoDiscoverGame {
  id: string;
  groupName: string;
  sport: string;
  courtName: string;
  venueName: string;
  city: string;
  groundType: string | null;
  date: Date;
  time: string;
  price: number;
  currentPlayers: number;
  minPlayers: number;
  maxPlayers: number;
  state: "rescue" | "open";
}

export const DEMO_RESCUE_GAMES: DemoDiscoverGame[] = [
  {
    id: "demo-rescue-1",
    groupName: "Auckland Tennis Tuesday",
    sport: "tennis",
    courtName: "Centre Court",
    venueName: "Auckland Tennis Centre",
    city: "Auckland",
    groundType: "hard",
    date: future(1, "18:30"),
    time: "18:30",
    price: 12,
    currentPlayers: 3,
    minPlayers: 4,
    maxPlayers: 8,
    state: "rescue",
  },
  {
    id: "demo-rescue-2",
    groupName: "Padel Crew Wellington",
    sport: "padel",
    courtName: "Glass Court",
    venueName: "Te Aro Padel Hub",
    city: "Wellington",
    groundType: "turf",
    date: future(2, "19:00"),
    time: "19:00",
    price: 18,
    currentPlayers: 3,
    minPlayers: 4,
    maxPlayers: 4,
    state: "rescue",
  },
  {
    id: "demo-rescue-3",
    groupName: "Sunday Hoops Mt Eden",
    sport: "basketball",
    courtName: "Indoor Court A",
    venueName: "Eden Park Indoor Sports",
    city: "Auckland",
    groundType: "hard",
    date: future(4, "10:00"),
    time: "10:00",
    price: 8,
    currentPlayers: 7,
    minPlayers: 6,
    maxPlayers: 10,
    state: "open",
  },
  {
    id: "demo-rescue-4",
    groupName: "Beach Volley Mission Bay",
    sport: "volleyball",
    courtName: "Beach Court 1",
    venueName: "Mission Bay Beach Volleyball",
    city: "Auckland",
    groundType: "sand",
    date: future(3, "16:00"),
    time: "16:00",
    price: 6,
    currentPlayers: 5,
    minPlayers: 6,
    maxPlayers: 12,
    state: "rescue",
  },
  {
    id: "demo-rescue-5",
    groupName: "Christchurch Futsal Friday",
    sport: "futsal",
    courtName: "Multi-sport Hall",
    venueName: "Cashmere Sports Hub",
    city: "Christchurch",
    groundType: "hard",
    date: future(5, "20:00"),
    time: "20:00",
    price: 9,
    currentPlayers: 8,
    minPlayers: 8,
    maxPlayers: 10,
    state: "open",
  },
  {
    id: "demo-rescue-6",
    groupName: "Wellington Padel Pros",
    sport: "padel",
    courtName: "Glass Court",
    venueName: "Te Aro Padel Hub",
    city: "Wellington",
    groundType: "turf",
    date: future(6, "19:30"),
    time: "19:30",
    price: 16,
    currentPlayers: 2,
    minPlayers: 4,
    maxPlayers: 4,
    state: "rescue",
  },
];
