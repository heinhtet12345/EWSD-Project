import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MessageCircle, Paperclip, ShieldCheck, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react'

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
  closure_period_academic_year?: string
  poster_username?: string | null
  poster_name?: string | null
  closure_period_idea_open?: boolean
  closure_period_comment_open?: boolean
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
  idea: number
}

type IdeaListResponse = {
  results?: Idea[]
  count?: number
  page?: number
  total_pages?: number
}

export default function QAManagerDepartmentIdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [closurePeriods, setClosurePeriods] = useState<Array<{ id: number; academic_year: string; is_active: boolean }>>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [openFilter, setOpenFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedIdeaIds, setExpandedIdeaIds] = useState<Set<number>>(new Set())
  const [openCommentIds, setOpenCommentIds] = useState<Set<number>>(new Set())
  const [commentsByIdea, setCommentsByIdea] = useState<Record<number, Comment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [commentAnon, setCommentAnon] = useState<Record<number, boolean>>({})
  const [totalIdeas, setTotalIdeas] = useState(0)

  const location = useLocation()
  const highlightIdeaIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const rawId = params.get('highlightIdeaId')
    const parsed = Number(rawId)
    return Number.isFinite(parsed) ? parsed : null
  }, [location.search])

  const [highlightIdeaId, setHighlightIdeaId] = useState<number | null>(null)
  const highlightRef = React.useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setHighlightIdeaId(highlightIdeaIdFromQuery)
  }, [highlightIdeaIdFromQuery])

  useEffect(() => {
    if (!highlightIdeaId) return

    const timeoutId = window.setTimeout(() => setHighlightIdeaId(null), 5000)
    return () => window.clearTimeout(timeoutId)
  }, [highlightIdeaId])

  const itemsPerPage = 5

  const getStoredRole = () => {
    try {
      const raw = localStorage.getItem('authUser')
      if (!raw) return 'staff'
      const parsed = JSON.parse(raw) as { role?: string }
      return String(parsed?.role || 'staff').trim().toLowerCase()
    } catch {
      return 'staff'
    }
  }

  const canModerate = getStoredRole() !== 'qa_coordinator'

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

  const isAccountActive = () => {
    try {
      const raw = localStorage.getItem('authUser')
      if (!raw) return true
      const parsed = JSON.parse(raw) as { active_status?: boolean }
      return parsed.active_status !== false
    } catch {
      return true
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalIdeas / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + ideas.length
  const currentIdeas = ideas

  const categoryOptions = useMemo(
    () =>
      Object.entries(categoryMap)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoryMap],
  )

  const parseAcademicYearStart = (academicYear?: string) => {
    if (!academicYear) return 0
    const match = academicYear.match(/(\d{4})/)
    if (!match) return 0
    return Number(match[1])
  }

  const groupedByClosure = useMemo(() => {
    type Group = {
      title: string
      closureId: number
      ideas: Idea[]
      commentOpen: boolean
      ideaOpen: boolean
      sortKey: number
    }

    const groups: Record<number, Group> = {}

    // Ensure every known closure period is represented, even when it has no ideas yet.
    closurePeriods.forEach((cp) => {
      const title = cp.academic_year || `Closure Period #${cp.id}`
      const sortKey = parseAcademicYearStart(cp.academic_year)
      groups[cp.id] = {
        title,
        closureId: cp.id,
        ideas: [],
        commentOpen: Boolean(cp.is_active),
        ideaOpen: Boolean(cp.is_active),
        sortKey,
      }
    })

    currentIdeas.forEach((idea) => {
      const closureId = idea.closurePeriod
      const group = groups[closureId]
      const ideaOpen = Boolean(idea.closure_period_idea_open)
      const commentOpen = Boolean(idea.closure_period_comment_open)

      if (group) {
        group.ideas.push(idea)
        group.ideaOpen = group.ideaOpen || ideaOpen
        group.commentOpen = group.commentOpen || commentOpen
      } else {
        const title = idea.closure_period_academic_year || `Closure Period #${closureId}`
        const sortKey = parseAcademicYearStart(idea.closure_period_academic_year)
        groups[closureId] = {
          title,
          closureId,
          ideas: [idea],
          commentOpen,
          ideaOpen,
          sortKey,
        }
      }
    })

    return Object.values(groups).sort((a, b) => {
      // Prioritize closure periods where commenting is open, then where ideas are open.
      const aCommentOpen = a.commentOpen ? 1 : 0
      const bCommentOpen = b.commentOpen ? 1 : 0
      if (aCommentOpen !== bCommentOpen) return bCommentOpen - aCommentOpen

      const aIdeaOpen = a.ideaOpen ? 1 : 0
      const bIdeaOpen = b.ideaOpen ? 1 : 0
      if (aIdeaOpen !== bIdeaOpen) return bIdeaOpen - aIdeaOpen

      // For closed periods, show newest first (newer closed periods above older ones).
      const closed = !a.commentOpen && !a.ideaOpen
      const closedOther = !b.commentOpen && !b.ideaOpen
      if (closed && closedOther) return b.sortKey - a.sortKey

      return b.sortKey - a.sortKey
    })
  }, [currentIdeas, closurePeriods])

  useEffect(() => {
    fetchCategories()
    fetchClosurePeriods()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, openFilter])

  useEffect(() => {
    if (!highlightIdeaId || ideas.length === 0) return
    const highlightIndex = ideas.findIndex((idea) => idea.idea_id === highlightIdeaId)
    if (highlightIndex < 0) return
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [highlightIdeaId, ideas, currentPage])

  useEffect(() => {
    if (!highlightIdeaId) return
    const element = highlightRef.current
    if (!element) return
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightIdeaId, currentPage])

  useEffect(() => {
    if (!actionMessage) return
    const timeoutId = window.setTimeout(() => setActionMessage(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  useEffect(() => {
    fetchIdeas(currentPage)
  }, [currentPage, searchTerm, selectedCategory, openFilter])

  const fetchIdeas = async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/ideas/my-department/', {
        ...(getAuthConfig() || {}),
        params: {
          page,
          page_size: itemsPerPage,
          search: searchTerm.trim() || undefined,
          category_id: selectedCategory || undefined,
          open_filter: openFilter,
          highlight_idea_id: highlightIdeaId || undefined,
        },
      })
      const data = response.data as IdeaListResponse
      const results = Array.isArray(data.results) ? data.results : []
      setIdeas(results)
      setTotalIdeas(typeof data.count === 'number' ? data.count : results.length)
      setCurrentPage(Math.max(1, Number(data.page) || page))
    } catch {
      setError('Failed to load department ideas')
    } finally {
      setLoading(false)
    }
  }

  const fetchClosurePeriods = async () => {
    try {
      const response = await axios.get('/api/closure-period/', getAuthConfig())
      const data = Array.isArray(response.data) ? response.data : response.data?.results
      if (!Array.isArray(data)) return
      setClosurePeriods(data)
    } catch {
      // ignore
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories/view/', getAuthConfig())
      const data = Array.isArray(response.data) ? response.data : response.data?.results
      if (!Array.isArray(data)) return
      const map: Record<number, string> = {}
      data.forEach((item: any) => {
        const id = item.category_id ?? item.id
        const name = item.category_name ?? item.name
        if (typeof id === 'number' && typeof name === 'string') map[id] = name
      })
      setCategoryMap(map)
    } catch {
      // ignore
    }
  }

  const handleDisableUser = async (userId: number) => {
    const shouldDisable = window.confirm(`Disable account for User #${userId}?`)
    if (!shouldDisable) return

    setError('')
    setActionMessage('')
    try {
      const response = await axios.post(`/api/admin/users/${userId}/disable/`, {}, getAuthConfig())
      const message = (response.data as { message?: string })?.message || `User #${userId} disabled.`
      setActionMessage(message)
      await fetchIdeas()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined
        setError(data?.message || data?.detail || 'Failed to disable user.')
      } else {
        setError('Failed to disable user.')
      }
    }
  }

  const shouldShowDescriptionToggle = (content: string) =>
    content.length > 180 || content.includes('\n')

  const getModerationDisplayName = (name: string | null | undefined, fallback: string) =>
    name && name.trim().length > 0 ? name : fallback

  const toggleIdeaContent = (ideaId: number) => {
    setExpandedIdeaIds((prev) => {
      const next = new Set(prev)
      if (next.has(ideaId)) {
        next.delete(ideaId)
      } else {
        next.add(ideaId)
      }
      return next
    })
  }

  const resolveDocumentUrl = (url: string) => {
    if (!url) return '#'
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    if (url.startsWith('/')) return url
    return `/${url}`
  }

  const fetchComments = async (ideaId: number) => {
    try {
      const response = await axios.get(`/api/interaction/idea/${ideaId}/comments/`, getAuthConfig())
      const data = Array.isArray(response.data?.results) ? response.data.results : []
      setCommentsByIdea((prev) => ({ ...prev, [ideaId]: data }))
      if (typeof response.data?.comment_count === 'number') {
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.idea_id === ideaId ? { ...idea, comment_count: response.data.comment_count } : idea,
          ),
        )
      }
    } catch {
      // ignore
    }
  }

  const toggleComments = (ideaId: number) => {
    setOpenCommentIds((prev) => {
      const next = new Set(prev)
      if (next.has(ideaId)) {
        next.delete(ideaId)
      } else {
        next.add(ideaId)
        if (!commentsByIdea[ideaId]) {
          fetchComments(ideaId)
        }
      }
      return next
    })
  }

  const handleVote = async (ideaId: number, voteType: 'UP' | 'DOWN') => {
    if (!isAccountActive()) {
      setError('Your account is disabled. You cannot vote or comment.')
      return
    }
    const idea = ideas.find((item) => item.idea_id === ideaId)
    if (idea && idea.closure_period_comment_open === false) {
      setError('Commenting and voting are closed for this closure period.')
      return
    }
    try {
      const response = await axios.post(
        `/api/interaction/idea/${ideaId}/vote/`,
        { vote_type: voteType },
        getAuthConfig(),
      )
      const data = response.data as { upvote_count?: number; downvote_count?: number; user_vote?: 'UP' | 'DOWN' | null }
      setIdeas((prev) =>
        prev.map((idea) =>
          idea.idea_id === ideaId
            ? {
                ...idea,
                upvote_count: typeof data.upvote_count === 'number' ? data.upvote_count : idea.upvote_count,
                downvote_count: typeof data.downvote_count === 'number' ? data.downvote_count : idea.downvote_count,
                user_vote: data.user_vote ?? null,
              }
            : idea,
        ),
      )
    } catch {
      // ignore
    }
  }

  const handleSubmitComment = async (ideaId: number) => {
    if (!isAccountActive()) {
      setError('Your account is disabled. You cannot vote or comment.')
      return
    }
    const idea = ideas.find((item) => item.idea_id === ideaId)
    if (idea && idea.closure_period_comment_open === false) {
      setError('Commenting is closed for this closure period.')
      return
    }
    const content = (commentDrafts[ideaId] || '').trim()
    if (!content) return
    try {
      const response = await axios.post(
        `/api/interaction/idea/${ideaId}/comments/`,
        { cmt_content: content, anonymous_status: Boolean(commentAnon[ideaId]) },
        getAuthConfig(),
      )
      const data = response.data as { comment?: Comment; comment_count?: number }
      if (data.comment) {
        setCommentsByIdea((prev) => ({
          ...prev,
          [ideaId]: [...(prev[ideaId] || []), data.comment as Comment],
        }))
      }
      if (typeof data.comment_count === 'number') {
        setIdeas((prev) =>
          prev.map((idea) =>
            idea.idea_id === ideaId ? { ...idea, comment_count: data.comment_count } : idea,
          ),
        )
      }
      setCommentDrafts((prev) => ({ ...prev, [ideaId]: '' }))
      setCommentAnon((prev) => ({ ...prev, [ideaId]: false }))
    } catch {
      // ignore
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-black">My Department Ideas</h1>
        <p className="text-sm text-slate-500">Department-only listing with moderation actions.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search title or content..."
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          />
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={openFilter}
            onChange={(event) => setOpenFilter(event.target.value as 'all' | 'open' | 'closed')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
          >
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {actionMessage && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionMessage}</div>}
      {loading && <p className="text-sm text-slate-500">Loading ideas...</p>}

      {(!loading && ideas.length === 0 && (searchTerm.trim() || selectedCategory || openFilter !== 'all')) ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">No department ideas match your filters</p>
        </div>
      ) : (!loading && ideas.length === 0 && closurePeriods.length === 0) ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">No department ideas yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByClosure.map((group) => (
            <div key={group.title} className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">Closure Period: {group.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      group.commentOpen
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {group.commentOpen ? "Comments Open" : "Comments Closed"}
                  </span>
                </div>
              </div>

                  {group.ideas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                      No ideas yet for this closure period.
                    </div>
                  ) : (
                    group.ideas.map((idea) => {
                      const commentOpen = idea.closure_period_comment_open !== false
                      return (
                      <article
                        key={idea.idea_id}
                        ref={highlightIdeaId === idea.idea_id ? highlightRef : undefined}
                        className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                          highlightIdeaId === idea.idea_id
                            ? 'border-amber-300 ring-2 ring-amber-200'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h2 className="text-lg font-semibold text-slate-900">{idea.idea_title}</h2>
                            <p className="mt-1 text-xs text-slate-500">
                              {idea.anonymous_status
                                ? `Posted by ${getModerationDisplayName(idea.poster_name, `User #${idea.user}`)} (Anonymous)`
                                : idea.poster_name
                                  ? `Posted by ${idea.poster_name}`
                                  : `Posted by User #${idea.user}`} • {new Date(idea.submit_datetime).toLocaleString()}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                            {idea.department_name || `Department #${idea.department}`}
                          </span>
                        </div>

                        <p
                          className="whitespace-pre-wrap text-justify text-sm leading-6 text-slate-700"
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
                        <a key={doc.doc_id} href={resolveDocumentUrl(doc.file)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline">
                          <Paperclip className="h-4 w-4" /> {doc.file_name}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      disabled={!commentOpen}
                      onClick={() => handleVote(idea.idea_id, 'UP')}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        idea.user_vote === 'UP'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      } ${commentOpen ? '' : 'opacity-60 cursor-not-allowed'}`}
                    >
                      <ThumbsUp className="h-4 w-4" /> Upvote {idea.upvote_count ?? 0}
                    </button>
                    <button
                      type="button"
                      disabled={!commentOpen}
                      onClick={() => handleVote(idea.idea_id, 'DOWN')}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        idea.user_vote === 'DOWN'
                          ? 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      } ${commentOpen ? '' : 'opacity-60 cursor-not-allowed'}`}
                    >
                      <ThumbsDown className="h-4 w-4" /> Downvote {idea.downvote_count ?? 0}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(idea.idea_id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <MessageCircle className="h-4 w-4" /> Comment {idea.comment_count ?? 0}
                    </button>
                    {canModerate && (
                      <>
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"><ShieldCheck className="h-4 w-4" /> Approve</button>
                        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"><XCircle className="h-4 w-4" /> Reject</button>
                        <button type="button" onClick={() => handleDisableUser(idea.user)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"><XCircle className="h-4 w-4" /> Disable User</button>
                      </>
                    )}
                  </div>
                  {openCommentIds.has(idea.idea_id) && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="space-y-3">
                        {(commentsByIdea[idea.idea_id] || []).length === 0 ? (
                          <p className="text-sm text-slate-500">No comments yet.</p>
                        ) : (
                          (commentsByIdea[idea.idea_id] || []).map((comment) => (
                            <div key={comment.cmt_id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <p className="text-xs text-slate-500">
                                {comment.user}
                                {comment.anonymous_status ? ' (Anonymous)' : ''} |{' '}
                                {new Date(comment.cmt_datetime).toLocaleString()}
                              </p>
                              <p className="mt-1 text-sm text-slate-700">{comment.cmt_content}</p>
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
                          onChange={(event) =>
                            setCommentDrafts((prev) => ({ ...prev, [idea.idea_id]: event.target.value }))
                          }
                          placeholder="Write a comment..."
                          disabled={!commentOpen}
                          className={`w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 ${
                            commentOpen ? '' : 'cursor-not-allowed bg-slate-100 text-slate-400'
                          }`}
                          style={{ resize: 'none' }}
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(commentAnon[idea.idea_id])}
                              onChange={(event) =>
                                setCommentAnon((prev) => ({ ...prev, [idea.idea_id]: event.target.checked }))
                              }
                              disabled={!commentOpen}
                            />
                            Post anonymously
                          </label>
                          <button
                            type="button"
                            onClick={() => handleSubmitComment(idea.idea_id)}
                            disabled={!commentOpen}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${
                              commentOpen
                                ? 'bg-blue-700 hover:bg-blue-800'
                                : 'cursor-not-allowed bg-slate-400'
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
            }))}
            </div>
          ))}

          {totalIdeas > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <p className="text-sm text-slate-700">Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span> — Showing <span className="font-medium">{totalIdeas === 0 ? 0 : startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalIdeas)}</span> of <span className="font-medium">{totalIdeas}</span> results</p>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><span className="sr-only">Previous</span><ChevronLeft className="h-5 w-5" /></button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${page === currentPage ? 'z-10 bg-indigo-600 text-white' : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'}`}>{page}</button>
                  ))}
                  <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><span className="sr-only">Next</span><ChevronRight className="h-5 w-5" /></button>
                </nav>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
