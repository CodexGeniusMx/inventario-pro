import { test, expect } from "@playwright/test"

test.describe("auth guards", () => {
  test("redirects unauthenticated users from protected pages", async ({ page }) => {
    await page.goto("/products")
    await expect(page).toHaveURL(/\/login/)
  })

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByText("Iniciar sesión", { exact: true }).first()).toBeVisible()
  })
})

test.describe("public routes", () => {
  test("accept-invite page loads", async ({ page }) => {
    await page.goto("/accept-invite")
    await expect(page.locator("body")).toContainText(/Keep Inventory|invit/i)
  })
})
