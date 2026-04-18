import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ManagerLayout } from "@/components/layout/ManagerLayout";
import { Loader2 } from "lucide-react";

// Eagerly load the landing/index pages for fastest LCP
import Index from "./pages/Index";
import Landing from "./pages/Landing";

// Lazy load everything else
const Auth = lazy(() => import("./pages/Auth"));
const JoinGroup = lazy(() => import("./pages/JoinGroup"));
const Groups = lazy(() => import("./pages/Groups"));
const Discover = lazy(() => import("./pages/Discover"));
const Games = lazy(() => import("./pages/Games"));
const GameDetail = lazy(() => import("./pages/GameDetail"));
const GroupDetail = lazy(() => import("./pages/GroupDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const QuickGameLobby = lazy(() => import("./pages/QuickGameLobby"));
const Courts = lazy(() => import("./pages/Courts"));
const CourtDetail = lazy(() => import("./pages/CourtDetail"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const ManagerDashboard = lazy(() => import("./pages/manager/ManagerDashboard"));
const ManagerVenues = lazy(() => import("./pages/manager/ManagerVenues"));
const ManagerVenueForm = lazy(() => import("./pages/manager/ManagerVenueForm"));
const ManagerCourts = lazy(() => import("./pages/manager/ManagerCourts"));
const ManagerCourtForm = lazy(() => import("./pages/manager/ManagerCourtForm"));
const ManagerCourtsNew = lazy(() => import("./pages/manager/ManagerCourtsNew"));
const ManagerCourtFormNew = lazy(() => import("./pages/manager/ManagerCourtFormNew"));
const ManagerAvailability = lazy(() => import("./pages/manager/ManagerAvailability"));
const ManagerSettings = lazy(() => import("./pages/manager/ManagerSettings"));
const ManagerEquipment = lazy(() => import("./pages/manager/ManagerEquipment"));
const ManagerBookings = lazy(() => import("./pages/manager/ManagerBookings"));
const ManagerWidget = lazy(() => import("./pages/manager/ManagerWidget"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSportCategories = lazy(() => import("./pages/admin/AdminSportCategories"));
const AdminSurfaceTypes = lazy(() => import("./pages/admin/AdminSurfaceTypes"));
const AdminArchiving = lazy(() => import("./pages/admin/AdminArchiving"));
const AdminReferralSettings = lazy(() => import("./pages/admin/AdminReferralSettings"));
const AdminPlatformFees = lazy(() => import("./pages/admin/AdminPlatformFees"));
const AdminFinance = lazy(() => import("./pages/admin/AdminFinance"));
const AdminVenueSlugs = lazy(() => import("./pages/admin/AdminVenueSlugs"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const VenueLanding = lazy(() => import("./pages/VenueLanding"));
const VenueDirectory = lazy(() => import("./pages/VenueDirectory"));
const ArchivedSessions = lazy(() => import("./pages/ArchivedSessions"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
                <Route path="/join/:code" element={<JoinGroup />} />
                <Route path="/discover" element={<ProtectedRoute requireCompleteProfile><Discover /></ProtectedRoute>} />
                <Route path="/quick-games/:id" element={<ProtectedRoute requireCompleteProfile><QuickGameLobby /></ProtectedRoute>} />
                <Route path="/games" element={<ProtectedRoute requireCompleteProfile><Games /></ProtectedRoute>} />
                <Route path="/games/:id" element={<GameDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/edit" element={<ProfileEdit />} />
                <Route path="/courts" element={<Courts />} />
                <Route path="/courts/:id" element={<CourtDetail />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                {/* Manager Routes - share a single ManagerLayout instance */}
                <Route
                  element={
                    <ProtectedRoute allowedRoles={["court_manager", "venue_staff"]}>
                      <ManagerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/manager" element={<ManagerDashboard />} />
                  <Route path="/manager/venues" element={<ManagerVenues />} />
                  <Route path="/manager/venues/new" element={<ManagerVenueForm />} />
                  <Route path="/manager/venues/:venueId/edit" element={<ManagerVenueForm />} />
                  <Route path="/manager/venues/:venueId/courts" element={<ManagerCourts />} />
                  <Route path="/manager/venues/:venueId/courts/new" element={<ManagerCourtForm />} />
                  <Route path="/manager/venues/:venueId/courts/:courtId/edit" element={<ManagerCourtForm />} />
                  <Route path="/manager/courts" element={<ManagerCourtsNew />} />
                  <Route path="/manager/courts/new" element={<ManagerCourtFormNew />} />
                  <Route path="/manager/courts/:id/edit" element={<ManagerCourtFormNew />} />
                  <Route path="/manager/availability" element={<ManagerAvailability />} />
                  <Route path="/manager/equipment" element={<ManagerEquipment />} />
                  <Route path="/manager/bookings" element={<ManagerBookings />} />
                  <Route path="/manager/settings" element={<ManagerSettings />} />
                  <Route
                    path="/manager/widget"
                    element={
                      <ProtectedRoute allowedRoles={["court_manager"]}>
                        <ManagerWidget />
                      </ProtectedRoute>
                    }
                  />
                </Route>
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/sports" element={<AdminSportCategories />} />
                <Route path="/admin/surfaces" element={<AdminSurfaceTypes />} />
                <Route path="/admin/archiving" element={<AdminArchiving />} />
                <Route path="/admin/referrals" element={<AdminReferralSettings />} />
                <Route path="/admin/fees" element={<AdminPlatformFees />} />
                <Route path="/admin/finance" element={<AdminFinance />} />
                <Route path="/admin/venues" element={<AdminVenueSlugs />} />
                <Route path="/admin/*" element={<AdminDashboard />} />
                {/* Legal pages */}
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                {/* Public venue pages */}
                <Route path="/venue" element={<VenueDirectory />} />
                <Route path="/venue/:slug" element={<VenueLanding />} />
                {/* User Routes */}
                <Route path="/archived-sessions" element={<ArchivedSessions />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
