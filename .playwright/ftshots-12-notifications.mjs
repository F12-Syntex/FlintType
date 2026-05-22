async page => {
      await page.locator('button[aria-label*="otification" i], button[aria-label*="bell" i]').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(900);
    }