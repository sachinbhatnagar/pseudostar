import { afterEach, beforeEach, expect, it } from 'vitest';
import { harness } from './harness';
let h: Awaited<ReturnType<typeof harness>>;
beforeEach(async () => {
  h = await harness();
});
afterEach(async () => {
  await h?.close();
});
const payload = { kind: 'program', source: 'INPUT number\nOUTPUT number', problemId: 'ref-1-1' };
it('accepts a single explanation step for a one-instruction starter', async () => {
  const a = await h.login();
  h.groqMode('single-step');
  const response = await h.request(
    '/api/explanations',
    'POST',
    { ...payload, source: 'INPUT number' },
    a.cookie,
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    remaining: 199,
    steps: ['Read a value and store it in number.'],
  });
});
it('requires sign-in and sends only lesson context to the configured model', async () => {
  expect((await h.request('/api/explanations', 'POST', payload)).status).toBe(401);
  const a = await h.login();
  const response = await h.request('/api/explanations', 'POST', payload, a.cookie);
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    remaining: 199,
    steps: ['Read the value.', 'Show the result.'],
  });
  const request = h.explanations[0] as any;
  expect(request.model).toBe('openai/gpt-oss-120b');
  expect(request.include_reasoning).toBe(false);
  expect(request.messages[0].content).toContain('senior IGCSE ICT Instructor');
  expect(request.messages[0].content).toContain('ASD-STE100');
  expect(request.messages[0].content).toContain('Never invent missing instructions');
  const context = JSON.parse(request.messages[1].content);
  expect(context).not.toHaveProperty('privateReferenceSolution');
  expect(context.learnerPseudocode).toBe(payload.source);
  expect(JSON.stringify(request)).not.toContain(a.user.email);
});
it('shares an atomic daily allowance across block and program explanations', async () => {
  const a = await h.login();
  await h.request('/api/explanations', 'POST', payload, a.cookie);
  const day = Math.floor(Date.now() / 86400000) * 86400000;
  await h.db.prepare('UPDATE rate_limits SET count=199 WHERE window=?').bind(day).run();
  const results = await Promise.all([
    h.request('/api/explanations', 'POST', payload, a.cookie),
    h.request(
      '/api/explanations',
      'POST',
      { kind: 'block', source: payload.source, block: 'OUTPUT number' },
      a.cookie,
    ),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([200, 429]);
  expect(h.explanations).toHaveLength(2);
  const b = await h.login('second@example.com');
  expect((await h.request('/api/explanations', 'POST', payload, b.cookie)).status).toBe(200);
});
for (const mode of ['failure', 'malformed', 'truncated'])
  it(`refunds failed requests: ${mode}`, async () => {
    const a = await h.login();
    h.groqMode(mode);
    const r = await h.request('/api/explanations', 'POST', payload, a.cookie);
    expect(r.status).toBe(503);
    expect(JSON.stringify(await r.json())).not.toContain('private provider error');
    h.groqMode('ok');
    const good = await h.request('/api/explanations', 'POST', payload, a.cookie);
    expect(await good.json()).toMatchObject({ remaining: 199 });
  });
it('validates block membership, request size and problem IDs before charging', async () => {
  const a = await h.login();
  for (const data of [
    { ...payload, source: 'x'.repeat(24001) },
    { ...payload, problemId: 'unknown' },
    { ...payload, kind: 'block', block: 'OUTPUT hiddenAnswer' },
  ])
    expect((await h.request('/api/explanations', 'POST', data, a.cookie)).status).toBe(400);
  expect(h.explanations).toHaveLength(0);
});
it('reports missing credentials without charging or contacting Groq', async () => {
  await h.close();
  h = await harness({ groq: false });
  const a = await h.login();
  expect((await h.request('/api/explanations', 'POST', payload, a.cookie)).status).toBe(503);
  expect(h.explanations).toHaveLength(0);
});
it('retries a temporary provider failure within one allowance', async () => {
  const a = await h.login();
  h.groqMode('retry-once');
  const r = await h.request('/api/explanations', 'POST', payload, a.cookie);
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ remaining: 199 });
  expect(h.explanations).toHaveLength(2);
});
it('keeps block explanations contextual and discards extra model steps', async () => {
  const a = await h.login();
  h.groqMode('single-step');
  const r = await h.request(
    '/api/explanations',
    'POST',
    {
      kind: 'block',
      source: 'INPUT number\nOUTPUT number',
      block: 'OUTPUT number',
      problemId: 'ref-1-1',
    },
    a.cookie,
  );
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ steps: [] });
  const messages = (h.explanations[0] as any).messages;
  expect(messages[0].content).toContain('values set by earlier instructions');
  expect(JSON.parse(messages[1].content)).toMatchObject({
    learnerPseudocode: 'INPUT number\nOUTPUT number',
    selectedBlock: 'OUTPUT number',
  });
  expect(JSON.parse(messages[1].content)).not.toHaveProperty('privateReferenceSolution');
});
