# Keep Inventory — Testing

## Stack

| Layer | Tool |
|-------|------|
| Unit / service / Keep AI eval | **Vitest** |
| End-to-end browser | **Playwright** |

No Jest, Cypress, or duplicate frameworks.

## Commands

```bash
npm run test          # Vitest unit + Keep AI evaluation
npm run test:ai       # Keep AI evaluation only
npm run test:e2e      # Playwright (requires app on :3000)
npm run test:integration  # Gated DB integration (disabled by default)
```

## Safety guards

Tests **never** run with `NODE_ENV=production`.

Integration tests require **all** of:

- `KEEP_INVENTORY_INTEGRATION_TESTS=true`
- `KEEP_INVENTORY_TEST_ORG_ID=<dedicated-qa-org-uuid>`
- `KEEP_INVENTORY_ALLOW_REMOTE_TESTS=true`
- `KEEP_INVENTORY_PRODUCTION_ORG_ID` must differ from test org

Unit tests mock Supabase/tool execution and do not mutate remote data.

## Test data factory

See `tests/setup/factories.ts`:

- Organization: Keep Inventory QA
- Product: PlayStation 5 (`PS5-001-*` generated SKU)
- Supplier: Sony México
- Customer: Cliente QA

Generated suffixes avoid collisions when integration tests are enabled.

## Keep AI evaluation

- Cases: `tests/keep-ai/evaluation-cases.ts`
- Runner: `tests/keep-ai/evaluation.test.ts`
- Report format: `docs/keep-ai-evaluation.md`
- Dev UI: `http://localhost:3000/dev/testing` (development only)

## Development debug metadata

In `NODE_ENV=development`, `/api/keep-ai` includes:

```json
{
  "debug": {
    "tool": "getProductStock",
    "intent": "stock_query",
    "provider": "fallback"
  }
}
```

No API keys, secrets, or chain-of-thought.

## CI

Vitest exits non-zero on failure. Playwright can run in CI with `PLAYWRIGHT_BASE_URL` and `npx playwright install chromium`.
