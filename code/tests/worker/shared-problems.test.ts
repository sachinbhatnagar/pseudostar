import { it, expect } from 'vitest';
import { harness } from './harness';
const solution = 'INPUT n\nSET result = n * 2\nOUTPUT result';
const input = {
  statement: 'Read a whole number from 0 to 10 and output twice its value.',
  solution,
};
const metadata = {
  explanation: 'Multiply the input by two.',
  problem: {
    title: 'Double a number',
    statement: 'Read a whole number from 0 to 10. Output twice the number.',
    difficulty: 'Easy',
    hints: ['Read the input.', 'Think about doubling.', 'Show the result.'],
    prerequisites: ['Multiplication'],
    cases: [0, 1, 3, 10].map((n) => ({ inputs: [String(n)], expectedOutput: [String(n * 2)] })),
  },
};
it('publishes checked user code, preserves it, and makes it public without review', async () => {
  const h = await harness({ generations: [metadata, { solution: 'INPUT x\nOUTPUT x + x' }] });
  try {
    expect((await h.request('/api/problems/publish', 'POST', input)).status).toBe(401);
    const user = await h.login();
    const response = await h.request('/api/problems/publish', 'POST', input, user.cookie);
    expect(response.status).toBe(201);
    const data = (await response.json()) as any;
    expect(data.problem.title).toBe('Double a number');
    expect(data.problem.statement).toBe(metadata.problem.statement);
    expect(data.problem).not.toHaveProperty('solution');
    const list = await h.request('/api/problems');
    expect(((await list.json()) as any).problems).toEqual([{ ...data.problem, canEdit: false }]);
    const reveal = await h.request(`/api/problems/${data.problem.id}/solution`, 'POST', {
      confirmed: true,
    });
    expect(((await reveal.json()) as any).source).toBe(solution);
    const again = await h.request('/api/problems/publish', 'POST', input, user.cookie);
    expect(again.status).toBe(200);
    expect(((await again.json()) as any).problem.id).toBe(data.problem.id);
    expect((await h.request('/api/imports', 'GET', undefined, user.cookie)).status).toBe(404);
  } finally {
    await h.close();
  }
});
it('does not publish a program that fails the generated tests', async () => {
  const h = await harness({ generations: [metadata, { solution: 'INPUT x\nOUTPUT x + x' }] });
  try {
    const user = await h.login();
    const response = await h.request(
      '/api/problems/publish',
      'POST',
      { ...input, solution: 'INPUT n\nOUTPUT n' },
      user.cookie,
    );
    expect(response.status).toBe(422);
    expect(((await response.json()) as any).error.checks.length).toBeGreaterThan(0);
    expect(((await (await h.request('/api/problems')).json()) as any).problems).toEqual([]);
  } finally {
    await h.close();
  }
});
it('rejects bad syntax before generation and requires a problem statement', async () => {
  const h = await harness();
  try {
    const user = await h.login();
    expect(
      (
        await h.request(
          '/api/problems/publish',
          'POST',
          { ...input, solution: 'broken code' },
          user.cookie,
        )
      ).status,
    ).toBe(422);
    expect(
      (await h.request('/api/problems/publish', 'POST', { ...input, statement: '' }, user.cookie))
        .status,
    ).toBe(400);
  } finally {
    await h.close();
  }
});
it('keeps publication blocked when the independent reference fails', async () => {
  const h = await harness({ generations: [metadata, { solution: 'INPUT n\nOUTPUT 99' }] });
  try {
    const user = await h.login();
    expect((await h.request('/api/problems/publish', 'POST', input, user.cookie)).status).toBe(422);
    expect(((await (await h.request('/api/problems')).json()) as any).problems).toEqual([]);
  } finally {
    await h.close();
  }
});
it('publishes a fixed calculation with one no-input test without changing the code', async () => {
  const source = 'a = 10\nb = 20\nSET total = a + b\nOUTPUT total';
  const fixed = {
    ...metadata,
    problem: {
      ...metadata.problem,
      statement: 'Store 10 in a and 20 in b. Show their sum.',
      cases: [{ inputs: [], expectedOutput: ['30'] }],
    },
  };
  const h = await harness({ generations: [fixed, { solution: 'OUTPUT 10 + 20' }] });
  try {
    const user = await h.login();
    const response = await h.request(
      '/api/problems/publish',
      'POST',
      { statement: 'Add two numbers.', solution: source },
      user.cookie,
    );
    expect(response.status).toBe(201);
    const problem = ((await response.json()) as any).problem;
    expect(problem.cases).toEqual(fixed.problem.cases);
    expect(problem.statement).toBe(fixed.problem.statement);
    const requests = h.explanations.map((request) => {
      const messages = request.messages as { content: string }[];
      return JSON.parse(messages[messages.length - 1].content);
    });
    expect(requests[0].program).toBe(source);
    expect(requests[1]).toEqual({ statement: fixed.problem.statement });
    const reveal = await h.request(`/api/problems/${problem.id}/solution`, 'POST', {
      confirmed: true,
    });
    expect(((await reveal.json()) as any).source).toBe(source);
    const wrong = await h.request(
      '/api/problems/publish',
      'POST',
      { statement: fixed.problem.statement, solution: source.replace('a + b', 'a - b') },
      user.cookie,
    );
    expect(wrong.status).toBe(422);
  } finally {
    await h.close();
  }
});
it('reports malformed AI reference code as a service failure, not a learner failure', async () => {
  const h = await harness({
    generations: [
      metadata,
      { solution: 'Read the first number using INPUT, read the second number using INPUT.' },
    ],
  });
  try {
    const user = await h.login();
    const response = await h.request('/api/problems/publish', 'POST', input, user.cookie);
    expect(response.status).toBe(502);
    expect(((await response.json()) as any).error.code).toBe('INVALID_REFERENCE');
    expect(((await (await h.request('/api/problems')).json()) as any).problems).toEqual([]);
  } finally {
    await h.close();
  }
});

