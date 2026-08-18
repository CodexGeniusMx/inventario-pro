import { describe, expect, it, beforeAll, afterAll } from "vitest"

import { detectFallbackTool } from "@/lib/keep-ai/fallback"
import { executeKeepAiTool } from "@/lib/keep-ai/tools/executor"
import {
  buildQaOwnerUser,
  cleanupQaOrganization,
  integrationContext,
  QA_PRODUCT_SKU,
  seedQaOrganization,
} from "@/tests/keep-ai/integration/qa-fixture"

const ctx = integrationContext()
const describeIntegration = ctx.enabled && ctx.admin && ctx.orgId ? describe : describe.skip

describeIntegration("Keep AI integration — real Supabase QA org", () => {
  let warehouseId = ""
  let user = buildQaOwnerUser(ctx.orgId!, "")

  beforeAll(async () => {
    const seeded = await seedQaOrganization(ctx.admin!, ctx.orgId!)
    warehouseId = seeded.warehouseId
    user = buildQaOwnerUser(ctx.orgId!, warehouseId)
  }, 60_000)

  afterAll(async () => {
    if (ctx.admin && ctx.orgId) {
      await cleanupQaOrganization(ctx.admin, ctx.orgId)
    }
  }, 60_000)

  it("routes stock query to getProductStock", () => {
    const detection = detectFallbackTool("cuantos ps5 quedan", [])
    expect(detection.tool).toBe("getProductStock")
  })

  it("returns real stock quantity from database (7 units)", async () => {
    const result = await executeKeepAiTool(user, "getProductStock", { query: "ps5" })
    expect(result.success).toBe(true)
    expect(result.denied).not.toBe(true)

    const matches = (result.data as { matches: Array<{ sku: string; quantity_on_hand: number }> }).matches
    const ps5 = matches.find((row) => row.sku === QA_PRODUCT_SKU)
    expect(ps5).toBeDefined()
    expect(Number(ps5?.quantity_on_hand)).toBe(7)
  })

  it("does not hardcode response in router — DB is source of truth", async () => {
    const detection = detectFallbackTool("cuantos ps5 quedan", [])
    const result = await executeKeepAiTool(user, detection.tool, detection.args)
    const matches = (result.data as { matches: Array<{ quantity_on_hand: number }> }).matches ?? []
    expect(matches.some((row) => Number(row.quantity_on_hand) === 7)).toBe(true)
  })

  it("returns empty matches for unknown product without inventing data", async () => {
    const result = await executeKeepAiTool(user, "getProductStock", { query: "xyz-nonexistent-999" })
    expect(result.success).toBe(true)
    const matches = (result.data as { matches: unknown[] }).matches
    expect(matches).toHaveLength(0)
  })
})

describe("Keep AI integration gate", () => {
  it("runs only when QA org and service role are configured", () => {
    const ready = Boolean(ctx.enabled && ctx.admin && ctx.orgId)
    if (ready) {
      expect(ctx.orgId).toBeTruthy()
      expect(ctx.admin).toBeTruthy()
    } else {
      expect(ready).toBe(false)
    }
  })
})
