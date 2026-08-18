"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { actionSuccess, toActionResult } from "@/lib/errors/action-result"
import type { ActionResult } from "@/lib/errors/action-result"
import { loginSchema } from "@/lib/validations/auth.schema"
import { createClient } from "@/lib/supabase/server"

function mapAuthErrorMessage(message: string): string {
  const normalized = message.toLowerCase()

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Correo electrónico o contraseña incorrectos."
  }

  if (normalized.includes("email not confirmed")) {
    return "Confirma tu correo electrónico antes de iniciar sesión."
  }

  return "No se pudo iniciar sesión. Inténtalo de nuevo."
}

export async function loginAction(
  input: unknown
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const parsed = loginSchema.parse(input)
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    })

    if (error) {
      return {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: mapAuthErrorMessage(error.message),
        },
      }
    }

    revalidatePath("/", "layout")
    return actionSuccess({ redirectTo: "/dashboard" })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
