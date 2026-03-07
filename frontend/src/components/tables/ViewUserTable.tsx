import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type AppUser = {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  department_name: string;
  active_status: boolean;
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
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [processingUserId, setProcessingUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  useEffect(() => {
    fetchUsers();
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

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
      </div>

      {isLoadingUsers ? (
        <p className="px-2 py-4 text-sm text-slate-500">Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isProcessing = processingUserId === user.user_id;
                  const roleName = (user.role_name || "").trim().toLowerCase();
                  const isAdminUser = roleName === "admin";

                  return (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.role_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.department_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.active_status ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            disabled={isProcessing}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Reset Password
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDisableUser(user)}
                            disabled={isProcessing || !user.active_status || isAdminUser}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Disable Account
                          </button>
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
