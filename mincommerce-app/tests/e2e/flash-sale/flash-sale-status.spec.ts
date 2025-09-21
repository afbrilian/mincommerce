import { test, expect } from '@playwright/test'

test.describe('Flash Sale Status Scenarios', () => {
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

    // Navigate to login and then to flash sale page
    await page.goto('/')
    await page.fill('input[placeholder="Enter your email address"]', 'user@example.com')
    await page.click('button[type="submit"]')
    await page.waitForURL('/flash-sale', { timeout: 10000 })
  })

  test('should display active status with buy button enabled', async ({ page }) => {
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
            timeUntilEnd: 1800, // 30 minutes left
            startTime: new Date(Date.now() - 1000).toISOString(),
            endTime: new Date(Date.now() + 1800 * 1000).toISOString()
          }
        })
      })
    })

    // Reload the page to get new status
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check active status
    await expect(page.locator('text=Active')).toBeVisible()
    await expect(page.locator('text=Sale ends in:')).toBeVisible()
    
    // Check buy button is enabled
    await expect(page.locator('button:has-text("Buy Now")')).toBeVisible()
    await expect(page.locator('button:has-text("Buy Now")')).toBeEnabled()
    
    // Check available quantity
    await expect(page.locator('text=50')).toBeVisible()
  })

  test('should display ended status with no buy button', async ({ page }) => {
    // Mock ended flash sale status
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            status: 'ended',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            availableQuantity: 0,
            timeUntilStart: 0,
            timeUntilEnd: 0,
            startTime: new Date(Date.now() - 2000).toISOString(),
            endTime: new Date(Date.now() - 1000).toISOString()
          }
        })
      })
    })

    // Reload the page to get new status
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check ended status
    await expect(page.locator('span:has-text("Ended")')).toBeVisible()
    await expect(page.locator('text=Sale has ended')).toBeVisible()
    
    // Check buy button is not visible
    await expect(page.locator('button:has-text("Buy Now")')).not.toBeVisible()
  })

  test('should display sold out message when active but no quantity', async ({ page }) => {
    // Mock active but sold out flash sale status
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

    // Reload the page to get new status
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check active status
    await expect(page.locator('text=Active')).toBeVisible()
    
    // Check sold out message
    await expect(page.locator('text=Sold Out!')).toBeVisible()
    
    // Check buy button is not visible
    await expect(page.locator('button:has-text("Buy Now")')).not.toBeVisible()
  })

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      })
    })

    // Reload the page to trigger error
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check error message is displayed
    await expect(page.locator('.text-red-600.text-lg.font-medium:has-text("Error")')).toBeVisible()
    await expect(page.locator('text=Internal server error')).toBeVisible()
    await expect(page.locator('button:has-text("Retry")')).toBeVisible()
  })
})
