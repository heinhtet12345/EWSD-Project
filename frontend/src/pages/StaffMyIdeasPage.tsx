import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ChevronLeft, ChevronRight, MessageCircle, Paperclip, ThumbsDown, ThumbsUp } from 'lucide-react'

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
  documents: { doc_id: number; file: string; file_name: string; upload_time: string }[]
}

const StaffMyIdeasPage = () => {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedIdeaIds, setExpandedIdeaIds] = useState<Set<number>>(new Set())

  const itemsPerPage = 5

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

  const filteredIdeas = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return ideas.filter((idea) => {
      const matchesSearch =
        !search ||
        idea.idea_title.toLowerCase().includes(search) ||
        idea.idea_content.toLowerCase().includes(search)

      const matchesCategory =
        !selectedCategory || idea.category_ids.includes(Number(selectedCategory))

      return matchesSearch && matchesCategory
    })
  }, [ideas, searchTerm, selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredIdeas.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentIdeas = filteredIdeas.slice(startIndex, endIndex)

  const categoryOptions = useMemo(
    () =>
      Object.entries(categoryMap)
        .map(([id, name]) => ({ id: Number(id), name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [categoryMap],
  )

  const groupedByClosure = useMemo(() => {
    const groups: Record<string, Idea[]> = {}
    currentIdeas.forEach((idea) => {
      const key = idea.closure_period_academic_year || `Closure Period #${idea.closurePeriod}`
      if (!groups[key]) groups[key] = []
      groups[key].push(idea)
    })
    return groups
  }, [currentIdeas])

  useEffect(() => {
    fetchIdeas()
    fetchCategories()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory])

  const fetchIdeas = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/ideas/list/?mine=true', getAuthConfig())
      setIdeas(response.data.results || response.data)
      setCurrentPage(1)
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

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black">My Ideas</h1>
          <p className="text-sm text-slate-500">Only your submitted ideas, grouped by closure period.</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
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
          </div>
        </div>

        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {loading && <p className="text-sm text-slate-500">Loading ideas...</p>}

        {filteredIdeas.length === 0 && !loading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
            <p className="text-sm text-slate-500">No ideas match your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByClosure).map(([closureTitle, groupIdeas]) => (
              <div key={closureTitle} className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2">
                  <p className="text-sm font-semibold text-slate-700">{closureTitle}</p>
                </div>

                {groupIdeas.map((idea) => (
                  <article key={idea.idea_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">{idea.idea_title}</h2>
                        <p className="mt-1 text-xs text-slate-500">{new Date(idea.submit_datetime).toLocaleString()}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                        {idea.department_name || `Department #${idea.department}`}
                      </span>
                    </div>

                    {idea.category_ids.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {idea.category_ids.map((catId) => (
                          <span key={`${idea.idea_id}-${catId}`} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
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
                          <a key={doc.doc_id} href={resolveDocumentUrl(doc.file)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-800 hover:underline">
                            <Paperclip className="h-4 w-4" /> {doc.file_name}
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><ThumbsUp className="h-4 w-4" /> Upvote</button>
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><ThumbsDown className="h-4 w-4" /> Downvote</button>
                      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"><MessageCircle className="h-4 w-4" /> Comment</button>
                    </div>
                  </article>
                ))}
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
                  <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-700">Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, filteredIdeas.length)}</span> of <span className="font-medium">{filteredIdeas.length}</span> results</p>
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
      </div>
    </section>
  )
}

export default StaffMyIdeasPage
