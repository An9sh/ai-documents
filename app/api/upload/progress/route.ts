import { NextResponse } from "next/server";
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