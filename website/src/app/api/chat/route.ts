import { createClient } from "@supabase/supabase-js";
import { encode } from "gpt-tokenizer";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    : null;

const MAX_TOTAL_CHARS = 500000;
const MAX_NUMBER_TOKENS = 120000;

function truncateMessages(messages: ChatMessage[]): ChatMessage[] {
  // ... (same as your code) ...
}

export async function POST(req: Request) {
  let messages: ChatMessage[] = [];
  let source: string | null = null;

  try {
    ({ messages } = await req.json());
    const namespace = req.headers.get("x-namespace");
    source = req.headers.get("x-source");
    const truncatedMessages = truncateMessages(messages);

    // Only Ollama
    const ollamaResponse = await fetch(
      process.env.OLLAMA_API_BASE || "http://host.docker.internal:11434/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.MODEL_NAME || "mistral",
          messages: truncatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      }
    );
    const data = await ollamaResponse.json();
    const result = data.message?.content || data.choices?.[0]?.message?.content || "";

    // Optionally log to Supabase
    if (supabase) {
      try {
        const { error } = await supabase
          .from("frontend_ai_requests")
          .insert({
            messages,
            namespace,
            source: source || "unknown",
          });
        if (error) {
          console.error("Supabase insert error:", error);
        } else {
          console.log("Successfully logged to Supabase");
        }
      } catch (err) {
        console.error("Failed to log to Supabase:", err);
      }
    }

    return new Response(result, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
