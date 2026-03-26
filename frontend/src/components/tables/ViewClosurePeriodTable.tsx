import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react'

export type ClosurePeriod = {
	id: number
	startDate: string
	ideaClosureDate: string
	commentClosureDate: string
	isActive: boolean
	academicYear: string
	canExtendIdeaDeadline?: boolean
	canExtendCommentDeadline?: boolean
}

type ViewClosurePeriodTableProps = {
	periods: ClosurePeriod[]
	showDownload?: boolean
	isDownloading?: boolean
	onDownloadAll?: () => void
	onEditPeriod?: (period: ClosurePeriod) => void
	downloadingPeriodId?: number | null
	searchTerm?: string
	onSearchChange?: (value: string) => void
	onOpenDownloadOptions?: (period?: ClosurePeriod) => void
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
	isDownloading,
	onDownloadAll,
	onEditPeriod,
	downloadingPeriodId = null,
	searchTerm = '',
	onSearchChange,
	onOpenDownloadOptions,
}: ViewClosurePeriodTableProps) => {
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 5

	const totalPages = Math.max(1, Math.ceil(periods.length / itemsPerPage))
	const safeCurrentPage = Math.min(currentPage, totalPages)
	const startIndex = (safeCurrentPage - 1) * itemsPerPage
	const endIndex = startIndex + itemsPerPage
	const visiblePeriods = useMemo(
		() => periods.slice(startIndex, endIndex),
		[periods, startIndex, endIndex],
	)
	const visiblePageNumbers = useMemo(() => {
		const startPage = Math.max(1, safeCurrentPage - 2)
		const endPage = Math.min(totalPages, safeCurrentPage + 2)
		return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
	}, [safeCurrentPage, totalPages])

	useEffect(() => {
		setCurrentPage(1)
	}, [searchTerm])

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages)
		}
	}, [currentPage, totalPages])

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
						{isDownloading ? 'Preparing...' : 'Download All'}
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
						visiblePeriods.map((period) => (
							<tr key={period.id}>
								<td className="px-4 py-3 text-center text-sm text-slate-700">{period.academicYear}</td>
								<td className="px-4 py-3 text-center text-sm text-slate-700">{formatDate(period.startDate)}</td>
								<td className="px-4 py-3 text-center text-sm text-slate-700">{formatDate(period.ideaClosureDate)}</td>
								<td className="px-4 py-3 text-center text-sm text-slate-700">{formatDate(period.commentClosureDate)}</td>
								<td className="px-4 py-3 text-center text-sm text-slate-700">
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
								<td className="px-4 py-3 text-center text-sm text-slate-700">
									<div className="flex items-center justify-center gap-2">
										{onEditPeriod && (
											<button
												type="button"
												onClick={() => onEditPeriod(period)}
												disabled={!period.canExtendIdeaDeadline && !period.canExtendCommentDeadline}
												className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
											>
												Extend
											</button>
										)}
										{showDownload && (
											<button
												type="button"
												onClick={() => onOpenDownloadOptions?.(period)}
												disabled={downloadingPeriodId === period.id}
												className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
											>
												{downloadingPeriodId === period.id ? 'Downloading...' : 'Export Options'}
											</button>
										)}
									</div>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
			{periods.length > 0 && (
				<div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-1 justify-between sm:hidden">
						<button
							onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
							disabled={safeCurrentPage === 1}
							className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Previous
						</button>
						<button
							onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
							disabled={safeCurrentPage === totalPages}
							className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Next
						</button>
					</div>
					<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
						<p className="text-sm text-slate-700">
							Page <span className="font-medium">{safeCurrentPage}</span> of <span className="font-medium">{totalPages}</span> — Showing <span className="font-medium">{periods.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, periods.length)}</span> of <span className="font-medium">{periods.length}</span> results
						</p>
						<nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
							<button
								onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
								disabled={safeCurrentPage === 1}
								className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<span className="sr-only">Previous</span>
								<ChevronLeft className="h-5 w-5" />
							</button>
							{visiblePageNumbers.map((page) => (
								<button
									key={page}
									onClick={() => setCurrentPage(page)}
									className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
										page === safeCurrentPage
											? 'z-10 bg-indigo-600 text-white'
											: 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
									}`}
								>
									{page}
								</button>
							))}
							<button
								onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
								disabled={safeCurrentPage === totalPages}
								className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<span className="sr-only">Next</span>
								<ChevronRight className="h-5 w-5" />
							</button>
						</nav>
					</div>
				</div>
			)}
		</div>
	)
}

export default ViewClosurePeriodTable
