import { DemoProvider } from "./DemoContext";
import { DemoBanner } from "./DemoBanner";
import { StatsCards } from "@/components/manager/dashboard/StatsCards";
import { LiveCourtStatus } from "@/components/manager/dashboard/LiveCourtStatus";
import { WeeklyPerformance } from "@/components/manager/dashboard/WeeklyPerformance";
import { UpcomingBookings } from "@/components/manager/dashboard/UpcomingBookings";
import {
  demoDashboardStats,
  demoLiveCourts,
  demoUpcomingBookings,
  demoWeeklyPerformance,
} from "./demoData";

function ManagerContent() {
  return (
    <div className="min-h-screen bg-background">
      <DemoBanner />
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Court Manager Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your venues and bookings</p>
        </div>

        <StatsCards stats={demoDashboardStats} loading={false} periodLabel="Weekly" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <LiveCourtStatus courts={demoLiveCourts} loading={false} />
          </div>
          <div className="space-y-6">
            <WeeklyPerformance data={demoWeeklyPerformance} loading={false} periodLabel="Weekly" />
          </div>
        </div>

        <UpcomingBookings bookings={demoUpcomingBookings} loading={false} />
      </div>
    </div>
  );
}

export default function DemoManagerView() {
  return (
    <DemoProvider role="manager">
      <ManagerContent />
    </DemoProvider>
  );
}
