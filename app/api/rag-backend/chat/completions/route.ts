/**
 * Streaming proxy for RAG backend chat completions.
 *
 * This route properly handles Server-Sent Events (SSE) streaming
 * by using ReadableStream instead of Next.js rewrites.
 */

const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || "http://localhost:8000";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(`${RAG_BACKEND_URL}/api/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return new Response(response.statusText, { status: response.status });
  }

  // Create a TransformStream to pass through the SSE data
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (error) {
        console.error("Streaming error:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
