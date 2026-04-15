import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FolderOpen } from 'lucide-react'
import { Column } from 'primereact/column'
import { DataTable } from 'primereact/datatable'

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
	const [itemsPerPage, setItemsPerPage] = useState(5)

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
	const skipSize = 5
	const nearbyPages = useMemo(
		() =>
			Array.from({ length: 4 }, (_, index) => safeCurrentPage - 4 + index).filter(
				(page) => page >= 1 && page < safeCurrentPage,
			),
		[safeCurrentPage],
	)

	const updateCurrentPage = (value: number | ((page: number) => number)) => {
		setPageSearchTerm(searchTerm)
		setCurrentPage((previousPage) => {
			const basePage = pageSearchTerm !== searchTerm ? 1 : previousPage
			const nextPage = typeof value === 'function' ? value(basePage) : value
			return Math.min(Math.max(1, nextPage), totalPages)
		})
	}

	const renderStatusBadge = (period: ClosurePeriod) => (
		<span
			className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold sm:px-4 sm:text-xs ${
				period.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
			}`}
		>
			{period.isActive ? 'Open' : 'Closed'}
		</span>
	)

	const renderActionButtons = (period: ClosurePeriod) => (
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
	)

	return (
		<div className="qa-closure-table overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			{showDownload && (
				<div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
					<div className="space-y-3 p-3 sm:hidden">
						{visiblePeriods.map((period) => (
							<article key={period.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Academic Year</p>
										<h3 className="mt-1 text-base font-semibold text-slate-900">{period.academicYear}</h3>
									</div>
									{renderStatusBadge(period)}
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
								<div className="mt-4 flex flex-col gap-2">{renderActionButtons(period)}</div>
							</article>
						))}
					</div>

					<div className="qa-closure-datatable hidden sm:block">
						<DataTable
							value={visiblePeriods}
							dataKey="id"
							responsiveLayout="scroll"
							emptyMessage="No closure periods available"
							rowHover
							showGridlines
							tableStyle={{ width: '100%', tableLayout: 'fixed' }}
						>
							<Column
								field="academicYear"
								header="Academic Year"
								body={(period: ClosurePeriod) => <div className="truncate">{period.academicYear}</div>}
								style={{ width: '20%' }}
							/>
							<Column
								field="startDate"
								header="Start Date"
								body={(period: ClosurePeriod) => formatDate(period.startDate)}
								style={{ width: '16%' }}
							/>
							<Column
								field="ideaClosureDate"
								header="Idea Closure Date"
								body={(period: ClosurePeriod) => formatDate(period.ideaClosureDate)}
								style={{ width: '16%' }}
							/>
							<Column
								field="commentClosureDate"
								header="Comment Closure Date"
								body={(period: ClosurePeriod) => formatDate(period.commentClosureDate)}
								style={{ width: '16%' }}
							/>
							<Column field="isActive" header="Status" body={renderStatusBadge} style={{ width: '12%' }} />
							<Column header="Action" body={renderActionButtons} style={{ width: '20%' }} />
						</DataTable>
					</div>
				</>
			)}
			{periods.length > 0 && (
				<div className="flex flex-col items-center gap-3 border-t border-slate-200 bg-white px-4 py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left">
					<p className="text-sm text-slate-600">
						Showing {startIndex + 1}-{Math.min(endIndex, periods.length)} of {periods.length}
					</p>
					<div className="flex items-center gap-2">
						<select
							value={itemsPerPage}
							onChange={(event) => {
								setPageSearchTerm(searchTerm)
								setCurrentPage(1)
								setItemsPerPage(Number(event.target.value))
							}}
							className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 sm:px-3 sm:py-1.5 sm:text-sm"
						>
							<option value={5}>5 / page</option>
							<option value={10}>10 / page</option>
							<option value={20}>20 / page</option>
							<option value={50}>50 / page</option>
						</select>
						<button
							type="button"
							onClick={() => updateCurrentPage((prev) => prev - skipSize)}
							disabled={safeCurrentPage === 1}
							className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
							aria-label={`Skip back ${skipSize} pages`}
							title={`Skip back ${skipSize} pages`}
						>
							<ChevronsLeft className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => updateCurrentPage((prev) => prev - 1)}
							disabled={safeCurrentPage === 1}
							className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
							aria-label="Previous page"
							title="Previous page"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						{nearbyPages.map((page) => (
							<button
								key={page}
								type="button"
								onClick={() => updateCurrentPage(page)}
								className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50 sm:px-3 sm:py-1.5 sm:text-sm"
							>
								{page}
							</button>
						))}
						<span className="text-xs text-slate-600 sm:text-sm">
							Page {safeCurrentPage} / {totalPages}
						</span>
						<button
							type="button"
							onClick={() => updateCurrentPage((prev) => prev + 1)}
							disabled={safeCurrentPage === totalPages}
							className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
							aria-label="Next page"
							title="Next page"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={() => updateCurrentPage((prev) => prev + skipSize)}
							disabled={safeCurrentPage === totalPages}
							className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:p-2 sm:text-sm"
							aria-label={`Skip forward ${skipSize} pages`}
							title={`Skip forward ${skipSize} pages`}
						>
							<ChevronsRight className="h-4 w-4" />
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default ViewClosurePeriodTable
