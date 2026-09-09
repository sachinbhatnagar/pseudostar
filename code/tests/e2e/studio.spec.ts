import { test, expect, editor, guest, write } from './fixtures';

test('SET and function results work in text, blocks, and the variable monitor', async ({
  page,
}) => {
  await guest(page);
  await write(
    page,
    'SET items = [2, 4, 6]\nSET count = LENGTH(items)\nSET items[2] = count\nOUTPUT count\nOUTPUT items',
  );
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(page.locator('.blockly-host')).toContainText('LENGTH');
  await expect(
    page.getByRole('button', {
      name: 'Function result Store the result of function',
      exact: true,
    }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('log', { name: 'Program output' }).locator('pre')).toHaveText([
    '3',
    '[2,3,6]',
  ]);
  await expect(page.getByRole('row').filter({ hasText: 'count' })).toHaveText('count3');
  await page.screenshot({ path: '/tmp/pseudostar-set-functions.png', fullPage: true });
  await page
    .getByRole('button', {
      name: 'Function result Store the result of function',
      exact: true,
    })
    .click();
  await expect(editor(page)).toContainText('SET count = LENGTH(items)');
});

test('guest opens a starter, explores hints in order, and restores the local program', async ({
  page,
  api,
}) => {
  await guest(page);
  await page.getByRole('button', { name: /^Problems/ }).click();
  const library = page.getByRole('dialog', { name: 'Choose your next challenge' });
  await library.getByRole('button', { name: /The inclusive gate/ }).click();
  await expect(library).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'The inclusive gate', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).toHaveText('INPUT number', { useInnerText: true });
  await expect(page.getByText('A range has two limits.', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Give me a hint', exact: true }).click();
  await expect(page.getByText('A range has two limits.', { exact: true })).toBeVisible();
  await expect(
    page.getByText('What must be true at both limits?', { exact: true }),
  ).not.toBeVisible();
  await page.getByRole('button', { name: 'Explore the next hint', exact: true }).click();
  await expect(page.getByText('What must be true at both limits?', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Explore the next hint', exact: true }).click();
  await expect(page.getByRole('button', { name: 'All hints explored' })).toBeDisabled();
  await expect(page.getByText('3 of 3 hints explored', { exact: true })).toBeVisible();
  await expect(editor(page)).toHaveText('INPUT number', { useInnerText: true });
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Program name' })).toHaveValue(
    'The inclusive gate',
  );
  await expect(editor(page)).toHaveText('INPUT number', { useInnerText: true });
  expect(api.saves).toEqual([]);
  expect(api.progress.size).toBe(0);
});

test('text execution asks for INPUT and renders numeric and string output and variables', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'INPUT name\nINPUT count\nOUTPUT name\nOUTPUT count * 2');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await page.getByRole('textbox', { name: 'Input for name', exact: true }).fill('Ada');
  await page.getByRole('button', { name: 'Submit input' }).click();
  await page.getByRole('textbox', { name: 'Input for count', exact: true }).fill('7');
  await page.getByRole('button', { name: 'Submit input' }).click();
  await expect(page.getByRole('log', { name: 'Program output' }).locator('pre')).toHaveText([
    'Ada',
    '14',
  ]);
  await expect(page.getByRole('status').filter({ hasText: /^Finished$/ })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'count' })).toHaveText('count7');
  await expect(
    page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'name', exact: true }) }),
  ).toHaveText('name"Ada"');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Run your program');
  await expect(page.getByRole('textbox', { name: /Input for/ })).toHaveCount(0);
});

test('invalid text disables execution and block edits, survives reload, and can be corrected', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'OUTPUT "kept"');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  const workspace = page.locator('.blockly-host');
  await expect(workspace).toContainText('"kept"');
  await editor(page).fill('OUTPUT "unterminated');
  await expect(page.getByRole('alert')).toContainText('Line 1');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Format', exact: true })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'OUTPUT Show a value', exact: true }),
  ).toBeDisabled();
  await expect(workspace).toContainText('"kept"');
  await page.reload();
  await expect(editor(page)).toHaveText('OUTPUT "unterminated', { useInnerText: true });
  await expect(workspace).toContainText('"kept"');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Restore last valid program', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "kept"', { useInnerText: true });
  await write(page, 'OUTPUT "recovered"');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('log').locator('pre')).toHaveText(['recovered']);
});

