import { test, expect } from '@playwright/test';
import { harness } from '../worker/harness';
const candidate = {
  solution: 'INPUT n\nOUTPUT n * 2',
  explanation: 'Read the number. Multiply it by two.',
  problem: {
    difficulty: 'Easy',
    starter: 'INPUT n',
    hints: ['Read the input.', 'Think about doubling.', 'Show the result.'],
    topics: ['Maths'],
    prerequisites: ['Multiplication'],
    cases: [
      { inputs: ['0'], expectedOutput: ['0'] },
      { inputs: ['10'], expectedOutput: ['20'] },
    ],
  },
};
test('contribute, check, preview blocks, and publish through the real local Worker', async ({
  page,
}) => {
  test.setTimeout(60000);
  const h = await harness({ generations: [candidate, { solution: 'INPUT x\nOUTPUT x + x' }] });
  const admin = await h.login('mailme@sachinbhatnagar.com');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const response = await h.request(
      new URL(req.url()).pathname,
      req.method(),
      req.postData() ? JSON.parse(req.postData()!) : undefined,
      admin.cookie,
    );
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: await response.text(),
    });
  });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: /^Problems/ }).click();
    await page.getByRole('button', { name: 'Contribute or review problems' }).click();
    await page.getByLabel('LeetCode reference link').fill('https://leetcode.com/problems/two-sum/');
    await page.getByLabel('Title', { exact: true }).fill('Double a number');
    await page
      .getByLabel('What should the learner do?')
      .fill('Read a whole number and show twice its value.');
    await page.getByLabel('Input limits').fill('A whole number from 0 to 10.');
    await page.getByLabel('Author name').fill('Original test author');
    await page.getByLabel('Example 1 inputs').fill('3');
    await page.getByLabel('Expected output', { exact: true }).fill('6');
    await page.screenshot({ path: '/tmp/pseudostar-import-mobile.png', fullPage: true });
    expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Generate solution', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Generate solution', exact: true }).click();
    await expect(
      page.getByText('Checks passed. Admin review is still required.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Preview blocks' }).click();
    await expect(page.locator('.import-block-preview .blocklySvg')).toBeVisible();
    await page.screenshot({ path: '/tmp/pseudostar-import-admin.png', fullPage: true });
    await page.getByRole('button', { name: 'Approve for everyone' }).click();
    await expect(page.getByText(/An approved version is in the library/)).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: /^Problems/ }).click();
    await page.getByLabel('Topic', { exact: true }).selectOption('Maths');
    await page.getByRole('button', { name: /Double a number/ }).click();
    await expect(page.getByRole('heading', { name: 'Double a number' })).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await h.close();
  }
});
