import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Plane, Radio, Users, Settings, Zap, LogOut, Wrench, LogIn
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/SettingsContext";
import { base44 } from "@/api/base44Client";

// Desktop sidebar navigation
const desktopNavItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/aircraft", label: "Aircraft", icon: Plane },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/flights", label: "Flights", icon: Radio },
  { path: "/rules", label: "Services", icon: Wrench },
  { path: "/settings", label: "Settings", icon: Settings },
];

// Mobile bottom tab bar
const mobileTabItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/aircraft", label: "Aircraft", icon: Plane },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/flights", label: "Flights", icon: Radio },
  { path: "/settings", label: "Settings", icon: Settings },
];

const clientNavItems = [
  { path: "/client", label: "My Aircraft", icon: Plane },
];

export default function AppLayout() {
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);
  const { settings } = useSettings();

  useEffect(() => {
    base44.auth.me().then(u => setUserRole(u?.role)).catch(() => {});
  }, []);

  const [currentUser, setCurrentUser] = React.useState(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, [userRole]);

  const isAdmin = userRole === "admin";
  const navItems = userRole === "client" ? clientNavItems : (userRole === null ? [] : desktopNavItems.filter(i => isAdmin || i.path !== "/customers"));
  const mobileNav = userRole === "client" ? clientNavItems : mobileTabItems.filter(i => isAdmin || i.path !== "/customers");
  const appName = settings?.app_name || "JetGlow";
  const logoUrl = settings?.logo_url || null;
  const sidebarBg = settings?.color_sidebar ? `hsl(${settings.color_sidebar})` : undefined;

  return (
    <div className="h-screen lg:h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border fixed inset-y-0 left-0 z-30 pt-[env(safe-area-inset-top)]" style={sidebarBg ? { background: sidebarBg } : {}}>
        {/* Logo */}
         <div className="p-6 border-b border-border">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center overflow-hidden flex-shrink-0">
               {logoUrl
                 ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                 : <span className="text-xs font-black text-amber-600">ORBIT</span>
               }
             </div>
             <div>
               <h1 className="font-black text-base tracking-tight">{appName}</h1>
               <p className="text-[10px] text-muted-foreground font-semibold tracking-widest uppercase">ORBIT Tracker</p>
             </div>
           </div>
         </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          {currentUser ? (
            <>
              {currentUser.full_name && (
                <p className="text-xs text-muted-foreground px-4 truncate">{currentUser.full_name}</p>
              )}
              <button
                onClick={() => base44.auth.logout()}
                className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-h-[44px]"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Log Out
              </button>
            </>
          ) : (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-h-[44px]"
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              Log In
            </button>
          )}
          <p className="text-[10px] text-muted-foreground text-center tracking-widest uppercase">JetGlow Aviation © 2025</p>
        </div>
      </aside>

      {/* Main content */}
       <main className="flex-1 lg:ml-64 overflow-y-auto pb-72 lg:pb-0 w-full">
         <Outlet />
       </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-[env(safe-area-inset-bottom)] left-0 right-0 z-50 bg-card border-t border-border flex gap-1 px-2 pt-2 min-h-[60px]">
        {mobileNav.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all min-h-[44px] justify-center select-none",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="hidden xs:block text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        {currentUser ? (
          <button
            onClick={() => base44.auth.logout()}
            className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all min-h-[44px] justify-center select-none text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden xs:block text-[10px]">Logout</span>
          </button>
        ) : (
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all min-h-[44px] justify-center select-none text-muted-foreground hover:text-foreground"
          >
            <LogIn className="w-5 h-5" />
            <span className="hidden xs:block text-[10px]">Login</span>
          </button>
        )}
      </nav>
    </div>
  );
}