async page => {
      // Drive a real run: read the passage words, type them at ~140 wpm so the
      // results screen renders with authentic, good-looking numbers.
      await page.waitForTimeout(800);
      const words = await page.evaluate(() => {
        const root = document.querySelector('[role="status"]');
        if (!root) return [];
        const spans = Array.from(root.querySelectorAll('span.whitespace-nowrap'));
        const out = spans.map((s) => (s.textContent || '').trim()).filter(Boolean);
        return out.slice(0, 28);
      });
      if (!words.length) return 'no-words';
      await page.mouse.click(720, 360);
      for (let i = 0; i < words.length; i++) {
        await page.keyboard.type(words[i], { delay: 60 });
        await page.keyboard.press('Space');
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(2200);
      return 'typed ' + words.length;
    }