import { AppError } from "@/lib/errors/app-error"
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
        message: "Please check the form and try again.",
        fieldErrors,
      },
    }
  }

  return {
    success: false,
    error: {
      code: "UNKNOWN",
      message: "Something went wrong. Please try again.",
    },
  }
}
