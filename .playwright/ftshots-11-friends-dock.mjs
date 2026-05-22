async page => {
      await page.locator('button[aria-label="Friends"]').first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1100);
    }