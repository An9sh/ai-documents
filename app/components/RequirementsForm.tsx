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
  // const [color, setColor] = useState(requirement?.color || '#3B82F6');
  const [category, setCategory] = useState(requirement?.category || categories[0]?.id || 'normal');
  const [requirements, setRequirements] = useState<string[]>(requirement?.requirements || []);

  const [matchThreshold, setMatchThreshold] = useState(requirement?.matchThreshold || 70);
  const [newRequirement, setNewRequirement] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const MAX_REQUIREMENTS = 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the selected category's color
    const selectedCategory = categories.find(c => c.id === category);
    const categoryColor = selectedCategory?.color || '#3B82F6';

    onSave({
      id: requirement?.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      color: categoryColor,
      category,
      requirements,
      matchThreshold,
      userId: '',
      categoryId: 0, // This will be set by the server
      threshold: matchThreshold,
      createdAt: new Date(),
    });
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
    const newRequirements = requirements.filter((_, i) => i !== index);
    setRequirements(newRequirements);
    setShowWarning(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
          Requirements ({requirements.length}/{MAX_REQUIREMENTS})
        </label>
        <div className="mt-1">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddRequirement()}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Add a requirement"
              disabled={requirements.length >= MAX_REQUIREMENTS}
            />
            <button
              type="button"
              onClick={handleAddRequirement}
              disabled={requirements.length >= MAX_REQUIREMENTS}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${
                requirements.length >= MAX_REQUIREMENTS 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              Add
            </button>
          </div>
          {showWarning && (
            <p className="mt-2 text-sm text-red-600">
              Maximum limit of {MAX_REQUIREMENTS} requirements reached. Please remove some requirements before adding more.
            </p>
          )}
          <div className="mt-2 space-y-2">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                <span className="text-sm text-gray-900">{req}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(index)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
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
        />
        <div className="mt-1 text-sm text-gray-500">{matchThreshold}%</div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Save
        </button>
      </div>
    </form>
  );
} 