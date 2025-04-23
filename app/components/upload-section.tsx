"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { DocumentMetadata } from '../types';
import { CloudArrowUpIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import { uploadDocument } from '../lib/db/documents';
import { useAuth } from '../contexts/auth-context';
import { UploadProgress } from './upload-progress';
import { v4 as uuidv4 } from 'uuid';

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

export function UploadSection({ onUploadComplete }: UploadSectionProps) {
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    document: DocumentMetadata;
    matchedRequirements: MatchResult[];
  } | null>(null);
  const { user } = useAuth();
  const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 1) {
      setError('Please upload only one PDF file at a time');
      return;
    }

    const file = acceptedFiles[0];
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size exceeds 10MB limit');
      return;
    }

    setError(null);
    setUploadResults(null);
    const newUploadId = uuidv4();
    setUploadId(newUploadId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`,
          'X-Upload-Id': newUploadId
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      onUploadComplete([data.document]);
      setUploadResults(data);
      setShowResults(true);
      setUploadId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploadId(null);
    }
  }, [onUploadComplete, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500'
          } ${uploadId ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} disabled={!!uploadId} />
          <CloudArrowUpIcon className={`mx-auto h-12 w-12 text-gray-400`} />
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-900">
              {isDragActive 
                ? 'Drop the files here' 
                : 'Drag and drop files here, or click to select files'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              PDF files up to 10MB
            </p>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {uploadId && (
          <div className="mt-4">
            <UploadProgress
              uploadId={uploadId}
              onComplete={() => {
                setUploadId(null);
                setError(null);
              }}
              onError={(errorMessage) => {
                setError(errorMessage);
                setUploadId(null);
              }}
            />
          </div>
        )}
      </div>

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
                                <ul className="mt-1 space-y-1">
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
    </>
  );
} 