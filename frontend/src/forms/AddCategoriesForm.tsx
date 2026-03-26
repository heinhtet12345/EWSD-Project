import React, { useState, type FormEvent } from 'react'
import { ArrowLeft } from 'lucide-react'

type AddCategoriesFromProps = {
  onCancel?: () => void
  onClose?: () => void
  onSubmit?: (category: { name: string; description: string }) => void
}

export const AddCategoriesFrom = ({ onCancel, onClose, onSubmit }: AddCategoriesFromProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.({ name: name.trim(), description: description.trim() })
  }

  return (
    <div className="qa-add-category-form mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Add Category</h2>
          <p className="text-sm text-slate-500">Create a new category name.</p>
        </div>
        <button
          type="button"
          aria-label="Back"
          onClick={onClose}
          className="qa-back-button group inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center text-slate-500 group-hover:text-blue-600">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          <span>Back</span>
        </button>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="category-name" className="text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="category-name"
            name="name"
            type="text"
            placeholder="e.g. Documentation"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category-description" className="text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="category-description"
            name="description"
            placeholder="Enter category description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  )
}
