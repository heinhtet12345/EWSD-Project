import { useMemo, useState } from 'react'
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
	const [pageSearchTerm, setPageSearchTerm] = useState(searchTerm)
	const itemsPerPage = 5

	const totalPages = Math.max(1, Math.ceil(periods.length / itemsPerPage))
	const isSearchStale = pageSearchTerm !== searchTerm
	const effectiveCurrentPage = isSearchStale ? 1 : currentPage
	const safeCurrentPage = Math.min(effectiveCurrentPage, totalPages)
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

	const updateCurrentPage = (value: number | ((page: number) => number)) => {
		setPageSearchTerm(searchTerm)
		setCurrentPage((previousPage) => {
			const basePage = pageSearchTerm !== searchTerm ? 1 : previousPage
			const nextPage = typeof value === 'function' ? value(basePage) : value
			return Math.min(Math.max(1, nextPage), totalPages)
		})
	}

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
							onChange={(e) => {
								setPageSearchTerm(e.target.value)
								setCurrentPage(1)
								onSearchChange?.(e.target.value)
							}}
							placeholder="Search academic year..."
							className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
						/>
					</div>
					<button
						type="button"
						onClick={onDownloadAll}
						disabled={isDownloading}
						className="whitespace-nowrap rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:text-xs"
					>
						{isDownloading ? 'Preparing...' : 'Download All'}
					</button>
				</div>
			)}
			{periods.length === 0 ? (
				<div className="px-4 py-10">
					<div className="qa-closure-empty-state flex flex-col items-center justify-center gap-1 text-center opacity-50">
						<FolderOpen className="h-8 w-8 text-slate-400" />
						<p className="text-sm font-medium text-slate-700">No closure periods available</p>
						<p className="text-sm text-slate-500">Closure periods will appear here once added</p>
					</div>
				</div>
			) : (
				<>
					<div className="space-y-3 p-3 md:hidden">
						{visiblePeriods.map((period) => (
							<article key={period.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Academic Year</p>
										<h3 className="mt-1 text-base font-semibold text-slate-900">{period.academicYear}</h3>
									</div>
									<span
										className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
											period.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
										}`}
									>
										{period.isActive ? 'Open' : 'Closed'}
									</span>
								</div>
								<div className="mt-4 grid gap-3">
									<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start Date</p>
										<p className="mt-1 text-sm text-slate-700">{formatDate(period.startDate)}</p>
									</div>
									<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Idea Closure</p>
										<p className="mt-1 text-sm text-slate-700">{formatDate(period.ideaClosureDate)}</p>
									</div>
									<div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comment Closure</p>
										<p className="mt-1 text-sm text-slate-700">{formatDate(period.commentClosureDate)}</p>
									</div>
								</div>
								<div className="mt-4 flex flex-col gap-2">
									{onEditPeriod && (
										<button
											type="button"
											onClick={() => onEditPeriod(period)}
											disabled={!period.canExtendIdeaDeadline && !period.canExtendCommentDeadline}
											className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
										>
											Extend
										</button>
									)}
									{showDownload && (
										<button
											type="button"
											onClick={() => onOpenDownloadOptions?.(period)}
											disabled={downloadingPeriodId === period.id}
											className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
										>
											{downloadingPeriodId === period.id ? 'Downloading...' : 'Export Options'}
										</button>
									)}
								</div>
							</article>
						))}
					</div>

					<table className="hidden w-full table-fixed divide-y divide-slate-200 md:table">
				<thead className="qa-closure-table-head bg-slate-50">
					<tr>
						<th className="w-[34%] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:w-[20%] sm:text-xs">
							Academic Year
						</th>
						<th className="hidden w-[16%] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 lg:table-cell sm:text-xs">
							Start Date
						</th>
						<th className="hidden w-[16%] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:table-cell sm:text-xs">
							Idea Closure Date
						</th>
						<th className="hidden w-[16%] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 md:table-cell sm:text-xs">
							Comment Closure Date
						</th>
						<th className="w-[24%] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:w-[12%] sm:text-xs">
							Status
						</th>
						<th className="w-[42%] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600 sm:w-[20%] sm:text-xs">
							Action
						</th>
					</tr>
				</thead>
				<tbody className="qa-closure-table-body divide-y divide-slate-100 bg-white">
					{visiblePeriods.map((period) => (
							<tr key={period.id}>
								<td className="px-4 py-3 text-center text-xs text-slate-700 sm:text-sm">
									<div className="truncate">{period.academicYear}</div>
								</td>
								<td className="hidden px-4 py-3 text-center text-xs text-slate-700 lg:table-cell sm:text-sm">{formatDate(period.startDate)}</td>
								<td className="hidden px-4 py-3 text-center text-xs text-slate-700 md:table-cell sm:text-sm">{formatDate(period.ideaClosureDate)}</td>
								<td className="hidden px-4 py-3 text-center text-xs text-slate-700 md:table-cell sm:text-sm">{formatDate(period.commentClosureDate)}</td>
								<td className="px-4 py-3 text-center text-xs text-slate-700 sm:text-sm">
									<span
										className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold sm:px-4 sm:text-xs ${
											period.isActive
												? 'bg-emerald-100 text-emerald-700'
												: 'bg-slate-100 text-slate-600'
										}`}
									>
										{period.isActive ? 'Open' : 'Closed'}
									</span>
								</td>
								<td className="px-4 py-3 text-center text-xs text-slate-700 sm:text-sm">
									<div className="flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
										{onEditPeriod && (
											<button
												type="button"
												onClick={() => onEditPeriod(period)}
												disabled={!period.canExtendIdeaDeadline && !period.canExtendCommentDeadline}
												className="whitespace-nowrap rounded-md bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:py-1 sm:text-xs"
											>
												Extend
											</button>
										)}
										{showDownload && (
											<button
												type="button"
												onClick={() => onOpenDownloadOptions?.(period)}
												disabled={downloadingPeriodId === period.id}
												className="whitespace-nowrap rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:px-3 sm:py-1 sm:text-xs"
											>
												{downloadingPeriodId === period.id ? 'Downloading...' : 'Export Options'}
											</button>
										)}
									</div>
								</td>
							</tr>
						))}
				</tbody>
			</table>
				</>
			)}
			{periods.length > 0 && (
				<div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
					<div className="flex flex-1 justify-between sm:hidden">
						<button
							onClick={() => updateCurrentPage((prev) => prev - 1)}
							disabled={safeCurrentPage === 1}
							className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Previous
						</button>
						<button
							onClick={() => updateCurrentPage((prev) => prev + 1)}
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
								onClick={() => updateCurrentPage((prev) => prev - 1)}
								disabled={safeCurrentPage === 1}
								className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<span className="sr-only">Previous</span>
								<ChevronLeft className="h-5 w-5" />
							</button>
							{visiblePageNumbers.map((page) => (
								<button
									key={page}
									onClick={() => updateCurrentPage(page)}
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
								onClick={() => updateCurrentPage((prev) => prev + 1)}
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
