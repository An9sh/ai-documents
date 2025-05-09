"use client";

import { useState, useEffect } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, DocumentTextIcon, XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Loader2 } from "lucide-react";
import { Classification, DocumentMetadata, ClassificationRequirement, ConfidenceLevel } from '../types';
import { useAuth } from '../contexts/auth-context';
import { getDocuments } from '../lib/db/documents';
import { getCategories } from '../lib/db/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import RequirementsForm from './RequirementsForm';

interface Category {
  id: string;
  name: string;
  color: string;
  threshold: number;
  isCustom: boolean;
  userId?: string;
  createdAt?: Date;
}

interface SyncResponse {
  classifications: Record<string, Array<{
    documentId: string;
    score: number;
  }>>;
}

interface ClassificationSectionProps {
  requirements: ClassificationRequirement[];
  classifications: Classification[];
  onCreateRequirement: (requirement: ClassificationRequirement) => void;
  onSyncClassification: (requirement: ClassificationRequirement) => Promise<SyncResponse>;
  onUpdateRequirement?: (requirement: ClassificationRequirement) => void;
  setGroupedResumes?: (resumes: Map<string, { requirementId: string; classifications: Classification[] }>) => void;
}

interface SyncResults {
  matched: Array<{
    documentId: string;
    documentName: string;
    score: number;
    matchReason: string;
    matchedRequirements: string[];
    confidence: string;
    isPrimary: boolean;
    isSecondary: boolean;
  }>;
  unmatched: Array<{
    documentId: string;
    documentName: string;
  }>;
}

const RequirementsList = ({ requirements }: { requirements: string[] }) => {
  return (
    <ul className="list-disc list-inside space-y-1">
      {requirements.map((req, index) => (
        <li key={index} className="text-gray-700">{req}</li>
      ))}
    </ul>
  );
};

