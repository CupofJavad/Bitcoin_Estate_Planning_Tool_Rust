import { test, expect } from '@playwright/test'

test.describe('Auth (E2E_TEST_PLAN §1)', () => {
  test('1.1 Public home redirect', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible()
    await expect(page.getByTestId('login-email')).toBeVisible()
    await expect(page.getByTestId('login-password')).toBeVisible()
    await expect(page.getByRole('link', { name: /Register/i })).toBeVisible()
  })

  test('1.3 Register — validation: empty email', async ({ page }) => {
    await page.goto('/register')
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('toast-message')).toHaveText(/Please enter your email/i)
    await expect(page).toHaveURL(/\/register/)
  })

  test('1.3 Register — validation: password too short', async ({ page }) => {
    await page.goto('/register')
    await page.getByTestId('register-email').fill('e2e-validation@test.local')
    await page.getByTestId('register-password').fill('short')
    await page.getByTestId('register-submit').click()
    await expect(page.getByTestId('toast-message')).toHaveText(/at least 8 characters/i)
    await expect(page).toHaveURL(/\/register/)
  })

  test('1.5 Login — validation: empty email and password', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('toast-message')).toHaveText(/Please enter email and password/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('1.5 Login — validation: wrong password shows toast', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@localhost')
    await page.getByTestId('login-password').fill('wrongpassword')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('toast-message')).toHaveText(/Login failed|Unauthorized|Authentication required/i)
    await expect(page).toHaveURL(/\/login/)
  })

  test('1.2 Register — happy path', async ({ page }) => {
    const unique = `e2e-${Date.now()}@test.local`
    await page.goto('/register')
    await page.getByTestId('register-email').fill(unique)
    await page.getByTestId('register-name').fill('E2E Test User')
    await page.getByTestId('register-password').fill('password123')
    await page.getByTestId('register-submit').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await expect(page.getByText(/Create Estate Plan|estate plan|Legacy Vault/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('1.4 Login — happy path (admin)', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@localhost')
    await page.getByTestId('login-password').fill('admin')
    await page.getByTestId('login-submit').click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await expect(page.getByText(/admin@localhost|Create Estate Plan|estate plan|Legacy Vault/i).first()).toBeVisible({ timeout: 5000 })
  })
})
