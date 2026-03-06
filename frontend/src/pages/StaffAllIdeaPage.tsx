import React, { useEffect, useState } from 'react'
import axios from 'axios'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdding) {
      fetchIdeas()
    }
  }, [isAdding])

  const fetchIdeas = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/ideas/list', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')!).token : ''}`,
        },
      })
      setIdeas(response.data.results || response.data)
    } catch {
      setError('Failed to load ideas')
    } finally {
      setLoading(false)
    }
  }

  const handleAddIdea = () => {
    setIsAdding(true)
  }

  const handleFormSubmit = () => {
    setIsAdding(false)
    // Optionally refetch ideas
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Submitted At</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Anonymous</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ideas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center">
                      <p className="text-sm text-slate-500">No ideas available</p>
                    </td>
                  </tr>
                ) : (
                  ideas.map((idea) => (
                    <tr key={idea.idea_id}>
                      <td className="px-4 py-3 text-sm text-slate-700">{idea.idea_id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{idea.idea_title}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{new Date(idea.submit_datetime).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{idea.anonymous_status ? 'Yes' : 'No'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}

export default StaffAllIdeaPage
