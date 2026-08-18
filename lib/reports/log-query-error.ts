import type { PostgrestError } from "@supabase/supabase-js"

type QueryErrorLike = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

function extractPostgrestFields(error: unknown): QueryErrorLike {
  if (!error || typeof error !== "object") {
    return { message: String(error) }
  }

  const postgrest = error as PostgrestError

  return {
    code: typeof postgrest.code === "string" ? postgrest.code : undefined,
    message: typeof postgrest.message === "string" ? postgrest.message : undefined,
    details: typeof postgrest.details === "string" ? postgrest.details : undefined,
    hint: typeof postgrest.hint === "string" ? postgrest.hint : undefined,
  }
}

export function logQueryError(source: string, error: unknown): void {
  const fields = extractPostgrestFields(error)

  // Log the raw error first — PostgrestError may not serialize via spread/JSON.stringify.
  console.error("[sales-report-raw-error]", error)
  console.error("[sales-report-raw-error]", {
    source,
    operation: source,
    code: fields.code ?? null,
    message: fields.message ?? null,
    details: fields.details ?? null,
    hint: fields.hint ?? null,
  })

  if (fields.code === "42702" && fields.message?.includes("net_revenue")) {
    console.error(
      "[sales-report-raw-error] Missing migration: apply 00025_fix_report_sales_summary.sql (ambiguous PL/pgSQL output columns in report_sales_summary)."
    )
  }
}

export function logSalesReportRpcFailure(
  source: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  logQueryError(source, error)

  if (context) {
    console.error("[sales-report-raw-error]", { source, context })
  }
}
