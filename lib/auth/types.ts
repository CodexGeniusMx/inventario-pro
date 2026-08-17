import type { Database } from "@/lib/database.types"

export type AppRole = Database["public"]["Enums"]["app_role"]

export type Permission = {
  resource: string
  action: string
}

export type AuthenticatedUser = {
  id: string
  email: string
  fullName: string
  organizationId: string
  organizationName: string
  organizationSlug: string
  role: AppRole
  branchId: string | null
  isActive: boolean
  permissions: Permission[]
}
