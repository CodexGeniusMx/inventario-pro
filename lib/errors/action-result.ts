import { AppError } from "@/lib/errors/app-error"
import { mapInvitationErrorMessage } from "@/lib/errors/invitation-error-mapping"
import { ZodError } from "zod"

export type ActionResult<T> =
  | { success: true; data: T }
  | {
      success: false
      error: {
        code: string
        message: string
        fieldErrors?: Record<string, string[]>
      }
    }

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { success: true, data }
}

export function toActionResult(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
      },
    }
  }

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {}

    for (const issue of error.issues) {
      const key = issue.path.join(".") || "form"
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message]
    }

    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Revisa el formulario e inténtalo de nuevo.",
        fieldErrors,
      },
    }
  }

  const mappedMessage = mapInvitationErrorMessage(error)

  if (mappedMessage) {
    const err = error as { code?: string; status?: number }
    const code =
      err.code === "23505"
        ? "CONFLICT"
        : err.code === "email_exists"
          ? "CONFLICT"
          : err.status === 429
            ? "CONFLICT"
            : "UNKNOWN"

    return {
      success: false,
      error: {
        code,
        message: mappedMessage,
      },
    }
  }

  return {
    success: false,
    error: {
      code: "UNKNOWN",
      message: "Algo salió mal. Inténtalo de nuevo.",
    },
  }
}
