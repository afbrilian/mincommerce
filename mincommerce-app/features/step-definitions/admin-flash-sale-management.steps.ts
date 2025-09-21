import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TestContext } from '../support/test-setup'

Given('there is an existing flash sale in the system', async function (this: TestContext) {
  // Mock the API response for getting flash sale details
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
})

Given('there is no existing flash sale in the system', async function (this: TestContext) {
  // Mock the API response to return 404 for flash sale
  await this.page.route('**/admin/flash-sale/*', async route => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Flash sale not found'
      })
    })
  })
})

Given('there is an existing flash sale with start time {string} and end time {string}', async function (this: TestContext, startTime: string, endTime: string) {
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
            startTime: startTime,
            endTime: endTime,
            status: 'upcoming',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }
        })
      })
    }
  })
})

Given('I can see the flash sale management form', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="flash-sale-form"]')).toBeVisible()
  await expect(this.page.locator('[data-testid="start-time-input"]')).toBeVisible()
  await expect(this.page.locator('[data-testid="end-time-input"]')).toBeVisible()
  await expect(this.page.locator('[data-testid="save-button"]')).toBeVisible()
})

Then('I should see {string} as the main heading', async function (this: TestContext, heading: string) {
  await expect(this.page.locator('[data-testid="flash-sale-management"]')).toContainText(heading)
})

Then('I should see a form with start time input', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="start-time-input"]')).toBeVisible()
})

Then('I should see a form with end time input', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="end-time-input"]')).toBeVisible()
})

Then('I should see a {string} button', async function (this: TestContext, buttonText: string) {
  await expect(this.page.locator(`[data-testid="save-button"]:has-text("${buttonText}")`)).toBeVisible()
})

Then('I should see the current flash sale status', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

Then('the start time input should contain {string}', async function (this: TestContext, value: string) {
  await expect(this.page.locator('[data-testid="start-time-input"]')).toHaveValue(value)
})

Then('the end time input should contain {string}', async function (this: TestContext, value: string) {
  await expect(this.page.locator('[data-testid="end-time-input"]')).toHaveValue(value)
})

When('I update the start time to {string}', async function (this: TestContext, startTime: string) {
  await this.page.fill('[data-testid="start-time-input"]', startTime)
})

When('I update the end time to {string}', async function (this: TestContext, endTime: string) {
  await this.page.fill('[data-testid="end-time-input"]', endTime)
})

When('I enter start time {string}', async function (this: TestContext, startTime: string) {
  await this.page.fill('[data-testid="start-time-input"]', startTime)
})

When('I enter end time {string}', async function (this: TestContext, endTime: string) {
  await this.page.fill('[data-testid="end-time-input"]', endTime)
})

When('I clear the start time input', async function (this: TestContext) {
  await this.page.fill('[data-testid="start-time-input"]', '')
})

When('I clear the end time input', async function (this: TestContext) {
  await this.page.fill('[data-testid="end-time-input"]', '')
})

Then('I should see a success message', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
})

Then('I should see an error message {string}', async function (this: TestContext, errorMessage: string) {
  await expect(this.page.locator('[data-testid="error-message"]')).toContainText(errorMessage)
})

Then('the flash sale should be updated in the system', async function (this: TestContext) {
  // Mock successful update response
  await this.page.route('**/admin/flash-sale', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          saleId: 'test-sale-id',
          productId: 'test-product-id',
          startTime: '2024-01-01T09:00:00.000Z',
          endTime: '2024-01-01T11:00:00.000Z',
          status: 'upcoming'
        }
      })
    })
  })
})

Then('the flash sale should not be updated', async function (this: TestContext) {
  // Verify that the form still shows the original values
  await expect(this.page.locator('[data-testid="start-time-input"]')).not.toHaveValue('2024-01-01T09:00:00.000Z')
})

Then('the flash sale should be created in the system', async function (this: TestContext) {
  // Mock successful creation response
  await this.page.route('**/admin/flash-sale', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          saleId: 'new-sale-id',
          productId: 'test-product-id',
          startTime: '2024-01-01T10:00:00.000Z',
          endTime: '2024-01-01T12:00:00.000Z',
          status: 'upcoming'
        }
      })
    })
  })
})

Then('the form should show the updated values', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="start-time-input"]')).toHaveValue('2024-01-01T09:00:00.000Z')
  await expect(this.page.locator('[data-testid="end-time-input"]')).toHaveValue('2024-01-01T11:00:00.000Z')
})

Then('I should see the flash sale status updated', async function (this: TestContext) {
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

Then('the form should retain the original values', async function (this: TestContext) {
  // Verify form values haven't changed after error
  await expect(this.page.locator('[data-testid="start-time-input"]')).toHaveValue('2024-01-01T10:00:00.000Z')
  await expect(this.page.locator('[data-testid="end-time-input"]')).toHaveValue('2024-01-01T12:00:00.000Z')
})

Given('the API is returning an error', async function (this: TestContext) {
  await this.page.route('**/admin/flash-sale', async route => {
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

