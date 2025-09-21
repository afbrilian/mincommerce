import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check if the page title is correct
  await expect(page).toHaveTitle(/MinCommerce/)
  
  // Check if the main content is visible
  await expect(page.locator('main')).toBeVisible()
})

test('navigation works', async ({ page }) => {
  await page.goto('/')
  
  // Check if navigation elements are present
  const header = page.locator('header')
  await expect(header).toBeVisible()
})

test('responsive design', async ({ page }) => {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/')
  
  // Check if mobile layout is working
  await expect(page.locator('main')).toBeVisible()
  
  // Test desktop viewport
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/')
  
  // Check if desktop layout is working
  await expect(page.locator('main')).toBeVisible()
})
