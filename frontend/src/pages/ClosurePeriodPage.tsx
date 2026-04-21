import React, { useEffect, useMemo, useState } from 'react'
import { BreadCrumb } from 'primereact/breadcrumb'
import type { MenuItem } from 'primereact/menuitem'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, House } from 'lucide-react'
import axios from 'axios'

import Modal from '../components/common/Modal'
import { AddClosurePeriodForm } from '../forms/AddClosurePeriodForm'
import ViewClosurePeriodTable, { type ClosurePeriod } from '../components/tables/ViewClosurePeriodTable'

type ClosurePeriodApiItem = {
  id?: number
  closure_period_id?: number
  start_date?: string
  idea_closure_date?: string
  comment_closure_date?: string
  is_active?: boolean
  academic_year?: string
  startDate?: string
  ideaClosureDate?: string
  commentClosureDate?: string
  isActive?: boolean
  academicYear?: string
  can_extend_idea_deadline?: boolean
  can_extend_comment_deadline?: boolean
  canExtendIdeaDeadline?: boolean
  canExtendCommentDeadline?: boolean
}

const CLOSURE_PERIOD_CREATE_PATH = '/api/closure-period/create/'
const CLOSURE_PERIOD_LIST_PATH = '/api/closure-period/list/'
const DOWNLOAD_ALL_DATA_PATH = '/api/ideas/download/all/'
type ExportType = 'all' | 'report' | 'documents'

const getAuthConfig = () => {
  try {
    const raw = localStorage.getItem('authUser')
    if (!raw) {
      return undefined
    }

    const parsed = JSON.parse(raw) as { token?: string }
    if (!parsed?.token) {
      return undefined
    }

    return {
      headers: {
        Authorization: `Bearer ${parsed.token}`,
      },
    }
  } catch {
    return undefined
  }
}

const normalizeClosurePeriod = (item: ClosurePeriodApiItem, fallbackId: number): ClosurePeriod => {
  const startDate = item.start_date ?? item.startDate ?? ''
  const ideaClosureDate = item.idea_closure_date ?? item.ideaClosureDate ?? ''
  const commentClosureDate = item.comment_closure_date ?? item.commentClosureDate ?? ''

  const fallbackActive = (() => {
    if (!commentClosureDate) return true
    const [year, month, day] = commentClosureDate.split('-').map((part) => Number(part))
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return true
    const closeDate = new Date(year, month - 1, day)
    const now = new Date()
    return now.getTime() < closeDate.getTime()
  })()

  return {
    id: item.id ?? item.closure_period_id ?? fallbackId,
    startDate,
    ideaClosureDate,
    commentClosureDate,
    isActive: item.is_active ?? item.isActive ?? fallbackActive,
    academicYear: item.academic_year ?? item.academicYear ?? '',
    canExtendIdeaDeadline: item.can_extend_idea_deadline ?? item.canExtendIdeaDeadline ?? fallbackActive,
    canExtendCommentDeadline: item.can_extend_comment_deadline ?? item.canExtendCommentDeadline ?? fallbackActive,
  }
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback

  const data = error.response?.data
  if (!data) return error.message || fallback

  if (typeof data === 'string') return data
  if (typeof data.message === 'string') return data.message
  if (typeof data.detail === 'string') return data.detail

  const fieldErrors = Object.entries(data as Record<string, unknown>)
    .map(([field, value]) => {
      if (Array.isArray(value)) return `${field}: ${value.join(', ')}`
      if (typeof value === 'string') return `${field}: ${value}`
      return null
    })
    .filter(Boolean) as string[]

  if (fieldErrors.length > 0) return fieldErrors.join(' | ')

  return error.response?.statusText || error.message || fallback
}

