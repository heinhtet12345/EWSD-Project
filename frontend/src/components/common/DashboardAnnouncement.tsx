import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type AnnouncementItem = {
  id?: string | number
  title: string
  description: string
  path: string
}

type DashboardAnnouncementProps = {
  items: AnnouncementItem[]
}

export default function DashboardAnnouncement({ items }: DashboardAnnouncementProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    setCurrentIndex(0)
    if (!items.length) return undefined

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % items.length)
    }, 8000)

    return () => window.clearInterval(interval)
  }, [items])

  if (!items.length) {
    return null
  }

  const active = items[currentIndex]

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition duration-200 dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => navigate(active.path)}
        className="group flex w-full flex-col gap-3 text-left transition duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:hover:bg-slate-800"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-sky-900/20 dark:text-sky-200">
            Announcement
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{currentIndex + 1}/{items.length}</span>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{active.title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{active.description}</p>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-sky-700 transition group-hover:text-sky-900 dark:text-sky-300 dark:group-hover:text-sky-200">
          <span>View details</span>
          <span aria-hidden="true">→</span>
        </div>
      </button>
    </div>
  )
}
