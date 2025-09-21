import { Page } from '@playwright/test'

export interface TestContext {
  adminEmail?: string
  userEmail?: string
  newUserEmail?: string
}

export interface TestSetup {
  page: Page
  context: TestContext
}

// This will be extended by the actual test runner
export const test = {
  page: {} as Page,
  context: {} as TestContext
}

export function setTestContext(page: Page, context: TestContext) {
  test.page = page
  test.context = context
}
