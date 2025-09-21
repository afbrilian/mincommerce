import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Welcome back')
    await expect(page.locator('input[placeholder="Enter your email address"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.fill('input[placeholder="Enter your email address"]', 'invalid-email')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid email format')
  })

  test('should show error for empty email', async ({ page }) => {
    await page.click('button[type="submit"]')
    
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Email is required')
  })
})
