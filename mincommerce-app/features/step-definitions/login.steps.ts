import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { test } from '../support/test-setup'

Given('the application is running', async () => {
  // This step is handled by the test setup
})

Given('I am on the login page', async () => {
  await test.page.goto('/')
  await expect(test.page.locator('h1')).toContainText('Login')
})

Given('I am an admin user with email {string}', async (email: string) => {
  // Admin user setup is handled by the backend
  test.context.adminEmail = email
})

Given('I am a regular user with email {string}', async (email: string) => {
  // Regular user setup is handled by the backend
  test.context.userEmail = email
})

Given('I am a new user with email {string}', async (email: string) => {
  // New user will be auto-created by the backend
  test.context.newUserEmail = email
})

When('I enter my email {string} in the email field', async (email: string) => {
  await test.page.fill('input[type="email"]', email)
})

When('I enter an invalid email {string}', async (email: string) => {
  await test.page.fill('input[type="email"]', email)
})

When('I leave the email field empty', async () => {
  // Field is already empty, just ensure it's cleared
  await test.page.fill('input[type="email"]', '')
})

When('I click the login button', async () => {
  await test.page.click('button[type="submit"]')
})

Then('I should be redirected to the admin console', async () => {
  await expect(test.page).toHaveURL('/admin')
  await expect(test.page.locator('h1')).toContainText('Admin Console')
})

Then('I should be redirected to the flash sale page', async () => {
  await expect(test.page).toHaveURL('/flash-sale')
  await expect(test.page.locator('h1')).toContainText('Flash Sale')
})

Then('I should see the admin dashboard', async () => {
  await expect(test.page.locator('[data-testid="admin-dashboard"]')).toBeVisible()
})

Then('I should see the flash sale interface', async () => {
  await expect(test.page.locator('[data-testid="flash-sale-interface"]')).toBeVisible()
})

Then('I should be automatically registered as a regular user', async () => {
  // This is handled by the backend, we just verify the redirect
  await expect(test.page).toHaveURL('/flash-sale')
})

Then('I should see an error message about invalid email format', async () => {
  await expect(test.page.locator('[data-testid="error-message"]')).toContainText('Invalid email format')
})

Then('I should see an error message about required email', async () => {
  await expect(test.page.locator('[data-testid="error-message"]')).toContainText('Email is required')
})

Then('I should remain on the login page', async () => {
  await expect(test.page).toHaveURL('/')
})
