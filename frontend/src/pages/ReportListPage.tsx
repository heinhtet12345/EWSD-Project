import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type ReportItem = {
  report_id: number;
  reason: string;
  details: string;
  created_at: string;
  reporter: number;
  reporter_username?: string | null;
  idea: number;
  idea_title?: string | null;
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

export default function ReportListPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const currentRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return "staff";
      const parsed = JSON.parse(raw) as { role?: string };
      return String(parsed?.role || "staff").trim().toLowerCase();
    } catch {
      return "staff";
    }
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await axios.get("/api/interaction/reports/", getAuthConfig());
        const data = Array.isArray(response.data?.results) ? response.data.results : [];
        setReports(data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as { message?: string; detail?: string } | undefined;
          setError(data?.message || data?.detail || "Failed to load reports.");
        } else {
          setError("Failed to load reports.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return reports;
    return reports.filter((report) => {
      const reporter = report.reporter_username || "";
      const title = report.idea_title || "";
      return (
        reporter.toLowerCase().includes(normalized) ||
        title.toLowerCase().includes(normalized) ||
        report.reason.toLowerCase().includes(normalized)
      );
    });
  }, [reports, search]);

  const title = currentRole === "qa_manager" ? "Reported Ideas" : "Reports";
  const handleOpenIdea = (ideaId: number) => {
    const basePath = currentRole === "qa_manager" ? "/qa_manager/all-ideas" : "/admin/all-ideas";
    navigate(`${basePath}?highlightIdeaId=${ideaId}`);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black">{title}</h1>
          <p className="text-sm text-slate-500">Review reported ideas and reasons.</p>
        </div>
        <div className="w-full max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by reporter, reason, idea..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading && <p className="text-sm text-slate-500">Loading reports...</p>}

      {!loading && filteredReports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">No reports found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Idea</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Reporter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredReports.map((report) => (
                <tr
                  key={report.report_id}
                  onClick={() => handleOpenIdea(report.idea)}
                  className="cursor-pointer transition hover:bg-amber-50/60"
                >
                  <td className="px-4 py-3 text-sm text-slate-700">{report.idea_title || `Idea #${report.idea}`}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{report.reporter_username || `User #${report.reporter}`}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{report.reason}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{report.details || "-"}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{new Date(report.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
