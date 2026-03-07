import { useEffect, useState } from "react";
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users">("overview");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const handleResetPassword = async (user: AppUser) => {
    setError("");
    setSuccess("");
    try {
      const response = await axios.post(
        `/api/admin/users/${user.user_id}/reset-password/`,
        {},
        getAuthConfig(),
      );
      setSuccess((response.data as { message?: string })?.message || `Password reset for ${user.username}.`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined;
        setError(data?.message || data?.detail || "Failed to reset password.");
      } else {
        setError("Failed to reset password.");
      }
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Manage users and monitor system operations.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === "overview" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            activeTab === "users" ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          Users
        </button>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      {activeTab === "overview" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            Open the <span className="font-semibold">Users</span> tab to view accounts and reset passwords.
          </p>
        </div>
      )}

      {activeTab === "users" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.user_id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{user.email || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{user.role_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{user.department_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{user.active_status ? "Active" : "Inactive"}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(user)}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                          >
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
