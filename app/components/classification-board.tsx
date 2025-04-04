// import React, { useState } from 'react';
// import { Disclosure, Dialog, Transition } from '@headlessui/react';
// import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
// import { Loader2 } from "lucide-react";
// import { v4 as uuidv4 } from 'uuid';
// import { Classification, ClassificationRequirement, ParsedResume } from '../types/resume';
// import { ResumeCard } from './resume-card';

// interface ClassificationBoardProps {
//   requirements: ClassificationRequirement[];
//   groupedResumes: Map<string, ParsedResume[]>;
//   onSyncClassification: (requirement: ClassificationRequirement) => Promise<void>;
//   onCreateRequirement: (requirement: ClassificationRequirement) => void;
//   loading: Map<string, boolean>;
// }

// export const ClassificationBoard: React.FC<ClassificationBoardProps> = ({
//   requirements,
//   groupedResumes,
//   onSyncClassification,
//   onCreateRequirement,
//   loading
// }) => {
//   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
//   const [newRequirementName, setNewRequirementName] = useState('');
//   const [newRequirementDescription, setNewRequirementDescription] = useState('');
//   const [newRequirementThreshold, setNewRequirementThreshold] = useState(70);
//   const [newCertification, setNewCertification] = useState('');
//   const [newLicense, setNewLicense] = useState('');
//   const [newEducation, setNewEducation] = useState({ degree: '', field: '', required: false });
//   const [newExperience, setNewExperience] = useState({ skill: '', yearsRequired: 1, required: false });
//   const [newMinYears, setNewMinYears] = useState(0);

//   const handleCreateQuickRequirement = () => {
//     if (!newRequirementName.trim()) return;
    
//     const newRequirement: ClassificationRequirement = {
//       id: `new-${uuidv4()}`,
//       name: newRequirementName,
//       description: newRequirementDescription || `Requirement for ${newRequirementName}`,
//       color: '#6366f1',
//       certifications: newCertification ? [{
//         id: uuidv4(),
//         name: newCertification,
//         isRequired: true
//       }] : [],
//       licenses: newLicense ? [{
//         id: uuidv4(),
//         name: newLicense,
//         isRequired: true
//       }] : [],
//       educationRequirements: newEducation.degree ? [{
//         degree: newEducation.degree,
//         field: newEducation.field,
//         required: newEducation.required
//       }] : [],
//       experienceRequirements: newExperience.skill ? [{
//         skill: newExperience.skill,
//         yearsRequired: newExperience.yearsRequired,
//         required: newExperience.required
//       }] : [],
//       minimumYearsOverallExperience: newMinYears,
//       matchThreshold: newRequirementThreshold
//     };
    
//     onCreateRequirement(newRequirement);
    
//     // Reset form
//     setIsCreateModalOpen(false);
//     setNewRequirementName('');
//     setNewRequirementDescription('');
//     setNewRequirementThreshold(70);
//     setNewCertification('');
//     setNewLicense('');
//     setNewEducation({ degree: '', field: '', required: false });
//     setNewExperience({ skill: '', yearsRequired: 1, required: false });
//     setNewMinYears(0);
//   };

//   return (
//     <div className="mt-8">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-2xl font-semibold text-gray-900">Classification Board</h2>
//           <p className="mt-1 text-sm text-gray-500">
//             Match candidates with job requirements
//           </p>
//         </div>
//         <button
//           type="button"
//           className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
//           onClick={() => setIsCreateModalOpen(true)}
//         >
//           <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
//           Create Requirement
//         </button>
//       </div>

//       <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
//         {requirements.map((requirement) => {
//           const requirementResumes = groupedResumes.get(requirement.id) || [];
          
//           return (
//             <Disclosure as="div" key={requirement.id} defaultOpen={true} className="bg-white shadow rounded-lg overflow-hidden">
//               {({ open }: { open: boolean }) => (
//                 <div>
//                   <div className="w-full px-4 py-3 flex items-center justify-between" 
//                     style={{ backgroundColor: requirement.color ? `${requirement.color}20` : '#f3f4f6' }}>
//                     <div className="flex items-center flex-grow">
//                       <div className="w-2 h-8 mr-3 rounded-full" style={{ backgroundColor: requirement.color || '#6b7280' }}></div>
//                       <span>{requirement.name}</span>
//                       <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
//                         {requirementResumes.length}
//                       </span>
//                     </div>
//                     <div className="flex items-center space-x-2 ml-4">
//                       <button
//                         onClick={() => onSyncClassification(requirement)}
//                         disabled={loading.get(requirement.id)}
//                         className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
//                       >
//                         {loading.get(requirement.id) ? (
//                           <Loader2 className="h-4 w-4 animate-spin mr-1" />
//                         ) : (
//                           <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                           </svg>
//                         )}
//                         Sync
//                       </button>
//                       <Disclosure.Button className="p-1">
//                         {open ? (
//                           <ChevronDownIcon className="h-5 w-5 text-gray-500" />
//                         ) : (
//                           <ChevronRightIcon className="h-5 w-5 text-gray-500" />
//                         )}
//                       </Disclosure.Button>
//                     </div>
//                   </div>
                  
