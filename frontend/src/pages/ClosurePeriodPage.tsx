import React, { useEffect, useMemo, useState } from 'react'
import { BreadCrumb } from 'primereact/breadcrumb'
import type { MenuItem } from 'primereact/menuitem'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, House } from 'lucide-react'
import axios from 'axios'

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
}

const CLOSURE_PERIOD_CREATE_PATH = '/api/closure-period/create/'
const CLOSURE_PERIOD_LIST_PATH = '/api/closure-period/list/'

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

const normalizeClosurePeriod = (item: ClosurePeriodApiItem, fallbackId: number): ClosurePeriod => ({
  id: item.id ?? item.closure_period_id ?? fallbackId,
  startDate: item.start_date ?? item.startDate ?? '',
  ideaClosureDate: item.idea_closure_date ?? item.ideaClosureDate ?? '',
  commentClosureDate: item.comment_closure_date ?? item.commentClosureDate ?? '',
  isActive: item.is_active ?? item.isActive ?? true,
  academicYear: item.academic_year ?? item.academicYear ?? '',
})

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
  const navigate = useNavigate()
  const location = useLocation()
  const dashboardPath = location.pathname.startsWith('/admin') ? '/admin' : '/qa_manager'
  const [isAdding, setIsAdding] = useState(false)
  const [periods, setPeriods] = useState<ClosurePeriod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')

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

  const breadcrumbItems = useMemo<MenuItem[]>(() => {
    if (isAdding) {
      return [
        {
          label: 'Closure Periods',
          command: () => setIsAdding(false),
          template: (item: MenuItem) => (
            <button
              type="button"
              onClick={() => item.command?.({ originalEvent: undefined as never, item })}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </button>
          ),
        },
        {
          label: 'Add Closure Period',
          template: (item: MenuItem) => (
            <span className="px-2 py-1 text-sm font-semibold text-slate-900">{item.label}</span>
          ),
        },
      ]
    }

    return [
      {
        label: 'Closure Periods',
        template: (item: MenuItem) => (
          <span className="px-2 py-1 text-sm font-semibold text-slate-900">{item.label}</span>
        ),
      },
    ]
  }, [isAdding])

  const breadcrumbHome = useMemo(
    () => ({
      label: 'Dashboard',
      command: () => navigate(dashboardPath),
      template: (item: MenuItem) => (
        <button
          type="button"
          onClick={() => item.command?.({ originalEvent: undefined as never, item })}
          className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <House className="h-4 w-4" />
          <span>{item.label}</span>
        </button>
      ),
    }),
    [dashboardPath, navigate],
  )

  const breadcrumbSeparator = <ChevronRight className="h-4 w-4 text-slate-400" />

  return (
    <section className="space-y-4">
      <BreadCrumb
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
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            Add Closure Period
          </button>
        )}
      </div>

      {isAdding && (
        <div className="w-full max-w-2xl space-y-3">
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

      {!isAdding && (
        <div className="space-y-2">
          {loadError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {loadError}
            </div>
          )}
          {isLoading && <p className="text-sm text-slate-500">Loading closure periods...</p>}
          <ViewClosurePeriodTable periods={periods} />
        </div>
      )}
    </section>
  )
}

export default ClosurePeriodPage
