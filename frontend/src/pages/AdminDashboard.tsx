import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Activity,
  BarChart3,
  Globe,
  Monitor,
  Network,
  ShieldCheck,
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

const TRAFFIC_STYLES: Record<TrafficData["status"], string> = {
  High: "border-amber-200 bg-amber-50 text-amber-800",
  Normal: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Low: "border-slate-200 bg-slate-50 text-slate-700",
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

export default function AdminDashboard() {
  const isDarkMode = useThemeMode();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Monitor system traffic, usage patterns, and operational health.</p>
        </div>
        <select
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 365 days</option>
        </select>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
          Loading dashboard...
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Total Events</span>
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{data.summary.total_events}</p>
              <p className="mt-1 text-xs text-slate-500">{data.summary.average_daily_events} events per day</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Active Users</span>
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{data.summary.unique_active_users}</p>
              <p className="mt-1 text-xs text-slate-500">out of {data.summary.total_user_accounts} total accounts</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Ideas in System</span>
                <BarChart3 className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{data.summary.total_ideas}</p>
              <p className="mt-1 text-xs text-slate-500">{data.summary.page_view_count} page views in selected period</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Network Traffic Status</span>
                <Network className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{data.traffic.status}</p>
              <p className="mt-1 text-xs text-slate-500">{data.traffic.recent_1h_events} events in the last hour</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Most Viewed Pages</h2>
                  <p className="text-sm text-slate-500">Top URLs by activity volume</p>
                </div>
                <div className="overflow-hidden" style={{ height: "28rem" }}>
                  <Bar data={topPagesChartData} options={topPagesChartOptions} />
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Most Active Users</h2>
                  <p className="text-sm text-slate-500">Users generating the most events</p>
                </div>
                <div className="overflow-hidden" style={{ height: "28rem" }}>
                  <Bar data={topUsersChartData} options={topUsersChartOptions} />
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className={`rounded-2xl border p-5 shadow-sm ${TRAFFIC_STYLES[data.traffic.status]}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Traffic Snapshot</h2>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-70">Last 24 hours</p>
                    <p className="text-2xl font-semibold">{data.traffic.recent_24h_events}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-70">Previous 24 hours</p>
                    <p className="text-2xl font-semibold">{data.traffic.previous_24h_events}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-70">Change</p>
                    <p className="text-2xl font-semibold">{data.traffic.change_percent}%</p>
                  </div>
                  <p className="text-xs opacity-80">
                    Traffic status is an estimate based on recent activity log volume.
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Event Mix</h2>
                <p className="text-sm text-slate-500">What kind of activity is happening</p>
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

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Browser Distribution</h2>
                <p className="text-sm text-slate-500">Which browsers are being used most often</p>
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

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Monitor className="h-5 w-5 text-violet-600" />
                <h2 className="text-lg font-semibold text-slate-900">Browsers & Systems</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Browsers</p>
                  {data.tables.browsers.map((item, index) => (
                    <div key={`${item.browser}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{item.browser}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.usage_count}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Operating Systems</p>
                  {data.tables.operating_systems.map((item, index) => (
                    <div key={`${item.operating_system}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-700">{item.operating_system}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.usage_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">System Highlights</h2>
              <p className="text-sm text-slate-500">Quick operational takeaways</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Most Viewed URL</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.summary.most_viewed_page || "No data"}</p>
                <p className="mt-1 text-xs text-slate-500">{data.summary.most_viewed_page_count} views</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Most Active User</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.summary.most_active_user || "No data"}</p>
                <p className="mt-1 text-xs text-slate-500">{data.summary.most_active_user_count} events</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Login Activity</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{data.summary.login_count} logins</p>
                <p className="mt-1 text-xs text-slate-500">{data.summary.total_departments} departments currently in system</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Top URLs</h2>
              </div>
              <div className="space-y-3">
                {data.tables.top_pages.map((item, index) => (
                  <div key={`${item.path}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.path}</p>
                    </div>
                    <span className="ml-3 text-sm font-semibold text-blue-700">{item.view_count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-slate-900">Top Users</h2>
              </div>
              <div className="space-y-3">
                {data.tables.top_users.map((item, index) => (
                  <div key={`${item.username}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">{item.display_name || item.username || "Unknown"}</p>
                    <span className="text-sm font-semibold text-emerald-700">{item.activity_count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <p className="text-sm text-slate-500">Latest events recorded in the system</p>
              </div>
              <div className="space-y-3">
                {data.tables.recent_activity.slice(0, 5).map((item) => (
                  <div key={item.activity_log_id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{item.username}</p>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                        {item.event_type}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-700">{item.path}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(item.operating_system || "Unknown") + " / " + (item.device_type || "Unknown")} | {item.browser || "Unknown"} | {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
