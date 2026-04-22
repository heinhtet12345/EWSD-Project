import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  BarChart3,
  Globe,
  Monitor,
  Network,
  ShieldCheck,
  Trash2,
  UserX,
  Users,
} from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import useThemeMode from "../hooks/useThemeMode";
import Modal from "../components/common/Modal";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type DashboardSummary = {
  total_events: number;
  unique_active_users: number;
  total_user_accounts: number;
  total_departments: number;
  total_ideas: number;
  page_view_count: number;
  login_count: number;
  average_daily_events: number;
  most_viewed_page?: string | null;
  most_viewed_page_count: number;
  most_active_user?: string | null;
  most_active_user_count: number;
};

type TrafficData = {
  status: "High" | "Normal" | "Low";
  recent_1h_events: number;
  recent_24h_events: number;
  previous_24h_events: number;
  change_percent: number;
};

type SimpleCountRow = {
  usage_count: number;
  browser?: string;
  operating_system?: string;
  path?: string;
  view_count?: number;
  username?: string;
  display_name?: string;
  activity_count?: number;
  event_type?: string;
  event_count?: number;
  device_type?: string;
  hour?: string;
};

type RecentActivity = {
  activity_log_id: number;
  username: string;
  event_type: string;
  path: string;
  browser: string;
  operating_system: string;
  device_type: string;
  created_at: string;
};

type UserProfile = {
  user_id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  role_name?: string | null;
  department_name?: string | null;
  dob?: string | null;
  address_line_1?: string | null;
  township?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  hire_date?: string | null;
  active_status: boolean;
  profile_image?: string | null;
};

type AdminUserLookupRow = {
  user_id: number;
  username: string;
};

type DashboardResponse = {
  period_days: number;
  summary: DashboardSummary;
  traffic: TrafficData;
  charts: {
    top_pages: SimpleCountRow[];
    top_users: SimpleCountRow[];
    event_breakdown: SimpleCountRow[];
    device_breakdown: SimpleCountRow[];
    peak_hours: SimpleCountRow[];
  };
  tables: {
    top_pages: SimpleCountRow[];
    top_users: SimpleCountRow[];
    browsers: SimpleCountRow[];
    operating_systems: SimpleCountRow[];
    recent_activity: RecentActivity[];
  };
};

const BAR_COLORS = ["#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be123c", "#0891b2", "#4d7c0f", "#4338ca"];

const shortenPath = (path?: string | null) => {
  if (!path) return "Unknown";
  return path.length > 28 ? `${path.slice(0, 28)}...` : path;
};

const computeSuggestedMax = (values: number[]) => {
  const maxValue = Math.max(...values, 0);
  if (maxValue <= 0) return 5;
  if (maxValue <= 5) return maxValue + 1;
  return Math.ceil(maxValue * 1.03);
};

const shellCardClassName =
  "rounded-[1.5rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

const surfaceCardClassName =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950";

