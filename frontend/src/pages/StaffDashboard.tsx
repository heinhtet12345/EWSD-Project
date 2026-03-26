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

type StaffDashboardResponse = {
  summary: {
    my_idea_count: number
    my_comment_count: number
    my_vote_count: number
    department_idea_count: number
    department_contributor_count: number
  }
  profile: {
    display_name: string
    department_name: string
  }
  active_closure: {
    academic_year: string | null
    idea_closure_date: string | null
    comment_closure_date: string | null
    is_idea_open: boolean
    is_comment_open: boolean
  }
  charts: {
    idea_history: Array<{
      label: string
      idea_count: number
    }>
    engagement_mix: {
      ideas: number
      comments: number
      votes: number
    }
  }
  lists: {
    recent_my_ideas: IdeaCardItem[]
    popular_department_ideas: IdeaCardItem[]
    ideas_needing_comments: IdeaCardItem[]
  }
}

const doughnutColors = ['#2563eb', '#0f766e', '#d97706']

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
  emptyLabel,
  items,
  onOpen,
}: {
  title: string
  emptyLabel: string
  items: IdeaCardItem[]
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
              {item.department_name} | {formatDateTime(item.submit_datetime)}
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

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<StaffDashboardResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await axios.get<StaffDashboardResponse>('/api/analytics/staff-dashboard/')
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

  const historyBarData = useMemo(
    () => ({
      labels: (data?.charts.idea_history || []).map((item) => item.label),
      datasets: [
        {
          label: 'Ideas',
          data: (data?.charts.idea_history || []).map((item) => item.idea_count),
          backgroundColor: '#2563eb',
          borderRadius: 10,
          maxBarThickness: 52,
        },
      ],
    }),
    [data],
  )

  const engagementData = useMemo(
    () => ({
      labels: ['Ideas', 'Comments', 'Votes'],
      datasets: [
        {
          data: [
            data?.charts.engagement_mix.ideas || 0,
            data?.charts.engagement_mix.comments || 0,
            data?.charts.engagement_mix.votes || 0,
          ],
          backgroundColor: doughnutColors,
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
    navigate(`/staff/all-ideas?highlightIdeaId=${ideaId}`)
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h1>
          <p className="text-sm text-slate-500">
            {data?.profile.display_name ? `${data.profile.display_name} | ` : ''}
            {data?.profile.department_name || 'Track your contribution, current deadlines, and department activity.'}
          </p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {isLoading && <p className="text-sm text-slate-500">Loading dashboard...</p>}

      {!isLoading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="My Ideas" value={data.summary.my_idea_count} />
            <StatCard label="My Comments" value={data.summary.my_comment_count} />
            <StatCard label="My Votes" value={data.summary.my_vote_count} />
            <StatCard label="Department Ideas" value={data.summary.department_idea_count} />
            <StatCard label="Department Contributors" value={data.summary.department_contributor_count} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">My Idea History</h2>
              <p className="text-sm text-slate-500">Ideas you submitted across recent closure periods</p>
              <div className="mt-5 h-[320px] overflow-hidden">
                <Bar data={historyBarData} options={barOptions} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">My Engagement Mix</h2>
              <p className="text-sm text-slate-500">How you are participating in the platform</p>
              <div className="mt-5 h-[320px] overflow-hidden">
                <Doughnut data={engagementData} options={doughnutOptions} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Closure Period</h2>
                <p className="text-sm text-slate-500">
                  {data.active_closure.academic_year || 'There is no active closure period right now.'}
                </p>
              </div>
              {data.active_closure.academic_year && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Idea: {data.active_closure.is_idea_open ? 'Open' : 'Closed'} | Comment: {data.active_closure.is_comment_open ? 'Open' : 'Closed'}
                </div>
              )}
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

          <div className="grid gap-4 xl:grid-cols-2">
            <IdeaListCard
              title="My Latest Ideas"
              emptyLabel="You have not submitted any ideas yet."
              items={data.lists.recent_my_ideas}
              onOpen={openIdea}
            />
            <IdeaListCard
              title="Popular Ideas In My Department"
              emptyLabel="No department ideas available yet."
              items={data.lists.popular_department_ideas}
              onOpen={openIdea}
            />
          </div>

          <IdeaListCard
            title="Ideas Still Waiting For Comments"
            emptyLabel="Nothing is waiting for comments right now."
            items={data.lists.ideas_needing_comments}
            onOpen={openIdea}
          />
        </>
      )}
    </section>
  )
}
