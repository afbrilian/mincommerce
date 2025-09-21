import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { TestContext } from '../support/test-setup'

Given('I am on the admin console page', async function (this: TestContext) {
  await this.page.goto('/admin')
  await expect(this.page.locator('h1')).toContainText('Admin Console')
})

Given('I have a valid admin session', async function (this: TestContext) {
  // Mock the API response for admin login
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

  // Mock the API response for token verification
  await this.page.route('**/auth/verify', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        valid: true,
        userType: 'admin',
        email: 'admin@brilian.af',
        userId: 'admin-user-id',
        role: 'admin'
      })
    })
  })
})

Given('I have a valid user session', async function (this: TestContext) {
  // Mock the API response for user login
  await this.page.route('**/auth/login', async route => {
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

  // Mock the API response for token verification
  await this.page.route('**/auth/verify', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        valid: true,
        userType: 'user',
        email: 'user@example.com',
        userId: 'user-id',
        role: 'user'
      })
    })
  })
})

Given('I am not logged in', async function (this: TestContext) {
  // Mock the API response for token verification to return unauthorized
  await this.page.route('**/auth/verify', async route => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        valid: false,
        error: 'Invalid or expired token'
      })
    })
  })
})

When('I navigate to {string}', async function (this: TestContext, path: string) {
  await this.page.goto(path)
})

Then('I should be redirected to {string}', async function (this: TestContext, path: string) {
  await expect(this.page).toHaveURL(path)
})

Then('I should see the admin console page', async function (this: TestContext) {
  await expect(this.page.locator('h1')).toContainText('Admin Console')
  await expect(this.page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
})

Then('I should see the flash sale page', async function (this: TestContext) {
  await expect(this.page.locator('h1:has-text("Flash Sale")')).toBeVisible()
  await expect(this.page.locator('[data-testid="flash-sale-interface"]')).toBeVisible()
})

Then('I should see the login page', async function (this: TestContext) {
  await expect(this.page.locator('h2')).toContainText('Welcome back')
  await expect(this.page.locator('input[placeholder="Enter your email address"]')).toBeVisible()
})

Then('I should see {string} in the page title', async function (this: TestContext, title: string) {
  await expect(this.page.locator('h1')).toContainText(title)
})

Then('I should see {string} in the header', async function (this: TestContext, text: string) {
  await expect(this.page.locator('header')).toContainText(text)
})

Then('I should see a logout button', async function (this: TestContext) {
  await expect(this.page.locator('button:has-text("Logout")')).toBeVisible()
})

When('I click the {string} button', async function (this: TestContext, buttonText: string) {
  await this.page.click(`button:has-text("${buttonText}")`)
})

Then('my session should be cleared', async function (this: TestContext) {
  // Verify that localStorage is cleared or token is removed
  const token = await this.page.evaluate(() => localStorage.getItem('auth-storage'))
  expect(token).toBeNull()
})

Then('I should see the login form', async function (this: TestContext) {
  await expect(this.page.locator('form')).toBeVisible()
  await expect(this.page.locator('input[type="text"]')).toBeVisible()
  await expect(this.page.locator('button[type="submit"]')).toBeVisible()
})

