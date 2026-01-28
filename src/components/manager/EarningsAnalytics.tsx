import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Court = Database["public"]["Tables"]["courts"]["Row"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];

interface BookingDetail {
  id: string;
  session_date: string;
  start_time: string;
  court_name: string;
  venue_name: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
  transferred_at: string | null;
  transfer_amount: number | null;
  player_count: number;
}

interface EarningsStats {
  totalEarnings: number;
  pendingTransfers: number;
  completedTransfers: number;
  platformFees: number;
  bookingsCount: number;
  averageBookingValue: number;
}

interface Props {
  userId: string;
}

export function EarningsAnalytics({ userId }: Props) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
    platformFees: 0,
    bookingsCount: 0,
    averageBookingValue: 0,
  });
  const [bookingDetails, setBookingDetails] = useState<BookingDetail[]>([]);
  const [previousStats, setPreviousStats] = useState<EarningsStats | null>(null);

  useEffect(() => {
    fetchEarningsData();
  }, [userId, timeRange]);

  const getDateRange = () => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let prevStart: Date;
    let prevEnd: Date;

    switch (timeRange) {
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        prevStart = startOfWeek(subMonths(now, 1), { weekStartsOn: 1 });
        prevEnd = endOfWeek(subMonths(now, 1), { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        prevStart = startOfMonth(subMonths(now, 1));
        prevEnd = endOfMonth(subMonths(now, 1));
        break;
      case "all":
      default:
        start = new Date(2020, 0, 1);
        end = now;
        prevStart = new Date(2020, 0, 1);
        prevEnd = subMonths(now, 1);
        break;
    }

    return { start, end, prevStart, prevEnd };
  };

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const { start, end, prevStart, prevEnd } = getDateRange();

      // Get all venues owned by the manager
      const { data: venues, error: venuesError } = await supabase
        .from("venues")
        .select("id, name")
        .eq("owner_id", userId);

      if (venuesError) throw venuesError;
      if (!venues || venues.length === 0) {
        setLoading(false);
        return;
      }

      const venueIds = venues.map((v) => v.id);

      // Get all courts for these venues
      const { data: courts, error: courtsError } = await supabase
        .from("courts")
        .select("id, name, venue_id")
        .in("venue_id", venueIds);

      if (courtsError) throw courtsError;
      if (!courts || courts.length === 0) {
        setLoading(false);
        return;
      }

      const courtIds = courts.map((c) => c.id);

      // Create lookup maps
      const courtMap = new Map<string, Court>(courts.map((c) => [c.id, c]));
      const venueMap = new Map<string, Venue>(venues.map((v) => [v.id, v]));

      // Fetch sessions for current period
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select(`
          id,
          session_date,
          start_time,
          court_id,
          court_price,
          state
        `)
        .in("court_id", courtIds)
        .gte("session_date", format(start, "yyyy-MM-dd"))
        .lte("session_date", format(end, "yyyy-MM-dd"))
        .order("session_date", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch sessions for previous period (for comparison)
      const { data: prevSessions } = await supabase
        .from("sessions")
        .select("id, court_price")
        .in("court_id", courtIds)
        .gte("session_date", format(prevStart, "yyyy-MM-dd"))
        .lte("session_date", format(prevEnd, "yyyy-MM-dd"));

      if (!sessions || sessions.length === 0) {
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map((s) => s.id);

      // Fetch payments for these sessions
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .in("session_id", sessionIds);

      if (paymentsError) throw paymentsError;

      // Fetch player counts for sessions
      const { data: playerCounts } = await supabase
        .from("session_players")
        .select("session_id")
        .in("session_id", sessionIds);

      const playerCountMap = new Map<string, number>();
      playerCounts?.forEach((p) => {
        playerCountMap.set(p.session_id, (playerCountMap.get(p.session_id) || 0) + 1);
      });

      // Calculate current period stats
      let totalEarnings = 0;
      let pendingTransfers = 0;
      let completedTransfers = 0;
      let platformFees = 0;
      const bookings: BookingDetail[] = [];

      payments?.forEach((payment) => {
        const session = sessions.find((s) => s.id === payment.session_id);
        if (!session) return;

        const court = courtMap.get(session.court_id || "");
        const venue = court ? venueMap.get(court.venue_id) : null;
        const netAmount = Number(payment.amount) - Number(payment.platform_fee || 0);

        if (payment.status === "completed") {
          totalEarnings += Number(payment.amount);
          platformFees += Number(payment.platform_fee || 0);

          if (payment.transferred_at) {
            completedTransfers += Number(payment.transfer_amount || netAmount);
          } else {
            pendingTransfers += netAmount;
          }

          bookings.push({
            id: payment.id,
            session_date: session.session_date,
            start_time: session.start_time,
            court_name: court?.name || "Unknown Court",
            venue_name: venue?.name || "Unknown Venue",
            amount: Number(payment.amount),
            platform_fee: Number(payment.platform_fee || 0),
            net_amount: netAmount,
            status: payment.status,
            paid_at: payment.paid_at,
            transferred_at: payment.transferred_at || null,
            transfer_amount: payment.transfer_amount ? Number(payment.transfer_amount) : null,
            player_count: playerCountMap.get(session.id) || 0,
          });
        }
      });

      // Calculate previous period stats for comparison
      let prevTotalEarnings = 0;
      if (prevSessions && timeRange !== "all") {
        const prevSessionIds = prevSessions.map((s) => s.id);
        const { data: prevPayments } = await supabase
          .from("payments")
          .select("amount, status")
          .in("session_id", prevSessionIds)
          .eq("status", "completed");

        prevPayments?.forEach((p) => {
          prevTotalEarnings += Number(p.amount);
        });
      }

      setStats({
        totalEarnings,
        pendingTransfers,
        completedTransfers,
        platformFees,
        bookingsCount: bookings.length,
        averageBookingValue: bookings.length > 0 ? totalEarnings / bookings.length : 0,
      });

      setPreviousStats(
        timeRange !== "all"
          ? {
              totalEarnings: prevTotalEarnings,
              pendingTransfers: 0,
              completedTransfers: 0,
              platformFees: 0,
              bookingsCount: prevSessions?.length || 0,
              averageBookingValue: 0,
            }
          : null
      );

      setBookingDetails(bookings);
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: "NZD",
    }).format(amount);
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    previousValue,
    subtitle,
  }: {
    title: string;
    value: string;
    icon: any;
    color: string;
    previousValue?: number;
    subtitle?: string;
  }) => {
    const currentNum = parseFloat(value.replace(/[^0-9.-]+/g, ""));
    const change = previousValue !== undefined ? calculatePercentageChange(currentNum, previousValue) : null;
    const isPositive = change !== null && change >= 0;

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            {change !== null && timeRange !== "all" && (
              <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                <span className="font-medium">{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="text-2xl font-bold mb-1">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Earnings Analytics</h2>
          <p className="text-muted-foreground">Track your bookings and payouts</p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Earnings"
          value={formatCurrency(stats.totalEarnings)}
          icon={DollarSign}
          color="bg-green-500"
          previousValue={previousStats?.totalEarnings}
          subtitle="Gross revenue from bookings"
        />
        <StatCard
          title="Pending Transfers"
          value={formatCurrency(stats.pendingTransfers)}
          icon={Clock}
          color="bg-orange-500"
          subtitle="Awaiting player confirmation"
        />
        <StatCard
          title="Completed Transfers"
          value={formatCurrency(stats.completedTransfers)}
          icon={CheckCircle2}
          color="bg-blue-500"
          subtitle="Successfully transferred to you"
        />
        <StatCard
          title="Platform Fees"
          value={formatCurrency(stats.platformFees)}
          icon={CreditCard}
          color="bg-purple-500"
          subtitle="Service charges deducted"
        />
        <StatCard
          title="Total Bookings"
          value={stats.bookingsCount.toString()}
          icon={Calendar}
          color="bg-indigo-500"
          previousValue={previousStats?.bookingsCount}
          subtitle="Completed reservations"
        />
        <StatCard
          title="Avg Booking Value"
          value={formatCurrency(stats.averageBookingValue)}
          icon={TrendingUp}
          color="bg-teal-500"
          subtitle="Per booking revenue"
        />
      </div>

      {/* Detailed Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Booking Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bookingDetails.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No bookings found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Venue / Court</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Players</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Platform Fee</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Net Earnings</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingDetails.map((booking) => (
                    <tr key={booking.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="text-sm font-medium">
                          {format(new Date(booking.session_date), "MMM dd, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">{booking.start_time}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-sm font-medium">{booking.venue_name}</div>
                        <div className="text-xs text-muted-foreground">{booking.court_name}</div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{booking.player_count}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-medium">
                        {formatCurrency(booking.amount)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-muted-foreground">
                        -{formatCurrency(booking.platform_fee)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-bold text-green-600">
                        {formatCurrency(booking.net_amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {booking.transferred_at ? (
                          <Badge variant="default" className="inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Transferred
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={3} className="py-3 px-2 text-sm">
                      Total ({bookingDetails.length} bookings)
                    </td>
                    <td className="py-3 px-2 text-right text-sm">
                      {formatCurrency(stats.totalEarnings)}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">
                      -{formatCurrency(stats.platformFees)}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-green-600">
                      {formatCurrency(stats.totalEarnings - stats.platformFees)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Status Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Transferred</div>
              <div className="text-xs text-muted-foreground">
                Payment has been transferred to your connected Stripe account after player confirmation
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Pending</div>
              <div className="text-xs text-muted-foreground">
                Payment received but awaiting player confirmation before transfer
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-sm">Platform Fee</div>
              <div className="text-xs text-muted-foreground">
                Service charge deducted from each booking to cover payment processing and platform costs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