test('library filters by difficulty only', async ({ page }) => {
  await guest(page);
  await page.getByRole('button', { name: /^Problems/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox')).toHaveCount(1);
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await dialog.getByLabel('Difficulty').selectOption('Hard');
  await expect(dialog.locator('.problem-row')).toHaveCount(20);
});

test('text converts to blocks and editing a block field updates executable text', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'INPUT value\nOUTPUT value + 1');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(page.locator('.blockly-host')).toContainText('INPUT');
  await expect(page.locator('.blockly-host')).toContainText('value');
  await page
    .locator('.blockly-host .blocklyText')
    .filter({ hasText: /^value\s+\+\s+1$/ })
    .click();
  const field = page.locator('input.blocklyHtmlInput');
  await field.fill('value * 2');
  await field.press('Enter');
  await expect(editor(page)).toHaveText('INPUT value\nOUTPUT value * 2', { useInnerText: true });
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).toHaveText('INPUT value\nOUTPUT value * 2', { useInnerText: true });
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await page.getByRole('textbox', { name: 'Input for value', exact: true }).fill('42');
  await page.getByRole('button', { name: 'Submit input' }).click();
  await expect(page.getByRole('log').locator('pre')).toHaveText(['84']);
});

test('partial block fields do not interrupt typing and incomplete blocks remain editable', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'OUTPUT 12');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await page.locator('.blockly-host .blocklyText').filter({ hasText: /^12$/ }).click();
  const field = page.locator('input.blocklyHtmlInput');
  await field.fill('');
  await expect(field).toBeFocused();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.blockly-host')).not.toHaveAttribute('inert');
  await field.fill('7 +');
  await field.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Line 1');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await expect(page.locator('.invalid-overlay')).toHaveCount(0);
  await expect(page.locator('.blockly-host')).not.toHaveAttribute('inert');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT 12', { useInnerText: true });
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT 7 +', { useInnerText: true });
  await page
    .locator('.blockly-host .blocklyText')
    .filter({ hasText: /^7\s+\+$/ })
    .click();
  await field.fill('7 + 5');
  await field.press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('log').locator('pre')).toHaveText(['12']);
});

