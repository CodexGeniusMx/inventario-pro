import { detectFallbackTool } from "@/lib/keep-ai/fallback"
import { runKeepAiFallback } from "@/lib/keep-ai/fallback"
import {
  HALLUCINATION_PATTERN,
  runKeepAiFallbackOffline,
} from "@/lib/keep-ai/testing/offline-fallback"
import type { KeepAiConversationMessage } from "@/lib/keep-ai/types"
import type { AuthenticatedUser } from "@/lib/auth/types"
import {
  KEEP_AI_BASELINE_CASES,
  KEEP_AI_EVALUATION_CASES,
  type KeepAiEvaluationCase,
  type KeepAiEvaluationMetric,
} from "@/tests/keep-ai/evaluation-cases"
import { userWithRole } from "@/tests/setup/factories"

export type KeepAiEvaluationResult = {
  id: string
  input: string
  group: string
  metric: KeepAiEvaluationMetric
  expectedTool: string
  toolUsed: string
  expectedIntent?: string
  intent?: string
  expectedEntity?: string
  permissionRole?: string
  denied?: boolean
  preparedAction?: boolean
  clarification?: boolean
  messagePreview: string
  status: "PASS" | "FAIL"
  failureReason?: string
  notes?: string
  baseline?: boolean
}

export type KeepAiEvaluationMetrics = {
  total: number
  passed: number
  failed: number
  baseline: { total: number; passed: number; failed: number }
  byMetric: Record<string, { total: number; passed: number; failed: number }>
  byGroup: Record<string, { total: number; passed: number; failed: number }>
}

function entityMatches(expected: string, actual: string, supplier?: string): boolean {
  const firstToken = expected.split(" ")[0]?.toLowerCase() ?? ""
  const haystack = `${actual} ${supplier ?? ""}`.toLowerCase()
  return haystack.includes(firstToken)
}

export async function runKeepAiEvaluationCase(
  testCase: KeepAiEvaluationCase,
  user?: AuthenticatedUser,
  options?: { offline?: boolean }
): Promise<KeepAiEvaluationResult> {
  const actor = user ?? userWithRole(testCase.permissionRole ?? "owner")
  const history = (testCase.history ?? []) as KeepAiConversationMessage[]
  const detection = detectFallbackTool(testCase.input, history)
  const response = options?.offline
    ? await runKeepAiFallbackOffline(actor, testCase.input, history)
    : await runKeepAiFallback(actor, testCase.input, history)

  const failures: string[] = []

  if (detection.tool !== testCase.expectedTool) {
    failures.push(`tool: expected ${testCase.expectedTool}, got ${detection.tool}`)
  }

  if (testCase.expectedIntent && response.intent !== testCase.expectedIntent) {
    failures.push(`intent: expected ${testCase.expectedIntent}, got ${response.intent}`)
  }

  if (testCase.expectedEntity) {
    const actualEntity = String(detection.args.query ?? "")
    const supplier = String(detection.args.supplier ?? "")
    if (!entityMatches(testCase.expectedEntity, actualEntity, supplier)) {
      failures.push(`entity: expected ${testCase.expectedEntity}, got ${actualEntity || supplier}`)
    }
  }

  if (testCase.expectDenied && !response.denied) {
    failures.push("expected denied response")
  }

  if (testCase.expectPreparedAction && !response.preparedAction) {
    failures.push("expected prepared action")
  }

  if (
    testCase.expectClarification &&
    !("clarificationOptions" in response && response.clarificationOptions?.length)
  ) {
    failures.push("expected clarification options")
  }

  if (testCase.expectRejected && !response.denied && detection.tool !== "unknown") {
    failures.push("expected rejection")
  }

  if (testCase.expectEmptyResult && !/no encontré|no hay|sin resultados/i.test(response.message)) {
    failures.push("expected empty-result message")
  }

  if (testCase.expectNoHallucination) {
    if (testCase.group === "unknown" || testCase.expectedTool === "unknown") {
      if (HALLUCINATION_PATTERN.test(response.message)) {
        failures.push("hallucinated inventory data on out-of-scope query")
      }
    }
  }

  if (
    (testCase.group === "unknown" || testCase.group === "anti-hallucination") &&
    testCase.expectNoHallucination &&
    testCase.expectedTool === "unknown" &&
    /PlayStation|PS5|\d+ uds/i.test(response.message)
  ) {
    failures.push("invented data on unknown query")
  }

  if (!response.message.length) {
    failures.push("empty response message")
  }

  return {
    id: testCase.id,
    input: testCase.input,
    group: testCase.group,
    metric: testCase.metric,
    expectedTool: testCase.expectedTool,
    toolUsed: detection.tool,
    expectedIntent: testCase.expectedIntent,
    intent: response.intent,
    expectedEntity: testCase.expectedEntity,
    permissionRole: testCase.permissionRole,
    denied: response.denied,
    preparedAction: Boolean(response.preparedAction),
    clarification:
      "clarificationOptions" in response
        ? Boolean(response.clarificationOptions?.length)
        : false,
    messagePreview: response.message.slice(0, 160),
    status: failures.length === 0 ? "PASS" : "FAIL",
    failureReason: failures.join("; ") || undefined,
    notes: testCase.notes,
    baseline: testCase.baseline,
  }
}

function summarizeResults(results: KeepAiEvaluationResult[]): KeepAiEvaluationMetrics {
  const passed = results.filter((row) => row.status === "PASS").length
  const baselineResults = results.filter((row) => row.baseline)
  const baselinePassed = baselineResults.filter((row) => row.status === "PASS").length

  const byMetric: KeepAiEvaluationMetrics["byMetric"] = {}
  const byGroup: KeepAiEvaluationMetrics["byGroup"] = {}

  for (const row of results) {
    byMetric[row.metric] ??= { total: 0, passed: 0, failed: 0 }
    byMetric[row.metric].total += 1
    byMetric[row.metric][row.status === "PASS" ? "passed" : "failed"] += 1

    byGroup[row.group] ??= { total: 0, passed: 0, failed: 0 }
    byGroup[row.group].total += 1
    byGroup[row.group][row.status === "PASS" ? "passed" : "failed"] += 1
  }

  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    baseline: {
      total: baselineResults.length,
      passed: baselinePassed,
      failed: baselineResults.length - baselinePassed,
    },
    byMetric,
    byGroup,
  }
}

export async function runKeepAiEvaluationSuite(options?: {
  group?: string
  offline?: boolean
  baselineOnly?: boolean
}): Promise<{
  results: KeepAiEvaluationResult[]
  metrics: KeepAiEvaluationMetrics
  group?: string
}> {
  const source = options?.baselineOnly ? KEEP_AI_BASELINE_CASES : KEEP_AI_EVALUATION_CASES
  const cases = options?.group
    ? source.filter((c) => c.group === options.group)
    : source

  const results: KeepAiEvaluationResult[] = []

  for (const testCase of cases) {
    results.push(await runKeepAiEvaluationCase(testCase, undefined, options))
  }

  return {
    results,
    metrics: summarizeResults(results),
    group: options?.group,
  }
}

export async function runKeepAiBaselineSuite(options?: { offline?: boolean }) {
  return runKeepAiEvaluationSuite({ ...options, baselineOnly: true, offline: options?.offline ?? true })
}
