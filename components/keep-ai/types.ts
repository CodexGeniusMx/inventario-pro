import type {
  KeepAiPreparedAction,
  KeepAiMessageRole,
} from "@/lib/keep-ai/types"

export type { KeepAiPreparedAction }

export type KeepAiMessage = {
  id: string
  role: KeepAiMessageRole
  content: string
  links?: Array<{ label: string; href: string }>
  preparedAction?: KeepAiPreparedAction
  denied?: boolean
  clarificationOptions?: string[]
}

export const KEEP_AI_QUICK_PROMPTS = [
  "¿Qué productos tenemos?",
  "¿Qué productos tienen stock bajo?",
  "¿Cuánto vendimos hoy?",
  "¿Qué compras están pendientes?",
] as const
