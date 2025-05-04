"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentMetadata } from '../types';
import { DocumentManager } from '../lib/DocumentManager';
import { BackgroundJob } from '../lib/services/background-job';
import { Dialog } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/auth-context';

interface UploadSectionProps {
  onUploadComplete: (documents: DocumentMetadata[]) => void;
}

interface MatchResult {
  documentId: string;
  requirementId: string;
  score: number;
  confidence: string;
  isMatched: boolean;
  reason: string;
  threshold: number;
  vectorScore: number;
  aiScore: number;
  matchedContent?: string[];
  requirement?: string;
}

// interface Classification {
//   requirementId?: string;
//   score?: {
//     final?: number;
//     vector?: number;
//     ai?: number;
//     threshold?: number;
//   };
//   confidence?: string;
//   match?: boolean;
//   reason?: string;
//   requirement?: string;
//   matchedContent?: string[];
// }

export function UploadSection({ onUploadComplete }: UploadSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});
  const [uploadResults, setUploadResults] = useState<{
    document: DocumentMetadata;
    matchedRequirements: MatchResult[];
  } | null>(null);
  const { user } = useAuth();

  // app/components/upload-section.tsx
const onDrop = useCallback(async (acceptedFiles: File[]) => {
  if (!user) {
    setError('Please sign in to upload documents');
    return;
  }

  const manager = new DocumentManager();

  try {
    setError(null);
    setUploadProgress(0);
    setUploading(true);
    setShowResults(false);
    setExpandedReasons({});

    const token = await user.getIdToken();
    const documents = await manager.uploadDocuments(acceptedFiles, user.uid, token);
    console.log('Raw documents:', documents);

    const jobId = documents[0]?.uploadId;
    if (!jobId) {
      throw new Error('No jobId found in upload response');
    }

    const jobResult = await BackgroundJob.getJobResult(jobId, token);
    console.log('Job result:', jobResult);

    const transformedResults = {
      document: jobResult.document || documents[0],
      matchedRequirements: (jobResult.classifications || []).map((match: any) => ({
        documentId: match.documentId,
        requirementId: match.requirementId,
        score: match.score,
        confidence: match.confidence,
        isMatched: match.isMatched,
        reason: match.reason,
        threshold: match.threshold,
        vectorScore: match.vectorScore,
        aiScore: match.aiScore,
        matchedContent: match.matchedContent,
        requirement: match.requirement,
      })),
    };

    setUploadResults(transformedResults);
    setShowResults(true);
    onUploadComplete([jobResult.document || documents[0]]);

  } catch (err) {
    console.error(err);
    setError(err instanceof Error ? err.message : 'Upload failed');
  } finally {
    setUploading(false);
    setUploadProgress(100);
  }
}, [user, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 10 * 1024 * 1024, // 10 MB limit
    multiple: true
  });

  return (
    <div className="space-y-6">
      {/* Upload box */}
      <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop your PDF files here...</p>
        ) : (
          <p>Drag & drop PDF files here, or click to select</p>
        )}
        <p className="text-sm text-gray-500 mt-2">Up to 10 PDFs (max 10MB each)</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="mt-4">
          <div className="text-sm text-gray-500 mb-2">Uploading... {uploadProgress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div
              className="bg-indigo-600 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Results Dialog */}
      <Dialog
        open={showResults}
        onClose={() => setShowResults(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-2xl rounded-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Document Analysis Results
            </Dialog.Title>

            {uploadResults && (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-medium text-gray-900">Document Details</h3>
                  <p className="text-sm text-gray-500">Filename: {uploadResults.document.filename}</p>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Requirement Matches</h3>
                  <div className="space-y-3">
                    {uploadResults.matchedRequirements.map((match, index) => (
                      <div key={index} className="flex flex-col p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start space-x-3">
                          {match.isMatched ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-grow">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {match.requirement || 'Unnamed Requirement'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                Score:
                              </span>
                              <span className="text-sm px-2 py-1 bg-gray-50 text-gray-700 rounded border">
                                {Math.round(match.score)}%
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                match.confidence === 'high' 
                                  ? 'bg-green-100 text-green-800'
                                  : match.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {match.confidence} confidence
                              </span>
                            </div>
                            
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  const newExpandedReasons = { ...expandedReasons };
                                  newExpandedReasons[index] = !newExpandedReasons[index];
                                  setExpandedReasons(newExpandedReasons);
                                }}
                                className="flex items-center text-sm font-medium text-gray-900 hover:text-indigo-600"
                              >
                                <span>Match Reason</span>
                                <ChevronDownIcon
                                  className={`h-4 w-4 ml-1 transition-transform ${
                                    expandedReasons[index] ? 'transform rotate-180' : ''
                                  }`}
                                />
                              </button>
                              {expandedReasons[index] && (
                                <p className="text-sm text-gray-600 mt-1">{match.reason}</p>
                              )}
                            </div>

                            {match.matchedContent && match.matchedContent.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-900">Matched Content:</p>
                                <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                                  {match.matchedContent.map((content, idx) => (
                                    <li key={idx} className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200">
                                      {content}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {(!match.matchedContent || match.matchedContent.length === 0) && match.isMatched && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-sm text-yellow-800">
                                  ⚠️ Warning: No specific content matches found in the document. This match might be incorrect.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={() => setShowResults(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}