import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import AddIdeaSubmissionForm from '../forms/AddIdeaSubmissionForm'
import { useRef } from 'react'
import ViewIdeaTable from '../components/tables/ViewIdeaTable'

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
  closure_period_idea_open?: boolean
  closure_period_comment_open?: boolean
  poster_username?: string | null
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

type ClosurePeriod = {
  id: number
  academic_year: string
  is_active: boolean
}

type DepartmentOption = {
  department_id: number
  department_name: string
}

type IdeaListResponse = {
  results?: Idea[]
  count?: number
  page?: number
  total_pages?: number
  department_options?: DepartmentOption[]
}

const StaffAllIdeaPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAdding, setIsAdding] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [closurePeriods] = useState<ClosurePeriod[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [openFilter, setOpenFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalIdeas, setTotalIdeas] = useState(0)
  const skipSize = 5;
  const [expandedIdeaIds, setExpandedIdeaIds] = useState<Set<number>>(new Set())
  const [isCheckingAccount, setIsCheckingAccount] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [openCommentIds, setOpenCommentIds] = useState<Set<number>>(new Set())
  const [commentsByIdea, setCommentsByIdea] = useState<Record<number, Comment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [commentAnon, setCommentAnon] = useState<Record<number, boolean>>({})
  const [reportTarget, setReportTarget] = useState<
    | { type: 'idea'; id: number }
    | { type: 'comment'; id: number }
    | null
  >(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [isSubmittingReport, setIsSubmittingReport] = useState(false)

  const effectivePageSize = pageSize === -1 ? Math.max(totalIdeas, 1) : pageSize;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalIdeas / pageSize));

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

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')

  const currentRole = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      if (!raw) return 'staff'
      const parsed = JSON.parse(raw) as { role?: string }
      return String(parsed.role || 'staff').trim().toLowerCase()
    } catch {
      return 'staff'
    }
  }, [])

  const isStaff = currentRole === 'staff'
  const canModerateView = currentRole === 'qa_manager' || currentRole === 'admin'
  const currentUserId = useMemo(() => {
    try {
      const raw = localStorage.getItem('authUser')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { user_id?: number | string; id?: number | string }
      const numericId = Number(parsed.user_id ?? parsed.id)
      return Number.isFinite(numericId) ? numericId : null
    } catch {
      return null
    }
  }, [])

  const highlightIdeaIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const rawId = params.get('highlightIdeaId')
    const parsed = Number(rawId)
    return Number.isFinite(parsed) ? parsed : null
  }, [location.search])

  const highlightCommentIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const rawId = params.get('highlightCommentId')
    const parsed = Number(rawId)
    return Number.isFinite(parsed) ? parsed : null
  }, [location.search])

  const [highlightIdeaId, setHighlightIdeaId] = useState<number | null>(null)
  const [highlightCommentId, setHighlightCommentId] = useState<number | null>(null)
  const [highlightElement, setHighlightElement] = useState<HTMLDivElement | null>(null)
  const [pendingHighlightIdeaId, setPendingHighlightIdeaId] = useState<number | null>(null)
  const ideaPageCacheRef = useRef<Record<string, IdeaListResponse>>({})
  const sectionTopRef = useRef<HTMLElement | null>(null)

  // Keep a local highlight state so we can clear it after a short duration.
  useEffect(() => {
    setHighlightIdeaId(highlightIdeaIdFromQuery)
    setPendingHighlightIdeaId(highlightIdeaIdFromQuery)
  }, [highlightIdeaIdFromQuery])

  useEffect(() => {
    setHighlightCommentId(highlightCommentIdFromQuery)
  }, [highlightCommentIdFromQuery])

  useEffect(() => {
    if (!highlightIdeaId) return

    const handle = window.setTimeout(() => {
      setHighlightIdeaId(null)
    }, 5000)

    return () => window.clearTimeout(handle)
  }, [highlightIdeaId])

  useEffect(() => {
    if (!highlightCommentId) return

    const handle = window.setTimeout(() => {
      setHighlightCommentId(null)
    }, 5000)

    return () => window.clearTimeout(handle)
  }, [highlightCommentId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [searchTerm])

  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalIdeas);
  // Exclude deleted_user ideas from search results, but include in full list and CSV export
  const isSearching = debouncedSearchTerm.length > 0
  const filteredIdeas = useMemo(() => {
    if (!isSearching) return ideas
    const term = debouncedSearchTerm.toLowerCase()
    return ideas.filter((idea) => {
      // Exclude if deleted_user
      const isDeletedUser = idea.user === 0 || idea.poster_username === 'deleted_user' || idea.poster_name === 'deleted_user'
      // Only exclude from search
      if (isDeletedUser) return false
      // Search title, content, poster_name, poster_username
      return (
        idea.idea_title.toLowerCase().includes(term) ||
        idea.idea_content.toLowerCase().includes(term) ||
        (idea.poster_name && idea.poster_name.toLowerCase().includes(term)) ||
        (idea.poster_username && idea.poster_username.toLowerCase().includes(term))
      )
    })
  }, [ideas, debouncedSearchTerm, isSearching])

  const currentIdeas = isSearching ? filteredIdeas : ideas

  const buildIdeasQueryParams = (page: number) => {
    let page_size = effectivePageSize;
    // If 'All' is selected, use a large number (e.g., 1000) instead of -1 or totalIdeas
    if (pageSize === -1) {
      page_size = 1000;
    }
    return {
      page,
      page_size,
      search: debouncedSearchTerm || undefined,
      category_id: selectedCategory || undefined,
      department_id: selectedDepartment || undefined,
      open_filter: openFilter,
      highlight_idea_id: pendingHighlightIdeaId || undefined,
    };
  };

  const buildIdeasCacheKey = (page: number) =>
    JSON.stringify({
      page,
      pageSize: effectivePageSize,
      search: debouncedSearchTerm || '',
      category: selectedCategory || '',
      department: selectedDepartment || '',
      open: openFilter,
      highlight: pendingHighlightIdeaId || '',
    });

  const categoryOptions = useMemo(
    () =>
      Object.entries(categoryMap)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoryMap],
  )

  const visiblePageNumbers = useMemo(() => {
    const startPage = Math.max(1, currentPage - 2)
    const endPage = Math.min(totalPages, currentPage + 2)
    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
  }, [currentPage, totalPages])

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

    // Ensure every known closure period is represented, even if it has no ideas yet.
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
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedCategory, selectedDepartment, openFilter, pageSize])

  // Ensure ideas are fetched immediately when pageSize changes
  useEffect(() => {
    fetchIdeas(1);
  }, [pageSize]);

  useEffect(() => {
    ideaPageCacheRef.current = {}
  }, [debouncedSearchTerm, selectedCategory, selectedDepartment, openFilter])

  useEffect(() => {
    if (isAdding) return
    fetchIdeas(currentPage)
  }, [isAdding, currentPage, debouncedSearchTerm, selectedCategory, selectedDepartment, openFilter, pendingHighlightIdeaId])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (!actionMessage) return
    const timeoutId = window.setTimeout(() => setActionMessage(''), 3500)
    return () => window.clearTimeout(timeoutId)
  }, [actionMessage])

  useEffect(() => {
    if (!highlightCommentId) return

    if (highlightIdeaId) {
      setOpenCommentIds((prev) => new Set([...prev, highlightIdeaId]))
      if (!commentsByIdea[highlightIdeaId]) {
        fetchComments(highlightIdeaId)
      }
    }
  }, [highlightCommentId, highlightIdeaId, commentsByIdea])

  useEffect(() => {
    if (!highlightIdeaId || !highlightElement) return

    // Ensure the element is rendered in the DOM before scrolling.
    requestAnimationFrame(() => {
      highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      highlightElement.focus({ preventScroll: true })
    })
  }, [highlightIdeaId, currentPage, highlightElement])

  useEffect(() => {
    if (loading) return

    sectionTopRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [currentPage, loading])

  useEffect(() => {
    if (loading || currentPage >= totalPages) return

    const nextPage = currentPage + 1
    const cacheKey = buildIdeasCacheKey(nextPage)
    if (ideaPageCacheRef.current[cacheKey]) return

    const authConfig = getAuthConfig()
    axios
      .get('/api/ideas/list/', {
        ...(authConfig || {}),
        params: buildIdeasQueryParams(nextPage),
      })
      .then((response) => {
        ideaPageCacheRef.current[cacheKey] = response.data as IdeaListResponse
      })
      .catch(() => {
        // Ignore background prefetch issues.
      })
  }, [currentPage, totalPages, loading, debouncedSearchTerm, selectedCategory, selectedDepartment, openFilter, pendingHighlightIdeaId])

  const fetchIdeas = async (page = 1) => {
    setLoading(true)
    setError('')
    try {
      const cacheKey = buildIdeasCacheKey(page)
      const cachedResponse = ideaPageCacheRef.current[cacheKey]
      if (cachedResponse) {
        const cachedResults = Array.isArray(cachedResponse.results) ? cachedResponse.results : []
        setIdeas(cachedResults)
        setTotalIdeas(typeof cachedResponse.count === 'number' ? cachedResponse.count : cachedResults.length)
        setCurrentPage(Math.max(1, Number(cachedResponse.page) || page))
        setDepartmentOptions(Array.isArray(cachedResponse.department_options) ? cachedResponse.department_options : [])
        if (pendingHighlightIdeaId && cachedResults.some((idea) => idea.idea_id === pendingHighlightIdeaId)) {
          setPendingHighlightIdeaId(null)
        }
        return
      }

      const authConfig = getAuthConfig()
      const response = await axios.get('/api/ideas/list/', {
        ...(authConfig || {}),
        params: buildIdeasQueryParams(page),
      })

      const data = response.data as IdeaListResponse
      ideaPageCacheRef.current[cacheKey] = data

      const results = Array.isArray(data.results) ? data.results : []
      setIdeas(results)
      console.log('Loaded ideas:', results.length, results);
      setTotalIdeas(typeof data.count === 'number' ? data.count : results.length)
      setCurrentPage(Math.max(1, Number(data.page) || page))
      setDepartmentOptions(Array.isArray(data.department_options) ? data.department_options : [])

      if (pendingHighlightIdeaId && results.some((idea) => idea.idea_id === pendingHighlightIdeaId)) {
        setPendingHighlightIdeaId(null)
      }
    } catch {
      setError('Failed to load ideas')
    } finally {
      setLoading(false)
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
        if (typeof id === 'number' && typeof name === 'string') {
          map[id] = name
        }
      })
      setCategoryMap(map)
    } catch {
      // Keep feed usable even if category lookup fails.
    }
  }

  const handleAddIdeaClick = async () => {
    setError('')
    setIsCheckingAccount(true)
    try {
      const response = await axios.get('/api/profile/me/', getAuthConfig())
      const activeStatus = Boolean(response.data?.active_status)
      if (!activeStatus) {
        setError('User cannot use this feature when account is disabled.')
        return
      }
      setIsAdding(true)
    } catch {
      setError('Unable to verify account status. Please try again.')
    } finally {
      setIsCheckingAccount(false)
    }
  }

  const resetReportModal = () => {
    setReportTarget(null)
    setReportReason('')
    setReportDetails('')
    setIsSubmittingReport(false)
  }

  const handleSubmitReport = async () => {
    if (!reportTarget || isSubmittingReport) return
    setError('')
    setActionMessage('')
    setIsSubmittingReport(true)
    try {
      const endpoint =
        reportTarget.type === 'idea'
          ? `/api/ideas/${reportTarget.id}/report/`
          : `/api/interaction/comment/${reportTarget.id}/report/`
      const response = await axios.post(
        endpoint,
        { reason: reportReason, details: reportDetails },
        getAuthConfig(),
      )
      setActionMessage(
        (response.data as { message?: string })?.message ||
          `${reportTarget.type === 'idea' ? 'Idea' : 'Comment'} reported successfully.`,
      )
      resetReportModal()
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; detail?: string } | undefined
        setError(
          data?.message ||
            data?.detail ||
            `Failed to report ${reportTarget.type === 'idea' ? 'idea' : 'comment'}.`,
        )
      } else {
        setError(`Failed to report ${reportTarget.type === 'idea' ? 'idea' : 'comment'}.`)
      }
    } finally {
      setIsSubmittingReport(false)
    }
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
      // ignore comment fetch errors
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
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string; message?: string } | undefined
        setError(data?.error || data?.message || 'Unable to vote right now.')
      } else {
        setError('Unable to vote right now.')
      }
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
        {
          cmt_content: content,
          anonymous_status: Boolean(commentAnon[ideaId]),
        },
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
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { error?: string; message?: string } | undefined
        setError(data?.error || data?.message || 'Unable to add comment right now.')
      } else {
        setError('Unable to add comment right now.')
      }
    }
  }

  const shouldShowDescriptionToggle = (content: string) =>
    content.length > 180 || content.includes('\n')

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

  const handleOpenUserRow = (userId: number) => {
    if (!canModerateView) return
    const basePath = currentRole === 'admin' ? '/admin/users' : '/qa_manager/users'
    navigate(`${basePath}?userId=${userId}`)
  }

  const handleHighlightRef = (element: HTMLDivElement | null) => {
  setHighlightElement(element);
  };

  return (
    <section ref={sectionTopRef} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">All Ideas</h1>
          <p className="text-sm text-slate-500">View ideas across departments.</p>
        </div>
        {!isAdding && isStaff && (
          <button
            type="button"
            onClick={handleAddIdeaClick}
            disabled={isCheckingAccount}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 sm:w-auto"
          >
            {isCheckingAccount ? 'Checking...' : 'Add New Idea'}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="w-full space-y-3">
          <AddIdeaSubmissionForm onCancel={() => setIsAdding(false)} onSubmit={() => { setIsAdding(false); fetchIdeas() }} />
        </div>
      )}

      {!isAdding && (
        <div className="space-y-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400"
              >
                <option value="">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department.department_id} value={String(department.department_id)}>
                    {department.department_name}
                  </option>
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
          <ViewIdeaTable
            loading={loading}
            ideas={ideas}
            hasActiveFilters={Boolean(searchTerm.trim() || selectedCategory || selectedDepartment || openFilter !== 'all')}
            groupedByClosure={groupedByClosure}
            highlightIdeaId={highlightIdeaId}
            highlightCommentId={highlightCommentId}
            handleHighlightRef={handleHighlightRef}
            canModerateView={canModerateView}
            isStaff={isStaff}
            currentUserId={currentUserId}
            categoryMap={categoryMap}
            expandedIdeaIds={expandedIdeaIds}
            shouldShowDescriptionToggle={shouldShowDescriptionToggle}
            toggleIdeaContent={toggleIdeaContent}
            resolveDocumentUrl={resolveDocumentUrl}
            onReportIdea={(ideaId) => {
              setReportTarget({ type: 'idea', id: ideaId })
              setReportReason('')
              setReportDetails('')
            }}
            onReportComment={(commentId) => {
              setReportTarget({ type: 'comment', id: commentId })
              setReportReason('')
              setReportDetails('')
            }}
            onOpenUserRow={handleOpenUserRow}
            onVote={handleVote}
            onToggleComments={toggleComments}
            openCommentIds={openCommentIds}
            commentsByIdea={commentsByIdea}
            commentDrafts={commentDrafts}
            onCommentDraftChange={(ideaId, value) =>
              setCommentDrafts((prev) => ({ ...prev, [ideaId]: value }))
            }
            commentAnon={commentAnon}
            onCommentAnonChange={(ideaId, checked) =>
              setCommentAnon((prev) => ({ ...prev, [ideaId]: checked }))
            }
            onSubmitComment={handleSubmitComment}
          />

          {/* Pagination Controls (AdminAnalyticsPage style) */}
          {!loading && totalIdeas > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:items-center sm:text-left">
              <p className="text-sm text-slate-600">
                Showing {startIndex + 1} to {endIndex} of {totalIdeas} ideas
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - skipSize))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Skip back ${skipSize} pages`}
                  title={`Skip back ${skipSize} pages`}
                >
                  {'<<'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous page"
                  title="Previous page"
                >
                  {'<'}
                </button>
                {Array.from({ length: 4 }, (_, index) => currentPage - 4 + index)
                  .filter((page) => page >= 1 && page < currentPage)
                  .map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {page}
                    </button>
                  ))}
                <span className="text-sm text-slate-600">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Next page"
                  title="Next page"
                >
                  {'>'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + skipSize))}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-slate-300 bg-white p-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Skip forward ${skipSize} pages`}
                  title={`Skip forward ${skipSize} pages`}
                >
                  {'>>'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {reportTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Report {reportTarget.type === 'idea' ? 'Idea' : 'Comment'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a reason for reporting this {reportTarget.type}.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</label>
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                >
                  <option value="">Select reason</option>
                  <option value="SWEARING">Swearing</option>
                  <option value="LIBEL">Libel</option>
                  <option value="SPAM">Spam</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Details (optional)</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400"
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetReportModal}
                disabled={isSubmittingReport}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={!reportReason || isSubmittingReport}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default StaffAllIdeaPage


