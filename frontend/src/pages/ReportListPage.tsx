import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type ReportStatus = "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "RESOLVED";

type ReportItem = {
  report_id: number;
  reason: string;
  details: string;
  status: ReportStatus;
  created_at: string;
  reporter: number;
  reporter_username?: string | null;
  idea?: number | null;
  idea_title?: string | null;
  comment?: number | null;
  comment_content?: string | null;
  target_type: "POST" | "COMMENT" | "USER";
  target_label?: string | null;
};

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "IN_REVIEW", label: "In Review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RESOLVED", label: "Resolved" },
];

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

const formatStatus = (status: ReportStatus) =>
  STATUS_OPTIONS.find((option) => option.value === status)?.label || status;

const formatReportedType = (targetType: ReportItem["target_type"]) => {
  if (targetType === "POST") return "Post";
  if (targetType === "COMMENT") return "Comment";
  return "User";
};

export default function ReportListPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [savingReportId, setSavingReportId] = useState<number | null>(null);

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
      const label = report.target_label || "";
      return (
        reporter.toLowerCase().includes(normalized) ||
        label.toLowerCase().includes(normalized) ||
        report.reason.toLowerCase().includes(normalized) ||
        report.status.toLowerCase().includes(normalized) ||
        formatReportedType(report.target_type).toLowerCase().includes(normalized)
      );
    });
  }, [reports, search]);

  const title = currentRole === "qa_manager" ? "Reported Content" : "Reports";

  const handleOpenTarget = (report: ReportItem) => {
    const ideaId = report.idea;
    if (!ideaId) return;

    let basePath = "/staff/all-ideas";
    if (currentRole === "qa_manager") {
      basePath = "/qa_manager/all-ideas";
    } else if (currentRole === "admin") {
      basePath = "/admin/all-ideas";
    } else if (currentRole === "qa_coordinator") {
      basePath = "/qa_coordinator/my-department";
    }

    const params = new URLSearchParams({ highlightIdeaId: String(ideaId) });
    if (report.target_type === "COMMENT" && report.comment) {
      params.set("highlightCommentId", String(report.comment));
    }

    navigate(`${basePath}?${params.toString()}`);
  };

  const handleStatusChange = async (reportId: number, nextStatus: ReportStatus) => {
    setSavingReportId(reportId);
    setError("");
    try {
      const response = await axios.patch(
        "/api/interaction/reports/",
        { report_id: reportId, status: nextStatus },
        getAuthConfig(),
      );
      const updated = response.data?.report as ReportItem | undefined;
      setReports((prev) =>
        prev.map((report) =>
          report.report_id === reportId ? { ...report, status: updated?.status || nextStatus } : report,
        ),
      );
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to update report status.");
      } else {
        setError("Failed to update report status.");
      }
    } finally {
      setSavingReportId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">{title}</h1>
          <p className="text-sm text-slate-500">Review reported ideas and comments, then update their status.</p>
        </div>
        <div className="w-full sm:max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by target, reporter, reason..."
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
          <table className="w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="hidden w-[12%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 md:table-cell">Reported Type</th>
                <th className="w-[30%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[22%]">Target</th>
                <th className="hidden w-[16%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 lg:table-cell">Reporter</th>
                <th className="w-[24%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[16%]">Reason</th>
                <th className="hidden w-[19%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 xl:table-cell">Details</th>
                <th className="w-[24%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[20%]">Status</th>
                <th className="w-[22%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[18%]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredReports.map((report) => (
                <tr key={report.report_id} className="transition hover:bg-amber-50/40">
                  <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">{formatReportedType(report.target_type)}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <button
                      type="button"
                      onClick={() => handleOpenTarget(report)}
                      className="block w-full truncate text-left text-blue-700 hover:text-blue-800 hover:underline"
                    >
                      {report.target_label || (report.target_type === "POST" ? `Idea #${report.idea}` : `Comment #${report.comment}`)}
                    </button>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-700 lg:table-cell">
                    <div className="truncate">{report.reporter_username || `User #${report.reporter}`}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{report.reason}</td>
                  <td className="hidden px-4 py-3 text-sm text-slate-700 xl:table-cell">
                    <div className="truncate">{report.details || "-"}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <select
                      value={report.status}
                      onChange={(event) => handleStatusChange(report.report_id, event.target.value as ReportStatus)}
                      disabled={savingReportId === report.report_id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <div>{new Date(report.created_at).toLocaleString()}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatStatus(report.status)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
