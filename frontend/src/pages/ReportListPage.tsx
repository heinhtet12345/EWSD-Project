import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/common/Modal";
import ViewReportTable, { type ReportItem, type ReportStatus } from "../components/tables/ViewReportTable";

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

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "IN_REVIEW", label: "In Review" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RESOLVED", label: "Resolved" },
];
const FINAL_REPORT_STATUSES: ReportStatus[] = ["REJECTED", "RESOLVED"];

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);
  const [isUserProfileLoading, setIsUserProfileLoading] = useState(false);
  const [userProfileError, setUserProfileError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [userProfileReportContext, setUserProfileReportContext] = useState<ReportItem | null>(null);
  const [didTakeProfileAction, setDidTakeProfileAction] = useState(false);

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
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, startIndex + itemsPerPage);
  const skipSize = 5;
  const nearbyPages = Array.from({ length: 4 }, (_, index) => safeCurrentPage - 4 + index).filter(
    (page) => page >= 1 && page < safeCurrentPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const title = currentRole === "qa_manager" ? "Reported Content" : "Reports";

  const isFinalReportStatus = (status: ReportStatus) => FINAL_REPORT_STATUSES.includes(status);

  const closeUserProfileModal = () => {
    setSelectedUserProfile(null);
    setUserProfileError("");
    setIsUserProfileLoading(false);
    setUserProfileReportContext(null);
    setDidTakeProfileAction(false);
  };

  const handleOpenTarget = async (report: ReportItem) => {
    if (!isFinalReportStatus(report.status)) {
      await handleStatusChange(report.report_id, "ACCEPTED");
    }

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

  const handleOpenUser = (userId: number, report: ReportItem) => {
    if (!userId) return;
    if (currentRole !== "admin" && currentRole !== "qa_manager") return;
    if (isFinalReportStatus(report.status)) return;
    const fetchUserProfile = async () => {
      setIsUserProfileLoading(true);
      setUserProfileError("");
      setSelectedUserProfile(null);
      setUserProfileReportContext(report);
      setDidTakeProfileAction(false);
      try {
        const response = await axios.get<UserProfile>(`/api/admin/users/${userId}/`, getAuthConfig());
        setSelectedUserProfile(response.data);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as { message?: string; detail?: string } | undefined;
          setUserProfileError(data?.message || data?.detail || "Failed to load user profile.");
        } else {
          setUserProfileError("Failed to load user profile.");
        }
      } finally {
        setIsUserProfileLoading(false);
      }
    };

    void fetchUserProfile();
  };

  const handleStatusChange = async (reportId: number, nextStatus: ReportStatus) => {
    const currentReport = reports.find((report) => report.report_id === reportId);
    if (currentReport && isFinalReportStatus(currentReport.status) && currentReport.status !== nextStatus) {
      return;
    }

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
      setSelectedReport((prev) =>
        prev?.report_id === reportId ? { ...prev, status: updated?.status || nextStatus } : prev,
      );
      setUserProfileReportContext((prev) =>
        prev?.report_id === reportId ? { ...prev, status: updated?.status || nextStatus } : prev,
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

  const refreshSelectedUserProfile = async (userId: number) => {
    const response = await axios.get<UserProfile>(`/api/admin/users/${userId}/`, getAuthConfig());
    setSelectedUserProfile(response.data);
  };

  const markReportResolvedFromProfileAction = async (report: ReportItem | null) => {
    if (!report) return;
    if (isFinalReportStatus(report.status)) return;
    setDidTakeProfileAction(true);
    await handleStatusChange(report.report_id, "RESOLVED");
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
      await markReportResolvedFromProfileAction(userProfileReportContext);
      await refreshSelectedUserProfile(user.user_id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to disable account.");
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
      await markReportResolvedFromProfileAction(userProfileReportContext);
      await refreshSelectedUserProfile(user.user_id);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to enable account.");
      } else {
        setError("Failed to enable account.");
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    const shouldDelete = window.confirm(
      `Delete account for "${user.username}"?\n\nAre you sure you want to delete this account?`,
    );
    if (!shouldDelete) return;

    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(`/api/admin/users/${user.user_id}/delete/`, {}, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `Account deleted for ${user.username}.`);
      await markReportResolvedFromProfileAction(userProfileReportContext);
      closeUserProfileModal();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to delete account.");
      } else {
        setError("Failed to delete account.");
      }
    } finally {
      setProcessingUserId(null);
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

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {loading && <p className="text-sm text-slate-500">Loading reports...</p>}

      {!loading && filteredReports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">No reports found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <ViewReportTable
            reports={paginatedReports}
            savingReportId={savingReportId}
            statusOptions={STATUS_OPTIONS}
            formatStatus={formatStatus}
            formatReportedType={formatReportedType}
            handleOpenTarget={handleOpenTarget}
            handleOpenUser={handleOpenUser}
            handleStatusChange={handleStatusChange}
            onSelectReport={setSelectedReport}
          />
          {filteredReports.length > 0 && (
            <div className="flex flex-col items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:gap-3 sm:text-left">
              <p className="text-xs text-slate-600 sm:text-sm">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredReports.length)} of {filteredReports.length}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                <select
                  value={itemsPerPage}
                  onChange={(event) => setItemsPerPage(Number(event.target.value))}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 sm:px-3 sm:py-1.5 sm:text-sm"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - skipSize))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
                  aria-label={`Skip back ${skipSize} pages`}
                  title={`Skip back ${skipSize} pages`}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
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
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 sm:px-3 sm:py-1.5 sm:text-sm"
                  >
                    {page}
                  </button>
                ))}
                <span className="text-xs text-slate-600 sm:text-sm">
                  Page {safeCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
                  aria-label="Next page"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + skipSize))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
                  aria-label={`Skip forward ${skipSize} pages`}
                  title={`Skip forward ${skipSize} pages`}
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={selectedReport !== null}
        onClose={() => setSelectedReport(null)}
        maxWidthClassName="max-w-3xl"
      >
        {selectedReport && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Report Details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review the full report information and open the related content if needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reported Type</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatReportedType(selectedReport.target_type)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reporter</p>
                <button
                  type="button"
                  onClick={() => handleOpenUser(selectedReport.reporter, selectedReport)}
                  className="mt-1 text-left text-sm font-medium text-slate-900 transition hover:text-slate-700 hover:underline"
                >
                  {selectedReport.reporter_username || `User #${selectedReport.reporter}`}
                </button>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Target</p>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedReport.target_user_id) {
                      handleOpenUser(selectedReport.target_user_id, selectedReport);
                    }
                  }}
                  className="mt-1 text-left text-sm font-medium text-slate-900 transition hover:text-slate-700 hover:underline"
                >
                  {selectedReport.target_label ||
                    (selectedReport.target_type === "POST"
                      ? `Idea #${selectedReport.idea}`
                      : `Comment #${selectedReport.comment}`)}
                </button>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {new Date(selectedReport.created_at).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{selectedReport.reason}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{formatStatus(selectedReport.status)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Details</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedReport.details || "-"}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={selectedUserProfile !== null || isUserProfileLoading || Boolean(userProfileError)}
        onClose={() => {
          closeUserProfileModal();
        }}
        maxWidthClassName="max-w-3xl"
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">User Profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                View the full profile information for this user.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                closeUserProfileModal();
              }}
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
                  <p className="mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white bg-slate-700">
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
