import { test, expect } from '@playwright/test';

test.describe('Connection Status Indicator', () => {
  test('should correctly display online and offline status', async ({ page }) => {
    const connectionStatus = page.locator('#connection-status');

    // 1. Initial Load - Should be "Connected"
    await page.goto('http://localhost:8080/');
    await expect(connectionStatus).toHaveText('Connected', { timeout: 10000 });

    // 2. Go Offline
    await page.context().setOffline(true);

    // The UI should update to the offline message.
    await expect(connectionStatus).toHaveText('Offline: Changes will be saved when reconnected', { timeout: 15000 });

    // 3. Go back Online
    await page.context().setOffline(false);

    // The UI should update back to "Connected".
    await expect(connectionStatus).toHaveText('Connected', { timeout: 15000 });
  });
});
