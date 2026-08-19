import type { Json } from "@/lib/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { AuditLogInput, AuditSource } from "@/lib/audit/types"

const SECRET_KEYS = new Set([
  "password",
  "token",
  "secret",
  "api_key",
  "service_role",
  "refresh_token",
  "access_token",
])

function sanitizeAuditPayload(
  value: Record<string, unknown> | null | undefined
): Json | undefined {
  if (!value) {
    return undefined
  }

  const sanitized: Record<string, Json> = {}

  for (const [key, raw] of Object.entries(value)) {
    if (SECRET_KEYS.has(key.toLowerCase())) {
      continue
    }

    if (
      raw === null ||
      typeof raw === "string" ||
      typeof raw === "number" ||
      typeof raw === "boolean"
    ) {
      sanitized[key] = raw
      continue
    }

    if (Array.isArray(raw) || (typeof raw === "object" && raw !== null)) {
      sanitized[key] = raw as Json
    }
  }

  return sanitized
}

/**
 * Server-only audit writer via service role + audit_log_record RPC.
 * End-user JWTs cannot insert audit rows directly after migration 00030.
 */
export async function writeAuditLog(
  input: AuditLogInput,
  options: { required?: boolean; actorId?: string | null } = {}
): Promise<void> {
  let actorId = options.actorId ?? input.actorId ?? null

  if (!actorId) {
    const sessionClient = await createClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()
    actorId = user?.id ?? null
  }

  const admin = createAdminClient()
  const source: AuditSource = input.source ?? "ui"

  const { error } = await admin.rpc("audit_log_record", {
    p_organization_id: input.organizationId,
    p_actor_id: actorId,
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
    p_old_values: sanitizeAuditPayload(input.oldValues),
    p_new_values: sanitizeAuditPayload(input.newValues),
    p_source: source,
  })

  if (error) {
    console.error("[audit] insert failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      message: error.message,
    })

    if (options.required) {
      throw error
    }
  }
}
