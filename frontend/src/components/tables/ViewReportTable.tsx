import { useRef } from "react";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";

export type ReportStatus = "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "RESOLVED";
const FINAL_REPORT_STATUSES: ReportStatus[] = ["REJECTED", "RESOLVED"];

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
  target_user_id?: number | null;
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
  handleOpenUser: (userId: number, report: ReportItem) => void;
  handleStatusChange: (reportId: number, nextStatus: ReportStatus) => void;
  onSelectReport: (report: ReportItem) => void;
};

export default function ViewReportTable({
  reports,
  savingReportId,
  statusOptions,
  formatStatus,
  formatReportedType,
  handleOpenTarget,
  handleOpenUser,
  handleStatusChange,
  onSelectReport,
}: ViewReportTableProps) {
  const clickTimeoutRef = useRef<number | null>(null);

  const scheduleSelectReport = (report: ReportItem) => {
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      onSelectReport(report);
      clickTimeoutRef.current = null;
    }, 220);
  };

  const handleRowDoubleClick = (report: ReportItem) => {
    if (clickTimeoutRef.current !== null) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    handleOpenTarget(report);
  };

  const renderType = (report: ReportItem) => (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
      {formatReportedType(report.target_type)}
    </span>
  );

  const renderTarget = (report: ReportItem) => (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        if (report.target_user_id) {
          handleOpenUser(report.target_user_id, report);
        }
      }}
      className="block w-full truncate text-left text-slate-900 transition hover:text-slate-700 hover:underline dark:text-white dark:hover:text-slate-200"
    >
      {report.target_label || (report.target_type === "POST" ? `Idea #${report.idea}` : `Comment #${report.comment}`)}
    </button>
  );

  const renderReporter = (report: ReportItem) => (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        handleOpenUser(report.reporter, report);
      }}
      className="block truncate text-left text-sm text-slate-700 transition hover:text-slate-900 hover:underline dark:text-slate-200 dark:hover:text-white"
    >
      {report.reporter_username || `User #${report.reporter}`}
    </button>
  );

  const renderReason = (report: ReportItem) => (
    <span className="block truncate text-sm text-slate-700 dark:text-slate-200" title={report.reason}>
      {report.reason}
    </span>
  );

  const renderStatusSelect = (report: ReportItem) => (
    <select
      value={report.status}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        event.stopPropagation();
        handleStatusChange(report.report_id, event.target.value as ReportStatus);
      }}
      disabled={savingReportId === report.report_id || FINAL_REPORT_STATUSES.includes(report.status)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const renderDate = (report: ReportItem) => (
    <div className="min-w-0">
      <div className="whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">
        {new Date(report.created_at).toLocaleDateString()}
      </div>
      <div className="mt-1 whitespace-nowrap text-xs text-slate-500">
        {new Date(report.created_at).toLocaleTimeString()}
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-3 p-3 sm:hidden">
        {reports.map((report) => (
          <article
            key={report.report_id}
            onClick={() => scheduleSelectReport(report)}
            onDoubleClick={() => handleRowDoubleClick(report)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:bg-amber-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatReportedType(report.target_type)}</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (report.target_user_id) {
                      handleOpenUser(report.target_user_id, report);
                    }
                  }}
                  className="mt-1 block w-full truncate text-left text-base font-semibold text-slate-900 transition hover:text-slate-700 hover:underline dark:text-white dark:hover:text-slate-200"
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
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleOpenUser(report.reporter, report);
                  }}
                  className="mt-1 text-left text-sm text-slate-700 transition hover:text-slate-900 hover:underline dark:text-slate-200 dark:hover:text-white"
                >
                  {report.reporter_username || `User #${report.reporter}`}
                </button>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                <p className="mt-1 text-sm text-slate-700">{report.reason}</p>
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
          onRowClick={(event) => scheduleSelectReport(event.data as ReportItem)}
          onRowDoubleClick={(event) => handleRowDoubleClick(event.data as ReportItem)}
          rowClassName={() => "cursor-pointer"}
        >
          <Column field="target_type" header="Reported Type" body={renderType} style={{ width: "15%" }} />
          <Column field="target_label" header="Target" body={renderTarget} style={{ width: "15%" }} />
          <Column field="reporter_username" header="Reporter" body={renderReporter} style={{ width: "15%" }} />
          <Column field="reason" header="Reason" body={renderReason} style={{ width: "15%" }} />
          <Column header="Status" body={renderStatusSelect} style={{ width: "15%" }} />
          <Column
            field="created_at"
            header="Date"
            body={renderDate}
            style={{ width: "16%" }}
          />
        </DataTable>
      </div>
    </>
  );
}
