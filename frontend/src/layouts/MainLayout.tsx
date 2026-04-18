import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import SideBar from "../components/common/SideBar";
import ToolBar from "../components/common/ToolBar";

const ROLE_PREFIXES = ["admin", "qa_coordinator", "qa_manager", "staff"] as const;

type Role = (typeof ROLE_PREFIXES)[number];
type LoginNotice = {
  username?: string;
  firstLogin?: boolean;
  lastLoginAt?: string | null;
};

function getStoredRole(): Role | null {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { role?: string };
    const role = String(parsed?.role || "").trim().toLowerCase();
    return ROLE_PREFIXES.includes(role as Role) ? (role as Role) : null;
  } catch {
    return null;
  }
}

function getRoleFromPath(pathname: string): Role | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) {
    return "staff";
  }
  return ROLE_PREFIXES.includes(firstSegment as Role) ? (firstSegment as Role) : null;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = getRoleFromPath(pathname);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mobileSidebarRoute, setMobileSidebarRoute] = useState(pathname);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 1023px)").matches : false,
  );
  const [loginNotice, setLoginNotice] = useState<LoginNotice | null>(() => {
    try {
      const raw = sessionStorage.getItem("loginNotice");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LoginNotice;
      sessionStorage.removeItem("loginNotice");
      return parsed;
    } catch {
      return null;
    }
  });
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!role) return;
    const storedRole = getStoredRole();
    if (!storedRole || storedRole !== role) {
      navigate("/", { replace: true });
    }
  }, [navigate, role]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const applyViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    applyViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => applyViewport(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!role) return;
    if (lastTrackedPathRef.current === pathname) return;
    lastTrackedPathRef.current = pathname;

    const timeoutId = window.setTimeout(() => {
      void axios
        .post("/api/analytics/track/", {
          event_type: "page_view",
          path: pathname,
          metadata: { source: "frontend-route-change" },
        })
        .catch(() => {
          // Keep navigation smooth if activity tracking fails.
        });
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, role]);

  if (role) {
    const isSidebarOpenForCurrentRoute =
      isMobileViewport && isMobileSidebarOpen && mobileSidebarRoute === pathname;

    return (
      <div className="relative flex min-h-screen items-stretch">
        <SideBar
          role={role}
          isMobile={isMobileViewport}
          isMobileOpen={isSidebarOpenForCurrentRoute}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{
            backgroundColor: "var(--dashboard_bg)",
            color: "var(--dashboard_text)",
          }}
        >
          <ToolBar
            onMenuToggle={
              isMobileViewport
                ? () => {
                    setIsMobileSidebarOpen((value) => {
                      const nextValue = !value;
                      if (nextValue) {
                        setMobileSidebarRoute(pathname);
                      }
                      return nextValue;
                    });
                  }
                : undefined
            }
          />
          <main className="flex-1 px-2 py-3 sm:p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
        {loginNotice && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-slate-900">
                {loginNotice.firstLogin ? "Welcome" : "Welcome back"}
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {loginNotice.firstLogin
                  ? `Welcome ${loginNotice.username || "user"}! This is your first login.`
                  : `Last login: ${
                      loginNotice.lastLoginAt
                        ? new Date(loginNotice.lastLoginAt).toLocaleString()
                        : "Not available"
                    }`}
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setLoginNotice(null)}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return <Outlet />;
}
