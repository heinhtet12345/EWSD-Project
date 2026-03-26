import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type StaffUser = {
  user_id: number;
  username: string;
  email: string;
  role_name: string;
  department_name: string;
  active_status: boolean;
};

export default function QACoordMyStaffPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  useEffect(() => {
    const fetchStaffUsers = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await axios.get("/api/qa-coordinator/my-staff/");
        const data = Array.isArray(response.data) ? response.data : response.data?.results;
        setStaffUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const payload = err.response?.data as { message?: string; detail?: string } | undefined;
          setError(payload?.message || payload?.detail || "Failed to load department staff.");
        } else {
          setError("Failed to load department staff.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return staffUsers;

    return staffUsers.filter((user) => {
      return (
        user.username.toLowerCase().includes(normalizedSearch) ||
        (user.email || "").toLowerCase().includes(normalizedSearch) ||
        (user.department_name || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [staffUsers, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  const departmentName = staffUsers[0]?.department_name || "My Department";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Staff</h1>
        <p className="text-sm text-slate-500">Staff accounts from {departmentName}.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by username, email, or department..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
          />
          <div className="flex items-center justify-end text-sm text-slate-500">
            Total staff: <span className="ml-1 font-semibold text-slate-900">{filteredUsers.length}</span>
          </div>
        </div>

        {isLoading ? (
          <p className="px-2 py-4 text-sm text-slate-500">Loading staff...</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.role_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.department_name || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.active_status ? "Active" : "Disabled"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredUsers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safeCurrentPage === 1}
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
                      page === safeCurrentPage
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
                disabled={safeCurrentPage === totalPages}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
