import React, { useEffect, useState } from 'react'
import { MultiSelect } from 'primereact/multiselect'
import { Checkbox, CheckboxChangeEvent } from 'primereact/checkbox'
import axios from 'axios'

type Category = {
  id: number
  name: string
  description: string
}

type AddIdeaSubmissionFormProps = {
  onCancel: () => void
  onSubmit: (data: any) => void
}

const AddIdeaSubmissionForm: React.FC<AddIdeaSubmissionFormProps> = ({ onCancel, onSubmit }) => {
  const [title, setTitle] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/categories/view', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')!).token : ''}`,
          },
        })
        const data = response.data.results || response.data
        setCategories(data.map((cat: any) => ({ id: cat.category_id || cat.id, name: cat.category_name || cat.name, description: cat.category_desc || cat.description })))
      } catch {
        setError('Failed to load categories')
      }
    }
    fetchCategories()
  }, [])

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
      formData.append('category_ids', JSON.stringify(selectedCategories.map(c => c.id)))
      formData.append('idea_content', description)
      formData.append('anonymous_status', anonymous.toString())
      formData.append('terms_accepted', termsAccepted.toString())
      if (file) formData.append('documents', file)
      await axios.post('/ideas/post/', formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')!).token : ''}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      onSubmit({ title, selectedCategories, description, file, anonymous })
    } catch {
      setError('Failed to submit idea')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700">Idea Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Categories</label>
        <MultiSelect
          value={selectedCategories}
          options={categories}
          onChange={(e) => setSelectedCategories(e.value)}
          optionLabel="name"
          placeholder="Select categories"
          display="chip"
          className="w-full"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          rows={4}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Upload Supporting File (Optional)</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
          className="mt-1 block w-full"
        />
      </div>
      <div className="flex items-center">
        <Checkbox
          inputId="anonymous"
          checked={anonymous}
          onChange={(e: CheckboxChangeEvent) => setAnonymous(!!e.checked)}
        />
        <label htmlFor="anonymous" className="ml-2 text-sm">Submit Anonymously</label>
      </div>
      <div className="flex items-center">
        <Checkbox
          inputId="terms"
          checked={termsAccepted}
          onChange={(e: CheckboxChangeEvent) => setTermsAccepted(!!e.checked)}
          required
        />
        <label htmlFor="terms" className="ml-2 text-sm">I accept the terms and conditions</label>
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          {loading ? 'Submitting...' : 'Submit Idea'}
        </button>
      </div>
    </form>
  )
}

export default AddIdeaSubmissionForm
