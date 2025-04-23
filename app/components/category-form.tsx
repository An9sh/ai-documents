'use client'

import { useState, useEffect } from 'react'
import { Category } from '../types/filtering'
import { v4 as uuidv4 } from 'uuid'

interface CategoryFormProps {
  category?: Category
  onSave: (category: Category) => void
  onCancel: () => void
}

export default function CategoryForm({ category, onSave, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || '#6366f1')
  const [threshold, setThreshold] = useState(category?.threshold || 70)

  useEffect(() => {
    if (category) {
      setName(category.name)
      setColor(category.color)
      setThreshold(category.threshold)
    }
  }, [category])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newCategory: Category = {
        id: category?.id || `cat-${uuidv4()}`,
        name,
        color,
        threshold,
        isCustom: true
    }
    
    onSave(newCategory)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Category Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="color" className="block text-sm font-medium text-gray-700">
          Color
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="color"
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 rounded border border-gray-300"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
          Default Match Threshold (%)
        </label>
        <div className="mt-1 flex items-center space-x-2">
          <input
            type="range"
            id="threshold"
            min="0"
            max="100"
            step="5"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="flex-grow"
          />
          <span className="w-12 text-sm text-gray-500">{threshold}%</span>
        </div>
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {category ? 'Update' : 'Create'} Category
        </button>
      </div>
    </form>
  )
} 