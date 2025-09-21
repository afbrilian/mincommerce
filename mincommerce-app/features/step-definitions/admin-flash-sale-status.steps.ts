import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TestContext } from '../support/test-setup'

Then('I should see the flash sale status section', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

Then('I should see the current status {string}', async function (this: TestContext, status: string) {
  await expect(this.page.locator('[data-testid="status-badge"]')).toContainText(status)
})

Then('I should see the product name {string}', async function (this: TestContext, productName: string) {
  await expect(this.page.locator('[data-testid="product-name"]')).toContainText(productName)
})

Then('I should see the product price {string}', async function (this: TestContext, price: string) {
  await expect(this.page.locator('[data-testid="product-price"]')).toContainText(price)
})

Then('I should see the available quantity', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="available-quantity"]')).toBeVisible()
})

Then('I should see the total quantity', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="total-quantity"]')).toBeVisible()
})

Given('there is a flash sale with start time in the future', async function (this: TestContext) {
  const futureStartTime = new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  const futureEndTime = new Date(Date.now() + 7200000).toISOString() // 2 hours from now
  
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
            totalRevenue: 0
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
            startTime: futureStartTime,
            endTime: futureEndTime,
            status: 'upcoming',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Given('there is a flash sale with start time in the past and end time in the future', async function (this: TestContext) {
  const pastStartTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  const futureEndTime = new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  
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
            totalRevenue: 1799.97
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
            startTime: pastStartTime,
            endTime: futureEndTime,
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Given('there is a flash sale with end time in the past', async function (this: TestContext) {
  const pastStartTime = new Date(Date.now() - 7200000).toISOString() // 2 hours ago
  const pastEndTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  
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
            pendingOrders: 0,
            failedOrders: 2,
            totalQuantity: 1000,
            availableQuantity: 992,
            totalRevenue: 4799.92
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
            startTime: pastStartTime,
            endTime: pastEndTime,
            status: 'ended',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Given('there is an active flash sale with orders', async function (this: TestContext) {
  const pastStartTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  const futureEndTime = new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  
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
            totalOrders: 15,
            confirmedOrders: 12,
            pendingOrders: 2,
            failedOrders: 1,
            totalQuantity: 1000,
            availableQuantity: 988,
            totalRevenue: 7199.88
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
            startTime: pastStartTime,
            endTime: futureEndTime,
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Then('I should see the status as {string}', async function (this: TestContext, status: string) {
  await expect(this.page.locator('[data-testid="status-badge"]')).toContainText(status)
})

Then('I should see the time until start', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="time-until-start"]')).toBeVisible()
})

Then('I should see the time until end', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="time-until-end"]')).toBeVisible()
})

Then('I should see the time since start', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="time-since-start"]')).toBeVisible()
})

Then('I should see the time since end', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="time-since-end"]')).toBeVisible()
})

Then('I should see the total orders count', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="total-orders"]')).toBeVisible()
})

Then('I should see the confirmed orders count', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="confirmed-orders"]')).toBeVisible()
})

Then('I should see the pending orders count', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="pending-orders"]')).toBeVisible()
})

Then('I should see the sold quantity', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="sold-quantity"]')).toBeVisible()
})

When('I update the start time to a time in the past', async function (this: TestContext) {
  const pastStartTime = new Date(Date.now() - 3600000).toISOString() // 1 hour ago
  await this.page.fill('[data-testid="start-time-input"]', pastStartTime)
})

When('I update the end time to a time in the past', async function (this: TestContext) {
  const pastEndTime = new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
  await this.page.fill('[data-testid="end-time-input"]', pastEndTime)
})

Then('I should see the status change to {string}', async function (this: TestContext, status: string) {
  await expect(this.page.locator('[data-testid="status-badge"]')).toContainText(status)
})

Then('the status should update automatically', async function (this: TestContext) {
  // Wait for status to update after save
  await this.page.waitForTimeout(1000)
  await expect(this.page.locator('[data-testid="status-badge"]')).toBeVisible()
})

Then('I should see a countdown timer', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="countdown-timer"]')).toBeVisible()
})

Then('the countdown should update every second', async function (this: TestContext) {
  // Wait for countdown to update
  await this.page.waitForTimeout(2000)
  await expect(this.page.locator('[data-testid="countdown-timer"]')).toBeVisible()
})

When('the start time is reached', async function (this: TestContext) {
  // Simulate time passing by updating the mock to return active status
  const pastStartTime = new Date(Date.now() - 1000).toISOString() // Just started
  const futureEndTime = new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  
  await this.page.route('**/admin/flash-sale/*', async route => {
    const url = route.request().url()
    if (!url.includes('/stats')) {
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
            startTime: pastStartTime,
            endTime: futureEndTime,
            status: 'active',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Then('the countdown should switch to show time until end', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="time-until-end"]')).toBeVisible()
})

Given('the API is returning an error for flash sale data', async function (this: TestContext) {
  await this.page.route('**/admin/flash-sale/*', async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    })
  })
})

Then('I should see an error message {string}', async function (this: TestContext, errorMessage: string) {
  await expect(this.page.locator('[data-testid="error-message"]')).toContainText(errorMessage)
})

Then('I should see a retry button', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible()
})

When('I click the retry button', async function (this: TestContext) {
  await this.page.click('[data-testid="retry-button"]')
})

Then('the flash sale data should be reloaded', async function (this: TestContext) {
  // Restore successful API response
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
            totalRevenue: 0
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
            startTime: '2024-01-01T10:00:00.000Z',
            endTime: '2024-01-01T12:00:00.000Z',
            status: 'upcoming',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
  
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

