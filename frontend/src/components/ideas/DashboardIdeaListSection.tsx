import { ArrowUpRight, MessageCircle, ThumbsUp } from 'lucide-react'

type DashboardIdeaItem = {
  idea_id: number
  idea_title: string
  department_name?: string
  submit_datetime: string
  comment_count?: number
  upvote_count?: number
  anonymous_status?: boolean
  author_name?: string
}

type DashboardIdeaListSectionProps = {
  title: string
  emptyLabel: string
  items: DashboardIdeaItem[]
  onOpen: (ideaId: number) => void
  metaLabel?: (item: DashboardIdeaItem) => string | null
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

export default function DashboardIdeaListSection({
  title,
  emptyLabel,
  items,
  onOpen,
  metaLabel,
}: DashboardIdeaListSectionProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
            {emptyLabel}
          </div>
        ) : (
          items.map((item) => {
            const authorLabel = metaLabel?.(item)
            return (
              <button
                key={`${title}-${item.idea_id}`}
                type="button"
                onClick={() => onOpen(item.idea_id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-slate-50 hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-slate-900 sm:text-base">
                      {item.idea_title}
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                      {authorLabel ? `${authorLabel} | ` : ''}
                      {formatDateTime(item.submit_datetime)}
                    </p>
                  </div>
                  {item.department_name && (
                    <span className="max-w-full shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 sm:text-xs">
                      {item.department_name}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 sm:text-xs">
                    <ThumbsUp className="h-4 w-4" /> Upvote {item.upvote_count ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 sm:text-xs">
                    <MessageCircle className="h-4 w-4" /> Comment {item.comment_count ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 sm:text-xs">
                    <ArrowUpRight className="h-4 w-4" /> Open Idea
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
