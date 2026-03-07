import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { MessageCircle, Paperclip, ThumbsDown, ThumbsUp } from 'lucide-react'
import AddIdeaSubmissionForm from '../forms/AddIdeaSubmissionForm'

type Idea = {
  idea_id: number
  idea_title: string
  idea_content: string
  anonymous_status: boolean
  category_ids: number[]
  terms_accepted: boolean
  submit_datetime: string
  user: number
  department: number
  closurePeriod: number
  documents: { doc_id: number; file: string; file_name: string; upload_time: string }[]
}

const StaffAllIdeaPage = () => {
  const [isAdding, setIsAdding] = useState(false)
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [categoryMap, setCategoryMap] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  useEffect(() => {
    if (!isAdding) {
      fetchIdeas()
      fetchCategories()
    }
  }, [isAdding])

  const fetchIdeas = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/ideas/list/', getAuthConfig())
      setIdeas(response.data.results || response.data)
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

  const handleAddIdea = () => {
    setIsAdding(true)
  }

  const handleFormSubmit = () => {
    setIsAdding(false)
    fetchIdeas()
  }

  const handleFormCancel = () => {
    setIsAdding(false)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black">All Ideas</h1>
          <p className="text-sm text-slate-500">View and submit ideas.</p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={handleAddIdea}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            Add New Idea
          </button>
        )}
      </div>

      {isAdding && (
        <div className="w-full max-w-2xl space-y-3">
          <AddIdeaSubmissionForm onCancel={handleFormCancel} onSubmit={handleFormSubmit} />
        </div>
      )}

      {!isAdding && (
        <div className="space-y-2">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {loading && <p className="text-sm text-slate-500">Loading ideas...</p>}
          {ideas.length === 0 && !loading ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-sm text-slate-500">No ideas available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ideas.map((idea) => (
                <article
                  key={idea.idea_id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{idea.idea_title}</h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {idea.anonymous_status ? 'Posted anonymously' : `Posted by User #${idea.user}`} •{' '}
                        {new Date(idea.submit_datetime).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                      Idea #{idea.idea_id}
                    </span>
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

                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{idea.idea_content}</p>

                  {idea.documents.length > 0 && (
                    <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      {idea.documents.map((doc) => (
                        <a
                          key={doc.doc_id}
                          href={doc.file}
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
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Upvote
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Downvote
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Comment
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default StaffAllIdeaPage
