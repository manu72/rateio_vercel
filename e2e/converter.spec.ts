import { test, expect } from '@playwright/test'

test.describe('Converter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for rates to load (skeleton disappears)
    await page.waitForSelector('[data-testid="currency-row"]')
  })

  test('displays currency rows after loading', async ({ page }) => {
    const rows = page.locator('[data-testid="currency-row"]')
    await expect(rows).toHaveCount(4)
  })

  test('editing one field updates all others', async ({ page }) => {
    const inputs = page.locator('[data-testid="currency-row"] input')
    await inputs.first().fill('100')
    await inputs.first().press('Tab')
    // Both second and third inputs should reflect converted values
    const secondValue = await inputs.nth(1).inputValue()
    const thirdValue = await inputs.nth(2).inputValue()
    expect(parseFloat(secondValue)).toBeGreaterThan(0)
    expect(parseFloat(thirdValue)).toBeGreaterThan(0)
  })

  test('selected currencies persist across reload', async ({ page }) => {
    // Open picker and add Swiss Franc
    const addBtn = page.getByText('Add currency')
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await page.getByPlaceholder(/search/i).fill('Swiss')
    await page.getByText('Swiss Franc').click()
    // Verify CHF was added before reloading
    await expect(page.getByText('CHF')).toBeVisible()
    // Reload and confirm persistence
    await page.reload()
    await page.waitForSelector('[data-testid="currency-row"]')
    await expect(page.getByText('CHF')).toBeVisible()
  })

  test('navigates to chart page and back', async ({ page }) => {
    // Click the chart icon on the first row
    const chartButtons = page.getByRole('button', { name: /chart/i })
    await chartButtons.first().click()
    // Should be on a chart page
    await expect(page).toHaveURL(/\/chart\//)
    // Time range buttons should be visible
    await expect(page.getByRole('button', { name: '1 month' })).toBeVisible()
    // Go back
    await page.getByRole('button', { name: /go back/i }).click()
    await expect(page).toHaveURL('/')
  })
})
