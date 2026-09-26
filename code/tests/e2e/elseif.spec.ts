import { test, expect, editor, guest, write } from './fixtures';

test('branch changes preserve existing conditions and bodies', async ({ page }) => {
  await guest(page);
  await write(page, 'IF number = 1 THEN\n    OUTPUT 1\nELSE\n    OUTPUT 2\nENDIF');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  const menu = async (name: string) => {
    await page
      .locator('.blockly-host .blocklyText')
      .filter({ hasText: /^IF$/ })
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name, exact: true }).click();
  };
  await menu('Add ELSEIF branch');
  await expect(editor(page)).toHaveText(
    'IF number = 1 THEN\n    OUTPUT 1\nELSEIF number >= 1 THEN\nELSE\n    OUTPUT 2\nENDIF',
    { useInnerText: true },
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor(page)).toHaveText(
    'IF number = 1 THEN\n    OUTPUT 1\nELSE\n    OUTPUT 2\nENDIF',
    { useInnerText: true },
  );
  await write(page, 'IF number = 1 THEN\nENDIF');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await menu('Add ELSE branch');
  await expect(editor(page)).toHaveText('IF number = 1 THEN\nELSE\nENDIF', { useInnerText: true });
  await menu('Remove ELSE branch');
  await expect(editor(page)).toHaveText('IF number = 1 THEN\nENDIF', { useInnerText: true });
});

test('adding ELSEIF updates pseudocode and supports undo, redo, and reload', async ({ page }) => {
  await guest(page);
  await write(page, 'IF number = 1 THEN\nENDIF');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  const addBranch = async () => {
    await page
      .locator('.blockly-host .blocklyText')
      .filter({ hasText: /^IF$/ })
      .click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Add ELSEIF branch', exact: true }).click();
  };
  await addBranch();
  await expect(editor(page)).toHaveText('IF number = 1 THEN\nELSEIF number >= 1 THEN\nENDIF', {
    useInnerText: true,
  });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor(page)).toHaveText('IF number = 1 THEN\nENDIF', { useInnerText: true });
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor(page)).toContainText('ELSEIF');
  await addBranch();
  await expect(editor(page)).toHaveText(
    'IF number = 1 THEN\nELSEIF number >= 1 THEN\nELSEIF number >= 1 THEN\nENDIF',
    { useInnerText: true },
  );
  await page.reload();
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).toHaveText(
    'IF number = 1 THEN\nELSEIF number >= 1 THEN\nELSEIF number >= 1 THEN\nENDIF',
    { useInnerText: true },
  );
});
