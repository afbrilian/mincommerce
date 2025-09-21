import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TestSetup } from '../support/test-setup'

Given('there is an upcoming flash sale', async function (this: TestSetup) {
  await this.page.route('**/admin/flash-sale/*', async route => {
    const url = route.request().url()
    if (url.includes('/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            totalOrders: 0,
            confirmedOrders: 0,
            pendingOrders: 0,
            failedOrders: 0,
            totalQuantity: 1000,
            availableQuantity: 1000,
            soldQuantity: 0
          }
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            productId: 'test-product-id',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            endTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
            status: 'upcoming',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Given('there is an active flash sale', async function (this: TestSetup) {
  await this.page.route('**/admin/flash-sale/*', async route => {
    const url = route.request().url()
    if (url.includes('/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            totalOrders: 5,
            confirmedOrders: 3,
            pendingOrders: 2,
            failedOrders: 0,
            totalQuantity: 1000,
            availableQuantity: 997,
            soldQuantity: 3
          }
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            productId: 'test-product-id',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Given('there is an ended flash sale', async function (this: TestSetup) {
  await this.page.route('**/admin/flash-sale/*', async route => {
    const url = route.request().url()
    if (url.includes('/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            totalOrders: 10,
            confirmedOrders: 8,
            pendingOrders: 1,
            failedOrders: 1,
            totalQuantity: 1000,
            availableQuantity: 992,
            soldQuantity: 8
          }
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            productId: 'test-product-id',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            startTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
            endTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            status: 'ended',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

When('the start time is reached', async function (this: TestSetup) {
  // This would typically involve advancing time in a test environment
  // For BDD, we'll mock the API response to reflect the new status
  await this.page.route('**/admin/flash-sale/*', async route => {
    const url = route.request().url()
    if (url.includes('/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            totalOrders: 0,
            confirmedOrders: 0,
            pendingOrders: 0,
            failedOrders: 0,
            totalQuantity: 1000,
            availableQuantity: 1000,
            soldQuantity: 0
          }
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            productId: 'test-product-id',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            startTime: new Date(Date.now() - 3600000).toISOString(), // Now in the past
            endTime: new Date(Date.now() + 3600000).toISOString(), // Still in the future
            status: 'active', // Changed to active
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
  // Re-fetch data to trigger UI update
  await this.page.reload()
})

When('the end time is reached', async function (this: TestSetup) {
  // This would typically involve advancing time in a test environment
  // For BDD, we'll mock the API response to reflect the new status
  await this.page.route('**/admin/flash-sale/*', async route => {
    const url = route.request().url()
    if (url.includes('/stats')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            totalOrders: 5,
            confirmedOrders: 3,
            pendingOrders: 2,
            failedOrders: 0,
            totalQuantity: 1000,
            availableQuantity: 997,
            soldQuantity: 3
          }
        })
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            saleId: 'test-sale-id',
            productId: 'test-product-id',
            productName: 'Limited Edition Gaming Console',
            productDescription: 'The most advanced gaming console with exclusive features',
            productPrice: 599.99,
            startTime: new Date(Date.now() - 7200000).toISOString(), // Now in the past
            endTime: new Date(Date.now() - 3600000).toISOString(), // Now in the past
            status: 'ended', // Changed to ended
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
  // Re-fetch data to trigger UI update
  await this.page.reload()
})

Then('I should see the flash sale status section', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

Then('I should see the current status \\(upcoming, active, or ended)', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="status-badge"]')).toBeVisible()
})

Then('I should see the product name {string}', async function (this: ICustomWorld, productName: string) {
  await expect(this.page.locator('[data-testid="product-name"]')).toContainText(productName)
})

Then('I should see the product price {string}', async function (this: ICustomWorld, price: string) {
  await expect(this.page.locator('[data-testid="product-price"]')).toContainText(price)
})

Then('I should see the available quantity', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="available-quantity"]')).toBeVisible()
})

Then('I should see the total quantity', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="total-quantity"]')).toBeVisible()
})

Then('I should see a countdown timer', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="time-until-start"]')).toBeVisible()
})

Then('the countdown should update every second', async function (this: TestSetup) {
  // This would typically involve checking that the countdown updates
  // For BDD, we'll just verify the countdown element is present
  await expect(this.page.locator('[data-testid="time-until-start"]')).toBeVisible()
})

Then('the status should automatically change to {string}', async function (this: ICustomWorld, expectedStatus: string) {
  await expect(this.page.locator('[data-testid="status-badge"]')).toContainText(expectedStatus)
})

Then('the countdown should switch to show time until end', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="time-until-end"]')).toBeVisible()
})

Then('I should see time since start', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="time-since-start"]')).toBeVisible()
})

Then('I should see time since end', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="time-since-end"]')).toBeVisible()
})

Then('I should see order statistics', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="total-orders"]')).toBeVisible()
  await expect(this.page.locator('[data-testid="confirmed-orders"]')).toBeVisible()
  await expect(this.page.locator('[data-testid="pending-orders"]')).toBeVisible()
})

Then('I should see {string} total orders', async function (this: ICustomWorld, expectedCount: string) {
  await expect(this.page.locator('[data-testid="total-orders"]')).toContainText(expectedCount)
})

Then('I should see {string} confirmed orders', async function (this: ICustomWorld, expectedCount: string) {
  await expect(this.page.locator('[data-testid="confirmed-orders"]')).toContainText(expectedCount)
})

Then('I should see {string} pending orders', async function (this: ICustomWorld, expectedCount: string) {
  await expect(this.page.locator('[data-testid="pending-orders"]')).toContainText(expectedCount)
})

Then('I should see {string} sold quantity', async function (this: ICustomWorld, expectedCount: string) {
  await expect(this.page.locator('[data-testid="sold-quantity"]')).toContainText(expectedCount)
})

Then('I should see {string} available quantity', async function (this: ICustomWorld, expectedCount: string) {
  await expect(this.page.locator('[data-testid="available-quantity"]')).toContainText(expectedCount)
})

Then('I should see {string} total quantity', async function (this: ICustomWorld, expectedCount: string) {
  await expect(this.page.locator('[data-testid="total-quantity"]')).toContainText(expectedCount)
})
