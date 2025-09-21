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

    // Mock flash sale status with dynamic IDs
    await page.route('**/flash-sale/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            productId: 'test-product-id',
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

    // Set auth token in localStorage before navigation
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          token: 'mock-user-token',
          user: {
            userId: 'user-id',
            email: 'user@example.com',
            role: 'user'
          },
          isAuthenticated: true
        }
      }))
    })
    
    // Navigate to flash sale page directly (skip login since we have token)
    await page.goto('/flash-sale')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the flash sale page
    await expect(page.locator('h1:has-text("Flash Sale")')).toBeVisible()
  })

  test('should successfully queue purchase request', async ({ page }) => {
    // Mock successful purchase API response
    await page.route('**/purchase', async route => {
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

    // Click "Buy Now" button
    await page.click('button:has-text("Buy Now")')

    // Wait for the success alert to appear
    await page.waitForTimeout(1000)
  })

  test('should show feedback when user has already purchased', async ({ page }) => {
    // Mock API response for already purchased
    await page.route('**/purchase', async route => {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'You have already purchased this item'
        })
      })
    })

    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('You have already purchased this item')
      await dialog.accept()
    })

    // Click "Buy Now" button
    await page.click('button:has-text("Buy Now")')

    // Wait for the already purchased alert to appear
    await page.waitForTimeout(1000)
  })

  test('should show feedback when sale has ended', async ({ page }) => {
    // Mock API response for ended sale
    await page.route('**/purchase', async route => {
      await route.fulfill({
        status: 410,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Flash sale has ended'
        })
      })
    })

    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Flash sale has ended')
      await dialog.accept()
    })

    // Click "Buy Now" button
    await page.click('button:has-text("Buy Now")')

    // Wait for the ended sale alert to appear
    await page.waitForTimeout(1000)
  })

  test('should show feedback when item is sold out', async ({ page }) => {
    // Mock API response for sold out
    await page.route('**/purchase', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Item is sold out'
        })
      })
    })

    // Set up dialog handler for alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Item is sold out')
      await dialog.accept()
    })

    // Click "Buy Now" button
    await page.click('button:has-text("Buy Now")')

    // Wait for the sold out alert to appear
    await page.waitForTimeout(1000)
  })
})
