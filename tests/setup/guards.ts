export function assertSafeTestEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Tests cannot run with NODE_ENV=production.")
  }

  if (
    process.env.KEEP_INVENTORY_TEST_ORG_ID &&
    process.env.KEEP_INVENTORY_PRODUCTION_ORG_ID &&
    process.env.KEEP_INVENTORY_TEST_ORG_ID ===
      process.env.KEEP_INVENTORY_PRODUCTION_ORG_ID
  ) {
    throw new Error("Test org id must not equal production org id.")
  }

  if (isIntegrationTestEnabled() && !process.env.KEEP_INVENTORY_ALLOW_REMOTE_TESTS) {
    throw new Error(
      "Integration tests against remote Supabase require KEEP_INVENTORY_ALLOW_REMOTE_TESTS=true and a dedicated KEEP_INVENTORY_TEST_ORG_ID."
    )
  }
}

export function isIntegrationTestEnabled(): boolean {
  return (
    process.env.KEEP_INVENTORY_INTEGRATION_TESTS === "true" &&
    Boolean(process.env.KEEP_INVENTORY_TEST_ORG_ID)
  )
}

export function getTestOrganizationId(): string | null {
  return process.env.KEEP_INVENTORY_TEST_ORG_ID ?? null
}