it('allows only the author to edit or delete and rejects stale edits', async () => {
  const h = await harness({ generations: [metadata, { solution: 'INPUT x\nOUTPUT x + x' }] });
  try {
    const author = await h.login();
    const other = await h.login('other@example.com');
    const created = await h.request('/api/problems/publish', 'POST', input, author.cookie);
    const id = ((await created.json()) as any).problem.id;
    const path = `/api/problems/${id}/author`;
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      expect(
        (
          await h.request(
            path,
            method,
            method === 'GET' ? undefined : { ...input, revision: 1 },
            other.cookie,
          )
        ).status,
      ).toBe(404);
      expect(
        (await h.request(path, method, method === 'GET' ? undefined : { ...input, revision: 1 }))
          .status,
      ).toBe(401);
    }
    expect(
      ((await (await h.request('/api/problems', 'GET', undefined, author.cookie)).json()) as any)
        .problems[0].canEdit,
    ).toBe(true);
    expect((await h.request(path, 'PATCH', { ...input, revision: 1 }, author.cookie)).status).toBe(
      200,
    );
    expect((await h.request(path, 'PATCH', { ...input, revision: 1 }, author.cookie)).status).toBe(
      409,
    );
    expect((await h.request(path, 'DELETE', { revision: 1 }, author.cookie)).status).toBe(409);
    expect((await h.request(path, 'DELETE', { revision: 2 }, author.cookie)).status).toBe(200);
    expect(((await (await h.request('/api/problems')).json()) as any).problems).toEqual([]);
    expect(
      (await h.request(`/api/problems/${id}/solution`, 'POST', { confirmed: true })).status,
    ).toBe(404);
    expect((await h.request(path, 'PATCH', { ...input, revision: 2 }, author.cookie)).status).toBe(
      404,
    );
  } finally {
    await h.close();
  }
});
it('rejects pseudocode in the generated description', async () => {
  const h = await harness({
    generations: [
      {
        ...metadata,
        problem: { ...metadata.problem, statement: 'SET firstNumber = 10. OUTPUT firstNumber.' },
      },
      { solution: 'OUTPUT 10' },
    ],
  });
  try {
    const user = await h.login();
    const response = await h.request('/api/problems/publish', 'POST', input, user.cookie);
    expect(response.status).toBe(502);
    expect(((await response.json()) as any).error.code).toBe('INVALID_DESCRIPTION');
    expect(((await (await h.request('/api/problems')).json()) as any).problems).toEqual([]);
  } finally {
    await h.close();
  }
});
