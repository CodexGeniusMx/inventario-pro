import { NextResponse } from "next/server"

import { requireUser } from "@/lib/auth/session"
import { runKeepAiQuery } from "@/lib/keep-ai/orchestrator"
import type { KeepAiConversationMessage } from "@/lib/keep-ai/types"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser()
    const body = (await request.json()) as {
      message?: string
      history?: KeepAiConversationMessage[]
    }

    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "Escribe una pregunta para Keep AI." },
        { status: 400 }
      )
    }

    const response = await runKeepAiQuery(
      user,
      body.message.trim(),
      body.history ?? []
    )

    const includeDebug = process.env.NODE_ENV === "development"
    if (!includeDebug) {
      return NextResponse.json(response)
    }

    const { detectFallbackTool } = await import("@/lib/keep-ai/fallback")
    const detection = detectFallbackTool(
      body.message.trim(),
      body.history ?? []
    )

    return NextResponse.json({
      ...response,
      debug: {
        tool: detection.tool,
        intent: detection.intent,
        provider: response.provider ?? "unknown",
      },
    })
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la consulta." },
      { status: 403 }
    )
  }
}