//                   <Disclosure.Panel className="px-4 py-3 bg-gray-50">
//                     {requirement.description && (
//                       <p className="text-xs text-gray-500 mb-3">{requirement.description}</p>
//                     )}
                    
//                     {/* Requirements List */}
//                     <Disclosure>
//                       {({ open }: { open: boolean }) => (
//                         <div>
//                           <Disclosure.Button className="flex w-full justify-between rounded-lg bg-white px-3 py-2 text-left text-xs font-medium text-gray-900 shadow-sm">
//                             <span>Requirements</span>
//                             {open ? (
//                               <ChevronDownIcon className="h-4 w-4 text-gray-500" />
//                             ) : (
//                               <ChevronRightIcon className="h-4 w-4 text-gray-500" />
//                             )}
//                           </Disclosure.Button>
//                           <Disclosure.Panel className="px-3 pt-3 pb-2 text-xs text-gray-500">
//                             {/* Show certifications */}
//                             {requirement.certifications.length > 0 && (
//                               <div className="mb-2">
//                                 <h4 className="font-medium text-gray-700 mb-1">Certifications:</h4>
//                                 <div className="flex flex-wrap gap-1">
//                                   {requirement.certifications.map((cert, idx) => (
//                                     <span key={idx} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
//                                       {cert.name}
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>
//                             )}
                            
//                             {/* Show licenses */}
//                             {requirement.licenses && requirement.licenses.length > 0 && (
//                               <div className="mb-2">
//                                 <h4 className="font-medium text-gray-700 mb-1">Licenses:</h4>
//                                 <div className="flex flex-wrap gap-1">
//                                   {requirement.licenses.map((license, idx) => (
//                                     <span key={idx} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
//                                       {license.name}
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>
//                             )}
                            
//                             {/* Show education requirements */}
//                             {requirement.educationRequirements.length > 0 && (
//                               <div className="mb-2">
//                                 <h4 className="font-medium text-gray-700 mb-1">Education:</h4>
//                                 <div className="flex flex-wrap gap-1">
//                                   {requirement.educationRequirements.map((edu, idx) => (
//                                     <span key={idx} className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
//                                       {edu.degree} in {edu.field} {edu.required ? '(Required)' : '(Preferred)'}
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>
//                             )}
                            
//                             {/* Show experience requirements */}
//                             {requirement.experienceRequirements.length > 0 && (
//                               <div className="mb-2">
//                                 <h4 className="font-medium text-gray-700 mb-1">Experience:</h4>
//                                 <div className="flex flex-wrap gap-1">
//                                   {requirement.experienceRequirements.map((exp, idx) => (
//                                     <span key={idx} className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
//                                       {exp.skill} ({exp.yearsRequired}+ years) {exp.required ? '(Required)' : '(Preferred)'}
//                                     </span>
//                                   ))}
//                                 </div>
//                               </div>
//                             )}
                            
//                             {/* Show minimum years experience */}
//                             <div className="mb-2">
//                               <h4 className="font-medium text-gray-700 mb-1">Minimum Years Overall:</h4>
//                               <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
//                                 {requirement.minimumYearsOverallExperience}+ years
//                               </span>
//                             </div>
//                           </Disclosure.Panel>
//                         </div>
//                       )}
//                     </Disclosure>
                    
//                     {/* Resumes matching this classification */}
//                     <div className="mt-4 space-y-3">
//                       {requirementResumes.length > 0 ? (
//                         requirementResumes.map((resume) => (
//                           <ResumeCard 
//                             key={resume.id} 
//                             resume={resume} 
//                             requirement={requirement}
//                             onViewClassification={() => {}}
//                           />
//                         ))
//                       ) : (
//                         <p className="text-sm text-gray-500 text-center py-4">
//                           No resumes match this classification.
//                         </p>
//                       )}
//                     </div>
//                   </Disclosure.Panel>
//                 </div>
//               )}
//             </Disclosure>
//           );
//         })}
        
//         {/* Unclassified resumes */}
//         <Disclosure as="div" defaultOpen={true} className="bg-white shadow rounded-lg overflow-hidden">
//           {({ open }: { open: boolean }) => (
//             <div>
//               <Disclosure.Button className="w-full px-4 py-3 text-left text-sm font-medium flex items-center justify-between bg-gray-100">
//                 <div className="flex items-center">
//                   <div className="w-2 h-8 mr-3 rounded-full bg-gray-400"></div>
//                   <span>Unclassified</span>
//                   <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-800">
//                     {(groupedResumes.get('unclassified') || []).length}
//                   </span>
//                 </div>
//                 {open ? (
//                   <ChevronDownIcon className="h-5 w-5 text-gray-500" />
//                 ) : (
//                   <ChevronRightIcon className="h-5 w-5 text-gray-500" />
//                 )}
//               </Disclosure.Button>
              
