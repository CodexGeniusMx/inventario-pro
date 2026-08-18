import type { AuthenticatedUser } from "@/lib/auth/types"
import { callKeepAiLlm, isKeepAiLlmConfigured } from "@/lib/keep-ai/provider"
import { runKeepAiFallback } from "@/lib/keep-ai/fallback"
import {
  KEEP_AI_TOOL_DEFINITIONS,
  buildKeepAiSystemPrompt,
  toLlmMessages,
  type LlmMessage,
} from "@/lib/keep-ai/tools/definitions"
import { executeKeepAiTool } from "@/lib/keep-ai/tools/executor"
import type {
  KeepAiConversationMessage,
  KeepAiPreparedAction,
  KeepAiResponse,
} from "@/lib/keep-ai/types"

const MAX_TOOL_ROUNDS = 3

export async function runKeepAiAgent(
  user: AuthenticatedUser,
  message: string,
  history: KeepAiConversationMessage[] = []
): Promise<KeepAiResponse> {
  if (!user.aiEnabled) {
    return {
      intent: "unknown",
      message: "Keep AI está desactivado para esta organización.",
      denied: true,
      provider: "fallback",
    }
  }

  if (!user.aiAllowQueries) {
    return {
      intent: "unknown",
      message: "Las consultas de Keep AI están desactivadas.",
      denied: true,
      provider: "fallback",
    }
  }

  const conversation: KeepAiConversationMessage[] = [
    ...history.slice(-8),
    { role: "user", content: message },
  ]

  if (!isKeepAiLlmConfigured()) {
    const fallback = await runKeepAiFallback(user, message, history)
    return { ...fallback, provider: "fallback" }
  }

  try {
    const systemPrompt = buildKeepAiSystemPrompt(user.organizationBaseCurrency)
    const llmMessages: LlmMessage[] = toLlmMessages(systemPrompt, conversation)
    let preparedAction: KeepAiPreparedAction | undefined
    let denied = false

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const { content, toolCalls } = await callKeepAiLlm(
        llmMessages,
        KEEP_AI_TOOL_DEFINITIONS
      )

      if (toolCalls.length === 0) {
        return {
          intent: "unknown",
          message:
            content?.trim() ||
            "No pude generar una respuesta. Intenta reformular tu pregunta.",
          preparedAction,
          denied,
          provider: "llm",
        }
      }

      llmMessages.push({
        role: "assistant",
        content,
        tool_calls: toolCalls,
      })

      for (const toolCall of toolCalls) {
        const args = JSON.parse(toolCall.function.arguments || "{}") as Record<
          string,
          unknown
        >
        const result = await executeKeepAiTool(
          user,
          toolCall.function.name,
          args
        )

        if (result.denied) denied = true
        if (result.preparedAction) preparedAction = result.preparedAction

        llmMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }
    }

    const final = await callKeepAiLlm(llmMessages, KEEP_AI_TOOL_DEFINITIONS)
    return {
      intent: "unknown",
      message:
        final.content?.trim() ||
        "Consulté la información disponible. ¿Quieres que profundice en algo?",
      preparedAction,
      denied,
      provider: "llm",
    }
  } catch {
    const fallback = await runKeepAiFallback(user, message, history)
    return {
      ...fallback,
      message: `${fallback.message}\n\n(Nota: el proveedor de IA no respondió; se usó el modo de respaldo.)`,
      provider: "fallback",
    }
  }
}
