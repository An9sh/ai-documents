import { useState } from 'react';
import { FilteringRequirements, Category } from '../types/filtering';
import { TrashIcon } from '@heroicons/react/24/outline';

interface RequirementsFormProps {
  requirement?: FilteringRequirements;
  onSave: (requirement: FilteringRequirements) => void;
  onCancel: () => void;
  categories: Category[];
}

export default function RequirementsForm({ requirement, onSave, onCancel, categories }: RequirementsFormProps) {
  const [name, setName] = useState(requirement?.name || '');
  const [description, setDescription] = useState(requirement?.description || '');
  const [category, setCategory] = useState(requirement?.category || categories[0]?.id || 'normal');
  const [requirements, setRequirements] = useState<string[]>(requirement?.requirements || []);
  const [matchThreshold, setMatchThreshold] = useState(requirement?.matchThreshold || 70);
  const [newRequirement, setNewRequirement] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const MAX_REQUIREMENTS = 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || categories.length === 0) return;

    setIsSaving(true);
    try {
      const selectedCategory = categories.find(c => c.id === category);
      const categoryColor = selectedCategory?.color || '#3B82F6';

      await onSave({
        id: requirement?.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        color: categoryColor,
        category,
        requirements,
        matchThreshold,
        userId: '',
        categoryId: 0,
        threshold: matchThreshold,
        createdAt: new Date(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRequirement = () => {
    if (requirements.length >= MAX_REQUIREMENTS) {
      setShowWarning(true);
      return;
    }
    if (newRequirement.trim() !== '') {
      setRequirements([...requirements, newRequirement]);
      setNewRequirement('');
      setShowWarning(false);
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
    setShowWarning(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-md shadow-md">
      {categories.length === 0 ? (
        <div className="text-center py-6">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Categories Available</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please create a category from settings page first before creating a classification.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
              disabled={categories.length === 0}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={categories.length === 0}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={categories.length === 0}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Requirements ({requirements.length}/{MAX_REQUIREMENTS})
            </label>
            <div className="mt-1 flex space-x-2">
              <input
                type="text"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRequirement()}
                className="flex-1 rounded-md border border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Add a requirement"
                disabled={requirements.length >= MAX_REQUIREMENTS || categories.length === 0}
              />
              <button
                type="button"
                onClick={handleAddRequirement}
                disabled={requirements.length >= MAX_REQUIREMENTS || categories.length === 0}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white ${
                  requirements.length >= MAX_REQUIREMENTS || categories.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                Add
              </button>
            </div>
            {showWarning && (
              <p className="mt-2 text-sm text-red-600">
                Maximum limit of {MAX_REQUIREMENTS} requirements reached.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {requirements.map((req, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 p-2 rounded-md"
                >
                  <span className="text-sm text-gray-900">{req}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRequirement(index)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
              Match Threshold (%)
            </label>
            <input
              type="range"
              id="threshold"
              min="0"
              max="100"
              value={matchThreshold}
              onChange={(e) => setMatchThreshold(parseInt(e.target.value))}
              className="mt-1 block w-full"
              disabled={categories.length === 0}
            />
            <div className="text-sm text-gray-500 mt-1">{matchThreshold}%</div>
          </div>
        </>
      )}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={categories.length === 0 || isSaving}
          className={`px-4 py-2 rounded-md text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            categories.length === 0 || isSaving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isSaving ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </div>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </form>
  );
}
