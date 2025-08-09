import { test, expect } from '@playwright/test';

test.describe('Functional UI Check', () => {
  test('should open and close modals correctly', async ({ page }) => {
    await page.goto('http://localhost:8080/');

    // Test the Employee Modal
    await page.click('[data-action="openEmployeeModal"]');
    const employeeModal = page.locator('#employeeModal');
    await expect(employeeModal).toBeVisible();
    await page.click('#employeeModal .close');
    await expect(employeeModal).toBeHidden();

    // Test the PTO Requests Modal
    // First, I need to find the button that opens this modal.
    // Looking at index.html, it's [data-action="openPTORequestsModal"]
    await page.click('[data-action="openPTORequestsModal"]');
    const ptoModal = page.locator('#ptoRequestsModal');
    await expect(ptoModal).toBeVisible();
    await page.click('#ptoRequestsModal .close');
    await expect(ptoModal).toBeHidden();
  });
});
