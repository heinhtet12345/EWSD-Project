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

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

type IdeaCardItem = {
  idea_id: number
  idea_title: string
  department_name: string
  submit_datetime: string
  comment_count: number
  upvote_count: number
  anonymous_status: boolean
  author_name: string
}

type ReportRow = {
  report_id: number
  status: string
  target_type: string
  reason: string
  created_at: string
  idea_id: number | null
  idea_title: string
}

type CoordinatorDashboardResponse = {
  summary: {
    staff_count: number
    participating_staff_count: number
    department_idea_count: number
    active_idea_count: number
    in_review_report_count: number
  }
  profile: {
    display_name: string
    department_name: string
  }
  active_closure: {
    academic_year: string | null
    idea_closure_date: string | null
    comment_closure_date: string | null
  }
  charts: {
    ideas_by_period: Array<{
      label: string
      idea_count: number
    }>
    top_contributors: Array<{
      display_name: string
      idea_count: number
      activity_count: number
    }>
    engagement_mix: {
      ideas: number
      comments: number
      votes: number
    }
    moderation_status: Array<{
      label: string
      count: number
    }>
  }
  lists: {
    latest_department_ideas: IdeaCardItem[]
    popular_department_ideas: IdeaCardItem[]
    ideas_without_comments: IdeaCardItem[]
    reported_items: ReportRow[]
  }
}

const donutPalette = ['#2563eb', '#0f766e', '#d97706', '#dc2626', '#7c3aed']

const formatDate = (value?: string | null) => {
  if (!value) return 'Not available'
  return new Date(value).toLocaleDateString()
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
  </div>
)

const IdeaListCard = ({
  title,
  items,
  emptyLabel,
  onOpen,
}: {
  title: string
  items: IdeaCardItem[]
  emptyLabel: string
  onOpen: (ideaId: number) => void
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <div className="mt-4 space-y-3">
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        items.map((item) => (
          <button
            key={`${title}-${item.idea_id}`}
            type="button"
            onClick={() => onOpen(item.idea_id)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <p className="text-sm font-semibold text-slate-900">{item.idea_title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.author_name} | {formatDateTime(item.submit_datetime)}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Upvotes: {item.upvote_count} | Comments: {item.comment_count}
            </p>
          </button>
        ))
      )}
    </div>
  </div>
)

export default function QACoordDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<CoordinatorDashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await axios.get<CoordinatorDashboardResponse>('/api/analytics/qa-coordinator-dashboard/')
        setData(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const payload = err.response?.data as { message?: string; detail?: string } | undefined
          setError(payload?.message || payload?.detail || 'Failed to load dashboard.')
        } else {
          setError('Failed to load dashboard.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const ideasByPeriodData = useMemo(
    () => ({
      labels: (data?.charts.ideas_by_period || []).map((item) => item.label),
      datasets: [
        {
          label: 'Ideas',
          data: (data?.charts.ideas_by_period || []).map((item) => item.idea_count),
          backgroundColor: '#2563eb',
          borderRadius: 10,
          maxBarThickness: 52,
        },
      ],
    }),
    [data],
  )

  const topContributorsData = useMemo(
    () => ({
      labels: (data?.charts.top_contributors || []).map((item) => item.display_name),
      datasets: [
        {
          label: 'Activity',
          data: (data?.charts.top_contributors || []).map((item) => item.activity_count),
          backgroundColor: '#059669',
          borderRadius: 10,
          maxBarThickness: 42,
        },
      ],
    }),
    [data],
  )

  const engagementMixData = useMemo(
    () => ({
      labels: ['Ideas', 'Comments', 'Votes'],
      datasets: [
        {
          data: [
            data?.charts.engagement_mix.ideas || 0,
            data?.charts.engagement_mix.comments || 0,
            data?.charts.engagement_mix.votes || 0,
          ],
          backgroundColor: donutPalette.slice(0, 3),
          borderWidth: 0,
        },
      ],
    }),
    [data],
  )

  const moderationStatusData = useMemo(
    () => ({
      labels: (data?.charts.moderation_status || []).map((item) => item.label),
      datasets: [
        {
          data: (data?.charts.moderation_status || []).map((item) => item.count),
          backgroundColor: donutPalette,
          borderWidth: 0,
        },
      ],
    }),
    [data],
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
          grid: { display: false },
          ticks: { color: '#475569' },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0, color: '#64748b' },
          grid: { color: '#e2e8f0' },
        },
      },
    }),
    [],
  )

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      radius: '82%',
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
    navigate(`/qa_coordinator/my-department?highlightIdeaId=${ideaId}`)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">QA Coordinator Dashboard</h1>
          <p className="text-sm text-slate-500">
            {data?.profile.display_name ? `${data.profile.display_name} | ` : ''}
            {data?.profile.department_name || 'Review department activity, contributors, and moderation signals.'}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {isLoading && <p className="text-sm text-slate-500">Loading dashboard...</p>}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Department Staff" value={data.summary.staff_count} />
            <StatCard label="Participating Staff" value={data.summary.participating_staff_count} />
            <StatCard label="Department Ideas" value={data.summary.department_idea_count} />
            <StatCard label="Active Period Ideas" value={data.summary.active_idea_count} />
            <StatCard label="Reports In Review" value={data.summary.in_review_report_count} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Closure Period</h2>
                <p className="text-sm text-slate-500">
                  {data.active_closure.academic_year || 'There is no active closure period right now.'}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Idea closure date</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(data.active_closure.idea_closure_date)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Comment closure date</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatDate(data.active_closure.comment_closure_date)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Ideas By Closure Period</h2>
              <p className="text-sm text-slate-500">Department submission trend over recent periods</p>
              <div className="mt-5 h-[320px] overflow-hidden">
                <Bar data={ideasByPeriodData} options={barOptions} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Top Contributors</h2>
              <p className="text-sm text-slate-500">Most active staff members in your department</p>
              <div className="mt-5 h-[320px] overflow-hidden">
                <Bar data={topContributorsData} options={barOptions} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Engagement Mix</h2>
              <p className="text-sm text-slate-500">Overall department participation across content and reactions</p>
              <div className="mt-5 h-[300px] overflow-hidden">
                <Doughnut data={engagementMixData} options={doughnutOptions} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Moderation Status</h2>
              <p className="text-sm text-slate-500">Current report distribution for your department</p>
              <div className="mt-5 h-[300px] overflow-hidden">
                <Doughnut data={moderationStatusData} options={doughnutOptions} />
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <IdeaListCard
              title="Latest Department Ideas"
              items={data.lists.latest_department_ideas}
              emptyLabel="No department ideas found."
              onOpen={openIdea}
            />
            <IdeaListCard
              title="Popular Department Ideas"
              items={data.lists.popular_department_ideas}
              emptyLabel="No popular ideas to show yet."
              onOpen={openIdea}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <IdeaListCard
              title="Ideas Without Comments"
              items={data.lists.ideas_without_comments}
              emptyLabel="Every idea has comments right now."
              onOpen={openIdea}
            />

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Recent Reported Items</h2>
              <div className="mt-4 space-y-3">
                {data.lists.reported_items.length === 0 ? (
                  <p className="text-sm text-slate-500">There are no reports in this department right now.</p>
                ) : (
                  data.lists.reported_items.map((report) => (
                    <button
                      key={report.report_id}
                      type="button"
                      onClick={() => report.idea_id && openIdea(report.idea_id)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{report.idea_title || 'Reported content'}</p>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          {report.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {report.target_type} | {report.reason} | {formatDateTime(report.created_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
