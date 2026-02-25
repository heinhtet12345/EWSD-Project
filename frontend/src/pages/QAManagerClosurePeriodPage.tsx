import React, { useMemo, useState } from 'react'
import { BreadCrumb } from 'primereact/breadcrumb'
import type { MenuItem } from 'primereact/menuitem'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, House } from 'lucide-react'

import { AddClosurePeriodForm } from '../forms/AddClosurePeriodForm'
import ViewClosurePeriodTable, { type ClosurePeriod } from '../components/tables/ViewClosurePeriodTable'

const mockPeriods: ClosurePeriod[] = [
  {
    id: 1,
    startDate: '2026-01-10',
    ideaClosureDate: '2026-02-10',
    commentClosureDate: '2026-02-20',
    isActive: true,
    academicYear: '2025/2026',
  },
  {
    id: 2,
    startDate: '2025-09-05',
    ideaClosureDate: '2025-10-05',
    commentClosureDate: '2025-10-15',
    isActive: false,
    academicYear: '2024/2025',
  },
]

const QAManagerClosurePeriodPage = () => {
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)

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
      command: () => navigate('/qa_manager'),
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
    [navigate],
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
        <AddClosurePeriodForm
          onCancel={() => {
            setIsAdding(false)
          }}
          onSubmit={() => {
            setIsAdding(false)
          }}
        />
      )}

      {!isAdding && (
        <ViewClosurePeriodTable periods={mockPeriods} />
      )}
    </section>
  )
}

export default QAManagerClosurePeriodPage