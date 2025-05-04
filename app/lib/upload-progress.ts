import { updateProgress } from './db/progress';

interface ProgressData {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
}

const progressMap = new Map<string, ProgressData>();

export async function sendProgressUpdate(uploadId: string, data: ProgressData) {
  progressMap.set(uploadId, data);
}

export async function getProgress(uploadId: string): Promise<ProgressData> {
  return progressMap.get(uploadId) || {
    status: 'error',
    message: 'Progress not found',
    progress: 0
  };
} 