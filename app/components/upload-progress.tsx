'use client';

import { useEffect, useState } from 'react';

interface ProgressData {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
}

interface UploadProgressProps {
  uploadId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function UploadProgress({ uploadId, onComplete, onError }: UploadProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    status: 'uploading',
    message: 'Starting upload...',
    progress: 0
  });

  useEffect(() => {
    // Create SSE connection
    const eventSource = new EventSource(`/api/upload/progress?uploadId=${uploadId}`);

    console.log("Upload ID:", eventSource);

    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        setProgress(data);

        // Handle completion
        if (data.status === 'completed') {
          eventSource.close();
          onComplete?.();
        }
        // Handle errors
        else if (data.status === 'error') {
          eventSource.close();
          onError?.(data.message);
        }
      } catch (error) {
        console.error('Error parsing progress data:', error);
        eventSource.close();
        onError?.('Failed to parse progress update');
      }
    };

    // Handle connection errors
    eventSource.onerror = () => {
      eventSource.close();
      onError?.('Connection to server lost');
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [uploadId, onComplete, onError]);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {progress.message}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {progress.progress}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${
              progress.status === 'error'
                ? 'bg-red-500'
                : progress.status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>
      {progress.status === 'error' && (
        <div className="text-red-500 text-sm mt-2">
          {progress.message}
        </div>
      )}
    </div>
  );
} 