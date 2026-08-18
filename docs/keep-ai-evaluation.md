# Keep AI — Evaluation report

Automated cases live in `tests/keep-ai/evaluation-cases*.ts` and run via `npm run test:ai`.

## Suites

| Suite | Command | Description |
|-------|---------|-------------|
| **Offline / routing** | `npm run test:ai` | 108 cases — fallback router + stub executor (no DB) |
| **Baseline regression** | included above | Original 27 cases preserved unchanged |
| **Integration / real data** | `npm run test:ai:integration` | Isolated QA org — requires env vars |

## Integration env (isolated QA org — never the clean dev org)

```env
KEEP_INVENTORY_INTEGRATION_TESTS=true
KEEP_INVENTORY_TEST_ORG_ID=<dedicated-uuid>
KEEP_INVENTORY_ALLOW_REMOTE_TESTS=true
SUPABASE_SERVICE_ROLE_KEY=<server-only>
```

Fixtures seed and clean up inside the dedicated org only.

## Result format

| Field | Description |
|-------|-------------|
| ID | Stable case identifier |
| Input | User message (Spanish, typos allowed) |
| History | Multi-turn context when applicable |
| Expected tool | Structured tool the fallback/LLM should select |
| Metric | intent, entity, typos, context, ambiguity, permissions, mutations, confirmation, hallucination, out-of-scope |
| Result | PASS / FAIL |

## Coverage groups

1. **inventory-list** — inventario general
2. **product-stock** — stock de producto
3. **low-stock** / **out-of-stock**
4. **sales** / **purchases**
5. **products** / **customers** / **suppliers**
6. **typos** — informal spelling
7. **context** — follow-ups and context switching
8. **ambiguity** — clarification required
9. **permissions** — role matrix (owner, admin, manager, seller, warehouse, read_only)
10. **mutations** — draft/clarification only
11. **confirmations** — update/cancel draft
12. **unknown** — dangerous / out-of-scope
13. **anti-hallucination** — zero results must not invent data

## Running

```bash
npm run test:ai
npm run test:ai:integration   # optional, when QA org configured
```

Development dashboard: `/dev/testing` (offline metrics + integration status)

## LLM vs fallback

These tests evaluate the **fallback tool router** (`lib/keep-ai/fallback.ts`) with stub executor mocks. No real LLM is involved. When `KEEP_AI_API_KEY` is set in production, the LLM path uses the same tool executor — integration tests validate real Supabase data separately.
