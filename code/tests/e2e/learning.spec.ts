import { test, expect, guest, signIn, write } from './fixtures';

test('guests can read credits but cannot request AI explanations', async ({ page }) => {
  await guest(page);
  await expect(
    page.getByRole('button', { name: 'Explain Pseudocode', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: '© 2026 Studio 8 Collective', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Studio 8 Collective' })).toContainText(
    'Built by Sachin Bhatnagar for Studio 8 Collective',
  );
});
test('explains a program with ordered steps and a block through its right-click menu', async ({
  page,
}) => {
  const requests: any[] = [];
  await page.route('**/api/explanations', async (route) => {
    const data = route.request().postDataJSON();
    requests.push(data);
    await route.fulfill({
      json: {
        paragraph: 'This code reads a number and shows it.',
        steps: data.kind === 'program' ? ['Read the number.', 'Show the number.'] : [],
        remaining: 199,
      },
    });
  });
  await page.goto('/');
  await signIn(page);
  await write(page, 'INPUT n\nOUTPUT n');
  await page.getByRole('button', { name: 'Explain Pseudocode', exact: true }).click();
  const program = page.getByRole('dialog', { name: 'Explain Pseudocode' });
  await expect(program.locator('li')).toHaveText(['Read the number.', 'Show the number.']);
  await expect(program).toContainText('199 explanations left');
  await program.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Blocks', exact: true }).click();
  await page
    .locator('.blockly-host .blocklyText')
    .filter({ hasText: /^INPUT$/ })
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Explain Purpose', exact: true }).click();
  const block = page.getByRole('dialog', { name: 'Explain Purpose' });
  await expect(block).toContainText('This code reads a number and shows it.');
  expect(requests[0]).toMatchObject({ kind: 'program', source: 'INPUT n\nOUTPUT n' });
  expect(requests[1]).toMatchObject({
    kind: 'block',
    block: 'INPUT n',
    source: 'INPUT n\nOUTPUT n',
  });
  await expect(block.locator('li')).toHaveCount(0);
});
test('AI errors show a retry without changing the program', async ({ page }) => {
  let count = 0;
  await page.route('**/api/explanations', (route) =>
    route.fulfill(
      ++count === 1
        ? { status: 503, json: { error: { message: 'The explanation service is busy.' } } }
        : {
            json: {
              paragraph: 'The code shows a value.',
              steps: ['Read the instruction.', 'Show the value.'],
              remaining: 199,
            },
          },
    ),
  );
  await page.goto('/');
  await signIn(page);
  await write(page, 'OUTPUT 7');
  await page.getByRole('button', { name: 'Explain Pseudocode', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('service is busy');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('The code shows a value.');
});
test('confirmed solution opens aligned code panes with differences', async ({ page }) => {
  await page.route('**/api/problems/*/solution', (route) =>
    route.fulfill({ json: { source: 'INPUT number\nOUTPUT number' } }),
  );
  await guest(page);
  await page.getByRole('button', { name: 'Choose a problem', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /The inclusive gate/ })
    .click();
  await page.getByRole('button', { name: 'Show Solution', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, show the solution', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare your approach' });
  await expect(dialog.getByRole('columnheader')).toHaveText([
    'Your pseudocode',
    'Reference solution',
  ]);
  await expect(dialog.locator('.diff-changed')).toHaveCount(1);
  await expect(dialog.locator('tbody tr').first().locator('code')).toHaveText([
    'INPUT number',
    'INPUT number',
  ]);
});
test('using a solution needs confirmation and replaces the current draft', async ({ page }) => {
  await page.route('**/api/problems/*/solution', (r) =>
    r.fulfill({ json: { source: 'INPUT number\nOUTPUT number' } }),
  );
  await guest(page);
  await page.getByRole('button', { name: 'Choose a problem', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /The inclusive gate/ })
    .click();
  await page.getByRole('button', { name: 'Show Solution', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, show the solution', exact: true }).click();
  await page.getByRole('button', { name: 'Use solution in my program', exact: true }).click();
  await page.getByRole('button', { name: 'Keep my program', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Use solution in my program', exact: true }).click();
  await page.getByRole('button', { name: 'Replace program', exact: true }).click();
  await page.getByRole('button', { name: 'Pseudocode', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Pseudocode editor' })).toHaveText(
    'INPUT number\nOUTPUT number',
    { useInnerText: true },
  );
});