//               <Disclosure.Panel className="px-4 py-3 bg-gray-50">
//                 <p className="text-xs text-gray-500 mb-3">
//                   Resumes that do not match any classification with sufficient confidence.
//                 </p>
                
//                 {/* Unclassified resumes */}
//                 <div className="mt-4 space-y-3">
//                   {(groupedResumes.get('unclassified') || []).length > 0 ? (
//                     (groupedResumes.get('unclassified') || []).map((resume) => (
//                       <ResumeCard 
//                         key={resume.id} 
//                         resume={resume}
//                         onViewClassification={() => {}}
//                       />
//                     ))
//                   ) : (
//                     <p className="text-sm text-gray-500 text-center py-4">
//                       No unclassified resumes.
//                     </p>
//                   )}
//                 </div>
//               </Disclosure.Panel>
//             </div>
//           )}
//         </Disclosure>
//       </div>

//       {/* Create Requirement Dialog */}
//       <Transition appear show={isCreateModalOpen} as={React.Fragment}>
//         <Dialog as="div" className="relative z-10" onClose={() => setIsCreateModalOpen(false)}>
//           <Transition.Child
//             as={React.Fragment}
//             enter="ease-out duration-300"
//             enterFrom="opacity-0"
//             enterTo="opacity-100"
//             leave="ease-in duration-200"
//             leaveFrom="opacity-100"
//             leaveTo="opacity-0"
//           >
//             <div className="fixed inset-0 bg-black bg-opacity-25" />
//           </Transition.Child>

//           <div className="fixed inset-0 overflow-y-auto">
//             <div className="flex min-h-full items-center justify-center p-4 text-center">
//               <Transition.Child
//                 as={React.Fragment}
//                 enter="ease-out duration-300"
//                 enterFrom="opacity-0 scale-95"
//                 enterTo="opacity-100 scale-100"
//                 leave="ease-in duration-200"
//                 leaveFrom="opacity-100 scale-100"
//                 leaveTo="opacity-0 scale-95"
//               >
//                 <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
//                   <Dialog.Title
//                     as="h3"
//                     className="text-lg font-medium leading-6 text-gray-900"
//                   >
//                     Quick Create Requirement
//                   </Dialog.Title>
//                   <div className="mt-2">
//                     <p className="text-sm text-gray-500">
//                       Create a basic classification requirement quickly. For more detailed settings, use the settings page.
//                     </p>
//                   </div>

//                   <div className="mt-4 space-y-4">
//                     <div>
//                       <label htmlFor="name" className="block text-sm font-medium text-gray-700">
//                         Requirement Name <span className="text-red-500">*</span>
//                       </label>
//                       <input
//                         type="text"
//                         name="name"
//                         id="name"
//                         value={newRequirementName}
//                         onChange={(e) => setNewRequirementName(e.target.value)}
//                         className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                         placeholder="e.g., Software Engineer"
//                         required
//                       />
//                     </div>
                    
//                     <div>
//                       <label htmlFor="description" className="block text-sm font-medium text-gray-700">
//                         Description
//                       </label>
//                       <textarea
//                         name="description"
//                         id="description"
//                         rows={2}
//                         value={newRequirementDescription}
//                         onChange={(e) => setNewRequirementDescription(e.target.value)}
//                         className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
//                         placeholder="Brief description of this requirement"
//                       />
//                     </div>
                    
//                     <div>
//                       <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">
//                         Match Threshold (%)
//                       </label>
//                       <div className="flex items-center mt-1">
//                         <input
//                           type="range"
//                           name="threshold"
//                           id="threshold"
//                           min="0"
//                           max="100"
//                           step="5"
//                           value={newRequirementThreshold}
//                           onChange={(e) => setNewRequirementThreshold(parseInt(e.target.value))}
//                           className="mr-3 flex-grow"
//                         />
//                         <span className="w-10 text-gray-700">{newRequirementThreshold}%</span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="mt-6 flex justify-between">
//                     <div className="flex gap-2">
//                       <button
//                         type="button"
//                         className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200"
//                         onClick={() => setIsCreateModalOpen(false)}
//                       >
//                         Cancel
//                       </button>
//                       <button
//                         type="button"
//                         className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200"
//                         onClick={() => {
//                           setIsCreateModalOpen(false);
//                           window.location.href = '/settings';
//                         }}
//                       >
//                         Advanced Settings
//                       </button>
//                     </div>
//                     <button
//                       type="button"
//                       className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
//                       onClick={handleCreateQuickRequirement}
//                       disabled={!newRequirementName.trim()}
//                     >
//                       Create
//                     </button>
//                   </div>
//                 </Dialog.Panel>
//               </Transition.Child>
//             </div>
//           </div>
//         </Dialog>
//       </Transition>
//     </div>
//   );
// }; 