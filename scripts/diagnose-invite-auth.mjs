/**
 * One-off diagnostic: logs raw Supabase Auth error for inviteUserByEmail.
 * Usage: node scripts/diagnose-invite-auth.mjs danyliuxloll@gmail.com
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local")
  const contents = readFileSync(envPath, "utf8")

  for (const line of contents.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const separator = trimmed.indexOf("=")
    if (separator === -1) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

const email = process.argv[2] ?? "danyliuxloll@gmail.com"

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const invitationId = "00000000-0000-4000-8000-000000000001"

console.log("[diagnose-invite-auth] calling inviteUserByEmail for:", email)

const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
  redirectTo: `${siteUrl}/accept-invite?invitation=${invitationId}`,
  data: {
    invitation_id: invitationId,
    organization_id: "00000000-0000-4000-8000-000000000002",
    role: "seller",
  },
})

if (error) {
  console.error("[invite-user-error]", {
    message: error.message,
    status: error.status,
    code: error.code,
    name: error.name,
  })
  process.exit(1)
}

console.log("[diagnose-invite-auth] success", {
  userId: data.user?.id,
  email: data.user?.email,
})
