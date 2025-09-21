import { test, expect } from '@playwright/test'

test.describe('User Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
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
            timeUntilEnd: 7200,
            startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 7200 * 1000).toISOString()
          }
        })
      })
    })

    await page.fill('input[placeholder="Enter your email address"]', 'user@example.com')
    await page.click('button[type="submit"]')
    
    // Wait for navigation to complete
    await page.waitForURL('/flash-sale', { timeout: 10000 })
    
    // Should redirect to flash sale page
    await expect(page).toHaveURL('/flash-sale')
    await expect(page.locator('h1:has-text("Flash Sale")')).toBeVisible()
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
            timeUntilEnd: 7200,
            startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 7200 * 1000).toISOString()
          }
        })
      })
    })

    await page.fill('input[placeholder="Enter your email address"]', 'newuser@example.com')
    await page.click('button[type="submit"]')
    
    // Should redirect to flash sale page (auto-registered as user)
    await expect(page).toHaveURL('/flash-sale')
    await expect(page.locator('h1:has-text("Flash Sale")')).toBeVisible()
  })
})