const headingClassName = "text-lg font-semibold text-slate-600 dark:text-slate-100";
const titleValueClassName = "text-slate-600 dark:text-slate-100";
const bodyTextClassName = "text-slate-500 dark:text-slate-400";

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

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  accentClassName,
}: {
  label: string;
  value: number | string;
  hint: string;
  icon: typeof Activity;
  accentClassName: string;
}) {
  return (
    <div className={`${surfaceCardClassName} relative overflow-hidden`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-3 text-3xl font-semibold ${titleValueClassName}`}>{value}</p>
          <p className={`mt-2 text-sm ${bodyTextClassName}`}>{hint}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accentClassName}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const isDarkMode = useThemeMode();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userIdByUsername, setUserIdByUsername] = useState<Record<string, number>>({});
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [isUserProfileLoading, setIsUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState("");
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await axios.get<DashboardResponse>("/api/analytics/admin-dashboard/", {
          params: { days },
        });
        setData(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const payload = err.response?.data as { message?: string; detail?: string } | undefined;
          setError(payload?.message || payload?.detail || "Failed to load admin dashboard.");
        } else {
          setError("Failed to load admin dashboard.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [days]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get("/api/admin/users/", getAuthConfig());
        const data = Array.isArray(response.data) ? response.data : response.data?.results;
        const users = Array.isArray(data) ? (data as AdminUserLookupRow[]) : [];
        setUserIdByUsername(
          users.reduce<Record<string, number>>((acc, user) => {
            if (user.username) {
              acc[user.username.toLowerCase()] = user.user_id;
            }
            return acc;
          }, {}),
        );
      } catch {
        // Leave dashboard usable even if user lookup fails.
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  const topPagesChartData = useMemo(() => ({
    labels: (data?.charts.top_pages || []).map((item) => shortenPath(item.path)),
    datasets: [
      {
        label: "Views",
        data: (data?.charts.top_pages || []).map((item) => item.view_count || 0),
        backgroundColor: BAR_COLORS,
        borderRadius: 10,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
    ],
  }), [data]);

  const topUsersChartData = useMemo(() => ({
    labels: (data?.charts.top_users || []).map((item) => item.display_name || item.username || "Unknown"),
    datasets: [
      {
        label: "Activity Count",
        data: (data?.charts.top_users || []).map((item) => item.activity_count || 0),
        backgroundColor: BAR_COLORS,
        borderRadius: 10,
        categoryPercentage: 0.8,
        barPercentage: 0.9,
      },
    ],
  }), [data]);

  const eventBreakdownData = useMemo(() => ({
    labels: (data?.charts.event_breakdown || []).map((item) => item.event_type || "Unknown"),
    datasets: [
      {
        label: "Events",
        data: (data?.charts.event_breakdown || []).map((item) => item.event_count || 0),
        backgroundColor: ["#2563eb", "#f59e0b", "#14b8a6", "#9333ea", "#ef4444"],
        borderWidth: 0,
      },
    ],
  }), [data]);

  const browserBreakdownData = useMemo(() => ({
    labels: (data?.tables.browsers || []).map((item) => item.browser || "Unknown"),
    datasets: [
      {
        label: "Browsers",
        data: (data?.tables.browsers || []).map((item) => item.usage_count || 0),
        backgroundColor: ["#1d4ed8", "#0f766e", "#d97706", "#7c3aed", "#dc2626", "#475569"],
        borderWidth: 0,
      },
    ],
  }), [data]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: isDarkMode ? "#cbd5e1" : "#475569" },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          color: isDarkMode ? "#94a3b8" : "#64748b",
        },
        grid: { color: isDarkMode ? "rgba(148, 163, 184, 0.15)" : "#e2e8f0" },
      },
    },
  };

  const topPagesValues = (data?.charts.top_pages || []).map((item) => item.view_count || 0);
  const topUsersValues = (data?.charts.top_users || []).map((item) => item.activity_count || 0);

  const topPagesChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        suggestedMax: computeSuggestedMax(topPagesValues),
      },
    },
  };

  const topUsersChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        suggestedMax: computeSuggestedMax(topUsersValues),
      },
    },
  };

  const selectedPeriodLabel =
    days === 7 ? "Last 7 days" : days === 30 ? "Last 30 days" : days === 90 ? "Last 90 days" : "Last 365 days";

  const closeUserProfileModal = () => {
    setSelectedUserProfile(null);
    setUserProfileError("");
    setIsUserProfileLoading(false);
  };

  const refreshSelectedUserProfile = async (userId: number) => {
    const response = await axios.get<UserProfile>(`/api/admin/users/${userId}/`, getAuthConfig());
    setSelectedUserProfile(response.data);
  };

  const handleOpenUserProfile = (username?: string | null) => {
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const userId = userIdByUsername[normalizedUsername];
    if (!userId) return;

    const fetchUserProfile = async () => {
      setIsUserProfileLoading(true);
      setUserProfileError("");
      setSelectedUserProfile(null);
      try {
        const response = await axios.get<UserProfile>(`/api/admin/users/${userId}/`, getAuthConfig());
        setSelectedUserProfile(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const payload = err.response?.data as { message?: string; detail?: string } | undefined;
          setUserProfileError(payload?.message || payload?.detail || "Failed to load user profile.");
        } else {
          setUserProfileError("Failed to load user profile.");
        }
      } finally {
        setIsUserProfileLoading(false);
      }
    };

    void fetchUserProfile();
  };

  const handleDisableUser = async (user: UserProfile) => {
    const shouldDisable = window.confirm(`Disable account for "${user.username}"?`);
    if (!shouldDisable) return;

    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(`/api/admin/users/${user.user_id}/disable/`, {}, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `Account disabled for ${user.username}.`);
      await refreshSelectedUserProfile(user.user_id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(payload?.message || payload?.detail || "Failed to disable account.");
      } else {
        setError("Failed to disable account.");
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleEnableUser = async (user: UserProfile) => {
    const shouldEnable = window.confirm(`Enable account for "${user.username}"?`);
    if (!shouldEnable) return;

    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(`/api/admin/users/${user.user_id}/enable/`, {}, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `Account enabled for ${user.username}.`);
      await refreshSelectedUserProfile(user.user_id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(payload?.message || payload?.detail || "Failed to enable account.");
      } else {
        setError("Failed to enable account.");
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    const shouldDelete = window.confirm(`Delete account for "${user.username}"?\n\nAre you sure you want to delete this account?`);
    if (!shouldDelete) return;

    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(`/api/admin/users/${user.user_id}/delete/`, {}, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `Account deleted for ${user.username}.`);
      closeUserProfileModal();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(payload?.message || payload?.detail || "Failed to delete account.");
      } else {
        setError("Failed to delete account.");
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className={`${shellCardClassName} overflow-hidden`}>
        <div
          className={`relative px-6 py-6 ${
            isDarkMode
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-800"
          }`}
        >
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isDarkMode ? "text-blue-100/90" : "text-blue-700"}`}>System Oversight</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-600 dark:text-white">Admin Dashboard</h1>
              <p className={`mt-3 max-w-xl text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Monitor platform traffic, usage patterns, login activity, and operational health from one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className={`rounded-2xl px-4 py-3 backdrop-blur ${
                isDarkMode
                  ? "border border-white/15 bg-white/10"
                  : "border border-slate-200 bg-slate-50 shadow-sm"
              }`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? "text-blue-100/80" : "text-blue-700/80"}`}>Tracking Window</p>
                <p className="mt-1 text-base font-semibold text-slate-600 dark:text-inherit">{selectedPeriodLabel}</p>
              </div>
              <div className={`rounded-2xl px-4 py-3 backdrop-blur ${
                isDarkMode
                  ? "border border-white/15 bg-white/10"
                  : "border border-slate-200 bg-slate-50 shadow-sm"
              }`}>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDarkMode ? "text-blue-100/80" : "text-blue-700/80"}`}>Traffic Status</p>
                <p className="mt-1 text-base font-semibold text-slate-600 dark:text-inherit">{data?.traffic.status || "..."}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Analytics window</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Choose how much activity history to show across the dashboard.</p>
          </div>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
      </div>

      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {isLoading ? (
        <div className={`${shellCardClassName} px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400`}>
          Loading dashboard...
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Events"
              value={data.summary.total_events}
              hint={`${data.summary.average_daily_events} events per day`}
              icon={Activity}
              accentClassName="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
            />
            <MetricCard
              label="Active Users"
              value={data.summary.unique_active_users}
              hint={`Out of ${data.summary.total_user_accounts} total accounts`}
              icon={Users}
              accentClassName="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
            />
            <MetricCard
              label="Ideas In System"
              value={data.summary.total_ideas}
              hint={`${data.summary.page_view_count} page views in selected period`}
              icon={BarChart3}
              accentClassName="bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
            />
            <MetricCard
              label="Traffic Status"
              value={data.traffic.status}
              hint={`${data.traffic.recent_1h_events} events in the last hour`}
              icon={Network}
              accentClassName="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`min-w-0 ${shellCardClassName} p-5`}>
              <div className="mb-4">
                <h2 className={headingClassName}>Most Viewed Pages</h2>
                <p className={`text-sm ${bodyTextClassName}`}>Top URLs by activity volume</p>
              </div>
              <div className="overflow-hidden" style={{ height: "28rem" }}>
                <Bar data={topPagesChartData} options={topPagesChartOptions} />
              </div>
            </div>
            <div className={`min-w-0 ${shellCardClassName} p-5`}>
              <div className="mb-4">
                <h2 className={headingClassName}>Most Active Users</h2>
                <p className={`text-sm ${bodyTextClassName}`}>Users generating the most events</p>
              </div>
              <div className="overflow-hidden" style={{ height: "28rem" }}>
                <Bar data={topUsersChartData} options={topUsersChartOptions} />
              </div>
            </div>
          </div>

          <div className={`${shellCardClassName} p-5`}>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-200">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className={headingClassName}>System Highlights</h2>
                <p className={`text-sm ${bodyTextClassName}`}>Quick operational takeaways</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Most Viewed URL</p>
                <p className={`mt-2 text-sm font-semibold ${titleValueClassName}`}>{data.summary.most_viewed_page || "No data"}</p>
                <p className={`mt-1 text-xs ${bodyTextClassName}`}>{data.summary.most_viewed_page_count} views</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Most Active User</p>
                <p className={`mt-2 text-sm font-semibold ${titleValueClassName}`}>{data.summary.most_active_user || "No data"}</p>
                <p className={`mt-1 text-xs ${bodyTextClassName}`}>{data.summary.most_active_user_count} events</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Login Activity</p>
                <p className={`mt-2 text-sm font-semibold ${titleValueClassName}`}>{data.summary.login_count} logins</p>
                <p className={`mt-1 text-xs ${bodyTextClassName}`}>{data.summary.total_departments} departments currently in system</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`${shellCardClassName} p-5`}>
              <div className="mb-4">
                <h2 className={headingClassName}>Event Mix</h2>
                <p className={`text-sm ${bodyTextClassName}`}>What kind of activity is happening</p>
              </div>
              <div className="overflow-hidden" style={{ height: "28rem" }}>
                <Doughnut
                  data={eventBreakdownData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    radius: "78%",
                    plugins: {
                      legend: {
                        position: "bottom" as const,
                        labels: { color: isDarkMode ? "#cbd5e1" : "#475569" },
                      },
                    },
                  }}
                />
              </div>
            </div>

            <div className={`${shellCardClassName} p-5`}>
              <div className="mb-4">
                <h2 className={headingClassName}>Browser Distribution</h2>
                <p className={`text-sm ${bodyTextClassName}`}>Which browsers are being used most often</p>
              </div>
              <div className="overflow-hidden" style={{ height: "28rem" }}>
                <Doughnut
                  data={browserBreakdownData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    radius: "78%",
                    plugins: {
                      legend: {
                        position: "bottom" as const,
                        labels: { color: isDarkMode ? "#cbd5e1" : "#475569" },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className={`${shellCardClassName} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    <Monitor className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className={headingClassName}>Browsers & Systems</h2>
                    <p className={`text-sm ${bodyTextClassName}`}>A quick breakdown of the client environment used across recent sessions.</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  {data.tables.browsers.length} browser types
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                  {data.tables.operating_systems.length} operating systems
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">Browsers</p>
                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                    Usage
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.tables.browsers.map((item, index) => {
                    const browserMax = Math.max(...data.tables.browsers.map((entry) => entry.usage_count || 0), 1);
                    const width = Math.max(((item.usage_count || 0) / browserMax) * 100, 10);
                    return (
                      <div key={`${item.browser}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${titleValueClassName}`}>{item.browser || "Unknown"}</p>
                            <p className={`text-xs ${bodyTextClassName}`}>Rank #{index + 1}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {item.usage_count}
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-200">Operating Systems</p>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    Usage
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.tables.operating_systems.map((item, index) => {
                    const osMax = Math.max(...data.tables.operating_systems.map((entry) => entry.usage_count || 0), 1);
                    const width = Math.max(((item.usage_count || 0) / osMax) * 100, 10);
                    return (
                      <div key={`${item.operating_system}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium ${titleValueClassName}`}>{item.operating_system || "Unknown"}</p>
                            <p className={`text-xs ${bodyTextClassName}`}>Rank #{index + 1}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {item.usage_count}
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className={`${shellCardClassName} p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <h2 className={headingClassName}>Top URLs</h2>
              </div>
              <div className="space-y-3">
                {data.tables.top_pages.map((item, index) => (
                  <div key={`${item.path}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${titleValueClassName}`}>{item.path}</p>
                    </div>
                    <span className="ml-3 text-sm font-semibold text-blue-700">{item.view_count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${shellCardClassName} p-5`}>
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h2 className={headingClassName}>Top Users</h2>
              </div>
              <div className="space-y-3">
                {data.tables.top_users.map((item, index) => (
                  <div key={`${item.username}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <button
                      type="button"
                      onClick={() => handleOpenUserProfile(item.username)}
                      disabled={!item.username || !userIdByUsername[String(item.username).toLowerCase()]}
                      className={`text-left text-sm font-medium ${titleValueClassName} disabled:cursor-default disabled:opacity-70`}
                    >
                      <span className="text-inherit hover:underline">{item.display_name || item.username || "Unknown"}</span>
                    </button>
                    <span className="text-sm font-semibold text-emerald-700">{item.activity_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${shellCardClassName} p-5`}>
              <div className="mb-4">
                <h2 className={headingClassName}>Recent Activity</h2>
                <p className={`text-sm ${bodyTextClassName}`}>Latest events recorded in the system</p>
              </div>
              <div className="space-y-3">
                {data.tables.recent_activity.slice(0, 5).map((item) => (
                  <div key={item.activity_log_id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenUserProfile(item.username)}
                        disabled={!item.username || !userIdByUsername[String(item.username).toLowerCase()]}
                        className={`text-left text-sm font-semibold ${titleValueClassName} disabled:cursor-default disabled:opacity-70`}
                      >
                        <span className="text-inherit hover:underline">{item.username}</span>
                      </button>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {item.event_type}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-700 dark:text-slate-300">{item.path}</p>
                    <p className={`mt-1 text-xs ${bodyTextClassName}`}>
                      {(item.operating_system || "Unknown") + " / " + (item.device_type || "Unknown")} | {item.browser || "Unknown"} | {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
        </>
      ) : null}

      <Modal
        isOpen={selectedUserProfile !== null || isUserProfileLoading || Boolean(userProfileError)}
        onClose={closeUserProfileModal}
        maxWidthClassName="max-w-3xl"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">User Profile</h2>
              <p className="mt-1 text-sm text-slate-500">View the full profile information for this user.</p>
            </div>
            <button
              type="button"
              onClick={closeUserProfileModal}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {isUserProfileLoading ? (
            <p className="mt-6 text-sm text-slate-500">Loading profile...</p>
          ) : userProfileError ? (
            <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {userProfileError}
            </div>
          ) : selectedUserProfile ? (
            <>
              <div className="mt-6 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:items-center sm:text-left">
                {selectedUserProfile.profile_image ? (
                  <img
                    src={selectedUserProfile.profile_image}
                    alt={selectedUserProfile.name || selectedUserProfile.username}
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-500 ring-4 ring-slate-100">
                    {(selectedUserProfile.name || selectedUserProfile.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col items-center sm:items-start">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedUserProfile.name || selectedUserProfile.username}
                  </h3>
                  <p className="text-sm text-slate-500">@{selectedUserProfile.username}</p>
                  {selectedUserProfile.department_name ? (
                    <p className="mt-1 text-sm text-slate-500">{selectedUserProfile.department_name}</p>
                  ) : null}
                  <p className="mt-2 inline-flex rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white">
                    {selectedUserProfile.role_name || "No role"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 self-center sm:self-start">
                  {selectedUserProfile.active_status ? (
                    <button
                      type="button"
                      onClick={() => handleDisableUser(selectedUserProfile)}
                      disabled={processingUserId === selectedUserProfile.user_id}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <UserX className="h-4 w-4" />
                      Disable Account
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleEnableUser(selectedUserProfile)}
                      disabled={processingUserId === selectedUserProfile.user_id}
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Enable Account
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUserProfile)}
                    disabled={processingUserId === selectedUserProfile.user_id}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedUserProfile.email || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Phone</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedUserProfile.phone || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date of Birth</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedUserProfile.dob || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hire Date</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedUserProfile.hire_date || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Department</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{selectedUserProfile.department_name || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account Status</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedUserProfile.active_status ? "Active" : "Disabled"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Address</p>
                <p className="mt-2 text-sm text-slate-700">
                  {[
                    selectedUserProfile.address_line_1,
                    selectedUserProfile.township,
                    selectedUserProfile.city,
                    selectedUserProfile.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ") || "-"}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