export function ClassificationSection({
  requirements,
  classifications,
  onCreateRequirement,
  onSyncClassification,
  onUpdateRequirement,
  setGroupedResumes
}: ClassificationSectionProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [showNoMatchAlert, setShowNoMatchAlert] = useState(false);
  const [currentRequirement, setCurrentRequirement] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCategoryError, setShowCategoryError] = useState(false);
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [showSyncResults, setShowSyncResults] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResults>({ matched: [], unmatched: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isCategoryLoading, setIsCategoryLoading] = useState<Map<string, boolean>>(new Map());
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set());
  const { user, getFreshToken } = useAuth();

  // Group classifications by requirement
  const groupedClassifications = new Map<string, Classification[]>();
  classifications.forEach(classification => {
    const requirementId = classification.requirementId || '';
    const existing = groupedClassifications.get(requirementId) || [];
    groupedClassifications.set(requirementId, [...existing, classification]);
  });

  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const dbCategories = await getCategories(user.uid);
        setCustomCategories(dbCategories);
        setCategories(dbCategories);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };
    loadCategories();
  }, [user]);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const docs = await getDocuments(user.uid);
        setDocuments(docs);
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDocuments();
  }, [user]);

  const handleCreateRequirement = async (requirement: ClassificationRequirement) => {
        try {
          await onCreateRequirement(requirement);
          setIsCreateModalOpen(false);
        } catch (error) {
          console.error('Error creating requirement:', error);
        }
      };


  const handleSyncClick = async (requirement: ClassificationRequirement) => {
    setLoading(new Map(loading.set(requirement.id, true)));
    try {
      const result = await onSyncClassification(requirement);
      
      // Process the sync results
      if (result?.classifications) {
        const classifications = result.classifications[requirement.id] || [];
        
        // Process matched documents
        const matchedDocs = classifications
          .filter((doc: any) => {
            try {
              const details = JSON.parse(doc.details);
              return details.metadata?.isMatched === true;
            } catch (error) {
              console.error('Error parsing details:', error);
              return false;
            }
          })
          .map((doc: any) => {
            let finalScore = doc.score;
            let matchReason = "No match reason provided";
            let matchedRequirements: string[] = [];
            let confidence = "low";
            
            try {
              const details = JSON.parse(doc.details);
              finalScore = details.scores?.final || doc.score;
              matchReason = details.metadata?.rawMatchReason || matchReason;
              matchedRequirements = details.requirements?.matched || [];
              confidence = details.metadata?.confidence || "low";
            } catch (e) {
              console.error('Error parsing details:', e);
            }
            
            return {
              documentId: doc.documentId,
              documentName: documents.find(d => d.id === doc.documentId)?.filename || 'Unknown Document',
              score: finalScore,
              matchReason,
              matchedRequirements,
              confidence,
              isPrimary: doc.isPrimary,
              isSecondary: doc.isSecondary
            };
          });

        // Always show popup, but with different content based on matches
        if (matchedDocs.length > 0) {
          const results: SyncResults = {
            matched: matchedDocs,
            unmatched: [] // We don't show unmatched documents anymore
          };
          
          setSyncResults(results);
          setShowSyncResults(true);
        } else {
          // Show alert dialog for no matches
          setCurrentRequirement(requirement.name);
          setShowNoMatchAlert(true);
        }

        // Refresh the documents list after sync
        if (user?.uid) {
          const updatedDocs = await getDocuments(user.uid);
          if (updatedDocs) {
            setDocuments(updatedDocs);
            // Also refresh classifications
            const token = await getFreshToken();
            const response = await fetch('/api/classifications', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (response.ok) {
              const results = await response.json();
              const groupedData = new Map();
              Object.entries(results).forEach(([requirementId, classifications]) => {
                groupedData.set(requirementId, {
                  requirementId,
                  classifications: (classifications as Classification[]).filter(c => c.isMatched)
                });
              });
              if (setGroupedResumes) {
                setGroupedResumes(groupedData);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error syncing requirement:', error);
      setCurrentRequirement(requirement.name);
      setShowNoMatchAlert(true);
    } finally {
      setLoading(new Map(loading.set(requirement.id, false)));
    }
  };

  const handleCategoryChange = async (requirement: ClassificationRequirement, newCategory: string) => {
    if (!user || !getFreshToken) return;
    
    try {
      // Set loading state for this requirement
      setIsCategoryLoading(new Map(isCategoryLoading.set(requirement.id, true)));
      
      const token = await getFreshToken();
      const response = await fetch(`/api/requirements/${requirement.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category: newCategory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update requirement category');
      }

      const updatedRequirement = await response.json();
      // Notify parent component of the update
      onUpdateRequirement?.(updatedRequirement);
      
      // Refresh classifications after category update
      const classificationsResponse = await fetch('/api/classifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (classificationsResponse.ok) {
        const results = await classificationsResponse.json();
        const groupedData = new Map();
        Object.entries(results).forEach(([requirementId, classifications]) => {
          groupedData.set(requirementId, {
            requirementId,
            classifications: (classifications as Classification[]).filter(c => c.isMatched)
          });
        });
        if (setGroupedResumes) {
          setGroupedResumes(groupedData);
        }
      }

    setOpenDropdownId(null);
    } catch (error) {
      console.error('Error updating requirement category:', error);
      setShowCategoryError(true);
      setTimeout(() => setShowCategoryError(false), 3000);
    } finally {
      // Clear loading state
      setIsCategoryLoading(new Map(isCategoryLoading.set(requirement.id, false)));
    }
  };

  const toggleRequirementExpansion = (requirementId: string) => {
    setExpandedRequirements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requirementId)) {
        newSet.delete(requirementId);
      } else {
        newSet.add(requirementId);
      }
      return newSet;
    });
  };

  const downloadCSV = (requirement: ClassificationRequirement) => {
    const requirementClassifications = groupedClassifications.get(requirement.id) || [];
    
    // Prepare CSV headers
    const headers = [
      'Document Name',
      'Score',
      'Confidence',
      'Match Reason',
      'Primary Match',
      'Secondary Match',
      'Matched Requirements',
      'Document Type',
      'Size (KB)',
      'Matched At'
    ];

    // Prepare CSV rows
    const rows = requirementClassifications.map(classification => {
      const details = classification.details;
      const metadata = details.metadata || {};
      const scores = details.scores || { final: 0 };
      
      return [
        classification.documentName || 'Unknown Document',
        `${scores.final.toFixed(1)}%`,
        metadata.confidence || 'Unknown',
        metadata.rawMatchReason || 'No reason provided',
        classification.isPrimary ? 'Yes' : 'No',
        classification.isSecondary ? 'Yes' : 'No',
        (metadata.matchedRequirements || []).join('; '),
        metadata.documentInfo?.type || 'Unknown',
        ((metadata.documentInfo?.size || 0) / 1024).toFixed(1),
        metadata.matchedAt || 'Unknown'
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${requirement.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_classifications.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Classification Board</h2>
            <p className="mt-1 text-sm text-gray-500">
              Match documents with requirements
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
              Create Requirement
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <p className="mt-4 text-sm text-gray-500">Loading documents...</p>
          </div>
        ) : (
          <>
        {showNoMatchAlert && (
          <AlertDialog open={showNoMatchAlert} onOpenChange={setShowNoMatchAlert}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>No Matches Found</AlertDialogTitle>
                <AlertDialogDescription>
                  No documents matched the requirement "{currentRequirement}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowNoMatchAlert(false)}>
                  Close
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {showSyncResults && syncResults && (
          <Dialog open={showSyncResults} onOpenChange={setShowSyncResults}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Sync Results</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Matched Documents ({syncResults.matched.length})</h3>
                <div className="space-y-4">
                  {syncResults.matched.map((doc) => (
                    <div key={doc.documentId} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{doc.documentName}</h4>
                          <div className="flex gap-2 mt-1">
                            {doc.isPrimary && (
                              <Badge variant="default">Primary</Badge>
                            )}
                            {doc.isSecondary && (
                              <Badge variant="secondary">Secondary</Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {doc.score.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {doc.matchReason}
                      </p>
                      {doc.matchedRequirements.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Matched Requirements:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {doc.matchedRequirements.map((req) => (
                              <Badge key={req} variant="outline">
                                {req}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setShowSyncResults(false);
                  // Refresh the documents list after closing the dialog
                  if (user?.uid) {
                    getDocuments(user.uid).then(updatedDocs => {
                      if (updatedDocs) {
                        setDocuments(updatedDocs);
                      }
                    });
                  }
                }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {showCategoryError && (
          <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  Failed to update category. Please try again.
                </p>
              </div>
            </div>
          </div>
        )}

    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {requirements.map((requirement) => {
            const requirementClassifications = groupedClassifications.get(requirement.id) || [];
        
        return (
          <Disclosure as="div" key={requirement.id} defaultOpen={true} className="bg-white shadow rounded-lg overflow-hidden">
            {({ open }: { open: boolean }) => (
              <div>
                <div className="w-full px-4 py-3 flex items-center justify-between" 
                  style={{ backgroundColor: requirement.color ? `${requirement.color}20` : '#f3f4f6' }}>
                  <div className="flex items-center flex-grow">
                    <div className="w-2 h-8 mr-3 rounded-full" style={{ backgroundColor: requirement.color || '#6b7280' }}></div>
                    <span>{requirement.name}</span>
                    <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          {requirementClassifications.length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenDropdownId(openDropdownId === requirement.id ? null : requirement.id)}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2 py-1 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            disabled={isCategoryLoading.get(requirement.id)}
                      >
                            {isCategoryLoading.get(requirement.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                        <ChevronDownIcon className="-mr-0.5 h-4 w-4 text-gray-400" aria-hidden="true" />
                            )}
                      </button>

                      {openDropdownId === requirement.id && (
                        <div className="absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            {customCategories.map((category) => (
                              <button
                                key={`dropdown-${requirement.id}-category-${category.id}`}
                                onClick={() => {
                                  handleCategoryChange(requirement, category.id);
                                  setActiveCategory(category.id);
                                  setOpenDropdownId(null);
                                }}
                                className={`block w-full px-4 py-2 text-left text-sm ${
                                  requirement.category === category.id
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                    disabled={isCategoryLoading.get(requirement.id)}
                                  >
                                    {isCategoryLoading.get(requirement.id) && requirement.category === category.id ? (
                                      <div className="flex items-center">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        <span>Updating...</span>
                                      </div>
                                    ) : (
                                      category.name
                                    )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleSyncClick(requirement)}
                      disabled={loading.get(requirement.id)}
                      className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {loading.get(requirement.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      Sync
                    </button>
                    {requirementClassifications.length > 0 && (
                      <button
                        onClick={() => downloadCSV(requirement)}
                        className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                        title="Download CSV"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    )}
                    <Disclosure.Button className="p-1">
                      {open ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
                
                <Disclosure.Panel className="px-4 py-3 bg-gray-50">
                  {requirement.description && (
                    <p className="text-xs text-gray-500 mb-3">{requirement.description}</p>
                  )}
                  
                  <div className="space-y-4">
                    <Disclosure>
                      {({ open }: { open: boolean }) => (
                        <div>
                          <Disclosure.Button className="flex w-full justify-between rounded-lg bg-white px-3 py-2 text-left text-xs font-medium text-gray-900 shadow-sm">
                            <span>Requirements</span>
                            {open ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                            )}
                          </Disclosure.Button>
                          <Disclosure.Panel className="px-3 pt-3 pb-2 text-xs text-gray-500">
                            <RequirementsList requirements={requirement.requirements} />
                          </Disclosure.Panel>
                        </div>
                      )}
                    </Disclosure>

                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Matched Documents</h3>
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          <span className="ml-2 text-sm text-gray-500">Loading documents...</span>
                        </div>
                      ) : requirementClassifications.length > 0 ? (
                        <div className="space-y-2">
                          {requirementClassifications
                            .slice(0, expandedRequirements.has(requirement.id) ? undefined : 5)
                            .map((classification) => {
                            const details = classification.details;
                            const scores = details.scores || { vector: 0, ai: 0, final: 0 };
                            const metadata = details.metadata || {
                              documentId: '',
                              filename: '',
                              lines: { from: 0, to: 0 },
                              userId: '',
                              matchedAt: '',
                              confidence: 'low' as ConfidenceLevel,
                              matchedRequirements: [],
                              rawMatchReason: '',
                              threshold: 0,
                              isMatched: false,
                              documentInfo: { type: 'Unknown', size: 0 }
                            };
                            
                            return (
                            <div key={classification.id} className="bg-white shadow rounded-lg p-4 mb-2 h-auto">
                            <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <DocumentTextIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                                      <span className="font-medium text-gray-900 truncate" title={classification.documentName}>
                                        {classification.documentName || 'Unknown Document'}
                                      </span>
                                </div>
                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        {classification.isPrimary ? (
                                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                            Primary
                                          </span>
                                        ) : classification.isSecondary ? (
                                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                                            Secondary
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                            Partial
                                          </span>
                                        )}
                                        <span className={`text-sm font-medium ${
                                          classification.score >= 75 ? 'text-green-600' : 'text-gray-600'
                                        }`}>
                                          {classification.score}%
                                  </span>
                                </div>
                              </div>

                                    <Disclosure>
                                      {({ open }) => (
                                        <div>
                                          <Disclosure.Button className="mt-2 flex w-full justify-between items-center text-left text-sm text-gray-500 hover:text-gray-700">
                                            <span>Show details</span>
                                            <ChevronRightIcon
                                              className={`${
                                                open ? 'transform rotate-90' : ''
                                              } h-5 w-5 text-gray-500`}
                                            />
                                          </Disclosure.Button>
                                          <Disclosure.Panel className="mt-2 text-sm text-gray-600">
                                            <div className="space-y-3">
                                              <div className="flex justify-between items-center">
                                                <span className="font-medium">Match Scores:</span>
                                                <div className="space-x-4">
                                                  <span className="font-medium">Final: {scores.final.toFixed(1)}%</span>
                                                </div>
                                              </div>

                                              <div>
                                                <span className="font-medium">Match Reason:</span>
                                                <p className="mt-1 text-gray-500">{metadata.rawMatchReason}</p>
                                              </div>

                                              <div className="flex justify-between text-xs text-gray-500 border-t pt-2 mt-2">
                                                <span>Type: {metadata.confidence || 'Unknown'}</span>
                                                <span>Size: {(Number(metadata.matchedAt || 0) / 1024).toFixed(1)} KB</span>
                                              </div>
                                            </div>
                                          </Disclosure.Panel>
                                        </div>
                                      )}
                                    </Disclosure>
                                  </div>
                                );
                              })}
                              {requirementClassifications.length > 5 && !expandedRequirements.has(requirement.id) && (
                                <div className="mt-2 text-center">
                                  <button
                                    onClick={() => toggleRequirementExpansion(requirement.id)}
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                  >
                                    Show {requirementClassifications.length - 5} more documents
                                  </button>
                                </div>
                              )}
                              {requirementClassifications.length > 5 && expandedRequirements.has(requirement.id) && (
                                <div className="mt-2 text-center">
                                  <button
                                    onClick={() => toggleRequirementExpansion(requirement.id)}
                                    className="text-sm text-indigo-600 hover:text-indigo-500"
                                  >
                                    Show less
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No matched documents found.</p>
                          )}
                    </div>
                  </div>
                </Disclosure.Panel>
              </div>
            )}
          </Disclosure>
        );
      })}
    </div>
      </>
    )}
  </div>
  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Requirement</DialogTitle>
          </DialogHeader>
          <RequirementsForm
            onSave={handleCreateRequirement}
            onCancel={() => setIsCreateModalOpen(false)}
            categories={categories}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
} 