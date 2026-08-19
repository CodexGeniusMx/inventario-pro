import { z } from "zod"

export const activateInviteSchema = z
  .object({
    invitationId: z.string().uuid("Enlace de invitación inválido."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  })

export const invitationIdSchema = z.object({
  invitationId: z.string().uuid("Enlace de invitación inválido."),
})

export const invitePageQuerySchema = z.object({
  invitationId: z.string().uuid().nullable(),
  callbackError: z.string().nullable().optional(),
})

export type InvitePageQueryInput = z.infer<typeof invitePageQuerySchema>
