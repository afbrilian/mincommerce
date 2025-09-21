import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Login')
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

  test('should login admin user and redirect to admin console', async ({ page }) => {
    // Mock the API response for admin login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-admin-token',
          userType: 'admin',
          email: 'admin@brilian.af',
          userId: 'admin-user-id'
        })
      })
    })

    await page.fill('input[placeholder="Enter your email address"]', 'admin@brilian.af')
    await page.click('button[type="submit"]')
    
    // Should redirect to admin page
    await expect(page).toHaveURL('/admin')
    await expect(page.locator('h1')).toContainText('Admin Console')
    await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
  })

  test('should login regular user and redirect to flash sale page', async ({ page }) => {
    // Mock the API response for regular user login
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-user-token',
          userType: 'user',
          email: 'user@example.com',
          userId: 'user-id'
        })
      })
    })

    // Mock the flash sale status API
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            status: 'upcoming',
            productName: 'Test Product',
            productDescription: 'Test Description',
            productPrice: 99.99,
            availableQuantity: 100,
            timeUntilStart: 3600,
            timeUntilEnd: 7200
          }
        })
      })
    })

    await page.fill('input[placeholder="Enter your email address"]', 'user@example.com')
    await page.click('button[type="submit"]')
    
    // Should redirect to flash sale page
    await expect(page).toHaveURL('/flash-sale')
    await expect(page.locator('h1')).toContainText('Flash Sale')
    await expect(page.locator('[data-testid="flash-sale-interface"]')).toBeVisible()
  })

  test('should auto-register new user', async ({ page }) => {
    // Mock the API response for new user auto-registration
    await page.route('**/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-new-user-token',
          userType: 'user',
          email: 'newuser@example.com',
          userId: 'new-user-id'
        })
      })
    })

    // Mock the flash sale status API
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            status: 'upcoming',
            productName: 'Test Product',
            productDescription: 'Test Description',
            productPrice: 99.99,
            availableQuantity: 100,
            timeUntilStart: 3600,
            timeUntilEnd: 7200
          }
        })
      })
    })

    await page.fill('input[placeholder="Enter your email address"]', 'newuser@example.com')
    await page.click('button[type="submit"]')
    
    // Should redirect to flash sale page (auto-registered as user)
    await expect(page).toHaveURL('/flash-sale')
    await expect(page.locator('h1')).toContainText('Flash Sale')
  })
})
