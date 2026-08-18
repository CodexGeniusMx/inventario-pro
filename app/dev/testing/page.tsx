import { notFound } from "next/navigation"

import { DevTestingGroups } from "@/components/dev/dev-testing-groups"
import {
  runKeepAiBaselineSuite,
  runKeepAiEvaluationSuite,
} from "@/lib/keep-ai/testing/run-evaluation"
import { isIntegrationTestEnabled } from "@/tests/setup/guards"

type DevTestingPageProps = {
  searchParams: Promise<{ group?: string }>
}

export default async function DevTestingPage({ searchParams }: DevTestingPageProps) {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  const { group } = await searchParams
  const offline = await runKeepAiEvaluationSuite(
    group ? { group, offline: true } : { offline: true }
  )
  const baseline = await runKeepAiBaselineSuite({ offline: true })
  const integrationAvailable = isIntegrationTestEnabled()

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          CodexGenius · desarrollo
        </p>
        <h1 className="text-2xl font-semibold">Keep AI — evaluación</h1>
        <p className="text-sm text-muted-foreground">
          Harness interno con suite offline (routing + mocks) e integración real
          opcional. No disponible en producción.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold">OFFLINE / ROUTING</h2>
          <p className="mt-2 text-sm">
            Total:{" "}
            <strong className="text-green-700 dark:text-green-400">
              {offline.metrics.passed} PASS
            </strong>{" "}
            /{" "}
            <strong className="text-destructive">{offline.metrics.failed} FAIL</strong> /{" "}
            {offline.metrics.total} casos
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Baseline: {baseline.metrics.baseline.passed}/{baseline.metrics.baseline.total}{" "}
            · Terminal: <code>npm run test:ai</code>
          </p>
        </section>

        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold">INTEGRATION / REAL DATA</h2>
          {integrationAvailable ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Configurado. Ejecutar: <code>npm run test:ai:integration</code>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No configurado. Requiere{" "}
              <code>KEEP_INVENTORY_INTEGRATION_TESTS=true</code>,{" "}
              <code>KEEP_INVENTORY_TEST_ORG_ID</code>,{" "}
              <code>SUPABASE_SERVICE_ROLE_KEY</code>.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="mb-2 text-sm font-semibold">Desglose por métrica</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(offline.metrics.byMetric).map(([metric, stats]) => (
            <span key={metric} className="rounded-md bg-muted px-2 py-1">
              {metric}: {stats.passed}/{stats.total}
            </span>
          ))}
        </div>
      </section>

      <DevTestingGroups activeGroup={group} />

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Métrica</th>
              <th className="px-3 py-2">Input</th>
              <th className="px-3 py-2">Tool esp.</th>
              <th className="px-3 py-2">Tool usado</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Notas / preview</th>
            </tr>
          </thead>
          <tbody>
            {offline.results.map((row) => (
              <tr key={row.id} className="border-b align-top">
                <td className="px-3 py-2 font-mono text-xs">{row.id}</td>
                <td className="px-3 py-2 text-xs">{row.metric}</td>
                <td className="px-3 py-2">{row.input}</td>
                <td className="px-3 py-2">{row.expectedTool}</td>
                <td className="px-3 py-2">{row.toolUsed}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      row.status === "PASS"
                        ? "font-medium text-green-700 dark:text-green-400"
                        : "font-medium text-destructive"
                    }
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.failureReason ?? row.messagePreview}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
