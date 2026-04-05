import { useEffect, useState } from "react";
import axios from "axios";

type ActivityLog = {
  activity_log_id: number;
  username: string;
  event_type: string;
  path: string;
  browser: string;
  operating_system: string;
  device_type: string;
  created_at: string;
};

type ActivityLogsResponse = {
  results: ActivityLog[];
  count: number;
  page: number;
  page_size: number;
  period_days: number;
};

export default function AdminAnalyticsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [days, setDays] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const fetchLogs = async () => {
    setError("");
    try {
      const response = await axios.get<ActivityLogsResponse>("/api/analytics/logs/", {
        params: {
          page: currentPage,
          page_size: pageSize,
          days,
          event_type: eventType || undefined,
          search: search.trim() || undefined,
        },
      });
      setLogs(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to load activity logs.");
      } else {
        setError("Failed to load activity logs.");
      }
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchLogs().finally(() => setIsLoading(false));
  }, [currentPage, pageSize, days, eventType, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [days, eventType, search]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchLogs();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [currentPage, pageSize, days, eventType, search]);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activities Logs</h1>
        <p className="text-sm text-slate-500">Track who did what, where, and when.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search user, page, browser..."
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="">All event types</option>
            <option value="login">Login</option>
            <option value="page_view">Page View</option>
          </select>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">Loading activity logs...</p>
        ) : (
          <>
            <div className="space-y-3 p-3 sm:hidden">
              {logs.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
                  No activity logs found.
                </div>
              ) : (
                logs.map((log) => (
                  <article key={log.activity_log_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</p>
                        <p className="mt-1 truncate text-base font-semibold text-slate-900">{log.username || "Unknown"}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">
                        {log.event_type}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Browser</p>
                        <p className="mt-1 text-sm text-slate-700">{log.browser || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Page</p>
                        <p className="mt-1 break-words text-sm text-slate-700">{log.path || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OS / Device</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {(log.operating_system || "-") + " / " + (log.device_type || "-")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Time</p>
                        <p className="mt-1 text-sm text-slate-700">{new Date(log.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Browser</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Page</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">OS / Device</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No activity logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.activity_log_id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.username || "Unknown"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.browser || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{log.event_type}</td>
                        <td className="max-w-[280px] truncate px-4 py-3 text-sm text-slate-700">{log.path || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {(log.operating_system || "-") + " / " + (log.device_type || "-")}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {!isLoading && totalCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:items-center sm:text-left">
          <p className="text-sm text-slate-600">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} logs
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
