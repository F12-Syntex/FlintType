async page => {
  await page.route('**/api/leaderboard/list', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ scope:'all', window:'all_time', preset:'any', generatedAtMs: Date.now(), entries: [{ testId:'x', rank:1, userId:'u', name:'Zara Mock', username:'zaramock', tags:['owner'], netWpm:200, wpm:200, accuracy:100, mode:'training', durationOrWordCount:50, completedAtMs: Date.now() }] }) }));
  await page.goto('http://localhost:3000/leaderboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  const txt = await page.evaluate(() => document.body.innerText);
  return JSON.stringify({ hasZara: txt.includes('zaramock'), hasSyntex: txt.includes('syntex') });
}
