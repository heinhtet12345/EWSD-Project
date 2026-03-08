import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Outlet, useLocation } from "react-router-dom";
import SideBar from "../components/common/SideBar";
import ToolBar from "../components/common/ToolBar";

const ROLE_PREFIXES = ["admin", "qa_coordinator", "qa_manager", "staff"] as const;

type Role = (typeof ROLE_PREFIXES)[number];
type LoginNotice = {
  username?: string;
  firstLogin?: boolean;
  lastLoginAt?: string | null;
};

function getRoleFromPath(pathname: string): Role | null {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) {
    return "staff";
  }
  return ROLE_PREFIXES.includes(firstSegment as Role) ? (firstSegment as Role) : null;
}

export default function MainLayout() {
  const { pathname } = useLocation();
  const role = getRoleFromPath(pathname);
  const [loginNotice, setLoginNotice] = useState<LoginNotice | null>(null);
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("loginNotice");
      if (!raw) return;
      const parsed = JSON.parse(raw) as LoginNotice;
      setLoginNotice(parsed);
      sessionStorage.removeItem("loginNotice");
    } catch {
      // Ignore malformed session notice payload.
    }
  }, []);

  useEffect(() => {
    if (!role) return;
    if (lastTrackedPathRef.current === pathname) return;
    lastTrackedPathRef.current = pathname;

    const trackPageView = async () => {
      try {
        await axios.post("/api/analytics/track/", {
          event_type: "page_view",
          path: pathname,
          metadata: { source: "frontend-route-change" },
        });
      } catch {
        // Keep navigation smooth if activity tracking fails.
      }
    };

    trackPageView();
  }, [pathname, role]);

  if (role) {
    return (
      <div className="relative flex h-screen overflow-hidden">
        <SideBar role={role} />
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={{
            backgroundColor: "var(--dashboard_bg)",
            color: "var(--dashboard_text)",
          }}
        >
          <ToolBar />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
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
