import React, { useEffect, useRef, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { ArrowLeft, Check, ChevronDown, EyeOff, FileText, Layers, ShieldCheck, Tag, User, X } from 'lucide-react'
import axios from 'axios'
import Modal from '../components/common/Modal'
import { IDEA_TERMS_SECTIONS, IDEA_TERMS_TITLE } from '../content/ideaTermsAndConditions'

type Category = {
  id: number
  name: string
  description: string
}

const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.odt',
  '.csv',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
]

const DOCUMENT_FILE_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(',')

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
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const [hasReachedTermsEnd, setHasReachedTermsEnd] = useState(false)
  const isSubmittingRef = useRef(false)
  const termsContentRef = useRef<HTMLDivElement | null>(null)

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
    if (selectedFile) {
      const dotIndex = selectedFile.name.lastIndexOf('.')
      const extension = dotIndex >= 0 ? selectedFile.name.slice(dotIndex).toLowerCase() : ''
      if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
        setFile(null)
        setFileName('')
        setError(`Only document files are allowed: ${ALLOWED_DOCUMENT_EXTENSIONS.join(', ')}`)
        e.target.value = ''
        return
      }
    }
    setError('')
    setFile(selectedFile)
    setFileName(selectedFile ? selectedFile.name : '')
  }

  const handleOpenTerms = () => {
    setHasReachedTermsEnd(false)
    setIsTermsModalOpen(true)
  }

  const handleTermsScroll = () => {
    const element = termsContentRef.current
    if (!element || hasReachedTermsEnd) return
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight
    if (remaining <= 12) {
      setHasReachedTermsEnd(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent duplicate submissions if the user clicks quickly multiple times.
    if (isSubmittingRef.current) return
    if (!title || !description || selectedCategories.length === 0 || !termsAccepted) {
      setError('Please fill all required fields and accept terms')
      return
    }

    isSubmittingRef.current = true
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
      isSubmittingRef.current = false
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
    <>
    <div className="qa-add-idea-form w-full rounded-2xl bg-white p-6 shadow-lg border border-slate-200">
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
              accept={DOCUMENT_FILE_ACCEPT}
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
          <p className="text-xs text-slate-500">Upload document files only, such as PDF, Word, Excel, PowerPoint, CSV, or TXT (Max: 10MB)</p>
        </div>

        {/* Checkbox Options */}
        <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="group rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
            <div className="flex items-start justify-start gap-3">
              <button
                id="anonymous"
                type="button"
                role="switch"
                aria-checked={anonymous}
                aria-label="Submit anonymously"
                onClick={() => setAnonymous((value) => !value)}
                className={`relative mt-0.5 inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-all duration-300 ease-out focus:outline-none focus:ring-4 ${
                  anonymous
                    ? 'border-blue-500 bg-gradient-to-r from-sky-500 to-blue-600 shadow-lg shadow-blue-200 focus:ring-blue-100'
                    : 'border-slate-300 bg-gradient-to-r from-slate-200 to-slate-300 focus:ring-slate-200'
                }`}
              >
                <span className="pointer-events-none absolute left-2 text-white/85">
                  <User className={`h-3.5 w-3.5 transition-opacity duration-300 ${anonymous ? 'opacity-0' : 'opacity-100'}`} />
                </span>
                <span className="pointer-events-none absolute right-2 text-white/90">
                  <EyeOff className={`h-3.5 w-3.5 transition-opacity duration-300 ${anonymous ? 'opacity-100' : 'opacity-0'}`} />
                </span>
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out ${
                    anonymous ? 'translate-x-6 text-blue-600' : 'translate-x-0 text-slate-500'
                  }`}
                >
                  {anonymous ? <EyeOff className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 transition-colors group-hover:text-blue-600">
                  Submit anonymously
                </p>
                <p className="text-xs text-slate-500">Your identity will be hidden from other users</p>
              </div>
            </div>
          </div>

          <div className="group rounded-xl border border-slate-200 bg-white p-3 transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
            <div className="flex items-start justify-start gap-3">
              <button
                id="terms"
                type="button"
                role="switch"
                aria-checked={termsAccepted}
                aria-label="Accept terms and conditions"
                onClick={() => {
                  if (termsAccepted) {
                    setTermsAccepted(false)
                    return
                  }
                  handleOpenTerms()
                }}
                className={`relative mt-0.5 inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-all duration-300 ease-out focus:outline-none focus:ring-4 ${
                  termsAccepted
                    ? 'border-emerald-500 bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg shadow-emerald-200 focus:ring-emerald-100'
                    : 'border-slate-300 bg-gradient-to-r from-slate-200 to-slate-300 focus:ring-slate-200'
                }`}
              >
                <span className="pointer-events-none absolute left-2 text-white/85">
                  <FileText className={`h-3.5 w-3.5 transition-opacity duration-300 ${termsAccepted ? 'opacity-0' : 'opacity-100'}`} />
                </span>
                <span className="pointer-events-none absolute right-2 text-white/90">
                  <Check className={`h-3.5 w-3.5 transition-opacity duration-300 ${termsAccepted ? 'opacity-100' : 'opacity-0'}`} />
                </span>
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out ${
                    termsAccepted ? 'translate-x-6 text-emerald-600' : 'translate-x-0 text-slate-500'
                  }`}
                >
                  {termsAccepted ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-start gap-2">
                  <p className="text-sm font-medium text-slate-700 transition-colors group-hover:text-blue-600">
                    I accept the terms and conditions <span className="text-red-500">*</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenTerms}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Read terms
                  </button>
                </div>
                <p className="text-xs text-slate-500">Open the terms, read to the end, then accept them before submitting</p>
              </div>
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
    <Modal
      isOpen={isTermsModalOpen}
      onClose={() => setIsTermsModalOpen(false)}
      // title={IDEA_TERMS_TITLE}
      // description="Scroll to the end to enable acceptance."
      maxWidthClassName="max-w-3xl"
    >
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-6 py-6 text-white dark:border-slate-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.28),_transparent_40%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                <ShieldCheck className="h-3.5 w-3.5" />
                Idea Submission Policy
              </div>
              <p className="text-sm leading-6 text-slate-200">
                Please review these terms carefully before sending your idea. Reaching the bottom unlocks acceptance.
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm ${
              hasReachedTermsEnd ? 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/30' : 'bg-white/10 text-slate-100 ring-1 ring-white/10'
            }`}>
              {hasReachedTermsEnd ? <Check className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {hasReachedTermsEnd ? 'Ready to accept' : 'Scroll to continue'}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Read every section before enabling the acceptance button.
            </p>
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ${
                  hasReachedTermsEnd ? 'w-full' : 'w-1/3'
                }`}
              />
            </div>
          </div>
        </div>

        <div
          ref={termsContentRef}
          onScroll={handleTermsScroll}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="max-h-[55vh] space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,1)_16%)] px-6 py-6 pr-4 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96)_0%,rgba(15,23,42,1)_16%)] [&::-webkit-scrollbar]:hidden"
        >
          {IDEA_TERMS_SECTIONS.map((section, index) => (
            <section
              key={section.heading}
              className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:shadow-[0_12px_30px_rgba(2,6,23,0.35)]"
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{section.heading}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Terms section</p>
                </div>
              </div>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/85 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/90 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-300">
            {hasReachedTermsEnd ? 'You can now accept the terms.' : 'Scroll to the bottom to enable acceptance.'}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTermsModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!hasReachedTermsEnd}
              onClick={() => {
                setTermsAccepted(true)
                setIsTermsModalOpen(false)
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
                hasReachedTermsEnd
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-200 animate-pulse hover:from-blue-600 hover:to-blue-700'
                  : 'cursor-not-allowed bg-slate-400'
              }`}
            >
              <Check className="h-4 w-4" />
              Accept Terms
            </button>
          </div>
        </div>
      </div>
    </Modal>
    </>
  )
}

export default AddIdeaSubmissionForm
