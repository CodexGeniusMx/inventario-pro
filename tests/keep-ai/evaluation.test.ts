import { describe, expect, it, vi, beforeEach } from "vitest"

import {
  canManageUsers,
  canViewFinancialProfit,
  canViewProductCosts,
  hasPermission,
} from "@/lib/auth/permissions"
import {
  detectFallbackTool,
  resolveProductFromContext,
} from "@/lib/keep-ai/fallback"
import { executeKeepAiToolStub } from "@/lib/keep-ai/testing/stub-executor"
import { userWithRole } from "@/tests/setup/factories"
import {
  KEEP_AI_BASELINE_CASES,
  KEEP_AI_EVALUATION_CASES,
} from "@/tests/keep-ai/evaluation-cases"
import {
  runKeepAiEvaluationSuite,
  runKeepAiBaselineSuite,
} from "@/lib/keep-ai/testing/run-evaluation"

vi.mock("@/lib/keep-ai/tools/executor", () => ({
  executeKeepAiTool: vi.fn(
    (user: Parameters<typeof executeKeepAiToolStub>[0], toolName: string, args: Record<string, unknown>) =>
      executeKeepAiToolStub(user, toolName, args)
  ),
}))

import { runKeepAiFallback } from "@/lib/keep-ai/fallback"

describe("Keep AI baseline regression (27 cases)", () => {
  it("preserves original 27 baseline cases", () => {
    expect(KEEP_AI_BASELINE_CASES).toHaveLength(27)
    expect(KEEP_AI_BASELINE_CASES.every((c) => c.baseline)).toBe(true)
  })

  it("baseline suite passes 27/27 offline", async () => {
    const summary = await runKeepAiBaselineSuite({ offline: true })
    expect(summary.metrics.baseline.total).toBe(27)
    expect(summary.metrics.baseline.failed).toBe(0)
    expect(summary.metrics.baseline.passed).toBe(27)
  })
})

describe("Keep AI expanded offline suite", () => {
  it("has at least 100 meaningful cases total", () => {
    expect(KEEP_AI_EVALUATION_CASES.length).toBeGreaterThanOrEqual(100)
  })

  it("passes full offline evaluation suite", async () => {
    const summary = await runKeepAiEvaluationSuite({ offline: true })
    const failures = summary.results.filter((row) => row.status === "FAIL")
    if (failures.length > 0) {
      console.error(
        "Failed cases:",
        failures.map((f) => ({ id: f.id, reason: f.failureReason, tool: f.toolUsed }))
      )
    }
    expect(summary.metrics.failed).toBe(0)
    expect(summary.metrics.passed).toBeGreaterThanOrEqual(100)
  })
})

describe("Keep AI intent detection", () => {
  it.each(
    KEEP_AI_EVALUATION_CASES.filter(
      (c) => !c.history && !c.expectDenied && !c.expectRejected && !c.expectClarification
    )
  )("detects tool for $id ($input)", (testCase) => {
    const result = detectFallbackTool(testCase.input, [])
    expect(result.tool).toBe(testCase.expectedTool)
    if (testCase.expectedIntent) {
      expect(result.intent).toBe(testCase.expectedIntent)
    }
    if (testCase.expectedEntity) {
      expect(String(result.args.query ?? result.args.supplier ?? "").toLowerCase()).toContain(
        testCase.expectedEntity.split(" ")[0]!.toLowerCase()
      )
    }
  })

  it("resolves product context from prior assistant message", () => {
    const history = [
      { role: "user" as const, content: "cuantos ps5 tenemos" },
      { role: "assistant" as const, content: "PlayStation 5 (PS5-001): 7 uds." },
    ]
    const product = resolveProductFromContext("y cuanto cuestan?", history)
    expect(product).toBe("PlayStation 5")
  })

  it("switches context when user says ahora busca iphone", () => {
    const history = [
      { role: "user" as const, content: "cuantos ps5 tenemos" },
      { role: "assistant" as const, content: "PlayStation 5 (PS5-001): 7 uds." },
      { role: "user" as const, content: "ahora busca iphone" },
      { role: "assistant" as const, content: "iPhone 16 (IP16-001): 4 uds." },
    ]
    const detection = detectFallbackTool("y cuantos quedan", history)
    expect(String(detection.args.query ?? "").toLowerCase()).toContain("iphone")
  })
})

describe("Keep AI evaluation harness", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(KEEP_AI_EVALUATION_CASES)("evaluates case $id", async (testCase) => {
    const user = userWithRole(testCase.permissionRole ?? "owner")
    const history = (testCase.history ?? []).map((entry) => ({
      role: entry.role,
      content: entry.content,
    }))

    const detection = detectFallbackTool(testCase.input, history)
    expect(detection.tool).toBe(testCase.expectedTool)

    const response = await runKeepAiFallback(user, testCase.input, history)

    if (testCase.expectDenied) {
      expect(response.denied).toBe(true)
      expect(response.message.toLowerCase()).toMatch(/permiso|acceso|autoriz/)
    }

    if (testCase.expectPreparedAction) {
      expect(response.preparedAction).toBeDefined()
    }

    if (testCase.expectClarification) {
      expect(response.clarificationOptions?.length ?? 0).toBeGreaterThan(0)
    }

    if (testCase.expectRejected) {
      expect(response.denied || detection.tool === "unknown" || detection.tool === "rejectDangerous").toBe(true)
    }

    if (testCase.expectEmptyResult) {
      expect(response.message.toLowerCase()).toMatch(/no encontré|no hay/)
    }

    expect(response.message.length).toBeGreaterThan(0)
  })
})

describe("Keep AI permission messaging", () => {
  it("seller denied for profit uses permission wording", async () => {
    const seller = userWithRole("seller")
    expect(canViewFinancialProfit(seller)).toBe(false)
    const response = await runKeepAiFallback(seller, "cuanto ganamos este mes", [])
    expect(response.denied).toBe(true)
    expect(response.message).toMatch(/permiso/i)
  })

  it("seller can query stock", async () => {
    const seller = userWithRole("seller")
    expect(hasPermission(seller, "inventory", "view")).toBe(true)
    const response = await runKeepAiFallback(seller, "cuantos ps5 quedan", [])
    expect(response.denied).not.toBe(true)
  })

  it("seller denied for product cost", async () => {
    const seller = userWithRole("seller")
    expect(canViewProductCosts(seller)).toBe(false)
    const response = await runKeepAiFallback(seller, "cuanto nos cuesta el ps5", [])
    expect(response.denied).toBe(true)
  })
})

describe("Keep AI role permissions (server-side helpers)", () => {
  it("seller cannot view costs or profit", () => {
    const seller = userWithRole("seller")
    expect(canViewProductCosts(seller)).toBe(false)
    expect(canViewFinancialProfit(seller)).toBe(false)
    expect(canManageUsers(seller)).toBe(false)
  })

  it("warehouse cannot manage users or profit", () => {
    const warehouse = userWithRole("warehouse")
    expect(canManageUsers(warehouse)).toBe(false)
    expect(canViewFinancialProfit(warehouse)).toBe(false)
    expect(hasPermission(warehouse, "purchases", "receive")).toBe(true)
  })

  it("owner can manage users and view profit", () => {
    const owner = userWithRole("owner")
    expect(canManageUsers(owner)).toBe(true)
    expect(canViewFinancialProfit(owner)).toBe(true)
  })
})
