import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, KeyRound, ShieldCheck, Trash2, UserX } from "lucide-react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { useLocation } from "react-router-dom";
import Modal from "../common/Modal";
import AddUserForm from "../../forms/AddUserForm";

type AppUser = {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  department_name: string;
  active_status: boolean;
};

type AdminUserMeta = {
  roles?: string[];
  departments?: string[];
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

export default function ViewUserTable() {
  const tableTopRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const currentRole = useMemo(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return "staff";
      const parsed = JSON.parse(raw) as { role?: string };
      return String(parsed.role || "staff").trim().toLowerCase();
    } catch {
      return "staff";
    }
  }, []);
  const canAddUser = currentRole === "admin";
  const canResetPassword = currentRole === "admin";

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const highlightedUserId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("userId");
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [location.search]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setError("");
    try {
      const response = await axios.get("/api/admin/users/", getAuthConfig());
      const data = Array.isArray(response.data) ? response.data : response.data?.results;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to load users.");
      } else {
        setError("Failed to load users.");
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchUserMeta = async () => {
    try {
      const response = await axios.get<AdminUserMeta>("/api/admin/users/meta/", getAuthConfig());
      const roles = Array.isArray(response.data?.roles) ? response.data.roles : [];
      const departments = Array.isArray(response.data?.departments) ? response.data.departments : [];
      setAvailableRoles(roles);
      setAvailableDepartments(departments);
    } catch {
      // Keep list usable if metadata endpoint fails.
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchUserMeta();
  }, []);

  const roleOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((user) => (user.role_name || "").trim()).values()),
      ).filter((value) => value.length > 0),
    [users],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(users.map((user) => (user.department_name || "").trim()).values()),
      ).filter((value) => value.length > 0),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const roleName = user.role_name || "";
      const departmentName = user.department_name || "";

      const matchesRole = roleFilter === "all" || roleName === roleFilter;
      const matchesDepartment = departmentFilter === "all" || departmentName === departmentFilter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        user.username.toLowerCase().includes(normalizedSearch) ||
        (user.email || "").toLowerCase().includes(normalizedSearch) ||
        roleName.toLowerCase().includes(normalizedSearch) ||
        departmentName.toLowerCase().includes(normalizedSearch);

      return matchesRole && matchesDepartment && matchesSearch;
    });
  }, [users, searchTerm, roleFilter, departmentFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, departmentFilter, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  const skipSize = 5;
  const nearbyPages = Array.from({ length: 4 }, (_, index) => currentPage - 4 + index).filter(
    (page) => page >= 1 && page < currentPage,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!highlightedUserId) return;
    const targetIndex = filteredUsers.findIndex((user) => user.user_id === highlightedUserId);
    if (targetIndex < 0) return;
    const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [highlightedUserId, filteredUsers, currentPage]);

  useEffect(() => {
    if (!success) return;
    const timeoutId = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => setError(""), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  useEffect(() => {
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  const handleResetPassword = async (user: AppUser) => {
    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(
        `/api/admin/users/${user.user_id}/reset-password/`,
        {},
        getAuthConfig(),
      );
      setSuccess((response.data as { message?: string })?.message || `Password reset for ${user.username}.`);
      await fetchUsers();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to reset password.");
      } else {
        setError("Failed to reset password.");
      }
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleDisableUser = async (user: AppUser) => {
    const shouldDisable = window.confirm(`Disable account for "${user.username}"?`);
    if (!shouldDisable) return;

    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(`/api/admin/users/${user.user_id}/disable/`, {}, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `Account disabled for ${user.username}.`);
      await fetchUsers();
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

  const handleEnableUser = async (user: AppUser) => {
    const shouldEnable = window.confirm(`Enable account for "${user.username}"?`);
    if (!shouldEnable) return;

    setError("");
    setSuccess("");
    setProcessingUserId(user.user_id);
    try {
      const response = await axios.post(`/api/admin/users/${user.user_id}/enable/`, {}, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `Account enabled for ${user.username}.`);
      await fetchUsers();
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

  const handleDeleteUser = async (user: AppUser) => {
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
      await fetchUsers();
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

  const handleCreateUser = async (payload: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    role_name: string;
    department_name: string;
  }) => {
    setSuccess("");
    setIsCreatingUser(true);
    try {
      const response = await axios.post("/api/admin/users/create/", payload, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `User "${payload.username}" created.`);
      setIsAddingUser(false);
      await fetchUsers();
    } finally {
      setIsCreatingUser(false);
    }
  };

  const renderStatusBadge = (user: AppUser) => (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.active_status ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
      {user.active_status ? "Active" : "Disabled"}
    </span>
  );

  const renderActionButtons = (user: AppUser) => {
    const isProcessing = processingUserId === user.user_id;
    const roleName = (user.role_name || "").trim().toLowerCase();
    const isAdminUser = roleName === "admin";

    return (
      <div className="flex flex-nowrap gap-1.5">
        {canResetPassword && (
          <button
            type="button"
            onClick={() => handleResetPassword(user)}
            disabled={isProcessing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            title="Reset password"
            aria-label={`Reset password for ${user.username}`}
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
        )}
        {user.active_status ? (
          <button
            type="button"
            onClick={() => handleDisableUser(user)}
            disabled={isProcessing || isAdminUser}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            title="Disable account"
            aria-label={`Disable account for ${user.username}`}
          >
            <UserX className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleEnableUser(user)}
            disabled={isProcessing}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            title="Enable account"
            aria-label={`Enable account for ${user.username}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDeleteUser(user)}
          disabled={isProcessing || isAdminUser}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          title="Delete account"
          aria-label={`Delete account for ${user.username}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div ref={tableTopRef} className="min-w-0 space-y-2">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className={`grid grid-cols-1 gap-3 ${canAddUser ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by username, email, role, department..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
          />
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
          >
            <option value="all">All roles</option>
            {roleOptions.map((roleName) => (
              <option key={roleName} value={roleName}>
                {roleName}
              </option>
            ))}
          </select>
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
          >
            <option value="all">All departments</option>
            {departmentOptions.map((departmentName) => (
              <option key={departmentName} value={departmentName}>
                {departmentName}
              </option>
            ))}
          </select>
          {canAddUser && (
            <button
              type="button"
              onClick={() => setIsAddingUser(true)}
              className="w-full rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 sm:w-auto"
            >
              Add User
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={isAddingUser}
        onClose={() => setIsAddingUser(false)}
        maxWidthClassName="max-w-3xl"
      >
        {isAddingUser && (
          <AddUserForm
            roles={availableRoles}
            departments={availableDepartments}
            isSubmitting={isCreatingUser}
            onCancel={() => setIsAddingUser(false)}
            onSubmit={handleCreateUser}
          />
        )}
      </Modal>

      {isLoadingUsers ? (
        <p className="px-2 py-4 text-sm text-slate-500">Loading users...</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {paginatedUsers.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">No users found.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:hidden">
                {paginatedUsers.map((user) => {
                  const isProcessing = processingUserId === user.user_id;
                  const roleName = (user.role_name || "").trim().toLowerCase();
                  const isAdminUser = roleName === "admin";

                  return (
                    <article
                      key={user.user_id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm ${
                        user.user_id === highlightedUserId ? "border-amber-300 ring-2 ring-amber-200 bg-amber-50/60" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-10">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-slate-900">{user.username}</h3>
                          <p className="mt-1 text-sm text-slate-500">{user.email || "-"}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${user.active_status ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {user.active_status ? "Active" : "Disabled"}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</p>
                          <p className="mt-1 text-sm text-slate-700">{user.role_name || "-"}</p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Department</p>
                          <p className="mt-1 text-sm text-slate-700">{user.department_name || "-"}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-col gap-2">
                        {canResetPassword && (
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            disabled={isProcessing}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Reset password"
                            aria-label={`Reset password for ${user.username}`}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {user.active_status ? (
                          <button
                            type="button"
                            onClick={() => handleDisableUser(user)}
                            disabled={isProcessing || isAdminUser}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Disable account"
                            aria-label={`Disable account for ${user.username}`}
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEnableUser(user)}
                            disabled={isProcessing}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Enable account"
                            aria-label={`Enable account for ${user.username}`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user)}
                          disabled={isProcessing || isAdminUser}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Delete account"
                          aria-label={`Delete account for ${user.username}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="user-datatable hidden sm:block">
                <DataTable
                  value={paginatedUsers}
                  dataKey="user_id"
                  responsiveLayout="scroll"
                  emptyMessage="No users found."
                  rowHover
                  showGridlines
                  tableStyle={{ width: "100%", tableLayout: "fixed" }}
                  rowClassName={(user) => (user.user_id === highlightedUserId ? "bg-amber-50/60" : "")}
                >
                  <Column field="username" header="Username" body={(user: AppUser) => <div className="truncate">{user.username}</div>} style={{ width: "16%" }} />
                  <Column field="email" header="Email" body={(user: AppUser) => <div className="truncate">{user.email || "-"}</div>} style={{ width: "22%" }} />
                  <Column field="role_name" header="Role" body={(user: AppUser) => <div className="truncate">{user.role_name || "-"}</div>} style={{ width: "14%" }} />
                  <Column field="department_name" header="Department" body={(user: AppUser) => <div className="truncate">{user.department_name || "-"}</div>} style={{ width: "16%" }} />
                  <Column field="active_status" header="Status" body={renderStatusBadge} style={{ width: "12%" }} />
                  <Column header="Action" body={renderActionButtons} style={{ width: "20%" }} />
                </DataTable>
              </div>
            </>
          )}
        </div>
      )}

      {!isLoadingUsers && filteredUsers.length > 0 && (
        <div className="flex flex-col items-center gap-3 border-t border-slate-200 pt-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-xs text-slate-500 sm:text-sm">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
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
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label={`Skip back ${skipSize} pages`}
              title={`Skip back ${skipSize} pages`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
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
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + skipSize))}
              disabled={currentPage === totalPages}
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
  );
}
