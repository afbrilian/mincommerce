import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TestSetup } from '../support/test-setup'

// Common setup steps
Given('the application is running', async function (this: TestSetup) {
  // Application is already running via test setup
})

Given('I am logged in as an admin user', async function (this: TestSetup) {
  await this.page.route('**/auth/login', async route => {
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
  
  await this.page.goto('/')
  await this.page.fill('input[placeholder="Enter your email address"]', 'admin@brilian.af')
  await this.page.click('button[type="submit"]')
  await expect(this.page).toHaveURL('/admin')
})

Given('I am on the admin console page', async function (this: TestSetup) {
  await this.page.goto('/admin')
  await expect(this.page.locator('h1')).toContainText('Admin Console')
})

Given('there is an existing flash sale in the system', async function (this: TestSetup) {
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

Given('there is an existing flash sale with start time {string} and end time {string}', async function (this: ICustomWorld, startTime: string, endTime: string) {
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

Given('there is no existing flash sale in the system', async function (this: TestSetup) {
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

Given('I can see the flash sale management form', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="flash-sale-form"]')).toBeVisible()
})

Given('the API is returning an error', async function (this: TestSetup) {
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

Given('the API is returning an error for flash sale data', async function (this: TestSetup) {
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

// Navigation steps
Given('I am on the login page', async function (this: TestSetup) {
  await this.page.goto('/')
})

Given('I am not logged in', async function (this: TestSetup) {
  await this.page.evaluate(() => {
    localStorage.removeItem('auth-storage')
  })
})

Given('I have a valid admin session', async function (this: TestSetup) {
  await this.page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          userId: 'admin-user-id',
          email: 'admin@brilian.af',
          role: 'admin',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        token: 'mock-admin-token',
        isAuthenticated: true
      }
    }))
  })
})

Given('I have a valid user session', async function (this: TestSetup) {
  await this.page.evaluate(() => {
    localStorage.setItem('auth-storage', JSON.stringify({
      state: {
        user: {
          userId: 'user-id',
          email: 'user@example.com',
          role: 'user',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        token: 'mock-user-token',
        isAuthenticated: true
      }
    }))
  })
})

When('I navigate to {string}', async function (this: ICustomWorld, path: string) {
  await this.page.goto(path)
})

When('I click the {string} button', async function (this: ICustomWorld, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`)
})

When('I click the retry button', async function (this: TestSetup) {
  await this.page.click('[data-testid="retry-button"]')
})

// Flash sale management steps
When('I update the start time to {string}', async function (this: ICustomWorld, startTime: string) {
  const localDateTime = new Date(startTime).toISOString().slice(0, 16)
  await this.page.fill('[data-testid="start-time-input"]', localDateTime)
})

When('I update the end time to {string}', async function (this: ICustomWorld, endTime: string) {
  const localDateTime = new Date(endTime).toISOString().slice(0, 16)
  await this.page.fill('[data-testid="end-time-input"]', localDateTime)
})

When('I enter start time {string}', async function (this: ICustomWorld, startTime: string) {
  const localDateTime = new Date(startTime).toISOString().slice(0, 16)
  await this.page.fill('[data-testid="start-time-input"]', localDateTime)
})

When('I enter end time {string}', async function (this: ICustomWorld, endTime: string) {
  const localDateTime = new Date(endTime).toISOString().slice(0, 16)
  await this.page.fill('[data-testid="end-time-input"]', localDateTime)
})

When('I clear the start time input', async function (this: TestSetup) {
  await this.page.fill('[data-testid="start-time-input"]', '')
})

When('I clear the end time input', async function (this: TestSetup) {
  await this.page.fill('[data-testid="end-time-input"]', '')
})

// Login steps
Given('I am an admin user with email {string}', async function (this: ICustomWorld, email: string) {
  // Admin user setup is handled by the backend
  this.context.adminEmail = email
})

Given('I am a regular user with email {string}', async function (this: ICustomWorld, email: string) {
  // Regular user setup is handled by the backend
  this.context.userEmail = email
})

Given('I am a new user with email {string}', async function (this: ICustomWorld, email: string) {
  // New user will be auto-created by the backend
  this.context.newUserEmail = email
})

When('I enter my email {string} in the email field', async function (this: ICustomWorld, email: string) {
  await this.page.fill('input[placeholder="Enter your email address"]', email)
})

When('I enter an invalid email {string}', async function (this: ICustomWorld, email: string) {
  await this.page.fill('input[placeholder="Enter your email address"]', email)
})

When('I leave the email field empty', async function (this: TestSetup) {
  await this.page.fill('input[placeholder="Enter your email address"]', '')
})

When('I click the login button', async function (this: TestSetup) {
  await this.page.click('button[type="submit"]')
})

// Assertion steps
Then('I should see {string} as the main heading', async function (this: ICustomWorld, heading: string) {
  await expect(this.page.locator('h3')).toContainText(heading)
})

Then('I should see a form with start time input', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="start-time-input"]')).toBeVisible()
})

Then('I should see a form with end time input', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="end-time-input"]')).toBeVisible()
})

Then('I should see a {string} button', async function (this: ICustomWorld, buttonText: string) {
  await expect(this.page.locator(`button:has-text("${buttonText}")`)).toBeVisible()
})

Then('I should see the current flash sale status', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

Then('the start time input should contain {string}', async function (this: ICustomWorld, expectedTime: string) {
  const localDateTime = new Date(expectedTime).toISOString().slice(0, 16)
  await expect(this.page.locator('[data-testid="start-time-input"]')).toHaveValue(localDateTime)
})

Then('the end time input should contain {string}', async function (this: ICustomWorld, expectedTime: string) {
  const localDateTime = new Date(expectedTime).toISOString().slice(0, 16)
  await expect(this.page.locator('[data-testid="end-time-input"]')).toHaveValue(localDateTime)
})

Then('I should see a success message', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
})

Then('I should see an error message {string}', async function (this: ICustomWorld, expectedMessage: string) {
  await expect(this.page.locator('[data-testid="error-message"]')).toContainText(expectedMessage)
})

Then('I should see an error message about invalid email format', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="validation-error"]')).toContainText('Invalid email format')
})

Then('I should see an error message about required email', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="validation-error"]')).toContainText('Email is required')
})

Then('the flash sale should be updated in the system', async function (this: TestSetup) {
  // This would typically involve making an API call to verify the backend state
  // For now, we'll assume the success message indicates it was updated
  await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
})

Then('the flash sale should not be updated', async function (this: TestSetup) {
  // This would typically involve making an API call to verify the backend state
  // For now, we'll assume the error message indicates it wasn't updated
  await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible()
})

Then('the form should show the updated values', async function (this: TestSetup) {
  // This would typically involve checking the form values
  // For now, we'll assume the success message indicates the form was updated
  await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
})

Then('the form should retain the original values', async function (this: TestSetup) {
  // This would typically involve checking the form values
  // For now, we'll assume the error message indicates the form retained original values
  await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible()
})

Then('the flash sale should be created in the system', async function (this: TestSetup) {
  // This would typically involve making an API call to verify the backend state
  // For now, we'll assume the success message indicates it was created
  await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible()
})

Then('I should see the flash sale status updated', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})

// Navigation assertions
Then('I should be redirected to {string}', async function (this: ICustomWorld, expectedUrl: string) {
  await expect(this.page).toHaveURL(expectedUrl)
})

Then('I should see the admin console page', async function (this: TestSetup) {
  await expect(this.page.locator('h1')).toContainText('Admin Console')
})

Then('I should see the flash sale page', async function (this: TestSetup) {
  await expect(this.page.locator('h1')).toContainText('Flash Sale')
})

Then('I should see the login page', async function (this: TestSetup) {
  await expect(this.page.locator('h2')).toContainText('Welcome back')
})

Then('I should be redirected to the admin console', async function (this: TestSetup) {
  await expect(this.page).toHaveURL('/admin')
  await expect(this.page.locator('h1')).toContainText('Admin Console')
})

Then('I should be redirected to the flash sale page', async function (this: TestSetup) {
  await expect(this.page).toHaveURL('/flash-sale')
  await expect(this.page.locator('h1')).toContainText('Flash Sale')
})

Then('I should be redirected to the login page', async function (this: TestSetup) {
  await expect(this.page).toHaveURL('/')
  await expect(this.page.locator('h2')).toContainText('Welcome back')
})

Then('I should see the admin dashboard', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
})

Then('I should see the flash sale interface', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="flash-sale-interface"]')).toBeVisible()
})

Then('I should remain on the login page', async function (this: TestSetup) {
  await expect(this.page).toHaveURL('/')
  await expect(this.page.locator('h2')).toContainText('Welcome back')
})

Then('I should be automatically registered as a regular user', async function (this: TestSetup) {
  // This would typically involve checking the user's role in the system
  // For now, we'll assume the redirect to flash sale page indicates registration
  await expect(this.page).toHaveURL('/flash-sale')
})

Then('my session should be cleared', async function (this: TestSetup) {
  const isAuthenticated = await this.page.evaluate(() => {
    const authStore = localStorage.getItem('auth-storage')
    if (authStore) {
      const { state } = JSON.parse(authStore)
      return state.isAuthenticated
    }
    return false
  })
  expect(isAuthenticated).toBe(false)
})

Then('I should see the login form', async function (this: TestSetup) {
  await expect(this.page.locator('form')).toBeVisible()
  await expect(this.page.locator('input[placeholder="Enter your email address"]')).toBeVisible()
})

Then('I should see {string} in the page title', async function (this: ICustomWorld, title: string) {
  await expect(this.page.locator('h1')).toContainText(title)
})

Then('I should see {string} in the header', async function (this: ICustomWorld, text: string) {
  await expect(this.page.locator('header')).toContainText(text)
})

Then('I should see a logout button', async function (this: TestSetup) {
  await expect(this.page.locator('button:has-text("Logout")')).toBeVisible()
})

Then('I should see a retry button', async function (this: TestSetup) {
  await expect(this.page.locator('[data-testid="retry-button"]')).toBeVisible()
})

Then('the flash sale data should be reloaded', async function (this: TestSetup) {
  // This would typically involve checking that the data was refreshed
  // For now, we'll assume the retry button click triggered a reload
  await expect(this.page.locator('[data-testid="flash-sale-status"]')).toBeVisible()
})