const ClosurePeriodPage = () => {
  // const navigate = useNavigate()
  const location = useLocation()
  // const dashboardPath = location.pathname.startsWith('/admin') ? '/admin' : '/qa_manager'
  const canManageClosurePeriods =
    location.pathname.startsWith('/qa_manager') || location.pathname.startsWith('/admin')
  const [isAdding, setIsAdding] = useState(false)
  const [periods, setPeriods] = useState<ClosurePeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadingPeriodId, setDownloadingPeriodId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [downloadTarget, setDownloadTarget] = useState<ClosurePeriod | null | undefined>(undefined)
  const [selectedExportType, setSelectedExportType] = useState<ExportType>('all')
  const [editingPeriod, setEditingPeriod] = useState<ClosurePeriod | null>(null)
  const [editIdeaClosureDate, setEditIdeaClosureDate] = useState('')
  const [editCommentClosureDate, setEditCommentClosureDate] = useState('')
  const [isUpdatingPeriod, setIsUpdatingPeriod] = useState(false)

  const hasEditableIdeaChange = Boolean(
    editingPeriod?.canExtendIdeaDeadline &&
      editIdeaClosureDate &&
      editIdeaClosureDate !== editingPeriod?.ideaClosureDate,
  )
  const hasEditableCommentChange = Boolean(
    editingPeriod?.canExtendCommentDeadline &&
      editCommentClosureDate &&
      editCommentClosureDate !== editingPeriod?.commentClosureDate,
  )
  const hasPendingEditChanges = hasEditableIdeaChange || hasEditableCommentChange

  useEffect(() => {
    let isMounted = true

    const fetchPeriods = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const response = await axios.get(CLOSURE_PERIOD_LIST_PATH, getAuthConfig())
        if (!isMounted) {
          return
        }

        const data = Array.isArray(response.data) ? response.data : response.data?.results
        if (Array.isArray(data)) {
          setPeriods(data.map((item, index) => normalizeClosurePeriod(item, Date.now() + index)))
        } else {
          setPeriods([])
        }
      } catch (error) {
        if (!isMounted) {
          return
        }
        if (axios.isAxiosError(error)) {
          setLoadError(
            (error.response?.data as { message?: string })?.message ||
              error.response?.statusText ||
              'Unable to load closure periods.',
          )
        } else {
          setLoadError('Unable to load closure periods.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPeriods()
    return () => {
      isMounted = false
    }
  }, [])

  const handleAddClosurePeriod = async (payload: {
    ideaSubmissibleEndDate: string
    commentableEndDate: string
    academicYear: string
  }) => {
    setFormError('')
    setIsSaving(true)

    try {
      const response = await axios.post(
        CLOSURE_PERIOD_CREATE_PATH,
        {
          idea_closure_date: payload.ideaSubmissibleEndDate,
          comment_closure_date: payload.commentableEndDate,
          academic_year: payload.academicYear,
        },
        getAuthConfig(),
      )

      const created = normalizeClosurePeriod(response.data ?? {}, Date.now())
      created.ideaClosureDate = created.ideaClosureDate || payload.ideaSubmissibleEndDate
      created.commentClosureDate = created.commentClosureDate || payload.commentableEndDate
      created.academicYear = created.academicYear || payload.academicYear

      setPeriods((prev) => [created, ...prev])
      setIsAdding(false)
    } catch (error) {
      setFormError(extractApiErrorMessage(error, 'Unable to create closure period.'))
    } finally {
      setIsSaving(false)
    }
  }


  const handleDownloadAll = async (exportType: ExportType) => {
    setDownloadError('')
    setIsDownloading(true)
    setDownloadingPeriodId(null)
    try {
      const response = await axios.get(DOWNLOAD_ALL_DATA_PATH, {
        ...getAuthConfig(),
        responseType: 'blob',
        params: { export_type: exportType },
      })

      const blob = new Blob([response.data], {
        type: exportType === 'report' ? 'text/csv' : 'application/zip',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers?.['content-disposition'] as string | undefined
      const match = disposition?.match(/filename="?([^";]+)"?/)
      link.href = url
      const fallbackName =
        exportType === 'report'
          ? 'all_closure_periods_report.csv'
          : exportType === 'documents'
            ? 'all_closure_periods_documents.zip'
            : 'Data_Report.zip'
      link.download = match?.[1] || fallbackName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(extractApiErrorMessage(error, 'Unable to download data.'))
    } finally {
      setIsDownloading(false)
    }
  }

  const openEditPeriod = (period: ClosurePeriod) => {
    setFormError('')
    setEditingPeriod(period)
    setEditIdeaClosureDate(period.ideaClosureDate)
    setEditCommentClosureDate(period.commentClosureDate)
  }

  const handleUpdateClosurePeriod = async () => {
    if (!editingPeriod) return

    setFormError('')
    const payload: Record<string, string> = {}
    if (hasEditableIdeaChange) {
        payload.idea_closure_date = editIdeaClosureDate
    }
    if (hasEditableCommentChange) {
        payload.comment_closure_date = editCommentClosureDate
    }

    if (Object.keys(payload).length === 0) {
      setFormError('Change at least one deadline before saving.')
      return
    }

    setIsUpdatingPeriod(true)
    try {

      const response = await axios.patch(
        `/api/closure-period/${editingPeriod.id}/update/`,
        payload,
        getAuthConfig(),
      )

      const updated = normalizeClosurePeriod(response.data ?? {}, editingPeriod.id)
      setPeriods((prev) => prev.map((period) => (period.id === editingPeriod.id ? updated : period)))
      setEditingPeriod(null)
    } catch (error) {
      setFormError(extractApiErrorMessage(error, 'Unable to update closure period.'))
    } finally {
      setIsUpdatingPeriod(false)
    }
  }

  const handleDownloadPeriod = async (period: ClosurePeriod, exportType: ExportType) => {
    setDownloadError('')
    setIsDownloading(true)
    setDownloadingPeriodId(period.id)
    try {
      const response = await axios.get(DOWNLOAD_ALL_DATA_PATH, {
        ...getAuthConfig(),
        responseType: 'blob',
        params: { closure_period_id: period.id, export_type: exportType },
      })

      const blob = new Blob([response.data], {
        type: exportType === 'report' ? 'text/csv' : 'application/zip',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const disposition = response.headers?.['content-disposition'] as string | undefined
      const match = disposition?.match(/filename="?([^";]+)"?/)
      link.href = url
      const safeYear = period.academicYear?.trim().replace(/\s+/g, '_') || `closure_${period.id}`
      const fallbackName =
        exportType === 'report'
          ? `${safeYear}_report.csv`
          : exportType === 'documents'
            ? `${safeYear}_documents.zip`
            : `${safeYear}_all.zip`
      link.download = match?.[1] || fallbackName
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(extractApiErrorMessage(error, 'Unable to download data.'))
    } finally {
      setIsDownloading(false)
      setDownloadingPeriodId(null)
    }
  }

  const handleConfirmDownload = async (exportType: ExportType) => {
    const target = downloadTarget
    setDownloadTarget(undefined)
    if (target) {
      await handleDownloadPeriod(target, exportType)
      return
    }
    await handleDownloadAll(exportType)
  }

  const openDownloadOptions = (period?: ClosurePeriod) => {
    setSelectedExportType('all')
    setDownloadTarget(period ?? null)
  }

  const filteredPeriods = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return periods
    return periods.filter((p) => {
      return (
        p.academicYear.toLowerCase().includes(term) ||
        p.startDate.toLowerCase().includes(term) ||
        p.ideaClosureDate.toLowerCase().includes(term) ||
        p.commentClosureDate.toLowerCase().includes(term)
      )
    })
  }, [periods, searchTerm])

  return (
    <section className="space-y-4">
      {/* <BreadCrumb
        model={breadcrumbItems}
        home={breadcrumbHome}
        separatorIcon={breadcrumbSeparator}
        className="qa-closure-breadcrumb rounded-xl border border-slate-200 bg-white px-1 py-1 shadow-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="qa-closure-title text-2xl font-semibold text-black">Closure Periods</h1>
          <p className="qa-closure-subtitle text-sm text-slate-500">Manage submission and comment windows.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
        >
          Add Closure Period
        </button>
      </div> */}

      <Modal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        maxWidthClassName="max-w-3xl"
      >
        {isAdding && (
          <div className="space-y-3">
            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}
            <AddClosurePeriodForm
              onCancel={() => {
                setIsAdding(false)
              }}
              onSubmit={handleAddClosurePeriod}
            />
            {isSaving && <p className="text-sm text-slate-500">Saving closure period...</p>}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(editingPeriod)}
        onClose={() => setEditingPeriod(null)}
        maxWidthClassName="max-w-2xl"
      >
        {editingPeriod && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Extend Closure Period</h2>
            <p className="mt-2 text-sm text-slate-600">
              You can only extend dates that have not passed yet for {editingPeriod.academicYear}.
            </p>
            {formError && (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {formError}
              </div>
            )}
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Idea closure date</label>
                <input
                  type="date"
                  value={editIdeaClosureDate}
                  onChange={(event) => setEditIdeaClosureDate(event.target.value)}
                  disabled={!editingPeriod.canExtendIdeaDeadline}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
                {!editingPeriod.canExtendIdeaDeadline && (
                  <p className="text-xs font-medium text-rose-600">Idea closure date has already passed and cannot be changed.</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Comment closure date</label>
                <input
                  type="date"
                  value={editCommentClosureDate}
                  onChange={(event) => setEditCommentClosureDate(event.target.value)}
                  disabled={!editingPeriod.canExtendCommentDeadline}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
                {!editingPeriod.canExtendCommentDeadline && (
                  <p className="text-xs font-medium text-rose-600">Comment closure date has already passed and cannot be changed.</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateClosurePeriod}
                disabled={isUpdatingPeriod || !hasPendingEditChanges}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdatingPeriod ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={downloadTarget !== undefined}
        onClose={() => setDownloadTarget(undefined)}
        maxWidthClassName="max-w-lg"
      >
        {downloadTarget !== undefined && (
          <div className="qa-export-options-modal rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900">Choose Export Type</h2>
            <p className="mt-2 text-sm text-slate-600">
              {downloadTarget
                ? `Select what to export for ${downloadTarget.academicYear}.`
                : 'Select what to export for all closure periods.'}
            </p>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => setSelectedExportType('report')}
                className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:focus-visible:ring-blue-500 ${
                  selectedExportType === 'report'
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500/50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">Report only</span>
                <span className="block text-xs text-slate-500">Download the CSV report without attached documents.</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedExportType('documents')}
                className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:focus-visible:ring-blue-500 ${
                  selectedExportType === 'documents'
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500/50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">Documents only</span>
                <span className="block text-xs text-slate-500">Download only the uploaded document ZIP content.</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedExportType('all')}
                className={`rounded-xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:focus-visible:ring-blue-500 ${
                  selectedExportType === 'all'
                    ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-500/10 dark:ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-500/50 dark:hover:bg-slate-800'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">All</span>
                <span className="block text-xs text-slate-500">Download the full export with report and documents.</span>
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDownloadTarget(undefined)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDownload(selectedExportType)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 dark:focus-visible:ring-emerald-500"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </Modal>

      <div className="space-y-2">
        {loadError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}
        {isLoading && <p className="text-sm text-slate-500">Loading closure periods...</p>}
        {downloadError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {downloadError}
          </div>
        )}
        {!isLoading && (
          <ViewClosurePeriodTable
            periods={filteredPeriods}
            showDownload={canManageClosurePeriods}
            showCreate={canManageClosurePeriods}
            onDownloadAll={() => handleDownloadAll('all')}
            onCreateClosurePeriod={() => setIsAdding(true)}
            onEditPeriod={canManageClosurePeriods ? openEditPeriod : undefined}
            isDownloading={isDownloading}
            downloadingPeriodId={downloadingPeriodId}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onOpenDownloadOptions={openDownloadOptions}
          />
        )}
      </div>
    </section>
  )
}

export default ClosurePeriodPage
