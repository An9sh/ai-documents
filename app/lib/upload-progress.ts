interface ProgressData {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
}

export function sendProgressUpdate(uploadId: string, data: ProgressData) {
  const encoder = new TextEncoder();
  if (global.uploadProgressControllers && global.uploadProgressControllers[uploadId]) {
    const controller = global.uploadProgressControllers[uploadId];
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }
} 