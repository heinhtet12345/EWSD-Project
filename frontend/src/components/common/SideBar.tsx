import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";

type Role = "admin" | "qa_coordinator" | "qa_manager" | "staff";

type RoleTab = {
  label: string;
  to: string;
  icon: LucideIcon;
};

const ROLE_TABS: Record<Role, RoleTab[]> = {
  admin: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Users", to: "/admin/users", icon: User},
    // { label: "Manage Closure Period", to: "/admin/closure-period", icon: Calendar },
    { label: "Activities", to: "/admin/analytics", icon: BarChart3 },
    { label: "All Ideas", to: "/admin/all-ideas", icon: FileText },
    { label: "Reports", to: "/admin/reports", icon: ShieldAlert },
  ], 
  "qa_manager": [
    { label: "Dashboard", to: "/qa_manager", icon: LayoutDashboard },
    { label: "Users", to: "/qa_manager/users", icon: User},
    { label: "All Ideas", to: "/qa_manager/all-ideas", icon: FileText },
    { label: "Closure Period", to: "/qa_manager/closure-period", icon: ShieldCheck },
    { label: "Categories", to: "/qa_manager/categories", icon: FileText },
    { label: "Reports", to: "/qa_manager/reports", icon: ShieldAlert },
  ],
  "qa_coordinator": [
    { label: "Dashboard", to: "/qa_coordinator", icon: LayoutDashboard },
    { label: "All Ideas", to: "/qa_coordinator/all-ideas", icon: FileText },
    { label: "My Department", to: "/qa_coordinator/my-department", icon: ShieldCheck },
    { label: "My Staff", to: "/qa_coordinator/my-staff", icon: Users },

  ],
  staff: [
    { label: "Dashboard", to: "/staff", icon: LayoutDashboard },
    { label: "All Ideas", to: "/staff/all-ideas", icon: FileText },
    { label: "My Ideas", to: "/staff/my-ideas", icon: User },
  ],
};

interface SideBarProps {
  role?: Role;
}

export default function SideBar({ role = "staff" }: SideBarProps) {
  const navigate = useNavigate();
  const tabs = ROLE_TABS[role] ?? ROLE_TABS.staff;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    let accessToken: string | undefined;
    let refreshToken: string | undefined;

    try {
      const raw = localStorage.getItem("authUser");
      if (raw) {
        const parsed = JSON.parse(raw) as { token?: string; refresh?: string };
        accessToken = parsed?.token;
        refreshToken = parsed?.refresh;
      }
    } catch {
      // Ignore localStorage parsing errors and proceed with logout cleanup.
    }

    if (refreshToken) {
      try {
        await axios.post(
          "/api/logout/",
          { refresh: refreshToken },
          accessToken
            ? { headers: { Authorization: `Bearer ${accessToken}` } }
            : undefined
        );
      } catch {
        // If logout fails, still clear local state to force re-auth.
      }
    }

    localStorage.removeItem("authUser");
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const applyCollapse = (matches: boolean) => {
      setIsCollapsed(matches);
    };

    applyCollapse(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      applyCollapse(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return (
    <aside className="sticky top-0 h-screen shrink-0">
      <nav
        className={`h-full flex flex-col shadow-sm text-white transition-[width] duration-200 ${
          isCollapsed ? "w-16" : "w-[250px]"
        }`}
        style={{
          backgroundColor: "var(--sidebar_bg)",
          borderRight: "1px solid var(--sidebar_border)",
        }}
      >
        <div
          className={
            isCollapsed
              ? "pt-4 pb-2 px-2 flex items-center justify-start overflow-hidden"
              : "p-4 pb-2 flex items-center justify-between gap-3 overflow-hidden"
          }
        >
          {!isCollapsed && (
            <h1 className="text-lg font-semibold whitespace-nowrap -mt-0.5">
              Quality System
            </h1>
          )}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-pressed={isCollapsed}
            className={`p-2 rounded-md hover:bg-white/10 ${
              isCollapsed ? "ml-0.5" : ""
            }`}
            onClick={() => setIsCollapsed((value) => !value)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <ul className={`flex-1 space-y-1 mt-6 ${isCollapsed ? "px-2" : "px-3"}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? "text-white"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? "var(--sidebar-active_tab)" : "transparent",
                  })}
                  end
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span
                    className={`whitespace-nowrap ${isCollapsed ? "hidden" : "inline"}`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`absolute left-full z-20 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg ring-1 ring-white/10 transition ${
                      isCollapsed ? "group-hover:opacity-100" : "hidden"
                    }`}
                  >
                    {tab.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="p-3">
          <button
            type="button"
            className={`group relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white ${
              isCollapsed ? "justify-center" : ""
            }`}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={isCollapsed ? "hidden" : "inline"}>Logout</span>
            <span
              className={`absolute left-full z-20 ml-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow-lg ring-1 ring-white/10 transition ${
                isCollapsed ? "group-hover:opacity-100" : "hidden"
              }`}
            >
              Logout
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
