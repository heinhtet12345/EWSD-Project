import { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
  const itemsPerPage = 10;
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
  }, [searchTerm, roleFilter, departmentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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

  const handleCreateUser = async (payload: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    role_name: string;
    department_name: string;
  }) => {
    setError("");
    setSuccess("");
    setIsCreatingUser(true);
    try {
      const response = await axios.post("/api/admin/users/create/", payload, getAuthConfig());
      setSuccess((response.data as { message?: string })?.message || `User "${payload.username}" created.`);
      setIsAddingUser(false);
      await fetchUsers();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to create user.");
      } else {
        setError("Failed to create user.");
      }
      throw err;
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

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
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[28%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[16%]">Username</th>
                <th className="hidden w-[24%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 lg:table-cell">Email</th>
                <th className="w-[24%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[16%]">Role</th>
                <th className="hidden w-[22%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 md:table-cell">Department</th>
                <th className="w-[16%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[10%]">Status</th>
                <th className="w-[32%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 sm:w-[18%]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500 sm:col-span-5 lg:col-span-6">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isProcessing = processingUserId === user.user_id;
                  const roleName = (user.role_name || "").trim().toLowerCase();
                  const isAdminUser = roleName === "admin";

                  return (
                    <tr
                      key={user.user_id}
                      className={user.user_id === highlightedUserId ? "bg-amber-50/60" : undefined}
                    >
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="truncate">{user.username}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 lg:table-cell">
                        <div className="truncate">{user.email || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="truncate">{user.role_name || "-"}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                        <div className="truncate">{user.department_name || "-"}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.active_status ? "Active" : "Disabled"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2 xl:flex-nowrap">
                          {canResetPassword && (
                            <button
                              type="button"
                              onClick={() => handleResetPassword(user)}
                              disabled={isProcessing}
                              className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Reset Password
                            </button>
                          )}
                          {user.active_status ? (
                            <button
                              type="button"
                              onClick={() => handleDisableUser(user)}
                              disabled={isProcessing || isAdminUser}
                              className="whitespace-nowrap rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Disable Account
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEnableUser(user)}
                              disabled={isProcessing}
                              className="whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Enable Account
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoadingUsers && filteredUsers.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                    page === currentPage
                      ? "bg-indigo-600 text-white"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
