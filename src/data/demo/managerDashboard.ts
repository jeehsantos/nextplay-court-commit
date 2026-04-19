// Mock data for src/hooks/useManagerDashboard.ts
import type {
  DashboardStats,
  LiveCourtInfo,
  DailyPerformance,
  UpcomingBookingInfo,
} from "@/hooks/useManagerDashboard";
import { DEMO_NAMES } from "./shared";
import { format, addDays } from "date-fns";

const VENUE_ID = "demo-venue-1";
const VENUE_NAME = "Auckland Tennis Centre";

export const DEMO_DASHBOARD_STATS: DashboardStats = {
  totalBookings: 45,
  revenue: 8500,
  utilizationRate: 72,
};

export const DEMO_LIVE_COURTS: LiveCourtInfo[] = [
  {
    court: { id: "dc-1", name: "Centre Court", venue_id: VENUE_ID, venue_name: VENUE_NAME, allowed_sports: ["tennis"], is_multi_court: false, parent_court_id: null },
    status: "in_use",
    currentBooking: { bookerName: "James Wilson", remainingMinutes: 25, endTime: "19:00", progressPercent: 60 },
  },
  {
    court: { id: "dc-2", name: "Court 2", venue_id: VENUE_ID, venue_name: VENUE_NAME, allowed_sports: ["tennis"], is_multi_court: false, parent_court_id: null },
    status: "available",
  },
  {
    court: { id: "dc-3", name: "Court 3", venue_id: VENUE_ID, venue_name: VENUE_NAME, allowed_sports: ["tennis"], is_multi_court: false, parent_court_id: null },
    status: "upcoming",
    nextBooking: { bookerName: "Sophie Anderson", startsInMinutes: 15, startTime: "19:00" },
  },
  {
    court: { id: "dc-4", name: "Indoor Court", venue_id: VENUE_ID, venue_name: VENUE_NAME, allowed_sports: ["tennis"], is_multi_court: false, parent_court_id: null },
    status: "in_use",
    currentBooking: { bookerName: "Liam Thompson", remainingMinutes: 50, endTime: "19:30", progressPercent: 30 },
  },
];

export const DEMO_WEEKLY_PERFORMANCE: DailyPerformance[] = [
  { day: "Mon", dayShort: "Mon", revenue: 980, bookings: 6 },
  { day: "Tue", dayShort: "Tue", revenue: 1240, bookings: 7 },
  { day: "Wed", dayShort: "Wed", revenue: 1560, bookings: 9 },
  { day: "Thu", dayShort: "Thu", revenue: 1100, bookings: 6 },
  { day: "Fri", dayShort: "Fri", revenue: 1820, bookings: 10 },
  { day: "Sat", dayShort: "Sat", revenue: 2100, bookings: 12 },
  { day: "Sun", dayShort: "Sun", revenue: 1480, bookings: 8 },
];

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const courts = ["Centre Court", "Court 2", "Court 3", "Indoor Court"];

const upcomingDef: Array<{ offset: number; start: string; end: string; nameIdx: number; status: string }> = [
  { offset: 0, start: "19:00:00", end: "20:30:00", nameIdx: 1, status: "completed" },
  { offset: 0, start: "19:30:00", end: "21:00:00", nameIdx: 2, status: "completed" },
  { offset: 0, start: "20:00:00", end: "21:00:00", nameIdx: 3, status: "pending" },
  { offset: 1, start: "07:00:00", end: "08:30:00", nameIdx: 4, status: "completed" },
  { offset: 1, start: "10:00:00", end: "11:30:00", nameIdx: 5, status: "completed" },
  { offset: 1, start: "18:00:00", end: "19:30:00", nameIdx: 6, status: "completed" },
  { offset: 2, start: "08:00:00", end: "09:00:00", nameIdx: 7, status: "completed" },
  { offset: 2, start: "17:30:00", end: "19:00:00", nameIdx: 8, status: "pending" },
  { offset: 2, start: "19:00:00", end: "20:30:00", nameIdx: 9, status: "completed" },
  { offset: 3, start: "09:00:00", end: "10:30:00", nameIdx: 10, status: "completed" },
  { offset: 3, start: "18:30:00", end: "20:00:00", nameIdx: 11, status: "completed" },
  { offset: 4, start: "20:00:00", end: "21:30:00", nameIdx: 12, status: "completed" },
];

const fmt12 = (t: string) => {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
};

export const DEMO_UPCOMING_BOOKINGS: UpcomingBookingInfo[] = upcomingDef.map((b, i) => {
  const name = DEMO_NAMES[b.nameIdx % DEMO_NAMES.length];
  const date = format(addDays(new Date(), b.offset), "yyyy-MM-dd");
  const [sh, sm] = b.start.split(":").map(Number);
  const [eh, em] = b.end.split(":").map(Number);
  const duration = (eh * 60 + em) - (sh * 60 + sm);
  return {
    id: `demo-booking-${i + 1}`,
    courtName: courts[i % courts.length],
    venueName: VENUE_NAME,
    date,
    startTime: fmt12(b.start),
    endTime: b.end,
    rawStartTime: b.start,
    rawEndTime: b.end,
    durationMinutes: duration,
    bookerName: name,
    bookerInitials: initials(name),
    bookerPhone: "+64 21 555 0" + (100 + i),
    paymentStatus: b.status,
    bookingRef: `BK-${(1000 + i).toString().toUpperCase()}`,
    courtId: `dc-${(i % 4) + 1}`,
    venueId: VENUE_ID,
  };
});

export const DEMO_DASHBOARD_COURTS = DEMO_LIVE_COURTS.map((lc) => lc.court);
