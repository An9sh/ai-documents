import { NextResponse } from "next/server";

interface ProgressData {
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
}

declare global {
  var uploadProgressControllers: {
    [key: string]: ReadableStreamDefaultController;
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller to send updates later
      global.uploadProgressControllers = global.uploadProgressControllers || {};
      global.uploadProgressControllers[uploadId] = controller;
    },
    cancel() {
      // Clean up when the client disconnects
      if (global.uploadProgressControllers) {
        delete global.uploadProgressControllers[uploadId];
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Helper function to send progress updates
export function sendProgressUpdate(uploadId: string, data: ProgressData) {
  const encoder = new TextEncoder();
  if (global.uploadProgressControllers && global.uploadProgressControllers[uploadId]) {
    const controller = global.uploadProgressControllers[uploadId];
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }
} 