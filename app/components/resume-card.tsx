// import React from 'react';
// import { ClassificationRequirement, ParsedResume } from '../types/resume';

// interface ResumeCardProps {
//   resume: ParsedResume;
//   requirement?: ClassificationRequirement;
//   onViewClassification: (resume: ParsedResume) => void;
// }

// export const ResumeCard: React.FC<ResumeCardProps> = ({ resume, requirement, onViewClassification }) => {
//   if (!resume.classificationData) {
//     return (
//       <div className="border-gray-200 bg-white rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-shadow cursor-pointer"
//         onClick={() => onViewClassification(resume)}>
//         <h3 className="text-sm font-medium text-gray-900">{resume.name}</h3>
//         {resume.experience && resume.experience[0] && (
//           <p className="text-xs text-gray-500">{resume.experience[0].title}</p>
//         )}
//         <p className="text-xs text-gray-500 mt-2">No classification data available</p>
//       </div>
//     );
//   }
  
//   const isPrimary = resume.classificationData.classifications.some(c => c.isPrimary);
//   const isSecondary = !isPrimary && resume.classificationData.classifications.some(c => c.isSecondary);
  
//   // Find the primary or highest scoring classification for this resume
//   const primaryClassification = resume.classificationData.classifications.find(c => c.isPrimary) || 
//                                resume.classificationData.classifications[0];
  
//   // Border color based on match quality
//   let borderColor = "border-gray-200";
//   let bgColor = "bg-white";
  
//   if (primaryClassification) {
//     if (primaryClassification.score >= 90) {
//       borderColor = "border-green-500";
//       bgColor = "bg-green-50";
//     } else if (primaryClassification.score >= 70) {
//       borderColor = "border-blue-500";
//       bgColor = "bg-blue-50";
//     } else if (primaryClassification.score >= 50) {
//       borderColor = "border-yellow-500";
//       bgColor = "bg-yellow-50";
//     } else {
//       borderColor = "border-red-500";
//       bgColor = "bg-red-50";
//     }
//   }
  
//   return (
//     <div 
//       className={`${borderColor} ${bgColor} rounded-lg shadow-sm border-2 p-4 hover:shadow-md transition-shadow cursor-pointer`}
//       onClick={() => onViewClassification(resume)}
//     >
//       <div className="flex items-start justify-between">
//         <div>
//           <h3 className="text-sm font-medium text-gray-900">{resume.name}</h3>
//           {resume.experience && resume.experience[0] && (
//             <p className="text-xs text-gray-500">{resume.experience[0].title}</p>
//           )}
//         </div>
        
//         {/* Match labels */}
//         <div className="flex space-x-1">
//           {isPrimary && (
//             <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
//               Primary
//             </span>
//           )}
//           {isSecondary && (
//             <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
//               Secondary
//             </span>
//           )}
//         </div>
//       </div>
      
//       {/* Match score & confidence */}
//       {primaryClassification && (
//         <div className="mt-2 flex items-center justify-between">
//           <div className="flex items-center space-x-2">
//             <span className="text-xs font-medium text-gray-700">
//               Match: {primaryClassification.score}%
//             </span>
//             <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
//               <div 
//                 className={`h-full ${primaryClassification.score >= 90 ? 'bg-green-500' : 
//                                      primaryClassification.score >= 70 ? 'bg-blue-500' : 
//                                      primaryClassification.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
//                 style={{ width: `${primaryClassification.score}%` }}
//               />
//             </div>
//           </div>
//           <span className="text-xs font-medium text-gray-700">
//             Confidence: {Math.round(primaryClassification.confidence * 100)}%
//           </span>
//         </div>
//       )}
      
//       {/* Matched requirements */}
//       {primaryClassification && (
//         <div className="mt-2">
//           <div className="flex flex-wrap gap-1 mt-1">
//             {primaryClassification.details.certifications.matched.map((cert, i) => (
//               <span key={i} className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
//                 {cert.name}
//               </span>
//             ))}
//             {primaryClassification.details.licenses.matched.map((lic, i) => (
//               <span key={i} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
//                 {lic.name}
//               </span>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }; 