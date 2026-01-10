import { auth } from "@/auth";
import { AIService, type ChatMessage } from "@/lib/core-modules/ai";

/**
 * POST /api/ai/chat/stream
 * AIチャットメッセージをストリーミングで送信
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const { messages, systemPrompt } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const config = await AIService.getConfig();

    if (!config.enabled) {
      return new Response(JSON.stringify({ error: "AI is not enabled" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // デフォルトのシステムプロンプト
    const defaultSystemPrompt = "You are a helpful AI assistant. Be concise and helpful in your responses. Respond in the same language as the user's message.";
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // システムプロンプトをメッセージの先頭に追加
    const messagesWithSystem: ChatMessage[] = [
      { role: "system", content: finalSystemPrompt },
      ...messages.filter((m: ChatMessage) => m.role !== "system"),
    ];

    // ストリーミングレスポンスを作成
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamChat(config, messagesWithSystem, controller);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Streaming failed";
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ error: message })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in AI chat stream:", error);
    const message = error instanceof Error ? error.message : "Failed to stream AI response";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function streamChat(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  controller: ReadableStreamDefaultController
) {
  const encoder = new TextEncoder();

  const sendChunk = (content: string) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
  };

  const sendDone = () => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
  };

  if (config.provider === "local") {
    if (config.localProvider === "ollama") {
      await streamOllama(config, messages, sendChunk, sendDone);
    } else {
      await streamOpenAICompatible(config, messages, sendChunk, sendDone);
    }
  } else if (config.provider === "openai") {
    await streamOpenAI(config, messages, sendChunk, sendDone);
  } else if (config.provider === "anthropic") {
    await streamAnthropic(config, messages, sendChunk, sendDone);
  }
}

// OpenAI APIストリーミング
async function streamOpenAI(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void
) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  await processSSEStream(response, sendChunk, sendDone, "openai");
}

// Anthropic APIストリーミング
async function streamAnthropic(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void
) {
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-haiku-20240307",
      max_tokens: 2000,
      system: systemMessage?.content,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  await processSSEStream(response, sendChunk, sendDone, "anthropic");
}

// OpenAI互換APIストリーミング (llama.cpp, LM Studio)
async function streamOpenAICompatible(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void
) {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.localModel || "default",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local LLM error: ${response.status}`);
  }

  await processSSEStream(response, sendChunk, sendDone, "openai");
}

// Ollama APIストリーミング
async function streamOllama(
  config: Awaited<ReturnType<typeof AIService.getConfig>>,
  messages: ChatMessage[],
  sendChunk: (content: string) => void,
  sendDone: () => void
) {
  const response = await fetch(config.localEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.localModel || "llama3.2",
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  // Ollamaは独自のJSON Lines形式
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          sendChunk(data.message.content);
        }
        if (data.done) {
          sendDone();
          return;
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  sendDone();
}

// SSEストリームを処理
async function processSSEStream(
  response: Response,
  sendChunk: (content: string) => void,
  sendDone: () => void,
  format: "openai" | "anthropic"
) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);

      if (data === "[DONE]") {
        sendDone();
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (format === "openai") {
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            sendChunk(content);
          }
        } else if (format === "anthropic") {
          if (parsed.type === "content_block_delta") {
            const content = parsed.delta?.text;
            if (content) {
              sendChunk(content);
            }
          } else if (parsed.type === "message_stop") {
            sendDone();
            return;
          }
        }
      } catch {
        // パースエラーは無視
      }
    }
  }

  sendDone();
}
