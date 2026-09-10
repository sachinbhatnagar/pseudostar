import { test, expect, editor, guest, write, signIn } from './fixtures';

test('selected block stays available when using workspace actions', async ({ page }) => {
  await guest(page);
  await write(page, 'OUTPUT 1\nOUTPUT 2\nOUTPUT 3');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Select an instruction' });
  await picker.selectOption({ label: 'OUTPUT 2' });
  await page.getByRole('button', { name: 'Up', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT 2\nOUTPUT 1\nOUTPUT 3', { useInnerText: true });
  await page.getByRole('button', { name: 'Down', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT 1\nOUTPUT 2\nOUTPUT 3', { useInnerText: true });
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT 1\nOUTPUT 3', { useInnerText: true });
});

test('Nest and Out move the selected instruction across a loop boundary', async ({ page }) => {
  await guest(page);
  await write(page, 'FOR i = 1 TO 3\n  OUTPUT i\nNEXT i\nOUTPUT 9');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Select an instruction' })
    .selectOption({ label: 'OUTPUT 9' });
  await page.getByRole('button', { name: 'Nest', exact: true }).click();
  await expect(editor(page)).toHaveText('FOR i = 1 TO 3\n  OUTPUT 9\n  OUTPUT i\nNEXT i', {
    useInnerText: true,
  });
  await page.getByRole('button', { name: 'Out', exact: true }).click();
  await expect(editor(page)).toHaveText('FOR i = 1 TO 3\n  OUTPUT i\nNEXT i\nOUTPUT 9', {
    useInnerText: true,
  });
  await write(page, 'FOR i = 1 TO 3\n  OUTPUT i\n  OUTPUT 9\nNEXT i');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(page.locator('.canvas-heading')).not.toContainText('Updating blocks');
  await page
    .getByRole('combobox', { name: 'Select an instruction' })
    .selectOption({ label: 'OUTPUT 9' });
  await page.getByRole('button', { name: 'Out', exact: true }).click();
  await expect(editor(page)).toHaveText('FOR i = 1 TO 3\n  OUTPUT i\nNEXT i\nOUTPUT 9', {
    useInnerText: true,
  });
});

test('a clicked block can be explained from the bottom toolbar', async ({ page }) => {
  await page.route('**/api/explanations', async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ kind: 'block', block: 'OUTPUT 42' });
    await route.fulfill({ json: { paragraph: 'Shows the number 42.', remaining: 199 } });
  });
  await page.goto('/');
  await signIn(page);
  await write(page, 'OUTPUT 42');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(page.locator('.blockly-host')).toContainText('42');
  await page
    .locator('.blockly-host .blocklyPath')
    .first()
    .click({ position: { x: 5, y: 15 } });
  await page.getByRole('button', { name: 'Explain Purpose', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Explain Purpose' })).toContainText(
    'Shows the number 42.',
  );
});
