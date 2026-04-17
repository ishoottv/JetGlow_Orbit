import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { base44 } from "@/api/base44Client";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import AircraftList from "./pages/AircraftList";
import AircraftDetail from "./pages/AircraftDetail";
import AircraftFlights from "./pages/AircraftFlights";
import AircraftMaintenance from "./pages/AircraftMaintenance";
import ClientDashboard from "./pages/ClientDashboard";
import ClientPortal from "./pages/ClientPortal";

import CustomersPage from "./pages/CustomersPage";
import CustomerDetail from "./pages/CustomerDetail";
import FlightsPage from "./pages/FlightsPage";
import MaintenancePage from "./pages/MaintenancePage";
import AlertsPage from "./pages/AlertsPage";
import RulesPage from "./pages/RulesPage";
import QuotesPage from "./pages/QuotesPage";
import SettingsPage from "./pages/SettingsPage";
import ArchivedAircraftPage from "./pages/ArchivedAircraftPage";
import { SettingsProvider } from "./lib/SettingsContext";
import { TabStateProvider } from "./lib/TabStateContext";
import { NavigationStackProvider } from "./lib/NavigationStack";
import { ThemeProvider } from "./lib/ThemeContext";
import NativePageTransition from "./components/shared/NativePageTransition";

import PageNotFound from "./lib/PageNotFound";

const queryClient = new QueryClient();

function RoleBasedHome() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoading(false);
      if (u?.role === "client") {
        // Redirect to first aircraft or client portal
        base44.entities.Aircraft.filter({ customer_id: u.id }).then(aircraft => {
          if (aircraft.length > 0) {
            navigate(`/aircraft/${aircraft[0].id}/overview`, { replace: true });
          } else {
            navigate("/client", { replace: true });
          }
        }).catch(() => navigate("/client", { replace: true }));
      }
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (user?.role === "client") return null;
  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <TabStateProvider>
            <Router>
            <NavigationStackProvider>
              <Toaster />
              <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<NativePageTransition><RoleBasedHome /></NativePageTransition>} />
                <Route path="/aircraft" element={<NativePageTransition><AircraftList /></NativePageTransition>} />
                <Route path="/aircraft/archived" element={<NativePageTransition><ArchivedAircraftPage /></NativePageTransition>} />
                <Route path="/aircraft/:id" element={<NativePageTransition><AircraftDetail /></NativePageTransition>} />
                <Route path="/aircraft/:id/flights" element={<NativePageTransition><AircraftFlights /></NativePageTransition>} />
                <Route path="/aircraft/:id/maintenance" element={<NativePageTransition><AircraftMaintenance /></NativePageTransition>} />
                <Route path="/aircraft/:id/overview" element={<NativePageTransition><ClientDashboard /></NativePageTransition>} />
                <Route path="/client" element={<NativePageTransition><ClientPortal /></NativePageTransition>} />
                <Route path="/customers" element={<NativePageTransition><CustomersPage /></NativePageTransition>} />
                <Route path="/customers/:id" element={<NativePageTransition><CustomerDetail /></NativePageTransition>} />
                <Route path="/flights" element={<NativePageTransition><FlightsPage /></NativePageTransition>} />
                <Route path="/maintenance" element={<NativePageTransition><MaintenancePage /></NativePageTransition>} />
                <Route path="/alerts" element={<NativePageTransition><AlertsPage /></NativePageTransition>} />
                <Route path="/rules" element={<NativePageTransition><RulesPage /></NativePageTransition>} />
                <Route path="/quotes" element={<NativePageTransition><QuotesPage /></NativePageTransition>} />
                <Route path="/settings" element={<NativePageTransition><SettingsPage /></NativePageTransition>} />
              </Route>
              <Route path="*" element={<PageNotFound />} />
            </Routes>
            </NavigationStackProvider>
          </Router>
        </TabStateProvider>
      </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}