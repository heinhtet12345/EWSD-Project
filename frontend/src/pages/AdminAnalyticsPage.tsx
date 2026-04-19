import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import ViewActivityTable, { type ActivityLog } from "../components/tables/ViewActivityTable";

// Response
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [days, setDays] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const cacheRef = useRef(new Map<string, ActivityLogsResponse>());

  const effectivePageSize = pageSize === -1 ? Math.max(totalCount, 1) : pageSize;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));
  const skipSize = 5;
  const nearbyPages = Array.from({ length: 4 }, (_, index) => currentPage - 4 + index).filter(
    (page) => page >= 1 && page < currentPage,
  );

  const fetchLogs = async () => {
    setError("");
    const cacheKey = JSON.stringify({
      page: currentPage,
      pageSize: effectivePageSize,
      days,
      eventType: eventType || "",
      search: search.trim(),
    });

    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setLogs(cached.results || []);
      setTotalCount(cached.count || 0);
      setIsLoading(false);
      return;
    }

    try {
      setIsRefreshing(true);
      const response = await axios.get<ActivityLogsResponse>("/api/analytics/logs/", {
        params: {
          page: currentPage,
          page_size: effectivePageSize,
          days,
          event_type: eventType || undefined,
          search: search.trim() || undefined,
        },
      });
      cacheRef.current.set(cacheKey, response.data);
      setLogs(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to load activity logs.");
      } else {
        setError("Failed to load activity logs.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (logs.length === 0) {
      setIsLoading(true);
    }
    fetchLogs();
  }, [currentPage, effectivePageSize, days, eventType, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [days, eventType, search, pageSize]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchLogs();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [currentPage, effectivePageSize, days, eventType, search]);

  return (
    <section className="space-y-2">
      {/* <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activities Logs</h1>
        <p className="text-sm text-slate-500">Track who did what, where, and when.</p>
      </div> */}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {/* Filter */}
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
          // Acitivity Log Table Component is called
          <ViewActivityTable logs={logs} isRefreshing={isRefreshing} />
        )}
      </div>
      
      {/* Pagination, Jump Skip and n Per Page */}
      {!isLoading && totalCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
          <p className="text-xs text-slate-600 sm:text-sm">
            Showing {(currentPage - 1) * effectivePageSize + 1} to {Math.min(currentPage * effectivePageSize, totalCount)} of {totalCount} logs
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              disabled={isRefreshing}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-sm"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={-1}>All</option>
            </select>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - skipSize))}
              disabled={currentPage === 1 || isRefreshing}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label={`Skip back ${skipSize} pages`}
              title={`Skip back ${skipSize} pages`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isRefreshing}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {nearbyPages.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                disabled={isRefreshing}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                {page}
              </button>
            ))}
            <span className="text-xs text-slate-600 sm:text-sm">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || isRefreshing}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + skipSize))}
              disabled={currentPage === totalPages || isRefreshing}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label={`Skip forward ${skipSize} pages`}
              title={`Skip forward ${skipSize} pages`}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
