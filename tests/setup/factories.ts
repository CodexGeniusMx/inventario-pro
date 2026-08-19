import type { AuthenticatedUser, Permission } from "@/lib/auth/types"

function suffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const QA_FIXTURE = {
  organizationName: "Keep Inventory QA",
  warehouseName: "Almacén Principal",
  warehouseCode: "MAIN",
  productName: "PlayStation 5",
  sku: () => `PS5-001-${suffix()}`,
  barcode: () => `1234567890${Math.floor(Math.random() * 1000)}`,
  baseCost: 9000,
  salePrice: 11999,
  reorderPoint: 5,
  supplierName: "Sony México",
  customerName: "Cliente QA",
} as const

export function buildPermissions(
  entries: Array<[string, string]>
): Permission[] {
  return entries.map(([resource, action]) => ({ resource, action }))
}

export function buildTestUser(
  overrides: Partial<AuthenticatedUser> = {}
): AuthenticatedUser {
  return {
    id: "test-user-id",
    email: "qa@test.local",
    fullName: "Usuario QA",
    organizationId: "test-org-id",
    organizationName: QA_FIXTURE.organizationName,
    organizationSlug: "keep-inventory-qa",
    organizationTimezone: "America/Mexico_City",
    organizationBaseCurrency: "MXN",
    organizationAllowedCurrencies: ["MXN"],
    defaultWarehouseId: "test-warehouse-id",
    role: "owner",
    branchId: null,
    isActive: true,
    permissions: buildPermissions([
      ["products", "view"],
      ["products", "create"],
      ["products", "view_cost"],
      ["inventory", "view"],
      ["inventory", "adjust"],
      ["purchases", "view"],
      ["purchases", "receive"],
      ["sales", "view"],
      ["sales", "create"],
      ["financial", "revenue"],
      ["financial", "profit"],
      ["financial", "costs"],
      ["settings", "company"],
      ["settings", "currency"],
      ["users", "invite"],
    ]),
    aiEnabled: true,
    aiAllowQueries: true,
    aiAllowPrepare: true,
    aiRequireConfirmation: true,
    ...overrides,
  }
}

export const ROLE_PERMISSION_PRESETS: Record<
  "owner" | "admin" | "manager" | "seller" | "warehouse" | "read_only",
  Permission[]
> = {
  owner: buildPermissions([
    ["products", "view"],
    ["products", "create"],
    ["products", "edit"],
    ["products", "archive"],
    ["products", "view_cost"],
    ["inventory", "view"],
    ["inventory", "adjust"],
    ["purchases", "view"],
    ["purchases", "receive"],
    ["sales", "view"],
    ["sales", "create"],
    ["financial", "revenue"],
    ["financial", "profit"],
    ["settings", "currency"],
    ["users", "invite"],
  ]),
  admin: buildPermissions([
    ["products", "view"],
    ["products", "create"],
    ["products", "edit"],
    ["products", "archive"],
    ["products", "view_cost"],
    ["inventory", "view"],
    ["purchases", "view"],
    ["sales", "view"],
    ["sales", "create"],
    ["financial", "revenue"],
    ["settings", "company"],
  ]),
  manager: buildPermissions([
    ["products", "view"],
    ["inventory", "view"],
    ["purchases", "view"],
    ["sales", "view"],
    ["sales", "create"],
    ["financial", "revenue"],
  ]),
  seller: buildPermissions([
    ["products", "view"],
    ["inventory", "view"],
    ["sales", "view"],
    ["sales", "create"],
    ["customers", "view"],
  ]),
  warehouse: buildPermissions([
    ["products", "view"],
    ["inventory", "view"],
    ["inventory", "adjust"],
    ["purchases", "view"],
    ["purchases", "receive"],
  ]),
  read_only: buildPermissions([
    ["products", "view"],
    ["inventory", "view"],
    ["sales", "view"],
    ["purchases", "view"],
    ["reports", "read"],
  ]),
}

export function userWithRole(
  role: keyof typeof ROLE_PERMISSION_PRESETS,
  overrides: Partial<AuthenticatedUser> = {}
): AuthenticatedUser {
  return buildTestUser({
    role,
    permissions: ROLE_PERMISSION_PRESETS[role],
    ...overrides,
  })
}
