'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DocumentMetadata } from '../types'
import { Category, FilteringRequirements } from '../types/filtering'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import RequirementsForm from '../components/RequirementsForm'
import CategoryForm from '../components/category-form'
import { useAuth } from '../contexts/auth-context'
import { getRequirements, createRequirement, updateRequirement, deleteRequirement } from '../lib/db/requirements'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../lib/db/categories'

function SettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const { user } = useAuth()
  
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Category | undefined>(undefined)
  const [requirements, setRequirements] = useState<FilteringRequirements[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [currentRequirement, setCurrentRequirement] = useState<FilteringRequirements | undefined>(undefined)
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])

  // Load saved requirements and categories from database
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      try {
        // Load requirements
        const reqs = await getRequirements(user.uid);
        setRequirements(reqs);
        
        if (editId) {
          const reqToEdit = reqs.find(req => req.id === editId);
          if (reqToEdit) {
            setCurrentRequirement(reqToEdit);
            setIsEditing(true);
          }
        }

        // Load categories
        const cats = await getCategories(user.uid);
        setCustomCategories(cats);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [user, editId]);

  // Load documents from localStorage
  useEffect(() => {
    const savedDocs = localStorage.getItem("documents");
    if (savedDocs) {
      const parsedDocs = JSON.parse(savedDocs);
      setDocuments(parsedDocs.map((doc: any) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt)
      })));
    }
  }, []);

  const analyzeDocuments = (requirement: FilteringRequirements) => {
    const matchingDocs = documents.filter(doc => {
      // For now, we'll do a simple name-based match
      // In a real application, you would analyze the document content
      const docName = doc.filename.toLowerCase();
      const requirementName = requirement.name.toLowerCase();
      
      return docName.includes(requirementName);
    });

    return matchingDocs;
  };

  const handleSaveRequirement = async (requirement: FilteringRequirements) => {
    if (!user) return;
    try {
      let updatedRequirement: FilteringRequirements;
      
      if (currentRequirement) {
        // Update existing requirement
        const updateData: Partial<FilteringRequirements> = {
          name: requirement.name,
          description: requirement.description,
          categoryId: 0, // This will be set by the server
          color: requirement.color,
          threshold: requirement.matchThreshold || 0,
          requirements: requirement.requirements || [],
          matchThreshold: requirement.matchThreshold || 0,
          category: requirement.category,
          userId: user.uid
        };
        const partialResult = await updateRequirement(requirement.id, updateData);
        // Convert partial result to full FilteringRequirements
        updatedRequirement = {
          id: requirement.id,
          userId: user.uid,
          name: partialResult.name || requirement.name,
          description: partialResult.description || requirement.description,
          categoryId: 0, // This will be set by the server
          color: partialResult.color || requirement.color,
          threshold: partialResult.threshold || requirement.matchThreshold || 0,
          requirements: partialResult.requirements || requirement.requirements || [],
          createdAt: requirement.createdAt,
          matchThreshold: partialResult.matchThreshold || requirement.matchThreshold || 0,
          category: partialResult.category || requirement.category
        };
      } else {
        // Create new requirement
        const createData: Omit<FilteringRequirements, 'id' | 'createdAt' | 'userId'> = {
          name: requirement.name,
          description: requirement.description,
          categoryId: 0, // This will be set by the server
          color: requirement.color,
          threshold: requirement.matchThreshold || 0,
          requirements: requirement.requirements || [],
          matchThreshold: requirement.matchThreshold || 0,
          category: requirement.category
        };
        const newRequirement = await createRequirement(user.uid, createData);
        // Convert to full FilteringRequirements
        updatedRequirement = {
          id: newRequirement.id,
          userId: user.uid,
          name: newRequirement.name,
          description: newRequirement.description,
          categoryId: 0, // This will be set by the server
          color: newRequirement.color,
          threshold: newRequirement.matchThreshold || 0,
          requirements: newRequirement.requirements || [],
          createdAt: newRequirement.createdAt,
          matchThreshold: newRequirement.matchThreshold || 0,
          category: newRequirement.category
        };
      }
      
      // Update local state
      setRequirements(prev => {
        const existingIndex = prev.findIndex(r => r.id === updatedRequirement.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = updatedRequirement;
          return updated;
        }
        return [...prev, updatedRequirement];
      });
      
      setIsEditing(false);
      setCurrentRequirement(undefined);
      
      // Clear the edit ID from URL if it exists
      if (editId) {
        router.push('/settings');
      }
    } catch (error) {
      console.error('Error saving requirement:', error);
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    if (!user) return;
    const confirmed = window.confirm('Are you sure you want to delete this requirement?');
    if (confirmed) {
      try {
        await deleteRequirement(user.uid, requirementId);
        setRequirements(prev => prev.filter(req => req.id !== requirementId));
      } catch (error) {
        console.error('Error deleting requirement:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentRequirement(undefined)
    
    // Clear the edit ID from URL if it exists
    if (editId) {
      router.push('/settings')
    }
  }

  const allCategories = customCategories;

  const filteredRequirements = requirements.filter(req => 
    activeCategory === 'all' || req.category === activeCategory
  )

  const handleCreateCategory = async (category: Omit<Category, 'isCustom'>) => {
    if (!user) return;
    try {
      const newCategory = await createCategory(user.uid, {
        ...category,
        isCustom: true
      });
      setCustomCategories(prev => [...prev, newCategory]);
      setIsEditingCategory(false);
      setCurrentCategory(undefined);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const handleUpdateCategory = async (category: Omit<Category, 'isCustom'>) => {
    if (!user) return;
    try {
      const updatedCategory = await updateCategory(user.uid, category.id, category);
      setCustomCategories(prev => 
        prev.map(c => c.id === updatedCategory.id ? updatedCategory : c)
      );
      setIsEditingCategory(false);
      setCurrentCategory(undefined);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user) return;
    const confirmed = window.confirm('Are you sure you want to delete this category?');
    if (confirmed) {
      try {
        await deleteCategory(user.uid, categoryId);
        setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          {/* Category Management */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Categories</h2>
              <button
                onClick={() => {
                  setCurrentCategory(undefined)
                  setIsEditingCategory(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allCategories.map((category) => (
                <div key={category.id} className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: category.color }}
                        />
                        <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentCategory(category)
                            setIsEditingCategory(true)
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Threshold: {category.threshold}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Navigation */}
          <div className="mt-8 mb-6">
            <div className="flex items-center justify-between">
              <nav className="flex space-x-4" aria-label="Categories">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    activeCategory === 'all'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Classifications
                </button>
                {allCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      activeCategory === category.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                onClick={() => {
                  setCurrentRequirement(undefined);
                  setIsEditing(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                Add New Classification
              </button>
            </div>
          </div>

          {/* Classification Boards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredRequirements.map((requirement) => (
              <div key={requirement.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">{requirement.name}</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setCurrentRequirement(requirement);
                          setIsEditing(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRequirement(requirement.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{requirement.description}</p>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Match Threshold</span>
                      <span className="text-sm text-gray-500">{requirement.matchThreshold}%</span>
                    </div>
                    <div className="mt-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={requirement.matchThreshold}
                        onChange={(e) => {
                          const updatedRequirements = requirements.map(req =>
                            req.id === requirement.id
                              ? { ...req, matchThreshold: parseInt(e.target.value) }
                              : req
                          );
                          setRequirements(updatedRequirements);
                        }}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {currentRequirement ? 'Edit Classification' : 'Create New Classification'}
              </h3>
              <RequirementsForm
                requirement={currentRequirement}
                onSave={handleSaveRequirement}
                onCancel={handleCancelEdit}
                categories={allCategories}
              />
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {isEditingCategory && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {currentCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <CategoryForm
                category={currentCategory}
                onSave={currentCategory ? handleUpdateCategory : handleCreateCategory}
                onCancel={() => {
                  setIsEditingCategory(false);
                  setCurrentCategory(undefined);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
} 