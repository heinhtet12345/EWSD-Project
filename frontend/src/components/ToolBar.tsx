import { useEffect, useState } from "react";
import { Bell, ChevronDown, Moon, Search, Sun, User } from "lucide-react";

interface ToolBarProps {
  userName?: string;
}

export default function ToolBar({ userName = "Bo Nay Toe" }: ToolBarProps) {
  const [user, setUser] = useState<{ id?: string | number; name: string; profileimg?: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as {
        id?: string | number;
        user_id?: string | number;
        username?: string;
        profileimg?: string;
        profile_image?: string;
      };
      if (parsed?.username) {
        setUser({
          id: parsed.user_id ?? parsed.id,
          name: parsed.username,
          profileimg: parsed.profile_image || parsed.profileimg,
        });
      }
    } catch {
      setUser(null);
    }
  }, []);

  const displayName = user?.name || userName;

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
        <button
          type="button"
          aria-label="Notifications"
          className={`mt-1 rounded-lg p-2 transition hover:bg-slate-100 ${
            isDarkMode ? "text-white hover:text-slate-600" : "text-slate-600"
          }`}
        >
          <Bell className="h-5 w-5" />
        </button>

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
              >
                Profile
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-100"
              >
                Settings
              </button>
              <button
                type="button"
                className="block w-full px-4 py-2 text-left text-red-600 hover:bg-slate-100"
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
