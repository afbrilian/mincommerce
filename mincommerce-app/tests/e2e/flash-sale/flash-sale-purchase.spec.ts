import { test, expect } from '@playwright/test'

test.describe('Flash Sale Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
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

    // Mock active flash sale status
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            status: 'active',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            availableQuantity: 50,
            timeUntilStart: 0,
            timeUntilEnd: 1800,
            startTime: new Date(Date.now() - 1000).toISOString(),
            endTime: new Date(Date.now() + 1800 * 1000).toISOString()
          }
        })
      })
    })

    // Navigate to login and then to flash sale page
    await page.goto('/')
    await page.fill('input[placeholder="Enter your email address"]', 'user@example.com')
    await page.click('button[type="submit"]')
    await page.waitForURL('/flash-sale', { timeout: 10000 })
    
    // Ensure auth token is set in localStorage
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          token: 'mock-user-token',
          user: {
            id: 'user-id',
            email: 'user@example.com',
            userType: 'user'
          }
        }
      }))
    })
  })

  test('should successfully queue purchase request', async ({ page }) => {
    // Mock successful purchase API response
    await page.route('**/purchase/queue', async route => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Purchase request queued successfully',
          purchaseId: 'purchase-123'
        })
      })
    })

    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Purchase request queued!')
      await dialog.accept()
    })

    // Wait for page to be ready
    await page.waitForLoadState('networkidle')
    
    // Click buy button
    await page.click('button:has-text("Buy Now")')

    // Wait for the alert to appear (purchase success)
    await page.waitForTimeout(1000)
  })

  test('should handle purchase API error', async ({ page }) => {
    // Mock failed purchase API response
    await page.route('**/purchase/queue', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Purchase failed: Insufficient stock'
        })
      })
    })

    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Purchase failed: Insufficient stock')
      await dialog.accept()
    })

    // Click buy button
    await page.click('button:has-text("Buy Now")')

    // Wait for the alert to appear (purchase error)
    await page.waitForTimeout(1000)
  })

  test('should handle network error during purchase', async ({ page }) => {
    // Mock network error
    await page.route('**/purchase/queue', async route => {
      await route.abort('failed')
    })

    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Purchase failed. Please try again.')
      await dialog.accept()
    })

    // Click buy button
    await page.click('button:has-text("Buy Now")')

    // Wait for the alert to appear (network error)
    await page.waitForTimeout(1000)
  })

  test('should disable buy button when sale is not active', async ({ page }) => {
    // Mock upcoming flash sale status
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            status: 'upcoming',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            availableQuantity: 50,
            timeUntilStart: 3600,
            timeUntilEnd: 7200,
            startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 7200 * 1000).toISOString()
          }
        })
      })
    })

    // Reload the page to get upcoming status
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check buy button is not visible for upcoming status
    await expect(page.locator('button:has-text("Buy Now")')).not.toBeVisible()
    await expect(page.locator('text=Sale hasn\'t started yet')).toBeVisible()
  })

  test('should disable buy button when sold out', async ({ page }) => {
    // Mock sold out flash sale status
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            status: 'active',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            availableQuantity: 0,
            timeUntilStart: 0,
            timeUntilEnd: 1800,
            startTime: new Date(Date.now() - 1000).toISOString(),
            endTime: new Date(Date.now() + 1800 * 1000).toISOString()
          }
        })
      })
    })

    // Reload the page to get sold out status
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check buy button is not visible for sold out status
    await expect(page.locator('button:has-text("Buy Now")')).not.toBeVisible()
    await expect(page.locator('text=Sold Out!')).toBeVisible()
  })
})
