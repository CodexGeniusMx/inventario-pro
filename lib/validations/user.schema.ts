import { z } from "zod"

import { INVITABLE_ROLES } from "@/lib/auth/roles"

const invitableRoleSchema = z.enum(
  INVITABLE_ROLES as [typeof INVITABLE_ROLES[number], ...typeof INVITABLE_ROLES[number][]]
)

export const inviteUserSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido."),
  role: invitableRoleSchema,
  warehouseId: z.string().uuid().nullable().optional(),
})

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum([
    "owner",
    "admin",
    "manager",
    "seller",
    "warehouse",
    "read_only",
    "employee",
  ]),
})

export const updateUserStatusSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
})
