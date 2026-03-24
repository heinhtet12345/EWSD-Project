import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Moon, Search, Sun, User } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface ToolBarProps {
  userName?: string;
}

type NotificationItem = {
  notification_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
  idea?: number | null;
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      id?: string | number;
      user_id?: string | number;
      first_name?: string;
      last_name?: string;
      name?: string;
      username?: string;
      profileimg?: string;
      profile_image?: string;
    };
    if (!parsed?.username) {
      return null;
    }
    const fullName = `${(parsed.first_name || "").trim()} ${(parsed.last_name || "").trim()}`.trim();
    return {
      id: parsed.user_id ?? parsed.id,
      name: fullName || (parsed.name || "").trim() || parsed.username,
      profileimg: parsed.profile_image || parsed.profileimg,
    };
  } catch {
    return null;
  }
};

const getStoredRole = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return "staff";
    const parsed = JSON.parse(raw) as { role?: string };
    const role = String(parsed?.role || "staff").trim().toLowerCase();
    if (role === "admin" || role === "qa_manager" || role === "qa_coordinator" || role === "staff") {
      return role;
    }
    return "staff";
  } catch {
    return "staff";
  }
};

const getAuthConfig = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { token?: string };
    if (!parsed?.token) return undefined;
    return { headers: { Authorization: `Bearer ${parsed.token}` } };
  } catch {
    return undefined;
  }
};

export default function ToolBar({ userName = "" }: ToolBarProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id?: string | number; name: string; profileimg?: string } | null>(
    () => getStoredUser()
  );
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") {
        return true;
      }
      if (stored === "light") {
        return false;
      }
    } catch {
      // Ignore storage errors and fall back to system preference.
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!getAuthConfig()?.headers?.Authorization) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const response = await axios.get("/api/notifications/", getAuthConfig());
      const data = response.data?.results;
      const count = response.data?.unread_count;
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
      setUnreadCount(typeof count === "number" ? count : 0);
    } catch {
      // Keep toolbar usable if notifications fail.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isDarkMode ? "dark" : "light";
    try {
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");
    } catch {
      // Ignore storage write errors.
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getStoredUser());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "authUser") {
        handleAuthChange();
      }
    };

    window.addEventListener("auth-changed", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const initialFetchTimeout = window.setTimeout(() => {
      fetchNotifications();
    }, 0);
    const interval = window.setInterval(fetchNotifications, 30000);
    return () => {
      window.clearTimeout(initialFetchTimeout);
      window.clearInterval(interval);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const displayName = user?.name || userName || "User";

  const handleGoToProfile = () => {
    const role = getStoredRole();
    setIsUserMenuOpen(false);
    navigate(`/${role}/profile`);
  };

  const getNotificationTargetPath = (item: NotificationItem) => {
    const role = getStoredRole();

    if (item.notification_type === "closure_period_created" || item.notification_type === "closure_period_extended") {
      if (role === "qa_manager") {
        return "/qa_manager/all-ideas";
      }
      if (role === "admin") {
        return "/admin/all-ideas";
      }
      if (role === "qa_coordinator") {
        return "/qa_coordinator/all-ideas";
      }
      return "/staff/all-ideas";
    }

    if (!item.idea) return null;

    if (role === "qa_manager") {
      return `/qa_manager/all-ideas?highlightIdeaId=${item.idea}`;
    }
    if (role === "admin") {
      return `/admin/all-ideas?highlightIdeaId=${item.idea}`;
    }
    if (role === "qa_coordinator") {
      return `/qa_coordinator/my-department?highlightIdeaId=${item.idea}`;
    }
    return `/staff/all-ideas?highlightIdeaId=${item.idea}`;
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setUser(null);
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
      // Ignore parsing errors and continue cleanup.
    }

    if (refreshToken) {
      try {
        await axios.post(
          "/api/logout/",
          { refresh: refreshToken },
          accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined
        );
      } catch {
        // Ignore failed logout endpoint, still clear local auth.
      }
    }

    localStorage.removeItem("authUser");
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/", { replace: true });
  };

  return (
    <header
      className="flex items-center justify-between gap-4 px-4 py-1 shadow-sm"
      style={{
        backgroundColor: "var(--toolbar_bg)",
        borderBottom: "1px solid var(--toolbar_border)",
      }}
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="relative w-80 max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setIsNotificationOpen((value) => !value);
              fetchNotifications();
            }}
            className={`mt-1 rounded-lg p-2 transition hover:bg-slate-100 ${
              isDarkMode ? "text-white hover:text-slate-600" : "text-slate-600"
            }`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="mb-2 flex items-center justify-between px-2 py-1">
                <p className="text-sm font-semibold text-slate-800">Notifications</p>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await axios.patch("/api/notifications/read-all/", {}, getAuthConfig());
                        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
                        setUnreadCount(0);
                      } catch {
                        // Ignore failed mark-all action in UI.
                      }
                    }}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div
                className="hide-scrollbar max-h-80 space-y-1 overflow-y-auto overscroll-contain"
                onWheel={(event) => event.stopPropagation()}
              >
                {notifications.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications yet</p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.notification_id}
                      type="button"
                      onClick={async () => {
                        const targetPath = getNotificationTargetPath(item);
                        try {
                          if (!item.is_read) {
                            await axios.patch(
                              `/api/notifications/${item.notification_id}/read/`,
                              {},
                              getAuthConfig()
                            );
                            setNotifications((prev) =>
                              prev.map((current) =>
                                current.notification_id === item.notification_id
                                  ? { ...current, is_read: true }
                                  : current
                              )
                            );
                            setUnreadCount((prev) => Math.max(0, prev - 1));
                          }
                        } catch {
                          // Ignore failed mark-read action in UI.
                        }
                        setIsNotificationOpen(false);
                        if (targetPath) {
                          navigate(targetPath);
                        }
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        item.is_read
                          ? "border-slate-100 bg-white"
                          : "border-blue-100 bg-blue-50/40"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-600">{item.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle theme"
          className={`relative inline-flex h-6 w-12 items-center rounded-full p-1 transition ${
            isDarkMode ? "bg-slate-900" : "bg-slate-200"
          }`}
          onClick={() => setIsDarkMode((value) => !value)}
        >
          <span className="sr-only">Toggle theme</span>
          <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2">
            <Sun
              className={`h-3 w-3 ${
                isDarkMode ? "text-slate-400" : "text-black"
              }`}
            />
          </span>
          <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2">
            <Moon
              className={`h-3 w-3 ${
                isDarkMode ? "text-white" : "text-slate-400"
              }`}
            />
          </span>
          <span
            className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition-transform ${
              isDarkMode
                ? "translate-x-6 bg-white text-black"
                : "translate-x-0 bg-yellow-400 text-black"
            }`}
          >
            {isDarkMode ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
          </span>
        </button>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={() => setIsUserMenuOpen((value) => !value)}
          >
            {user?.profileimg ? (
              <img
                src={user.profileimg}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <User className="h-4 w-4" />
              </span>
            )}
            <span className="hidden text-sm font-semibold sm:block">{displayName}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-slate-200 bg-white py-2 text-sm shadow-lg">
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100"
                onClick={handleGoToProfile}
              >
                Profile
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-red-600 hover:bg-slate-100"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
