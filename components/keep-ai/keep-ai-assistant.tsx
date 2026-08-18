"use client"

import Link from "next/link"
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react"
import { Loader2, SendHorizontal, Sparkles, X } from "lucide-react"

import { KeepAiActionPreview } from "@/components/keep-ai/keep-ai-action-preview"
import {
  KEEP_AI_QUICK_PROMPTS,
  type KeepAiMessage,
} from "@/components/keep-ai/types"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { canUseKeepAi } from "@/lib/auth/permissions"
import type { KeepAiResponse } from "@/lib/keep-ai/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type KeepAiAssistantProps = {
  user: AuthenticatedUser
}

function createMessageId(): string {
  return crypto.randomUUID()
}

export function KeepAiAssistant({ user }: KeepAiAssistantProps) {
  const panelId = useId()
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<KeepAiMessage[]>([])
  const [pendingPreviewId, setPendingPreviewId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const enabled = canUseKeepAi(user)

  const close = useCallback(() => {
    setOpen(false)
    launcherRef.current?.focus()
  }, [])

  const submitMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isPending) return

      setError(null)
      setDraft("")
      setPendingPreviewId(null)

      const userMessage: KeepAiMessage = {
        id: createMessageId(),
        role: "user",
        content: trimmed,
      }

      setMessages((current) => [...current, userMessage])

      startTransition(async () => {
        try {
          const history = messages.map((entry) => ({
            role: entry.role,
            content: entry.content,
          }))

          const result = await fetch("/api/keep-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed, history }),
          })

          if (!result.ok) {
            setError("No se pudo procesar la consulta.")
            return
          }

          const response = (await result.json()) as KeepAiResponse
          const assistantMessage: KeepAiMessage = {
            id: createMessageId(),
            role: "assistant",
            content: response.message,
            links: response.links,
            preparedAction: response.preparedAction,
            clarificationOptions: response.clarificationOptions,
            denied: response.denied,
          }

          setMessages((current) => [...current, assistantMessage])

          if (response.preparedAction) {
            setPendingPreviewId(assistantMessage.id)
          }
        } catch {
          setError("No se pudo conectar con Keep AI.")
        }
      })
    },
    [isPending]
  )

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, close])

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  if (!enabled) {
    return null
  }

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar panel de Keep AI"
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px] md:bg-black/5"
          onClick={close}
        />
      )}

      <aside
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${panelId}-title`}
        aria-hidden={!open}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden border bg-popover text-popover-foreground shadow-xl transition-all duration-300 ease-out",
          "max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[85vh] max-md:rounded-t-2xl",
          "md:right-4 md:w-[min(400px,calc(100vw-5rem))] md:rounded-2xl md:ring-1 md:ring-foreground/5",
          open
            ? "max-md:translate-y-0 md:bottom-[calc(130px+3.5rem+1rem)] md:opacity-100"
            : "pointer-events-none max-md:translate-y-full md:bottom-[calc(130px+3.5rem+1rem)] md:translate-x-4 md:opacity-0"
        )}
        style={{
          maxHeight: open ? "min(640px, 85vh)" : undefined,
        }}
      >
        <header className="flex items-start justify-between gap-3 border-b px-4 py-4">
          <div>
            <h2
              id={`${panelId}-title`}
              className="flex items-center gap-2 text-base font-semibold"
            >
              <Sparkles className="size-4 text-primary" aria-hidden />
              Keep AI
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              ¿Qué necesitas?
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Cerrar Keep AI"
            onPress={close}
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pregunta sobre inventario, ventas, compras o existencias.
              </p>
              <div className="flex flex-wrap gap-2">
                {KEEP_AI_QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="rounded-full border bg-background px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
                    onClick={() => submitMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "mr-auto border bg-background"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {message.role === "assistant" &&
                    message.preparedAction &&
                    pendingPreviewId === message.id && (
                      <div className="mt-3">
                        <KeepAiActionPreview
                          action={message.preparedAction}
                          onCancel={() => setPendingPreviewId(null)}
                          onConfirm={() => {
                            setPendingPreviewId(null)
                            setMessages((current) => [
                              ...current,
                              {
                                id: createMessageId(),
                                role: "assistant",
                                content:
                                  "La confirmación de acciones estará disponible en una fase posterior. Usa el flujo correspondiente en la aplicación para completar la operación.",
                              },
                            ])
                          }}
                        />
                      </div>
                    )}

                  {message.links && message.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="text-xs font-medium underline-offset-4 hover:underline"
                          onClick={close}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isPending && (
                <div className="mr-auto flex items-center gap-2 rounded-2xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Consultando…
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <form
          className="border-t p-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitMessage(draft)
          }}
        >
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Pregunta sobre tu inventario..."
              aria-label="Mensaje para Keep AI"
              disabled={isPending}
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Enviar mensaje"
              isDisabled={isPending || !draft.trim()}
            >
              <SendHorizontal className="size-4" />
            </Button>
          </div>
        </form>
      </aside>

      <button
        ref={launcherRef}
        type="button"
        aria-label={open ? "Cerrar Keep AI" : "Abrir Keep AI"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "fixed z-50 flex size-14 items-center justify-center rounded-full border bg-background text-foreground shadow-lg ring-1 ring-foreground/5 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "max-md:bottom-6 max-md:right-6 max-md:translate-x-0",
          open
            ? "md:bottom-[calc(130px+min(400px,calc(100vw-5rem))+1.75rem)] md:translate-x-0"
            : "md:bottom-[130px] md:right-0 md:translate-x-1/2"
        )}
      >
        <Sparkles className="size-5 text-primary" aria-hidden />
      </button>
    </>
  )
}
