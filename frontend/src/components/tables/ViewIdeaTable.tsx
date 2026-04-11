import React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  MessageCircle,
  Paperclip,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import UserAvatar from '../common/UserAvatar'

const formatDisplayTime = (value: string) =>
  new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

type Idea = {
  idea_id: number
  idea_title: string
  idea_content: string
  anonymous_status: boolean
  category_ids: number[]
  submit_datetime: string
  user: number
  department: number
  department_name?: string
  closurePeriod: number
  closure_period_comment_open?: boolean
  poster_name?: string | null
  poster_profile_image?: string | null
  upvote_count?: number
  downvote_count?: number
  comment_count?: number
  user_vote?: 'UP' | 'DOWN' | null
  documents: { doc_id: number; file: string; file_name: string; upload_time: string }[]
}

type Comment = {
  cmt_id: number
  cmt_content: string
  anonymous_status: boolean
  cmt_datetime: string
  user: string
  user_id?: number
  idea: number
}

type IdeaGroup = {
  title: string
  closureId: number
  ideas: Idea[]
  commentOpen: boolean
  ideaOpen: boolean
  sortKey: number
}

type ViewIdeaTableProps = {
  loading: boolean
  ideas: Idea[]
  hasActiveFilters: boolean
  groupedByClosure: IdeaGroup[]
  highlightIdeaId: number | null
  highlightCommentId: number | null
  handleHighlightRef: (element: HTMLDivElement | null) => void
  canModerateView: boolean
  isStaff: boolean
  currentUserId: number | null
  categoryMap: Record<number, string>
  expandedIdeaIds: Set<number>
  shouldShowDescriptionToggle: (content: string) => boolean
  toggleIdeaContent: (ideaId: number) => void
  resolveDocumentUrl: (url: string) => string
  onReportIdea: (ideaId: number) => void
  onReportComment: (commentId: number) => void
  onOpenUserRow: (userId: number) => void
  onVote: (ideaId: number, voteType: 'UP' | 'DOWN') => void
  onToggleComments: (ideaId: number) => void
  openCommentIds: Set<number>
  commentsByIdea: Record<number, Comment[]>
  commentDrafts: Record<number, string>
  onCommentDraftChange: (ideaId: number, value: string) => void
  commentAnon: Record<number, boolean>
  onCommentAnonChange: (ideaId: number, checked: boolean) => void
  onSubmitComment: (ideaId: number) => void
}

