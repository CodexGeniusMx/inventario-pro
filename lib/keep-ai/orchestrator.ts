import type { AuthenticatedUser } from "@/lib/auth/types"
import { runKeepAiAgent } from "@/lib/keep-ai/agent"
import type {
  KeepAiConversationMessage,
  KeepAiPreparedAction,
  KeepAiResponse,
} from "@/lib/keep-ai/types"

export type { KeepAiPreparedAction, KeepAiResponse, KeepAiConversationMessage }

export async function runKeepAiQuery(
  user: AuthenticatedUser,
  message: string,
  history: KeepAiConversationMessage[] = []
): Promise<KeepAiResponse> {
  return runKeepAiAgent(user, message, history)
}

export { canViewCostsInKeepAi } from "@/lib/keep-ai/permissions"
