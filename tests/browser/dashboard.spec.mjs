import { expect, test } from '@playwright/test';

async function interceptExternal(context) {
  const events = [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === 'http://127.0.0.1:8321') return route.continue();
    if (url.hostname.endsWith('.supabase.co')) {
      if (request.method() === 'POST') events.push(request.postDataJSON());
      return route.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    return route.abort();
  });
  return events;
}

test('dashboard works without consent and fits the viewport', async ({ page, context }) => {
  const events = await interceptExternal(context);
  await page.goto('/');
  await expect(page.locator('#result-count')).toContainText('5 active feeds');
  await expect(page.locator('#rows tr')).toHaveCount(12);
  await expect(page.locator('#privacy-banner')).toBeVisible();
  await page.locator('#privacy-reject').click();
  await page.locator('#market').selectOption('chicago');
  await expect(page.locator('#rows')).toContainText('Chicago');
  await page.locator('#next-page').click();
  await expect(page.locator('#page-label')).toContainText('Page 2');
  const download = page.waitForEvent('download');
  await page.locator('#download-csv').click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  expect(events).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
});

test('old consent is ignored and withdrawal propagates across tabs', async ({ page, context }) => {
  const events = await interceptExternal(context);
  await context.addInitScript(() => {
    localStorage.setItem('buildthepulse_privacy_choice_v2', JSON.stringify({ version: 2, optional: true }));
  });
  await page.goto('/advertise.html');
  await expect(page.locator('#privacy-banner')).toBeVisible();
  expect(events).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth),
  );
  await page.locator('#privacy-accept').click({ timeout: 5000 });
  await expect.poll(() => events.length).toBe(1);
  expect(events[0]).toMatchObject({ event_type: 'page_view', path: '/advertise.html' });

  const dashboard = await context.newPage();
  await dashboard.goto('/');
  await expect.poll(() => events.length).toBe(2);
  await page.locator('#privacy-settings-button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('#privacy-settings-button')).toBeFocused();
  await page.locator('#privacy-settings-button').click();
  await page.locator('#privacy-optional').uncheck();
  await page.locator('#privacy-save').click();
  await dashboard.waitForFunction(() => window.BuildThePulsePrivacy.optionalAllowed === false);
  await dashboard.locator('#market').selectOption('dc');
  expect(events).toHaveLength(2);
});

test('Global Privacy Control overrides stored opt-in', async ({ page, context }) => {
  const events = await interceptExternal(context);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
    localStorage.setItem('buildthepulse_privacy_choice_v3', JSON.stringify({ version: 3, optional: true }));
  });
  await page.goto('/');
  await expect(page.locator('#privacy-banner')).toBeHidden();
  await page.locator('#privacy-settings-button').click();
  await expect(page.locator('#privacy-optional')).toBeDisabled();
  expect(events).toHaveLength(0);
});

test('submission forms stay disabled without JavaScript and use POST', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    await interceptExternal(context);
    const page = await context.newPage();
    for (const [url, selector] of [
      ['/', '#waitlist-form'],
      ['/advertise.html', '#sponsor-form'],
      ['/privacy.html', '#privacy-request-form'],
    ]) {
      await page.goto(url);
      const form = page.locator(selector);
      await expect(form).toHaveAttribute('method', /post/i);
      await expect(form.locator('[type=submit]')).toBeDisabled();
    }
  } finally {
    await context.close();
  }
});

test('all market guides are discoverable from HTML and linked to the sitemap', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    await interceptExternal(context);
    const page = await context.newPage();
    await page.goto('/');
    const links = await page.locator('#markets a').evaluateAll(anchors => anchors.map(anchor => anchor.href));
    expect(links).toHaveLength(4);
    const response = await page.request.get('/sitemap.xml');
    expect(response.ok()).toBe(true);
    const sitemap = await response.text();
    for (const link of links) {
      await page.goto(link);
      const canonical = 'https://buildthepulse.onrender.com' + new URL(link).pathname;
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', canonical);
      await expect(page.locator('.related-markets a')).toHaveCount(3);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Building Permits');
      expect(sitemap).toContain(`<loc>${canonical}</loc>`);
    }
  } finally {
    await context.close();
  }
});
