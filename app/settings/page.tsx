'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DocumentMetadata } from '@/types'
import { categories, FilteringRequirements } from '../types/filtering'
import { v4 as uuidv4 } from 'uuid'
import { PlusIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import RequirementsForm from '../components/RequirementsForm'

const REQUIREMENTS_STORAGE_KEY = process.env.NEXT_PUBLIC_REQUIREMENTS_STORAGE_KEY || 'resume-filtering-requirements'

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  
  const [thresholds, setThresholds] = useState(
    Object.fromEntries(categories.map((cat: { id: any; threshold: any }) => [cat.id, cat.threshold]))
  )
  const [requirements, setRequirements] = useState<FilteringRequirements[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [currentRequirement, setCurrentRequirement] = useState<FilteringRequirements | undefined>(undefined)
  const [selectedRequirement, setSelectedRequirement] = useState<FilteringRequirements | null>(null)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [isPineconeConfigured, setIsPineconeConfigured] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  // Load saved requirements on component mount
  useEffect(() => {
    const savedRequirements = localStorage.getItem(REQUIREMENTS_STORAGE_KEY)
    if (savedRequirements) {
      try {
        // Parse dates from JSON
        const parsed = JSON.parse(savedRequirements, (key, value) => {
          if (key === 'createdAt' || key === 'updatedAt') {
            return new Date(value)
          }
          return value
        })
        setRequirements(parsed)
        
        // If we have an edit ID in the URL, find and set the current requirement
        if (editId) {
          const reqToEdit = parsed.find((req: FilteringRequirements) => req.id === editId)
          if (reqToEdit) {
            setCurrentRequirement(reqToEdit)
            setIsEditing(true)
          }
        }
      } catch (e) {
        console.error('Failed to parse saved requirements:', e)
        setRequirements([])
      }
    }
  }, [editId])

  useEffect(() => {
    const pineconeApiKey = localStorage.getItem('pinecone-api-key')
    setIsPineconeConfigured(!!pineconeApiKey && pineconeApiKey.length > 10)
  }, [])

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
      
      // Check if document name contains any of the requirement keywords
      const hasCertification = requirement.certifications.some(cert => 
        docName.includes(cert.name.toLowerCase())
      );
      
      const hasLicense = requirement.licenses.some(license => 
        docName.includes(license.name.toLowerCase())
      );
      
      const hasEducation = requirement.educationRequirements.some(edu => 
        docName.includes(edu.degree.toLowerCase()) || 
        docName.includes(edu.field.toLowerCase())
      );
      
      return hasCertification || hasLicense || hasEducation || docName.includes(requirementName);
    });

    return matchingDocs;
  };

  const handleRequirementSelect = (requirement: FilteringRequirements) => {
    setSelectedRequirement(requirement)
    const matchingDocs = analyzeDocuments(requirement);
    
    let initialMessage = `I'm looking for candidates with the following requirements:\n\n` +
                        `- ${requirement.name}\n` +
                        `- ${requirement.description}\n\n`;
    
    if (matchingDocs.length > 0) {
      initialMessage += `I found ${matchingDocs.length} matching documents:\n` +
                       matchingDocs.map(doc => `- ${doc.filename}`).join('\n');
    } else {
      initialMessage += `No matching documents found yet.`;
    }
    
    initialMessage += `\n\nWhat specific qualifications are you looking for?`;
    
    setMessages([
      {
        role: 'assistant' as const,
        content: initialMessage
      }
    ])
  }

  const handleSendMessage = async (message: string) => {
    if (!selectedRequirement) return

    const newMessages = [...messages, { role: 'user' as const, content: message }]
    setMessages(newMessages)

    const matchingDocs = analyzeDocuments(selectedRequirement);
    
    const response = {
      role: 'assistant' as const,
      content: `Based on your requirements, I found the following matches:\n\n` +
               `Requirements:\n` +
               `- Certifications: ${selectedRequirement.certifications.map(c => c.name).join(', ')}\n` +
               `- Licenses: ${selectedRequirement.licenses.map(l => l.name).join(', ')}\n` +
               `- Education: ${selectedRequirement.educationRequirements.map(e => `${e.degree} in ${e.field}`).join(', ')}\n` +
               `- Experience: ${selectedRequirement.experienceRequirements.map(e => `${e.skill} (${e.yearsRequired} years)`).join(', ')}\n\n` +
               (matchingDocs.length > 0 
                ? `Matching Documents:\n${matchingDocs.map(doc => `- ${doc.filename}`).join('\n')}`
                : `No matching documents found.`)
    }
    setMessages([...newMessages, response])
  }

  const handleThresholdChange = (categoryId: string, value: string) => {
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setThresholds((prev: any) => ({ ...prev, [categoryId]: numValue }))
    }
  }

  // Save requirements to storage
  const saveRequirementsToStorage = (reqs: FilteringRequirements[]) => {
    localStorage.setItem(REQUIREMENTS_STORAGE_KEY, JSON.stringify(reqs))
  }

  const handleSaveRequirement = (requirement: FilteringRequirements) => {
    let updatedRequirements: FilteringRequirements[]
    
    if (currentRequirement) {
      // Update existing requirement
      updatedRequirements = requirements.map(req => 
        req.id === requirement.id ? requirement : req
      )
    } else {
      // Add new requirement
      updatedRequirements = [...requirements, requirement]
    }
    
    setRequirements(updatedRequirements)
    saveRequirementsToStorage(updatedRequirements)
    setIsEditing(false)
    setCurrentRequirement(undefined)
    
    // Clear the edit ID from URL if it exists
    if (editId) {
      router.push('/settings')
    }
  }

  const handleDeleteRequirement = (requirementId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this requirement?')
    if (confirmed) {
      const updatedRequirements = requirements.filter(req => req.id !== requirementId)
      setRequirements(updatedRequirements)
      saveRequirementsToStorage(updatedRequirements)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setCurrentRequirement(undefined)
    
    // Clear the edit ID from URL if it exists
    if (editId) {
      router.push('/settings')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Classification Requirements */}
        <div className="pt-10">
          {isEditing ? (
            <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
              <div className="sm:flex sm:items-center mb-8">
                <div className="sm:flex-auto">
                  <h2 className="text-base font-semibold leading-7 text-gray-900">
                    {currentRequirement ? 'Edit Classification Requirements' : 'Create Classification Requirements'}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Define the criteria that will be used to filter and classify resumes.
                  </p>
                </div>
              </div>

              <RequirementsForm 
                requirement={currentRequirement}
                onSave={handleSaveRequirement}
                onCancel={handleCancelEdit}
              />
            </div>
          ) : (
            <div className="px-4 sm:px-0">
              <div className="sm:flex sm:items-center mb-6">
                <div className="sm:flex-auto">
                  <h2 className="text-base font-semibold leading-7 text-gray-900">Classification Requirements</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">
                    Create and manage classification categories with specific requirements for automatically categorizing resumes.
                  </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentRequirement(undefined)
                      setIsEditing(true)
                    }}
                    className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    <span className="flex items-center">
                      <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                      New Category
                    </span>
                  </button>
                </div>
              </div>

              {requirements.length > 0 ? (
                <div className="mt-8 flow-root">
                  <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead>
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                              Category Name
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Description
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Match Threshold
                            </th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Criteria
                            </th>
                            <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                              <span className="sr-only">Actions</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {requirements.map((requirement) => (
                            <tr key={requirement.id}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                                {requirement.name}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {requirement.description.substring(0, 50)}
                                {requirement.description.length > 50 ? '...' : ''}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {requirement.matchThreshold}%
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500">
                                <div className="flex gap-1 flex-wrap">
                                  {requirement.certifications.filter((c: { isRequired: any }) => c.isRequired).length > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                      {requirement.certifications.filter((c: { isRequired: any }) => c.isRequired).length} Certifications
                                    </span>
                                  )}
                                  {requirement.licenses.filter((l: { isRequired: any }) => l.isRequired).length > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                      {requirement.licenses.filter((l: { isRequired: any }) => l.isRequired).length} Licenses
                                    </span>
                                  )}
                                  {requirement.educationRequirements.filter((e) => e.required).length > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                      {requirement.educationRequirements.filter((e) => e.required).length} Education
                                    </span>
                                  )}
                                  {requirement.experienceRequirements.filter((e) => e.required).length > 0 && (
                                    <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                      {requirement.experienceRequirements.filter((e) => e.required).length} Skills
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                <button
                                  onClick={() => {
                                    setCurrentRequirement(requirement)
                                    setIsEditing(true)
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                                >
                                  Edit<span className="sr-only">, {requirement.name}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteRequirement(requirement.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete<span className="sr-only">, {requirement.name}</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow sm:rounded-lg mt-6">
                  <div className="px-4 py-5 sm:p-6">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No requirements defined</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by creating a new classification category.
                      </p>
                      <div className="mt-6">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentRequirement(undefined)
                            setIsEditing(true)
                          }}
                          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                          New Classification Category
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 