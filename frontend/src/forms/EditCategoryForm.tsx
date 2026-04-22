import React, { useState, type FormEvent } from 'react'
import { ArrowLeft, FileText, PencilLine, Tag } from 'lucide-react'

type EditCategoryFormProps = {
  initialCategory: { name: string; description: string }
  onCancel?: () => void
  onClose?: () => void
  onSubmit?: (category: { name: string; description: string }) => void
}

export const EditCategoryForm = ({
  initialCategory,
  onCancel,
  onSubmit,
}: EditCategoryFormProps) => {
  const [name, setName] = useState(initialCategory.name)
  const [description, setDescription] = useState(initialCategory.description)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit?.({ name: name.trim(), description: description.trim() })
  }

  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      {/* <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              <PencilLine className="h-3.5 w-3.5" />
              Edit Category
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">Update category details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Refine the category name and description without changing its ID order.
            </p>
          </div>
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center text-slate-500">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            <span>Back</span>
          </button>
        </div>
      </div> */}

      <form className="space-y-6 p-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="edit-category-name" className="text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-600" />
              Category Name
            </span>
          </label>
          <input
            id="edit-category-name"
            name="name"
            type="text"
            placeholder="e.g. Documentation"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition focus:border-purple-300 focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-category-description" className="text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Description
            </span>
          </label>
          <textarea
            id="edit-category-description"
            name="description"
            placeholder="Explain what this category should be used for"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-slate-900 outline-none transition focus:border-purple-300 focus:bg-white"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
