import { test, expect, editor, guest, write, saveStatus } from './fixtures';

test('COMPUTE runs, changes block syntax, and survives local reload', async ({ page }) => {
  await guest(page);
  await write(
    page,
    'SET items = [2, 4, 6]\nCOMPUTE count = LENGTH(items)\nCOMPUTE items[2] AS count * 2\nOUTPUT items',
  );
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(page.locator('.blockly-host')).toContainText('COMPUTE');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('log', { name: 'Program output' }).locator('pre')).toHaveText([
    '[2,6,6]',
  ]);
  const countPrefix = page.locator('[id^="line-2_field_"] .blocklyDropdownText');
  await countPrefix.click();
  await page.locator('.blocklyDropDownDiv').getByText('SET', { exact: true }).click();
  await expect(editor(page)).toContainText('SET count = LENGTH(items)');
  await countPrefix.click();
  await expect(
    page.locator('.blocklyDropDownDiv').getByText('COMPUTE', { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.blocklyDropdownMenu .blocklyMenuItemContent').filter({ hasText: /^COMPUTE$/ }),
  ).toHaveCSS('color', 'rgb(40, 59, 46)');
  await page
    .locator('.blocklyDropdownMenu')
    .screenshot({ path: '/tmp/pseudostar-compute-menu.png' });
  await page.locator('.blocklyDropDownDiv').getByText('COMPUTE', { exact: true }).click();
  await expect(editor(page)).toContainText('COMPUTE count AS LENGTH(items)');
  await expect(saveStatus(page)).toContainText('Saved');
  await page.reload();
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(editor(page)).toContainText('COMPUTE count AS LENGTH(items)');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('log', { name: 'Program output' }).locator('pre')).toHaveText([
    '[2,6,6]',
  ]);
  await page
    .getByRole('button', { name: 'SET / COMPUTE Store or calculate a value', exact: true })
    .click();
  await expect(editor(page)).toContainText('SET total = 0');
  await page.screenshot({ path: '/tmp/pseudostar-compute-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'SET / COMPUTE Store or calculate a value', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'SET / COMPUTE Store or calculate a value', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/pseudostar-compute-mobile.png', fullPage: true });
});
