import React, { useEffect, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { ArrowLeft, X, Tag, Layers } from 'lucide-react'
import axios from 'axios'

type Category = {
  id: number
  name: string
  description: string
}

type AddIdeaSubmissionFormProps = {
  onCancel: () => void
  onSubmit: (data: any) => void
  onClose?: () => void
}

const AddIdeaSubmissionForm: React.FC<AddIdeaSubmissionFormProps> = ({ onCancel, onSubmit, onClose }) => {
  const [title, setTitle] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  const getAuthConfig = () => {
    try {
      const raw = localStorage.getItem('authUser')
      if (!raw) return undefined

      const parsed = JSON.parse(raw) as { token?: string }
      if (!parsed?.token) return undefined

      return {
        headers: {
          Authorization: `Bearer ${parsed.token}`,
        },
      }
    } catch {
      return undefined
    }
  }

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const authConfig = getAuthConfig()
        if (!authConfig) {
          setError('Please log in again to load categories.')
          return
        }

        const response = await axios.get('/api/categories/view/', authConfig)
        const data = response.data.results || response.data
        const categoryList = Array.isArray(data) ? data : []
        setCategories(categoryList.map((cat: any) => ({ 
          id: cat.category_id || cat.id, 
          name: cat.category_name || cat.name, 
          description: cat.category_desc || cat.description 
        })))
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.detail ||
          err?.response?.statusText ||
          err?.message ||
          'Failed to load categories'
        setError(message)
      }
    }
    fetchCategories()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null
    setFile(selectedFile)
    setFileName(selectedFile ? selectedFile.name : '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description || selectedCategories.length === 0 || !termsAccepted) {
      setError('Please fill all required fields and accept terms')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('idea_title', title)
      selectedCategories.forEach((category) => {
        formData.append('category_ids', String(category.id))
      })
      formData.append('idea_content', description)
      formData.append('anonymous_status', anonymous.toString())
      formData.append('terms_accepted', termsAccepted.toString())
      if (file) formData.append('documents', file)
      const authConfig = getAuthConfig()
      await axios.post('/api/ideas/post/', formData, {
        ...authConfig,
        headers: {
          ...(authConfig?.headers || {}),
          'Content-Type': 'multipart/form-data',
        },
      })
      onSubmit({ title, selectedCategories, description, file, anonymous })
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        err?.response?.statusText ||
        err?.message ||
        (typeof err?.response?.data === 'string' ? err.response.data : '') ||
        'Failed to submit idea'
      setError(backendMessage)
    } finally {
      setLoading(false)
    }
  }

  // Custom header template for the dropdown
  const panelHeaderTemplate = (
    <div className="p-3 border-b border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-2 text-slate-600">
        <Layers className="h-4 w-4" />
        <span className="text-sm font-medium">Select Categories</span>
      </div>
    </div>
  )

  // Custom footer template
  const panelFooterTemplate = (
    <div className="p-2 border-t border-slate-100 bg-slate-50/50">
      <p className="text-xs text-slate-500 text-center">
        {selectedCategories.length} category{selectedCategories.length !== 1 ? 'ies' : ''} selected
      </p>
    </div>
  )

  // Custom item template for category options
  const categoryOptionTemplate = (option: Category) => {
    return (
      <div className="flex items-start gap-3 p-2 hover:bg-blue-50/50 rounded-lg transition-colors">
        <div className="flex-shrink-0 mt-0.5">
          <Tag className="h-4 w-4 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-slate-900">{option.name}</div>
          {option.description && (
            <div className="text-xs text-slate-500 truncate">{option.description}</div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="qa-add-idea-form w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg border border-slate-200">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Submit New Idea</h2>
          <p className="text-sm text-slate-500 mt-1">Share your innovative ideas with the community.</p>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="qa-back-button group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Title Field */}
        <div className="space-y-2">
          <label htmlFor="idea-title" className="text-sm font-medium text-slate-700 flex items-center gap-1">
            Idea Title <span className="text-red-500">*</span>
          </label>
          <input
            id="idea-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., AI-Powered Customer Support Assistant"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 placeholder:text-slate-400"
            required
          />
          <p className="text-xs text-slate-500">Choose a clear, descriptive title for your idea</p>
        </div>

        {/* Enhanced Categories Field with Multi-tag support */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
            Categories <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MultiSelect
              value={selectedCategories}
              options={categories}
              onChange={(e) => setSelectedCategories(e.value)}
              optionLabel="name"
              placeholder="Select categories..."
              display="comma"
              className="w-full"
              panelClassName="qa-category-panel !rounded-xl !shadow-xl !border !border-slate-100 overflow-hidden"
              required
              maxSelectedLabels={1}
              selectedItemsLabel="{0} categories selected"
              itemTemplate={categoryOptionTemplate}
              panelHeaderTemplate={panelHeaderTemplate}
              panelFooterTemplate={panelFooterTemplate}
              showSelectAll={false}
              pt={{
                root: { 
                  className: '!border-slate-200 hover:!border-blue-400 !transition-all !duration-200 !rounded-lg !min-h-[3.2rem] !py-1 !px-2' 
                },
                trigger: { 
                  className: '!text-slate-400 hover:!text-blue-500 !transition-colors !duration-200' 
                },
                label: { 
                  className: '!py-1 !px-2' 
                },
                wrapper: { 
                  className: '!max-h-60' 
                }
              }}
            />
          </div>
          {selectedCategories.length > 0 && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">
                  {selectedCategories.length} categor{selectedCategories.length === 1 ? 'y' : 'ies'} selected
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) => prev.filter((item) => item.id !== category.id))
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:border-blue-300 hover:bg-blue-50"
                    title={`Remove ${category.name}`}
                  >
                    <Tag className="h-3 w-3" />
                    <span>{category.name}</span>
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">Select one or more categories that match your idea</p>
        </div>

        {/* Description Field */}
        <div className="space-y-2">
          <label htmlFor="idea-description" className="text-sm font-medium text-slate-700 flex items-center gap-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="idea-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your idea in detail. Include the problem it solves, how it works, and potential impact..."
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 placeholder:text-slate-400 resize-y min-h-[120px]"
            rows={4}
            required
          />
          <p className="text-xs text-slate-500">Be thorough in your description to help others understand your idea</p>
        </div>

        {/* File Upload Field */}
        <div className="space-y-2">
          <label htmlFor="supporting-file" className="text-sm font-medium text-slate-700">
            Supporting File <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <input
              id="supporting-file"
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => document.getElementById('supporting-file')?.click()}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="text-slate-400 group-hover:text-blue-500">📎</span>
                <span className="text-sm text-slate-600 group-hover:text-blue-600 truncate">
                  {fileName || 'Choose a file...'}
                </span>
              </span>
              <span className="text-xs text-slate-400 group-hover:text-blue-500">
                Browse
              </span>
            </button>
          </div>
          {file && (
            <div className="flex items-center justify-between mt-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-600 truncate max-w-[200px]">{fileName}</span>
              <button
                type="button"
                onClick={() => {
                  setFile(null)
                  setFileName('')
                }}
                className="text-xs text-red-600 hover:text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">Upload documents, images, or other files (Max: 10MB)</p>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex items-start gap-3 group hover:bg-white p-2 rounded-lg transition-colors">
            <input
              id="anonymous"
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <label htmlFor="anonymous" className="text-sm font-medium text-slate-700 cursor-pointer group-hover:text-blue-600">
                Submit anonymously
              </label>
              <p className="text-xs text-slate-500">Your identity will be hidden from other users</p>
            </div>
          </div>

          <div className="flex items-start gap-3 group hover:bg-white p-2 rounded-lg transition-colors">
            <input
              id="terms"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex flex-col">
              <label htmlFor="terms" className="text-sm font-medium text-slate-700 cursor-pointer group-hover:text-blue-600">
                I accept the terms and conditions <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500">Please read and accept our terms before submitting</p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shadow-sm hover:shadow"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Idea'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddIdeaSubmissionForm
