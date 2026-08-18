import type { LlmMessage, LlmToolCall } from "@/lib/keep-ai/tools/definitions"

type OpenAiChatResponse = {
  choices: Array<{
    message: {
      content: string | null
      tool_calls?: LlmToolCall[]
    }
  }>
}

export function isKeepAiLlmConfigured(): boolean {
  return Boolean(process.env.KEEP_AI_API_KEY ?? process.env.OPENAI_API_KEY)
}

export async function callKeepAiLlm(
  messages: LlmMessage[],
  tools: unknown[]
): Promise<{ content: string | null; toolCalls: LlmToolCall[] }> {
  const apiKey = process.env.KEEP_AI_API_KEY ?? process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("KEEP_AI_API_KEY not configured")
  }

  const baseUrl =
    process.env.KEEP_AI_BASE_URL?.replace(/\/$/, "") ??
    "https://api.openai.com/v1"
  const model = process.env.KEEP_AI_MODEL ?? "gpt-4o-mini"

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`LLM request failed: ${response.status} ${body}`)
  }

  const payload = (await response.json()) as OpenAiChatResponse
  const message = payload.choices[0]?.message

  return {
    content: message?.content ?? null,
    toolCalls: message?.tool_calls ?? [],
  }
}
