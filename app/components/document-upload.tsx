// "use client";

// import React, { useState } from 'react';
// import { DocumentMetadata } from '@/types';
// import { UploadButton } from '@/components/uploadthing';

// interface DocumentUploadProps {
//   documents: DocumentMetadata[];
//   onDocumentSelect: (doc: DocumentMetadata) => void;
//   onUploadComplete: (documents: DocumentMetadata[]) => void;
// }

// export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
//   const [isUploading, setIsUploading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [uploadedDocuments, setUploadedDocuments] = useState<DocumentMetadata[]>([]);

//   const handleUploadComplete = (res: any[]) => {
//     if (res) {
//       const newDocs = res.map(file => ({
//         id: file.key,
//         filename: file.name,
//         uploadedAt: new Date(),
//         summary: "Document uploaded successfully",
//         pageCount: 1,
//         fileSize: file.size,
//         namespace: file.key,
//         url: file.url
//       }));
//       setUploadedDocuments(prev => [...prev, ...newDocs]);
//       onUploadComplete(newDocs);
//     }
//     setIsUploading(false);
//   };

//   const handleUploadError = (error: Error) => {
//     console.error("Upload error:", error);
//     setError(error.message);
//     setIsUploading(false);
//   };

//   const formatFileSize = (bytes: number): string => {
//     if (bytes === 0) return '0 Bytes';
//     const k = 1024;
//     const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//   };

//   return (
//     <div className="space-y-6">
//       <div className="bg-white shadow rounded-lg p-6">
//         <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Documents</h2>
//         <div className="space-y-4">
//           <UploadButton
//             endpoint="pdfUploader"
//             onClientUploadComplete={handleUploadComplete}
//             onUploadError={handleUploadError}
//           />
//           {error && (
//             <p className="text-sm text-red-600">{error}</p>
//           )}
//         </div>
//       </div>

//       {/* Uploaded Documents Section */}
//       <div className="bg-white shadow rounded-lg p-6">
//         <h2 className="text-lg font-medium text-gray-900 mb-4">Uploaded Documents</h2>
//         {uploadedDocuments.length === 0 ? (
//           <p className="text-gray-500">No documents uploaded yet.</p>
//         ) : (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Document Name
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Size
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Upload Date
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {uploadedDocuments.map((doc) => (
//                   <tr key={doc.id}>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                       {doc.filename}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {formatFileSize(doc.fileSize)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       {new Date(doc.uploadedAt).toLocaleDateString()}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                       <a
//                         href={doc.url}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="text-indigo-600 hover:text-indigo-900"
//                       >
//                         View
//                       </a>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }; 