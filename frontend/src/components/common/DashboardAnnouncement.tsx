import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Announcement = {
  id?: string | number
  title: string
  description: string
  path?: string
  badge?: string
  meta?: string
  ctaLabel?: string
}

type DashboardAnnouncementProps = {
  items: Announcement[]
}

export default function DashboardAnnouncement({ items }: DashboardAnnouncementProps) {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!items.length) return undefined

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % items.length)
    }, 8000)

    return () => window.clearInterval(interval)
  }, [items])

  if (!items.length) {
    return null
  }

  const safeIndex = currentIndex % items.length
  const active = items[safeIndex]
  const isClickable = Boolean(active.path)
  const progressWidth = `${((safeIndex + 1) / items.length) * 100}%`

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700 shadow-sm dark:border-sky-700/70 dark:bg-slate-800/90 dark:text-sky-100">
              Highlights
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
              {active.badge || 'Announcement'}
            </span>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-sky-100 dark:bg-slate-700/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300 dark:from-sky-400 dark:to-cyan-300"
              style={{ width: progressWidth }}
            />
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-800/90 dark:text-slate-300">
          {safeIndex + 1}/{items.length}
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{active.title}</h2>
        {active.meta && (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{active.meta}</p>
        )}
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{active.description}</p>
      </div>

      {isClickable && (
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-700 transition group-hover:bg-sky-200 group-hover:text-sky-900 dark:bg-sky-500/15 dark:text-sky-200 dark:group-hover:bg-sky-500/25 dark:group-hover:text-white">
          <span>{active.ctaLabel || 'View details'}</span>
          <span aria-hidden="true">{'->'}</span>
        </div>
      )}
    </>
  )

  return (
    <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-1 shadow-sm transition duration-200 dark:border-sky-900/60 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-sky-950/80 dark:shadow-[0_12px_40px_rgba(2,6,23,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.1),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.08),transparent_24%)]" />
      {isClickable ? (
        <button
          type="button"
          onClick={() => navigate(active.path!)}
          className="group relative flex w-full flex-col gap-4 rounded-[calc(1.5rem-4px)] bg-white/88 p-5 text-left backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-900/78 dark:hover:bg-slate-900/78 dark:hover:shadow-[0_16px_36px_rgba(2,6,23,0.55)]"
        >
          {content}
        </button>
      ) : (
        <div className="relative flex w-full flex-col gap-4 rounded-[calc(1.5rem-4px)] bg-white/88 p-5 text-left backdrop-blur-sm dark:bg-slate-900/78">
          {content}
        </div>
      )}
    </div>
  )
}