test('restore last valid program restores current document and never a previous document', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'OUTPUT "valid original"');
  await editor(page).fill('OUTPUT "broken');
  await page.getByRole('button', { name: 'Restore last valid program', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "valid original"', { useInnerText: true });
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "Hello"', { useInnerText: true });
  await editor(page).fill('IF');
  await page.getByRole('button', { name: 'Restore last valid program', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "Hello"', { useInnerText: true });
});

test('mode switches preserve both editor mounts and block undo history', async ({ page }) => {
  await guest(page);
  await write(page, 'OUTPUT "base"');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  const textNode = await editor(page).elementHandle();
  const svg = page.locator('.blockly-host .blocklySvg');
  await expect(svg).toBeVisible();
  const blockNode = await svg.elementHandle();
  await page
    .locator('.blockly-host .blocklyText')
    .filter({ hasText: /^"base"$/ })
    .click();
  const field = page.locator('input.blocklyHtmlInput');
  await field.fill('"changed"');
  await field.press('Enter');
  await expect(editor(page)).toHaveText('OUTPUT "changed"');
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  await expect(page.locator('.text-surface')).toBeHidden();
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(page.locator('.block-surface')).toBeHidden();
  expect(await editor(page).evaluate((element, old) => element === old, textNode)).toBe(true);
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  expect(await svg.evaluate((element, old) => element === old, blockNode)).toBe(true);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "base"', { useInnerText: true });
});

test('palette click with no selection appends to the existing program', async ({ page }) => {
  await guest(page);
  await write(page, 'OUTPUT "first"');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(
    page.locator('.blockly-host .blocklyText').filter({ hasText: /^"first"$/ }),
  ).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Select an instruction' })).toHaveValue('');
  await page.getByRole('button', { name: 'OUTPUT Show a value', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "first"\nOUTPUT "Hello"', { useInnerText: true });
});

test('new documents get separate editor instances and cannot undo into the previous draft', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'OUTPUT "previous document"');
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  const textNode = await editor(page).elementHandle();
  const svg = page.locator('.blockly-host .blocklySvg');
  await expect(svg).toBeVisible();
  const blockNode = await svg.elementHandle();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "Hello"');
  expect(await editor(page).evaluate((element, old) => element === old, textNode)).toBe(false);
  expect(await svg.evaluate((element, old) => element === old, blockNode)).toBe(false);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(editor(page)).toHaveText('OUTPUT "Hello"');
  await editor(page).focus();
  await editor(page).press('ControlOrMeta+z');
  await expect(editor(page)).toHaveText('OUTPUT "Hello"');
});

test('Step pauses at INPUT, resumes to output, and Stop clears a pending input', async ({
  page,
}) => {
  await guest(page);
  await write(page, 'INPUT count\nOUTPUT count * 2');
  const status = page.locator('.output-panel').getByRole('status');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(status).toHaveText('Paused');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await page.getByRole('textbox', { name: 'Input for count', exact: true }).fill('7');
  await page.getByRole('button', { name: 'Submit input', exact: true }).click();
  await expect(status).toHaveText('Paused');
  await expect(page.getByRole('log').locator('pre')).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(status).toHaveText('Finished');
  await expect(page.getByRole('log').locator('pre')).toHaveText(['14']);
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Input for count', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(status).toHaveText('Stopped');
  await expect(page.getByRole('textbox', { name: 'Input for count', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(status).toHaveText('Ready to try');
});

test('a running loop can pause, step, resume, and stop through real controls', async ({ page }) => {
  await guest(page);
  await write(
    page,
    'total = 0\nFOR counter = 1 TO 10000\n    total = total + 1\nNEXT counter\nOUTPUT total',
  );
  const status = page.locator('.output-panel').getByRole('status');
  await page.getByRole('button', { name: 'Run program', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(status).toHaveText('Paused');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(status).toHaveText('Paused');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(status).toHaveText('Running');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(status).toHaveText('Stopped');
  await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('responsive layouts stay visible without overflow and support keyboard and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await guest(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  );
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390)
      await page.getByRole('button', { name: 'Add or edit problem details' }).click();
    await expect(page.getByRole('textbox', { name: 'Program name' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run program', exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  }
  const toggle = page.getByRole('button', { name: 'Add or edit problem details', exact: true });
  const hide = page.getByRole('button', { name: 'Hide problem details', exact: true });
  await page
    .getByRole('textbox', { name: 'Detailed problem statement' })
    .fill('Find the sum of 10 and 20.');
  await page.screenshot({ path: '/tmp/pseudostar-problem-brief-mobile.png' });
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'Your problem' })).toBeVisible();
  await hide.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { name: 'Your problem' })).toBeHidden();
  await page.getByRole('button', { name: 'Blocks', exact: true }).focus();
  await page.keyboard.press('Tab');
  const textMode = page.getByRole('button', { name: 'Pseudocode', exact: true });
  await expect(textMode).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(textMode).toHaveAttribute('aria-pressed', 'true');
  await editor(page).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.insertText('OUTPUT "keyboard"');
  await expect(editor(page)).toHaveText('OUTPUT "keyboard"');
  await page.getByRole('button', { name: 'Run program', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log').locator('pre')).toHaveText(['keyboard']);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
});

test('full screen keeps the block picker and all editor modes available', async ({ page }) => {
  await guest(page);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.locator('.editor-workbench')).toHaveJSProperty(
    'clientWidth',
    await page.evaluate(() => innerWidth),
  );
  await expect(page.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'OUTPUT Show a value', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).toBeVisible();
  await page.getByRole('button', { name: 'Split Screen', exact: true }).click();
  await expect(editor(page)).toBeVisible();
  await expect(page.locator('.blockly-host')).toBeVisible();
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeVisible();
});

test('solution needs confirmation and leaves the learner draft unchanged', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/problems/*/solution', async (route) => {
    requests++;
    await route.fulfill({ json: { source: 'OUTPUT "Example solution"' } });
  });
  await guest(page);
  await page.getByRole('button', { name: /^Problems/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /The inclusive gate/ })
    .click();
  await page.getByRole('button', { name: 'Show Solution', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Do you really want to see the solution?' }),
  ).toBeVisible();
  expect(requests).toBe(0);
  await page.getByRole('button', { name: 'Keep thinking' }).click();
  await page.getByRole('button', { name: 'Show Solution', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, show the solution', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('OUTPUT "Example solution"');
  expect(requests).toBe(1);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(editor(page)).toHaveText('INPUT number', { useInnerText: true });
});
