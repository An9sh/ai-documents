"use client";

import { Fragment, useState } from 'react';
import { Disclosure, Dialog, Transition } from '@headlessui/react';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { Classification, ClassificationRequirement, ParsedResume } from '../types/resume';

interface ClassificationSectionProps {
  requirements: ClassificationRequirement[];
  groupedResumes: Map<string, ParsedResume[]>;
  onCreateRequirement: (requirement: ClassificationRequirement) => void;
  onSyncClassification: (requirement: ClassificationRequirement) => Promise<void>;
}

interface ResumeCardProps {
  resume: ParsedResume;
  requirement?: ClassificationRequirement;
  onViewClassification: (resume: ParsedResume) => void;
}

const ResumeCard = ({ resume, requirement, onViewClassification }: ResumeCardProps) => {
  if (!resume.classificationData) {
    return (
      <div className="border-gray-200 bg-white rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onViewClassification(resume)}>
        <h3 className="text-sm font-medium text-gray-900">{resume.name}</h3>
        {resume.experience && resume.experience[0] && (
          <p className="text-xs text-gray-500">{resume.experience[0].title}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">No classification data available</p>
      </div>
    );
  }
  
  const isPrimary = resume.classificationData.classifications.some(c => c.isPrimary);
  const isSecondary = !isPrimary && resume.classificationData.classifications.some(c => c.isSecondary);
  
  const primaryClassification = resume.classificationData.classifications.find(c => c.isPrimary) || 
                               resume.classificationData.classifications[0];
  
  let borderColor = "border-gray-200";
  let bgColor = "bg-white";
  
  if (primaryClassification) {
    if (primaryClassification.score >= 90) {
      borderColor = "border-green-500";
      bgColor = "bg-green-50";
    } else if (primaryClassification.score >= 70) {
      borderColor = "border-blue-500";
      bgColor = "bg-blue-50";
    } else if (primaryClassification.score >= 50) {
      borderColor = "border-yellow-500";
      bgColor = "bg-yellow-50";
    } else {
      borderColor = "border-red-500";
      bgColor = "bg-red-50";
    }
  }
  
  return (
    <div 
      className={`${borderColor} ${bgColor} rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={() => onViewClassification(resume)}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">{resume.name}</h3>
          {resume.experience && resume.experience[0] && (
            <p className="text-xs text-gray-500">{resume.experience[0].title}</p>
          )}
        </div>
        
        <div className="flex space-x-1">
          {isPrimary && (
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
              Primary
            </span>
          )}
          {isSecondary && (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              Secondary
            </span>
          )}
        </div>
      </div>
      
      {primaryClassification && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-700">
              Match: {primaryClassification.score}%
            </span>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${primaryClassification.score >= 90 ? 'bg-green-500' : 
                                     primaryClassification.score >= 70 ? 'bg-blue-500' : 
                                     primaryClassification.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${primaryClassification.score}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-700">
            Confidence: {Math.round(primaryClassification.confidence * 100)}%
          </span>
        </div>
      )}
      
      {primaryClassification && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-1 mt-1">
            {primaryClassification.details.certifications.matched.map((cert, i) => (
              <span key={i} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                {cert.name}
              </span>
            ))}
            {primaryClassification.details.licenses.matched.map((lic, i) => (
              <span key={i} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                {lic.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export function ClassificationSection({
  requirements,
  groupedResumes,
  onCreateRequirement,
  onSyncClassification
}: ClassificationSectionProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRequirementName, setNewRequirementName] = useState('');
  const [newRequirementDescription, setNewRequirementDescription] = useState('');
  const [newRequirementThreshold, setNewRequirementThreshold] = useState(70);
  const [loading, setLoading] = useState<Map<string, boolean>>(new Map());
  const [showNoMatchAlert, setShowNoMatchAlert] = useState(false);
  const [currentRequirement, setCurrentRequirement] = useState<string>('');

  const handleCreateQuickRequirement = () => {
    if (!newRequirementName.trim()) return;
    
    const newRequirement: ClassificationRequirement = {
      id: `new-${uuidv4()}`,
      name: newRequirementName,
      description: newRequirementDescription || `Requirement for ${newRequirementName}`,
      color: '#6366f1',
      certifications: [],
      licenses: [],
      educationRequirements: [],
      experienceRequirements: [],
      minimumYearsOverallExperience: 0,
      matchThreshold: newRequirementThreshold
    };
    
    onCreateRequirement(newRequirement);
    setIsCreateModalOpen(false);
    setNewRequirementName('');
    setNewRequirementDescription('');
    setNewRequirementThreshold(70);
  };

  const handleViewClassification = (resume: ParsedResume) => {
    console.log("View classification for resume:", resume);
  };

  const handleSyncClick = async (requirement: ClassificationRequirement) => {
    setLoading(prev => new Map(prev).set(requirement.id, true));
    setCurrentRequirement(requirement.name);

    console.log("Starting classification sync for requirement:", requirement);
    
    try {
      // Validate requirement data
      if (!requirement.id || !requirement.name) {
        console.error("Invalid requirement data:", requirement);
        setShowNoMatchAlert(true);
        return;
      }

      // Log the requirement details
      console.log("Requirement details:", {
        id: requirement.id,
        name: requirement.name,
        description: requirement.description,
        certifications: requirement.certifications,
        licenses: requirement.licenses,
        education: requirement.educationRequirements,
        experience: requirement.experienceRequirements,
        matchThreshold: requirement.matchThreshold
      });

      // Call the sync function
      await onSyncClassification(requirement);
      
      // Check results
      const matches = groupedResumes.get(requirement.id) || [];
      console.log("Classification results:", {
        requirementId: requirement.id,
        matchCount: matches.length,
        matches: matches.map(m => ({
          id: m.id,
          name: m.name,
          score: m.classificationData?.classifications?.[0]?.score ?? 0
        }))
      });

      if (matches.length === 0) {
        setShowNoMatchAlert(true);
        setTimeout(() => setShowNoMatchAlert(false), 3000);
      }
    } catch (error) {
      console.error("Error during classification sync:", error);
      // Show error to user
      setShowNoMatchAlert(true);
      setTimeout(() => setShowNoMatchAlert(false), 3000);
    } finally {
      setLoading(prev => new Map(prev).set(requirement.id, false));
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Classification Board</h2>
          <p className="mt-1 text-sm text-gray-500">
            Match candidates with job requirements
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
          Create Requirement
        </button>
      </div>

      {showNoMatchAlert && (
        <div className="fixed top-4 right-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">
                No matches found for requirement: {currentRequirement}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {requirements.map((requirement) => {
          const requirementResumes = groupedResumes.get(requirement.id) || [];
          
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
                        {requirementResumes.length}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleSyncClick(requirement)}
                        disabled={loading.get(requirement.id)}
                        className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
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
                            {requirement.certifications.length > 0 && (
                              <div className="mb-2">
                                <h4 className="font-medium text-gray-700 mb-1">Certifications:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {requirement.certifications.map((cert, idx) => (
                                    <span key={idx} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                                      {cert.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {requirement.licenses && requirement.licenses.length > 0 && (
                              <div className="mb-2">
                                <h4 className="font-medium text-gray-700 mb-1">Licenses:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {requirement.licenses.map((license, idx) => (
                                    <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                      {license.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {requirement.educationRequirements.length > 0 && (
                              <div className="mb-2">
                                <h4 className="font-medium text-gray-700 mb-1">Education:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {requirement.educationRequirements.map((edu, idx) => (
                                    <span key={idx} className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                                      {edu.degree} in {edu.field} {edu.required ? '(Required)' : '(Preferred)'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {requirement.experienceRequirements.length > 0 && (
                              <div className="mb-2">
                                <h4 className="font-medium text-gray-700 mb-1">Experience:</h4>
                                <div className="flex flex-wrap gap-1">
                                  {requirement.experienceRequirements.map((exp, idx) => (
                                    <span key={idx} className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                                      {exp.skill} ({exp.yearsRequired}+ years) {exp.required ? '(Required)' : '(Preferred)'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="mb-2">
                              <h4 className="font-medium text-gray-700 mb-1">Minimum Years Overall:</h4>
                              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                {requirement.minimumYearsOverallExperience}+ years
                              </span>
                            </div>
                          </Disclosure.Panel>
                        </div>
                      )}
                    </Disclosure>
                    
                    <div className="mt-4 space-y-3">
                      {requirementResumes.length > 0 ? (
                        requirementResumes.map((resume) => (
                          <ResumeCard 
                            key={resume.id} 
                            resume={resume} 
                            requirement={requirement}
                            onViewClassification={handleViewClassification}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No resumes match this classification.
                        </p>
                      )}
                    </div>
                  </Disclosure.Panel>
                </div>
              )}
            </Disclosure>
          );
        })}
        
        <Disclosure as="div" defaultOpen={true} className="bg-white shadow rounded-lg overflow-hidden">
          {({ open }: { open: boolean }) => (
            <div>
              <Disclosure.Button className="w-full px-4 py-3 text-left text-sm font-medium flex items-center justify-between bg-gray-100">
                <div className="flex items-center">
                  <div className="w-2 h-8 mr-3 rounded-full bg-gray-400"></div>
                  <span>Unclassified</span>
                  <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    {(groupedResumes.get('unclassified') || []).length}
                  </span>
                </div>
                {open ? (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                )}
              </Disclosure.Button>
              
              <Disclosure.Panel className="px-4 py-3 bg-gray-50">
                <p className="text-xs text-gray-500 mb-3">
                  Resumes that do not match any classification with sufficient confidence.
                </p>
                
                <div className="mt-4 space-y-3">
                  {(groupedResumes.get('unclassified') || []).length > 0 ? (
                    (groupedResumes.get('unclassified') || []).map((resume) => (
                      <ResumeCard 
                        key={resume.id} 
                        resume={resume}
                        onViewClassification={handleViewClassification}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No unclassified resumes.
                    </p>
                  )}
                </div>
              </Disclosure.Panel>
            </div>
          )}
        </Disclosure>
      </div>

      <Transition appear show={isCreateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsCreateModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Create New Requirement
                  </Dialog.Title>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Requirement Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={newRequirementName}
                        onChange={(e) => setNewRequirementName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="e.g., Software Engineer"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        name="description"
                        id="description"
                        rows={2}
                        value={newRequirementDescription}
                        onChange={(e) => setNewRequirementDescription(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Brief description of this requirement"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
                        Match Threshold (%)
                      </label>
                      <div className="flex items-center mt-1">
                        <input
                          type="range"
                          name="threshold"
                          id="threshold"
                          min="0"
                          max="100"
                          step="5"
                          value={newRequirementThreshold}
                          onChange={(e) => setNewRequirementThreshold(parseInt(e.target.value))}
                          className="mr-3 flex-grow"
                        />
                        <span className="w-10 text-gray-700">{newRequirementThreshold}%</span>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                        onClick={handleCreateQuickRequirement}
                        disabled={!newRequirementName.trim()}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 