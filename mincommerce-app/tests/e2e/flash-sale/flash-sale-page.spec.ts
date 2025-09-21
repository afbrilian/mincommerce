import { test, expect } from '@playwright/test'

test.describe('Flash Sale Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication to be logged in as user
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
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            availableQuantity: 100,
            timeUntilStart: 3600,
            timeUntilEnd: 7200,
            startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
            endTime: new Date(Date.now() + 7200 * 1000).toISOString()
          }
        })
      })
    })

    // Navigate to login and then to flash sale page
    await page.goto('/')
    await page.fill('input[placeholder="Enter your email address"]', 'user@example.com')
    await page.click('button[type="submit"]')
    await page.waitForURL('/flash-sale', { timeout: 10000 })
  })

  test('should display flash sale page elements', async ({ page }) => {
    // Check header elements
    await expect(page.locator('h1:has-text("Flash Sale")')).toBeVisible()
    await expect(page.locator('text=Welcome, User')).toBeVisible()
    await expect(page.locator('text=Logout')).toBeVisible()

    // Check flash sale interface
    await expect(page.locator('[data-testid="flash-sale-interface"]')).toBeVisible()
    
    // Check status section
    await expect(page.locator('h2:has-text("Flash Sale Status")')).toBeVisible()
    await expect(page.locator('text=Upcoming')).toBeVisible()

    // Check product information
    await expect(page.locator('h3:has-text("Product Information")')).toBeVisible()
    await expect(page.locator('text=Limited Edition Gaming Console')).toBeVisible()
    await expect(page.locator('text=The most advanced gaming console with exclusive features')).toBeVisible()
    await expect(page.locator('text=$599.99')).toBeVisible()
    await expect(page.locator('text=Available Quantity:')).toBeVisible()
    await expect(page.locator('text=100')).toBeVisible()
  })

  test('should display countdown timer for upcoming sale', async ({ page }) => {
    // Check countdown timer elements
    await expect(page.locator('text=Sale starts in:')).toBeVisible()
    await expect(page.locator('text=Hours')).toBeVisible()
    await expect(page.locator('text=Minutes')).toBeVisible()
    await expect(page.locator('text=Seconds')).toBeVisible()
    
    // Check that countdown values are displayed
    const hoursElement = page.locator('text=Hours').locator('..').locator('div').first()
    const minutesElement = page.locator('text=Minutes').locator('..').locator('div').first()
    const secondsElement = page.locator('text=Seconds').locator('..').locator('div').first()
    
    await expect(hoursElement).toBeVisible()
    await expect(minutesElement).toBeVisible()
    await expect(secondsElement).toBeVisible()
    
    // Days should not be visible for 1 hour countdown (3600 seconds)
    await expect(page.locator('text=Days')).not.toBeVisible()
  })

  test('should show sale not started message for upcoming status', async ({ page }) => {
    await expect(page.locator('text=Sale hasn\'t started yet')).toBeVisible()
  })

  test('should not show buy button for upcoming status', async ({ page }) => {
    await expect(page.locator('button:has-text("Buy Now")')).not.toBeVisible()
  })

  test('should display days when countdown is longer than 24 hours', async ({ page }) => {
    // Mock flash sale with longer countdown (2 days)
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
            availableQuantity: 100,
            timeUntilStart: 172800, // 2 days in seconds
            timeUntilEnd: 180000,
            startTime: new Date(Date.now() + 172800 * 1000).toISOString(),
            endTime: new Date(Date.now() + 180000 * 1000).toISOString()
          }
        })
      })
    })

    // Reload the page to get new countdown
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Check that days are now visible
    await expect(page.locator('text=Days')).toBeVisible()
    await expect(page.locator('text=Hours')).toBeVisible()
    await expect(page.locator('text=Minutes')).toBeVisible()
    await expect(page.locator('text=Seconds')).toBeVisible()
  })
})
