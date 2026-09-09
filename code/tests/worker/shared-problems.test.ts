import { describe, it, expect } from 'vitest';
import { harness } from './harness';
const source = {
  url: 'https://leetcode.com/problems/two-sum/',
  title: 'Double a number',
  statement: 'Read a number and show twice its value.',
  constraints: 'Whole numbers from 0 to 10.',
  rights: 'original',
  attribution: 'Test author',
  samples: [{ inputs: ['3'], outputs: ['6'] }],
};
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
describe('shared imports', () => {
  it('reserves one source, isolates drafts, validates, and publishes only through admin review', async () => {
    const h = await harness({ generations: [candidate, { solution: 'INPUT x\nOUTPUT x + x' }] });
    try {
      const owner = await h.login(),
        other = await h.login('other@example.com'),
        admin = await h.login('mailme@sachinbhatnagar.com');
      const responses = await Promise.all([
        h.request('/api/imports', 'POST', source, owner.cookie),
        h.request(
          '/api/imports',
          'POST',
          { ...source, url: source.url + 'description/?x=1' },
          owner.cookie,
        ),
      ]);
      expect(responses.map((r) => r.status).sort()).toEqual([200, 201]);
      const created = (await responses.find((r) => r.status === 201)!.json()) as any;
      const id = created.item.id;
      expect((await h.request('/api/imports/' + id, 'GET', undefined, other.cookie)).status).toBe(
        404,
      );
      expect(
        (
          await h.request(
            '/api/imports/' + id + '/review',
            'POST',
            { revision: 1, action: 'approve' },
            owner.cookie,
          )
        ).status,
      ).toBe(403);
      const generated = await h.request(
        '/api/imports/' + id + '/generate',
        'POST',
        { revision: 1 },
        owner.cookie,
      );
      const data = (await generated.json()) as any;
      expect(generated.status, JSON.stringify(data)).toBe(200);
      expect(data.item.validation.passed, JSON.stringify(data.item.validation)).toBe(true);
      expect(
        ((await h.request('/api/problems').then((r) => r.json())) as any).problems,
      ).toHaveLength(0);
      expect(
        (
          (await h
            .request('/api/problems', 'GET', undefined, owner.cookie)
            .then((r) => r.json())) as any
        ).problems[0].reviewLabel,
      ).toBe('Not reviewed');
      expect(
        (
          await h.request(
            '/api/imports/' + id + '/review',
            'POST',
            { revision: 1, action: 'approve' },
            admin.cookie,
          )
        ).status,
      ).toBe(409);
      const approved = await h.request(
        '/api/imports/' + id + '/review',
        'POST',
        { revision: 2, action: 'approve' },
        admin.cookie,
      );
      expect(approved.status).toBe(200);
      expect(
        ((await h.request('/api/problems').then((r) => r.json())) as any).problems,
      ).toHaveLength(1);
      const invalid = { ...data.item.candidate, solution: 'OUTPUT 99' };
      const updated = await h.request(
        '/api/imports/' + id,
        'PUT',
        { revision: 3, source, candidate: invalid },
        admin.cookie,
      );
      expect(updated.status).toBe(200);
      expect(
        (
          await h.request(
            '/api/imports/' + id + '/review',
            'POST',
            { revision: 4, action: 'approve' },
            admin.cookie,
          )
        ).status,
      ).toBe(409);
      const solution = await h.request('/api/problems/' + id + '/solution', 'POST', {
        confirmed: true,
      });
      expect(((await solution.json()) as any).source).toBe(candidate.solution);
    } finally {
      await h.mf.dispose();
    }
  });
  it('rejects invalid hosts and missing rights', async () => {
    const h = await harness();
    try {
      const u = await h.login();
      expect(
        (
          await h.request(
            '/api/imports',
            'POST',
            { ...source, url: 'https://leetcode.com.evil.test/problems/two-sum/' },
            u.cookie,
          )
        ).status,
      ).toBe(400);
      expect(
        (await h.request('/api/imports', 'POST', { ...source, rights: undefined }, u.cookie))
          .status,
      ).toBe(400);
    } finally {
      await h.mf.dispose();
    }
  });
});

it('keeps wrong generated solutions private and blocks approval', async () => {
  const h = await harness({
    generations: [{ ...candidate, solution: 'OUTPUT 99' }, { solution: 'INPUT n\nOUTPUT n + n' }],
  });
  try {
    const admin = await h.login('mailme@sachinbhatnagar.com');
    const saved = (await h
      .request('/api/imports', 'POST', source, admin.cookie)
      .then((r) => r.json())) as any;
    const generated = (await h
      .request('/api/imports/' + saved.item.id + '/generate', 'POST', { revision: 1 }, admin.cookie)
      .then((r) => r.json())) as any;
    expect(generated.item.status).toBe('failed');
    expect(generated.item.validation.passed).toBe(false);
    expect(
      (
        (await h
          .request('/api/problems', 'GET', undefined, admin.cookie)
          .then((r) => r.json())) as any
      ).problems,
    ).toHaveLength(0);
    expect(
      (
        await h.request(
          '/api/imports/' + saved.item.id + '/review',
          'POST',
          { revision: 2, action: 'approve' },
          admin.cookie,
        )
      ).status,
    ).toBe(409);
  } finally {
    await h.close();
  }
});
