import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useNavigate } from 'react-router-dom'

type DepartmentOption = {
  department_id: number
  department_name: string
}

type DepartmentChartItem = {
  department_name: string
  idea_count: number
  idea_percentage: number
  contributor_count: number
}

type IdeaCardItem = {
  idea_id: number
  idea_title: string
  department_name: string
  submit_datetime: string
  comment_count?: number
  upvote_count?: number
}

type DashboardResponse = {
  summary: {
    total_user_accounts: number
    total_idea_count: number
    department_count: number
  }
  filters: {
    department_options: DepartmentOption[]
    selected_department_id: number | null
    scope: 'all' | 'active'
  }
  charts: {
    ideas_by_department: DepartmentChartItem[]
    contributors_by_department: Array<{
      department_name: string
      contributor_count: number
    }>
  }
  ideas: {
    latest: IdeaCardItem[]
    popular: IdeaCardItem[]
  }
  exception_reports: {
    without_comments: IdeaCardItem[]
    anonymous: IdeaCardItem[]
  }
}

const getAuthConfig = () => {
  try {
    const raw = localStorage.getItem('authUser')
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { token?: string }
    if (!parsed?.token) return undefined
    return { headers: { Authorization: `Bearer ${parsed.token}` } }
  } catch {
    return undefined
  }
}

const donutPalette = ['#0f766e', '#2563eb', '#d97706', '#16a34a', '#db2777', '#7c3aed', '#ea580c']

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const formatRelativeDate = (value: string) => new Date(value).toLocaleString()

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
  </div>
)

const IdeaListCard = ({
  title,
  items,
  onOpenIdea,
}: {
  title: string
  items: IdeaCardItem[]
  onOpenIdea: (ideaId: number) => void
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <div className="mt-4 space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No ideas found.</p>
      ) : (
        items.map((item) => (
          <button
            key={`${title}-${item.idea_id}`}
            type="button"
            onClick={() => onOpenIdea(item.idea_id)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <p className="text-sm font-semibold text-slate-900">{item.idea_title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.department_name} | {formatRelativeDate(item.submit_datetime)}
            </p>
            {(typeof item.upvote_count === 'number' || typeof item.comment_count === 'number') && (
              <p className="mt-2 text-xs text-slate-600">
                Upvotes: {item.upvote_count ?? 0} | Comments: {item.comment_count ?? 0}
              </p>
            )}
          </button>
        ))
      )}
    </div>
  </div>
)

export default function QAManagerDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('all')
  const [scope, setScope] = useState<'all' | 'active'>('all')

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await axios.get<DashboardResponse>('/api/analytics/qa-manager-dashboard/', {
          ...getAuthConfig(),
          params: {
            department_id: departmentId !== 'all' ? departmentId : undefined,
            scope,
          },
        })
        setData(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const apiData = err.response?.data as { message?: string; detail?: string } | undefined
          setError(apiData?.message || apiData?.detail || 'Failed to load dashboard.')
        } else {
          setError('Failed to load dashboard.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [departmentId, scope])

  const departmentItems = data?.charts.ideas_by_department ?? []
  const contributorItems = data?.charts.contributors_by_department ?? []
  const ideaBarData = useMemo(
    () => ({
      labels: departmentItems.map((item) => item.department_name),
      datasets: [
        {
          label: 'Ideas',
          data: departmentItems.map((item) => item.idea_count),
          backgroundColor: '#2563eb',
          borderRadius: 8,
          maxBarThickness: 44,
        },
      ],
    }),
    [departmentItems],
  )

  const contributorBarData = useMemo(
    () => ({
      labels: contributorItems.map((item) => item.department_name),
      datasets: [
        {
          label: 'Contributors',
          data: contributorItems.map((item) => item.contributor_count),
          backgroundColor: '#059669',
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    }),
    [contributorItems],
  )

  const donutData = useMemo(
    () => ({
      labels: departmentItems.map((item) => item.department_name),
      datasets: [
        {
          data: departmentItems.map((item) => item.idea_count),
          backgroundColor: departmentItems.map((_, index) => donutPalette[index % donutPalette.length]),
          borderColor: '#ffffff',
          borderWidth: 3,
        },
      ],
    }),
    [departmentItems],
  )

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { color: '#475569' },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#64748b', precision: 0 },
          grid: { color: '#e2e8f0' },
        },
      },
    }),
    [],
  )

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            color: '#475569',
          },
        },
      },
    }),
    [],
  )

  const openIdea = (ideaId: number) => {
    navigate(`/qa_manager/all-ideas?highlightIdeaId=${ideaId}`)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">QA Manager Dashboard</h1>
          <p className="text-sm text-slate-500">Track department performance, active idea activity, and exception reports.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="all">All Department</option>
            {(data?.filters.department_options || []).map((department) => (
              <option key={department.department_id} value={department.department_id}>
                {department.department_name}
              </option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as 'all' | 'active')}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="all">All Closure Period</option>
            <option value="active">Active Only</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {isLoading && <p className="text-sm text-slate-500">Loading dashboard...</p>}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total User Account" value={data.summary.total_user_accounts} />
            <StatCard label="Total Idea Count" value={data.summary.total_idea_count} />
            <StatCard label="Department Count" value={data.summary.department_count} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Ideas By Department</h2>
              <div className="mt-5 h-[320px] min-w-0 overflow-hidden">
                <Bar data={ideaBarData} options={barOptions} />
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Idea Percentage By Department</h2>
              <div className="mt-5 h-[320px] min-w-0 overflow-hidden">
                <Doughnut data={donutData} options={donutOptions} />
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Contributors By Department</h2>
            <div className="mt-5 h-[340px] min-w-0 overflow-hidden">
              <Bar data={contributorBarData} options={barOptions} />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <IdeaListCard title="Latest Ideas By Department" items={data.ideas.latest} onOpenIdea={openIdea} />
            <IdeaListCard title="Popular Ideas By Department" items={data.ideas.popular} onOpenIdea={openIdea} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <IdeaListCard title="Ideas Without Comment" items={data.exception_reports.without_comments} onOpenIdea={openIdea} />
            <IdeaListCard title="Anonymous Ideas" items={data.exception_reports.anonymous} onOpenIdea={openIdea} />
          </div>
        </>
      )}
    </section>
  )
}
