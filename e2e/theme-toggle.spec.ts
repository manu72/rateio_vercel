import { test, expect } from '@playwright/test'

test.describe('Theme toggle — main page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('theme'))
    await page.goto('/')
    await page.waitForSelector('[data-testid="currency-row"]')
  })

  test('toggle switches to dark mode and html element gets dark class', async ({ page }) => {
    const btn = page.getByRole('button', { name: /toggle theme/i })
    await expect(btn).toBeVisible()

    // Default is light (no dark class)
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('toggle switches back to light mode', async ({ page }) => {
    const btn = page.getByRole('button', { name: /toggle theme/i })

    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await btn.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('dark mode preference persists across page reload', async ({ browser }) => {
    // Fresh context without addInitScript — persistence tests must not clear
    // localStorage on reload, since that's the value under test.
    const context = await browser.newContext({ colorScheme: 'light' })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForSelector('[data-testid="currency-row"]')

    const btn = page.getByRole('button', { name: /toggle theme/i })
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.reload()
    await page.waitForSelector('[data-testid="currency-row"]')
    await expect(page.locator('html')).toHaveClass(/dark/)
    await context.close()
  })

  test('light mode preference persists across page reload', async ({ browser }) => {
    // Dark OS context so toggling to light stores 'light' in localStorage
    // (preference differs from OS default). Fresh context without addInitScript
    // so the stored value survives the reload.
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    await page.goto('/')
    await page.waitForSelector('[data-testid="currency-row"]')

    const btn = page.getByRole('button', { name: /toggle theme/i })
    await expect(page.locator('html')).toHaveClass(/dark/)
    await btn.click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.reload()
    await page.waitForSelector('[data-testid="currency-row"]')
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await context.close()
  })
})

test.describe('Theme toggle — chart page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('theme'))
    await page.goto('/')
    await page.waitForSelector('[data-testid="currency-row"]')
    const chartButtons = page.getByRole('button', { name: /chart/i })
    await chartButtons.first().click()
    await expect(page).toHaveURL(/\/chart\//)
  })

  test('toggle on chart page switches dark mode', async ({ page }) => {
    const btn = page.getByRole('button', { name: /toggle theme/i })
    await expect(btn).toBeVisible()

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)
  })

  test('dark mode set on chart page persists when navigating back to main page', async ({ page }) => {
    const btn = page.getByRole('button', { name: /toggle theme/i })
    await btn.click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByRole('button', { name: /go to home page/i }).click()
    await expect(page).toHaveURL('/')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})

test.describe('Theme toggle — OS preference', () => {
  test('respects dark OS preference when no saved theme', async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: 'dark',
    })
    const page = await context.newPage()
    await page.addInitScript(() => localStorage.removeItem('theme'))
    await page.goto('/')
    await page.waitForSelector('[data-testid="currency-row"]')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await context.close()
  })

  test('respects light OS preference when no saved theme', async ({ browser }) => {
    const context = await browser.newContext({
      colorScheme: 'light',
    })
    const page = await context.newPage()
    await page.addInitScript(() => localStorage.removeItem('theme'))
    await page.goto('/')
    await page.waitForSelector('[data-testid="currency-row"]')

    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await context.close()
  })
})
