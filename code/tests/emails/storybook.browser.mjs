import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const root = resolve('.storybook/build');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!path.startsWith(root + '/')) {
    res.writeHead(403).end();
    return;
  }
  try {
    res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });
  for (const story of ['default', 'leading-zero', 'long-recipient', 'narrow']) {
    await page.goto(
      `http://127.0.0.1:${server.address().port}/iframe.html?id=emails-sign-in-code--${story}&viewMode=story`,
    );
    const frame = page.frameLocator('iframe[title="PseudoStar sign-in email"]');
    await frame.getByRole('heading', { name: 'Your sign-in code' }).waitFor();
    assert.match(await frame.locator('body').innerText(), /\d{6}/);
    const dimensions = await frame.locator('body').evaluate((el) => ({
      width: el.ownerDocument.documentElement.clientWidth,
      scroll: el.scrollWidth,
    }));
    assert.ok(dimensions.scroll <= dimensions.width, `${story}: horizontal overflow`);
    await page.screenshot({ path: `.storybook/${story}.png` });
  }
  for (const story of [
    'code-entry',
    'wrong-code',
    'expired-code',
    'verification-loading',
    'send-failed',
    'resend-cooldown',
  ]) {
    await page.goto(
      `http://127.0.0.1:${server.address().port}/iframe.html?id=auth-sign-in--${story}&viewMode=story`,
    );
    await page.locator('[data-auth-checked="passed"]').waitFor();
    await page.screenshot({ path: `.storybook/auth-${story}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `http://127.0.0.1:${server.address().port}/iframe.html?id=auth-sign-in--code-entry&viewMode=story`,
  );
  await page.locator('[data-auth-checked="passed"]').waitFor();
  assert.ok(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Auth form has horizontal overflow.',
  );
  await page.screenshot({ path: '.storybook/auth-mobile.png', fullPage: true });
  console.log(
    'Four email frames and six auth interaction stories passed; mobile auth has no horizontal overflow.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
