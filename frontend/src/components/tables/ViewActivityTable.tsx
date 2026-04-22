import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

export type ActivityLog = {
  activity_log_id: number;
  username: string;
  event_type: string;
  path: string;
  browser: string;
  operating_system: string;
  device_type: string;
  created_at: string;
};

type ViewActivityTableProps = {
  logs: ActivityLog[];
  isRefreshing?: boolean;
};

export default function ViewActivityTable({ logs, isRefreshing = false }: ViewActivityTableProps) {
  const renderUser = (log: ActivityLog) => (
    <span className="font-medium text-slate-900">{log.username || "Unknown"}</span>
  );

  const renderEventType = (log: ActivityLog) => (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
      {log.event_type}
    </span>
  );

  const renderPath = (log: ActivityLog) => (
    <span className="block max-w-[20rem] truncate text-sm text-slate-700" title={log.path || "-"}>
      {log.path || "-"}
    </span>
  );

  const renderSystem = (log: ActivityLog) => (
    <span className="block truncate text-sm text-slate-700" title={(log.operating_system || "-") + " / " + (log.device_type || "-")}>
      {(log.operating_system || "-") + " / " + (log.device_type || "-")}
    </span>
  );

  const renderTimestamp = (log: ActivityLog) => (
    <span className="block truncate text-sm text-slate-700" title={new Date(log.created_at).toLocaleString()}>
      {new Date(log.created_at).toLocaleString()}
    </span>
  );

  return (
    <>
      <div className="space-y-3 p-3 sm:hidden">
        {logs.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
            No activity logs found.
          </div>
        ) : (
          logs.map((log) => (
            <article key={log.activity_log_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</p>
                  <p className="mt-1 truncate text-base font-semibold text-slate-900">{log.username || "Unknown"}</p>
                </div>
                {renderEventType(log)}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Browser</p>
                  <p className="mt-1 text-sm text-slate-700">{log.browser || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Page</p>
                  <p className="mt-1 break-words text-sm text-slate-700">{log.path || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">OS / Device</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {(log.operating_system || "-") + " / " + (log.device_type || "-")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Time</p>
                  <p className="mt-1 text-sm text-slate-700">{new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="admin-activity-datatable hidden sm:block">
        <DataTable
          value={logs}
          dataKey="activity_log_id"
          responsiveLayout="scroll"
          emptyMessage="No activity logs found."
          rowHover
          stripedRows
          showGridlines
          loading={isRefreshing}
          tableStyle={{ width: "100%", tableLayout: "fixed" }}
        >
          <Column field="username" header="User" body={renderUser} style={{ width: "14%" }} />
          <Column field="browser" header="Browser" body={(log: ActivityLog) => log.browser || "-"} style={{ width: "14%" }} />
          <Column field="event_type" header="Type" body={renderEventType} style={{ width: "12%" }} />
          <Column field="path" header="Page" body={renderPath} style={{ width: "28%" }} />
          <Column header="OS / Device" body={renderSystem} style={{ width: "16%" }} />
          <Column field="created_at" header="Time" sortable body={renderTimestamp} style={{ width: "16%" }} />
        </DataTable>
      </div>
    </>
  );
}
