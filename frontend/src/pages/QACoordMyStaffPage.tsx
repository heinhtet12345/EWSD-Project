import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import ViewStaffTable, { type StaffUser } from "../components/tables/ViewStaffTable";

export default function QACoordMyStaffPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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
        (user.name || "").toLowerCase().includes(normalizedSearch) ||
        (user.first_name || "").toLowerCase().includes(normalizedSearch) ||
        (user.last_name || "").toLowerCase().includes(normalizedSearch) ||
        user.username.toLowerCase().includes(normalizedSearch) ||
        (user.email || "").toLowerCase().includes(normalizedSearch) ||
        (user.department_name || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }, [staffUsers, searchTerm]);

  const departmentName = staffUsers[0]?.department_name || "My Department";

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Staff accounts from {departmentName}.</h1>
        <p className="text-sm text-slate-500">View and manage staff accounts from the department.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, username, email, or department..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-600"
          />
          <div className="flex items-center justify-end text-sm text-slate-500">
            Total staff: <span className="ml-1 font-semibold text-slate-900">{filteredUsers.length}</span>
          </div>
        </div>

        <ViewStaffTable users={filteredUsers} isLoading={isLoading} />
      </div>
    </section>
  );
}
