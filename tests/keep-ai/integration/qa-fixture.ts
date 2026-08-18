import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import type { AuthenticatedUser } from "@/lib/auth/types"
import { buildTestUser, QA_FIXTURE } from "@/tests/setup/factories"
import { getTestOrganizationId, isIntegrationTestEnabled } from "@/tests/setup/guards"

export const QA_PRODUCT_SKU = "PS5-QA-001"
export const QA_PORTAL_SKU = "PSP-QA-001"
export const QA_SUPPLIER_NAME = "Sony México QA"

type AdminClient = SupabaseClient<Database>

export function getIntegrationAdminClient(): AdminClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function buildQaOwnerUser(orgId: string, warehouseId: string): AuthenticatedUser {
  return buildTestUser({
    organizationId: orgId,
    defaultWarehouseId: warehouseId,
    role: "owner",
  })
}

export async function seedQaOrganization(admin: AdminClient, orgId: string) {
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("id", orgId)
    .maybeSingle()

  if (!existingOrg) {
    await admin.from("organizations").insert({
      id: orgId,
      name: QA_FIXTURE.organizationName,
      slug: `keep-ai-qa-${orgId.slice(0, 8)}`,
      base_currency: "MXN",
      timezone: "America/Mexico_City",
    } as Database["public"]["Tables"]["organizations"]["Insert"])
  }

  const { data: warehouse } = await admin
    .from("warehouses")
    .select("id")
    .eq("organization_id", orgId)
    .eq("code", QA_FIXTURE.warehouseCode)
    .maybeSingle()

  let warehouseId = warehouse?.id
  if (!warehouseId) {
    const { data: created } = await admin
      .from("warehouses")
      .insert({
        organization_id: orgId,
        name: QA_FIXTURE.warehouseName,
        code: QA_FIXTURE.warehouseCode,
        is_default: true,
        is_active: true,
      })
      .select("id")
      .single()
    warehouseId = created?.id
  }

  if (!warehouseId) throw new Error("Failed to seed QA warehouse")

  await admin.from("suppliers").delete().eq("organization_id", orgId)
  await admin.from("inventory_movements").delete().eq("organization_id", orgId)
  await admin.from("inventory_balances").delete().eq("organization_id", orgId)
  await admin.from("product_variants").delete().eq("organization_id", orgId)
  await admin.from("products").delete().eq("organization_id", orgId)

  const { data: supplier } = await admin
    .from("suppliers")
    .insert({
      organization_id: orgId,
      name: QA_SUPPLIER_NAME,
      is_active: true,
    })
    .select("id")
    .single()

  const { data: ps5Product } = await admin
    .from("products")
    .insert({
      organization_id: orgId,
      name: "PlayStation 5",
      status: "active",
    })
    .select("id")
    .single()

  const { data: ps5Variant } = await admin
    .from("product_variants")
    .insert({
      organization_id: orgId,
      product_id: ps5Product!.id,
      sku: QA_PRODUCT_SKU,
      name: "",
      sale_price: 11999,
      cost_price: 9000,
      is_active: true,
    })
    .select("id")
    .single()

  await admin.from("inventory_balances").insert({
    organization_id: orgId,
    warehouse_id: warehouseId,
    product_variant_id: ps5Variant!.id,
    quantity_on_hand: 7,
  })

  return { warehouseId, supplierId: supplier?.id, variantId: ps5Variant?.id }
}

export async function cleanupQaOrganization(admin: AdminClient, orgId: string) {
  await admin.from("inventory_movements").delete().eq("organization_id", orgId)
  await admin.from("inventory_balances").delete().eq("organization_id", orgId)
  await admin.from("product_variants").delete().eq("organization_id", orgId)
  await admin.from("products").delete().eq("organization_id", orgId)
  await admin.from("suppliers").delete().eq("organization_id", orgId)
}

export function integrationContext() {
  return {
    enabled: isIntegrationTestEnabled(),
    orgId: getTestOrganizationId(),
    admin: getIntegrationAdminClient(),
  }
}
