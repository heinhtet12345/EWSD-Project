import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

export type StaffUser = {
  user_id: number;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email: string;
  role_name: string;
  department_name: string;
  active_status: boolean;
};

type ViewStaffTableProps = {
  users: StaffUser[];
  isLoading?: boolean;
};

export default function ViewStaffTable({ users, isLoading = false }: ViewStaffTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const skipSize = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [users, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(users.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visiblePageNumbers = useMemo(() => {
    const startPage = Math.max(1, safeCurrentPage - 2);
    const endPage = Math.min(totalPages, safeCurrentPage + 2);
    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }, [safeCurrentPage, totalPages]);

  const renderStatusBadge = (user: StaffUser) => (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        user.active_status ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {user.active_status ? "Active" : "Disabled"}
    </span>
  );

  const getDisplayName = (user: StaffUser) => {
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    return user.name?.trim() || fullName || user.username;
  };

  if (isLoading) {
    return <p className="px-2 py-4 text-sm text-slate-500">Loading staff...</p>;
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {paginatedUsers.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">No staff found.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 sm:hidden">
              {paginatedUsers.map((user) => (
                <article key={user.user_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">{getDisplayName(user)}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">@{user.username}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{user.email || "-"}</p>
                    </div>
                    {renderStatusBadge(user)}
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
                </article>
              ))}
            </div>

            <div className="admin-activity-datatable hidden sm:block">
              <DataTable
                value={paginatedUsers}
                dataKey="user_id"
                responsiveLayout="scroll"
                emptyMessage="No staff found."
                rowHover
                stripedRows
                showGridlines
                tableStyle={{ width: "100%", tableLayout: "fixed" }}
              >
                <Column
                  field="name"
                  header="Name"
                  body={(user: StaffUser) => (
                    <span className="block truncate font-medium text-slate-900">{getDisplayName(user)}</span>
                  )}
                  style={{ width: "20%" }}
                />
                <Column
                  field="username"
                  header="Username"
                  body={(user: StaffUser) => <span className="block truncate text-sm text-slate-700">@{user.username}</span>}
                  style={{ width: "16%" }}
                />
                <Column
                  field="email"
                  header="Email"
                  body={(user: StaffUser) => <span className="block truncate text-sm text-slate-700">{user.email || "-"}</span>}
                  style={{ width: "22%" }}
                />
                <Column
                  field="role_name"
                  header="Role"
                  body={(user: StaffUser) => <span className="block truncate text-sm text-slate-700">{user.role_name || "-"}</span>}
                  style={{ width: "14%" }}
                />
                <Column
                  field="department_name"
                  header="Department"
                  body={(user: StaffUser) => <span className="block truncate text-sm text-slate-700">{user.department_name || "-"}</span>}
                  style={{ width: "16%" }}
                />
                <Column field="active_status" header="Status" body={renderStatusBadge} style={{ width: "12%" }} />
              </DataTable>
            </div>
          </>
        )}
      </div>

      {users.length > 0 && (
        <div className="flex flex-col items-center gap-2 border-t border-slate-200 pt-3 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-left">
          <p className="text-xs text-slate-500 sm:text-sm">
            Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, users.length)} of {users.length}
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
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label={`Skip back ${skipSize} pages`}
              title={`Skip back ${skipSize} pages`}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 sm:py-1.5 sm:text-sm"
              aria-label="Previous page"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {visiblePageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold sm:px-3 sm:py-1.5 sm:text-sm ${
                  page === safeCurrentPage
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
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
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label="Next page"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + skipSize))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
              aria-label={`Skip forward ${skipSize} pages`}
              title={`Skip forward ${skipSize} pages`}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
