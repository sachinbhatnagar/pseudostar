import { test, expect } from '@playwright/test';
import { harness } from '../worker/harness';
const statement = 'Read a whole number from 0 to 10. Output twice the number.';
const metadata = {
  explanation: 'Multiply the input by two.',
  problem: {
    title: 'Double a number',
    statement,
    difficulty: 'Easy',
    hints: ['Read the input.', 'Think about doubling.', 'Show the result.'],
    prerequisites: ['Multiplication'],
    cases: [0, 1, 3, 10].map((n) => ({ inputs: [String(n)], expectedOutput: [String(n * 2)] })),
  },
};
test('publishes the current program after statement rewriting and checks', async ({ page }) => {
  const h = await harness({ generations: [metadata, { solution: 'INPUT x\nOUTPUT x + x' }] });
  const user = await h.login();
  await page.route('**/api/**', async (route) => {
    const r = route.request();
    const response = await h.request(
      new URL(r.url()).pathname,
      r.method(),
      r.postData() ? JSON.parse(r.postData()!) : undefined,
      user.cookie,
    );
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: await response.text(),
    });
  });
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'learner@example.com', exact: true }).click();
    await page.getByRole('textbox', { name: 'Your name' }).fill('   ');
    await expect(page.getByRole('button', { name: 'Save name', exact: true })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Your name' }).fill('Alex Learner');
    await page.getByRole('button', { name: 'Save name', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Alex Learner', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Alex Learner', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hide problem panel' }).click();
    await expect(page.getByRole('textbox', { name: 'Program name', exact: true })).toBeHidden();
    await page.getByRole('button', { name: 'Show problem panel' }).blur();
    await page.screenshot({ path: '/tmp/pseudostar-collapsed-rail-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/pseudostar-collapsed-rail-mobile.png' });
    await page.getByRole('button', { name: 'Show problem panel' }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(page.getByRole('textbox', { name: 'Program name', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose a problem', exact: true })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Pseudocode editor' });
    const source = 'INPUT n\nSET result = n * 2\nOUTPUT result';
    await editor.fill(source);
    await page.getByRole('textbox', { name: 'Program name', exact: true }).fill('Double a number');
    await page
      .getByRole('textbox', { name: 'Detailed problem statement' })
      .fill('Read a whole number from 0 to 10 and double it.');
    await expect(page.getByRole('textbox', { name: 'Program name', exact: true })).toHaveValue(
      'Double a number',
    );
    await page.getByRole('heading', { name: 'Your problem', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Detailed problem statement' })).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await page.screenshot({ path: '/tmp/pseudostar-problem-brief-desktop.png' });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByLabel('Problem statement', { exact: true })).toHaveValue(
      'Read a whole number from 0 to 10 and double it.',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: '/tmp/pseudostar-publish-mobile.png' });
    await page.getByRole('button', { name: 'Check and publish' }).click();
    await expect(
      page.getByText('Published. Everyone can now find this problem in the library.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(editor).toHaveText(source, { useInnerText: true });
    await page.getByRole('button', { name: /^Problems/ }).click();
    await expect(page.getByRole('dialog').getByRole('combobox')).toHaveCount(1);
    await page.getByLabel('Difficulty').selectOption('Easy');
    const authoredRow = page.getByRole('group', { name: 'Double a number', exact: true });
    await expect(authoredRow.getByRole('button', { name: 'Edit Double a number' })).toBeVisible();
    await authoredRow.screenshot({ path: '/tmp/pseudostar-authored-row-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await authoredRow.screenshot({ path: '/tmp/pseudostar-authored-row-desktop.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /^Easy Double a number/ }).click();
    await page.getByRole('button', { name: 'Show challenge & hints' }).click();
    await expect(page.getByText(statement, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Problems/ }).click();
    await page.getByRole('button', { name: 'Edit Double a number' }).click();
    await expect(page.getByLabel('Problem statement', { exact: true })).toHaveValue(statement);
    await page
      .getByLabel('Problem statement', { exact: true })
      .fill('Show twice a whole number from 0 to 10.');
    await page.getByRole('button', { name: 'Check and save changes' }).click();
    await expect(
      page.getByText('Published. Everyone can now find this problem in the library.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /^Problems/ }).click();
    await page.getByRole('button', { name: 'Edit Double a number' }).click();
    await page.getByRole('button', { name: 'Delete problem', exact: true }).click();
    await page.screenshot({ path: '/tmp/pseudostar-author-delete.png' });
    await page.getByRole('button', { name: 'Keep problem' }).click();
    await expect(page.getByRole('button', { name: 'Delete problem', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete problem', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: /^Problems/ }).click();
    await expect(page.getByRole('button', { name: /Double a number/ })).toHaveCount(0);
  } finally {
    await page.close();
    await h.close();
  }
});
