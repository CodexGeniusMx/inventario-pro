export type AuditSource =
  | "ui"
  | "keep_ai"
  | "import"
  | "api"
  | "whatsapp"
  | "automation"

export type AuditLogInput = {
  organizationId: string
  actorId?: string | null
  action: string
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
  source?: AuditSource
}