export default function ViewIdeaTable({
  loading,
  ideas,
  hasActiveFilters,
  groupedByClosure,
  highlightIdeaId,
  highlightCommentId,
  handleHighlightRef,
  canModerateView,
  isStaff,
  currentUserId,
  categoryMap,
  expandedIdeaIds,
  shouldShowDescriptionToggle,
  toggleIdeaContent,
  resolveDocumentUrl,
  onReportIdea,
  onReportComment,
  onOpenUserRow,
  onVote,
  onToggleComments,
  openCommentIds,
  commentsByIdea,
  commentDrafts,
  onCommentDraftChange,
  commentAnon,
  onCommentAnonChange,
  onSubmitComment,
}: ViewIdeaTableProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading ideas...</p>
  }

  if (ideas.length === 0 && hasActiveFilters) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">No ideas match your filters</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groupedByClosure.map((group) => (
        <div key={group.closureId} className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">Closure Period: {group.title}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  group.commentOpen
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {group.commentOpen ? 'Comments Open' : 'Comments Closed'}
              </span>
            </div>
          </div>

          {group.ideas.map((idea) => {
            const commentOpen = idea.closure_period_comment_open !== false

            return (
              <article
                key={idea.idea_id}
                ref={String(highlightIdeaId) === String(idea.idea_id) ? handleHighlightRef : undefined}
                tabIndex={-1}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5 ${
                  String(highlightIdeaId) === String(idea.idea_id)
                    ? 'border-amber-300 ring-2 ring-amber-200 bg-amber-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="mb-3 flex gap-3">
                  <UserAvatar
                    imageUrl={idea.poster_profile_image}
                    name={idea.poster_name || (idea.anonymous_status ? 'Anonymous' : `User ${idea.user}`)}
                    className="mt-0.5 h-11 w-11 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-semibold text-slate-900 sm:text-lg">
                        {idea.idea_title}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {idea.poster_name ? (
                          <>
                            Posted by{' '}
                            {canModerateView ? (
                              <button
                                type="button"
                                onClick={() => onOpenUserRow(idea.user)}
                                className="font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                              >
                                {idea.poster_name}
                              </button>
                            ) : (
                              idea.poster_name
                            )}
                          </>
                        ) : idea.anonymous_status ? (
                          'Posted anonymously'
                        ) : (
                          `Posted by User #${idea.user}`
                        )}{' '}
                        | {formatDisplayTime(idea.submit_datetime)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-full shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                        {idea.department_name || `Department #${idea.department}`}
                      </span>
                      {isStaff && idea.user !== currentUserId && (
                        <button
                          type="button"
                          onClick={() => onReportIdea(idea.idea_id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          <Flag className="h-4 w-4" /> Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {idea.category_ids.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {idea.category_ids.map((catId) => (
                      <span
                        key={`${idea.idea_id}-${catId}`}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                      >
                        {categoryMap[catId] || `Category #${catId}`}
                      </span>
                    ))}
                  </div>
                )}

                <p
                  className="whitespace-pre-wrap text-sm leading-6 text-slate-700"
                  style={
                    expandedIdeaIds.has(idea.idea_id)
                      ? undefined
                      : {
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }
                  }
                >
                  {idea.idea_content}
                </p>
                {shouldShowDescriptionToggle(idea.idea_content) && (
                  <button
                    type="button"
                    onClick={() => toggleIdeaContent(idea.idea_id)}
                    className="mt-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    {expandedIdeaIds.has(idea.idea_id) ? 'Show less' : 'See more'}
                  </button>
                )}

                {idea.documents.length > 0 && (
                  <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    {idea.documents.map((doc) => (
                      <a
                        key={doc.doc_id}
                        href={resolveDocumentUrl(doc.file)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline"
                      >
                        <Paperclip className="h-4 w-4" />
                        {doc.file_name}
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    disabled={!commentOpen}
                    onClick={() => onVote(idea.idea_id, 'UP')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      idea.user_vote === 'UP'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${commentOpen ? '' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <ThumbsUp className="h-4 w-4" /> Upvote {idea.upvote_count ?? 0}
                  </button>
                  <button
                    type="button"
                    disabled={!commentOpen}
                    onClick={() => onVote(idea.idea_id, 'DOWN')}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      idea.user_vote === 'DOWN'
                        ? 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${commentOpen ? '' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <ThumbsDown className="h-4 w-4" /> Downvote {idea.downvote_count ?? 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleComments(idea.idea_id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <MessageCircle className="h-4 w-4" /> Comment {idea.comment_count ?? 0}
                  </button>
                  {canModerateView && (
                    <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                      Moderation View
                    </span>
                  )}
                </div>

                {openCommentIds.has(idea.idea_id) && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="space-y-3">
                      {(commentsByIdea[idea.idea_id] || []).length === 0 ? (
                        <p className="text-sm text-slate-500">No comments yet.</p>
                      ) : (
                        (commentsByIdea[idea.idea_id] || []).map((comment) => (
                          <div
                            key={comment.cmt_id}
                            className={`rounded-lg border bg-white px-3 py-2 ${
                              Number(highlightCommentId) === Number(comment.cmt_id)
                                ? 'border-amber-300 ring-2 ring-amber-200'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500">
                                  {comment.anonymous_status ? 'Anonymous' : comment.user} |{' '}
                                  {formatDisplayTime(comment.cmt_datetime)}
                                </p>
                                <p className="mt-1 break-words text-sm text-slate-700">
                                  {comment.cmt_content}
                                </p>
                              </div>
                              {isStaff && comment.user_id !== currentUserId && (
                                <button
                                  type="button"
                                  onClick={() => onReportComment(comment.cmt_id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                                >
                                  <Flag className="h-3.5 w-3.5" /> Report
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      {!commentOpen && (
                        <p className="text-xs font-semibold text-rose-600">
                          Commenting is closed for this closure period.
                        </p>
                      )}
                      <textarea
                        rows={2}
                        value={commentDrafts[idea.idea_id] || ''}
                        onChange={(event) => onCommentDraftChange(idea.idea_id, event.target.value)}
                        placeholder="Write a comment..."
                        disabled={!commentOpen}
                        className={`w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 ${
                          commentOpen ? '' : 'cursor-not-allowed bg-slate-100 text-slate-400'
                        }`}
                        style={{ resize: 'none' }}
                      />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={Boolean(commentAnon[idea.idea_id])}
                            onChange={(event) => onCommentAnonChange(idea.idea_id, event.target.checked)}
                            disabled={!commentOpen}
                          />
                          Post anonymously
                        </label>
                        <button
                          type="button"
                          onClick={() => onSubmitComment(idea.idea_id)}
                          disabled={!commentOpen}
                          className={`w-full rounded-lg px-3 py-2 text-xs font-semibold text-white sm:w-auto ${
                            commentOpen ? 'bg-blue-700 hover:bg-blue-800' : 'cursor-not-allowed bg-slate-400'
                          }`}
                        >
                          Add Comment
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ))}

      {/* Pagination controls removed; now handled in StaffAllIdeaPage */}
    </div>
  )
}
