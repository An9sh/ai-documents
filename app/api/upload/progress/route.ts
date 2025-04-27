import { NextResponse } from "next/server";
import { getProgress } from "../../../lib/db/progress";

// Use a Map to store controllers
const uploadProgressControllers = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let isStreamClosed = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const checkProgress = async () => {
        if (isStreamClosed) return;

        try {
          const progress = await getProgress(uploadId);
          if (progress) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
            } catch (err) {
              // If we can't enqueue, the stream is likely closed
              isStreamClosed = true;
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              return;
            }
            
            // Close the stream if the upload is completed or errored
            if (progress.status === 'completed' || progress.status === 'error') {
              isStreamClosed = true;
              if (timeoutId) {
                clearTimeout(timeoutId);
              }
              controller.close();
              return;
            }
          }
        } catch (error) {
          console.error('Error checking progress:', error);
          isStreamClosed = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          try {
            controller.close();
          } catch (err) {
            // Ignore errors when closing an already closed controller
          }
          return;
        }

        // Schedule next check if stream is still open
        if (!isStreamClosed) {
          timeoutId = setTimeout(checkProgress, 1000);
        }
      };

      // Start checking progress
      checkProgress();

      // Cleanup function
      return () => {
        isStreamClosed = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        try {
          controller.close();
        } catch (err) {
          // Ignore errors when closing an already closed controller
        }
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Export the Map for use in other files
export { uploadProgressControllers }; 