import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

export type ReportStatus = "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "RESOLVED";

export type ReportItem = {
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

type StatusOption = {
  value: ReportStatus;
  label: string;
};

type ViewReportTableProps = {
  reports: ReportItem[];
  savingReportId: number | null;
  statusOptions: StatusOption[];
  formatStatus: (status: ReportStatus) => string;
  formatReportedType: (targetType: ReportItem["target_type"]) => string;
  handleOpenTarget: (report: ReportItem) => void;
  handleStatusChange: (reportId: number, nextStatus: ReportStatus) => void;
};

export default function ViewReportTable({
  reports,
  savingReportId,
  statusOptions,
  formatStatus,
  formatReportedType,
  handleOpenTarget,
  handleStatusChange,
}: ViewReportTableProps) {
  const renderTarget = (report: ReportItem) => (
    <button
      type="button"
      onClick={() => handleOpenTarget(report)}
      className="block w-full truncate text-left text-blue-700 hover:text-blue-800 hover:underline"
    >
      {report.target_label || (report.target_type === "POST" ? `Idea #${report.idea}` : `Comment #${report.comment}`)}
    </button>
  );

  const renderStatusSelect = (report: ReportItem) => (
    <select
      value={report.status}
      onChange={(event) => handleStatusChange(report.report_id, event.target.value as ReportStatus)}
      disabled={savingReportId === report.report_id}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <div className="space-y-3 p-3 sm:hidden">
        {reports.map((report) => (
          <article key={report.report_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-amber-50/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatReportedType(report.target_type)}</p>
                <button
                  type="button"
                  onClick={() => handleOpenTarget(report)}
                  className="mt-1 block w-full truncate text-left text-base font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                >
                  {report.target_label || (report.target_type === "POST" ? `Idea #${report.idea}` : `Comment #${report.comment}`)}
                </button>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatStatus(report.status)}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reporter</p>
                <p className="mt-1 text-sm text-slate-700">{report.reporter_username || `User #${report.reporter}`}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                <p className="mt-1 text-sm text-slate-700">{report.reason}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Details</p>
                <p className="mt-1 text-sm text-slate-700">{report.details || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</p>
                <p className="mt-1 text-sm text-slate-700">{new Date(report.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">{renderStatusSelect(report)}</div>
          </article>
        ))}
      </div>

      <div className="report-datatable hidden sm:block">
        <DataTable
          value={reports}
          dataKey="report_id"
          responsiveLayout="scroll"
          emptyMessage="No reports found."
          rowHover
          showGridlines
          tableStyle={{ width: "100%", tableLayout: "fixed" }}
        >
          <Column field="target_type" header="Reported Type" body={(report: ReportItem) => formatReportedType(report.target_type)} style={{ width: "12%" }} />
          <Column field="target_label" header="Target" body={renderTarget} style={{ width: "22%" }} />
          <Column field="reporter_username" header="Reporter" body={(report: ReportItem) => report.reporter_username || `User #${report.reporter}`} style={{ width: "16%" }} />
          <Column field="reason" header="Reason" style={{ width: "16%" }} />
          <Column field="details" header="Details" body={(report: ReportItem) => report.details || "-"} style={{ width: "18%" }} />
          <Column header="Status" body={renderStatusSelect} style={{ width: "16%" }} />
          <Column
            field="created_at"
            header="Date"
            body={(report: ReportItem) => (
              <div>
                <div>{new Date(report.created_at).toLocaleString()}</div>
                <div className="mt-1 text-xs text-slate-500">{formatStatus(report.status)}</div>
              </div>
            )}
            style={{ width: "18%" }}
          />
        </DataTable>
      </div>
    </>
  );
}
