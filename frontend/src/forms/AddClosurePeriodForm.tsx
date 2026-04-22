import React, { useState, type FormEvent } from 'react'

type ClosurePeriodPayload = {
  ideaSubmissibleEndDate: string
  commentableEndDate: string
  academicYear: string
}

type AddClosurePeriodFormProps = {
  onSubmit?: (payload: ClosurePeriodPayload) => void
  onCancel?: () => void
}

export const AddClosurePeriodForm = ({ onSubmit, onCancel }: AddClosurePeriodFormProps) => {
  const [ideaSubmissibleEndDate, setIdeaSubmissibleEndDate] = useState('')
  const [commentableEndDate, setCommentableEndDate] = useState('')
  const [academicYear, setAcademicYear] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    onSubmit?.({
      ideaSubmissibleEndDate,
      commentableEndDate,
      academicYear,
    })
  }

  return (
    <div className="qa-add-closure-form mx-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Add Closure Period</h2>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>

        <div className="space-y-2">
          <label htmlFor="academic-year" className="text-sm font-medium text-slate-700">
            Academic year
          </label>
          <input
            id="academic-year"
            type="text"
            placeholder="e.g. 2025/2026"
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="idea-end-date" className="text-sm font-medium text-slate-700">
            Idea submissible end date
          </label>
          <input
            id="idea-end-date"
            type="date"
            value={ideaSubmissibleEndDate}
            onChange={(event) => setIdeaSubmissibleEndDate(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="comment-end-date" className="text-sm font-medium text-slate-700">
            Commentable end date
          </label>
          <input
            id="comment-end-date"
            type="date"
            value={commentableEndDate}
            onChange={(event) => setCommentableEndDate(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
          >
            Create Period
          </button>
        </div>
      </form>
    </div>
  )
}
