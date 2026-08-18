import { KEEP_AI_BASELINE_CASES } from "./evaluation-cases-baseline"
import { KEEP_AI_EXPANDED_CASES } from "./evaluation-cases-expanded"
import type { KeepAiEvaluationCase } from "./evaluation-types"

export type {
  KeepAiEvaluationCase,
  KeepAiEvaluationMetric,
  KeepAiEvaluationCategory,
} from "./evaluation-types"
export { EVALUATION_GROUP_LABELS } from "./evaluation-types"
export { KEEP_AI_BASELINE_CASES } from "./evaluation-cases-baseline"
export { KEEP_AI_EXPANDED_CASES } from "./evaluation-cases-expanded"

/** Full offline evaluation suite (baseline + expanded). */
export const KEEP_AI_EVALUATION_CASES: KeepAiEvaluationCase[] = [
  ...KEEP_AI_BASELINE_CASES,
  ...KEEP_AI_EXPANDED_CASES,
]

/** Original 27-case regression baseline only. */
export const KEEP_AI_BASELINE_ONLY = KEEP_AI_BASELINE_CASES
