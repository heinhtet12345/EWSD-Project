import React from 'react'
import { FolderOpen } from 'lucide-react'

export type ClosurePeriod = {
	id: number
	startDate: string
	ideaClosureDate: string
	commentClosureDate: string
	isActive: boolean
	academicYear: string
}

type ViewClosurePeriodTableProps = {
	periods: ClosurePeriod[]
	showDownload?: boolean
	onDownloadAll?: () => void
	isDownloading?: boolean
	onDownloadPeriod?: (period: ClosurePeriod) => void
	downloadingPeriodId?: number | null
	searchTerm?: string
	onSearchChange?: (value: string) => void
}

const formatDate = (value: string) => {
	if (!value) {
		return '-'
	}

	const parts = value.split('-')
	if (parts.length === 3) {
		const [yearText, monthText, dayText] = parts
		const year = Number(yearText)
		const month = Number(monthText)
		const day = Number(dayText)

		if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
			const date = new Date(year, month - 1, day)
			return date.toLocaleDateString('en-GB', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			})
		}
	}

	return value
}

const ViewClosurePeriodTable = ({
	periods,
	showDownload = false,
	onDownloadAll,
	isDownloading,
	onDownloadPeriod,
	downloadingPeriodId = null,
	searchTerm = '',
	onSearchChange,
}: ViewClosurePeriodTableProps) => {
	return (
		<div className="qa-closure-table overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			{showDownload && (
				<div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="w-full sm:max-w-xs">
						<label className="sr-only" htmlFor="closure-search">
							Search closure periods
						</label>
						<input
							id="closure-search"
							type="text"
							value={searchTerm}
							onChange={(e) => onSearchChange?.(e.target.value)}
							placeholder="Search academic year..."
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>
					<button
						type="button"
						onClick={onDownloadAll}
						disabled={isDownloading}
						className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{isDownloading ? 'Preparing…' : 'Download All Data'}
					</button>
				</div>
			)}
			<table className="min-w-full divide-y divide-slate-200">
				<thead className="qa-closure-table-head bg-slate-50">
					<tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
							Academic Year
						</th>
						<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
							Start Date
						</th>
						<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
							Idea Closure Date
						</th>
						<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
							Comment Closure Date
						</th>
						<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
							Status
						</th>
						<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Action
                        </th>
					</tr>
				</thead>
				<tbody className="qa-closure-table-body divide-y divide-slate-100 bg-white">
					{periods.length === 0 ? (
						<tr>
							<td colSpan={6} className="px-4 py-10">
								<div className="qa-closure-empty-state flex flex-col items-center justify-center gap-1 text-center opacity-50">
									<FolderOpen className="h-8 w-8 text-slate-400" />
									<p className="text-sm font-medium text-slate-700">No closure periods available</p>
									<p className="text-sm text-slate-500">Closure periods will appear here once added</p>
								</div>
							</td>
						</tr>
					) : (
						periods.map((period) => (
							<tr key={period.id}>
								<td className="px-4 py-3 text-sm text-slate-700 text-center">{period.academicYear}</td>
								<td className="px-4 py-3 text-sm text-slate-700 text-center">{formatDate(period.startDate)}</td>
								<td className="px-4 py-3 text-sm text-slate-700 text-center">{formatDate(period.ideaClosureDate)}</td>
								<td className="px-4 py-3 text-sm text-slate-700 text-center">{formatDate(period.commentClosureDate)}</td>
								<td className="px-4 py-3 text-sm text-slate-700 text-center">
									<span
										className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-bold ${
											period.isActive
												? 'bg-emerald-100 text-emerald-700'
												: 'bg-slate-100 text-slate-600'
										}`}
									>
										{period.isActive ? 'Open' : 'Closed'}
									</span>
								</td>
								<td className="px-4 py-3 text-center text-sm text-slate-700 dark:text-[#000490]">
									<div className="flex items-center justify-center gap-2">
										{/* <button
											type="button"
											className="qa-closure-edit-button rounded-md bg-[#DADEFF] px-3 py-1 text-xs text-[#0e139e] transition hover:bg-blue-700 hover:text-white font-bold"
										>
											Edit
										</button> */}
										{onDownloadPeriod && (
											<button
												type="button"
												onClick={() => onDownloadPeriod(period)}
												disabled={downloadingPeriodId === period.id}
												className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
											>
												{downloadingPeriodId === period.id ? 'Downloading…' : 'Download'}
											</button>
										)}
									</div>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	)
}

export default ViewClosurePeriodTable
