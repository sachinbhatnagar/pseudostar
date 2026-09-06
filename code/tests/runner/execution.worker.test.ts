import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Command = { type: string; runId: string; source?: string; value?: string; step?: boolean };
type Envelope = {
  runId: string;
  sequence: number;
  event: {
    type: string;
    text?: string;
    name?: string;
    variables?: Record<string, unknown>;
    diagnostic?: unknown;
  };
};
let messages: Envelope[];
function send(command: Command) {
  const handler = globalThis.onmessage;
  if (!handler) throw new Error('The worker did not register onmessage.');
  handler.call(globalThis, new MessageEvent('message', { data: command }));
}
const types = () => messages.map((message) => message.event.type);
const longSource =
  'total = 0\nFOR count = 1 TO 200\n    total = total + 1\nNEXT count\nOUTPUT total';

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  messages = [];
  vi.stubGlobal(
    'postMessage',
    vi.fn((message: Envelope) => messages.push(structuredClone(message))),
  );
  vi.stubGlobal('onmessage', null);
  // Use the actual parser and machine. Only the worker boundary and clock are replaced.
  await import('../../src/runner/execution.worker');
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('execution worker message protocol', () => {
  it('starts in step mode with an explicit paused event and no timer', () => {
    send({ type: 'start', runId: 'step-run', source: 'OUTPUT 7', step: true });
    expect(types()).toEqual(['step', 'paused']);
    expect(vi.getTimerCount()).toBe(0);
    vi.runAllTimers();
    expect(types()).toEqual(['step', 'paused']);
    expect(messages.map(({ runId, sequence }) => ({ runId, sequence }))).toEqual([
      { runId: 'step-run', sequence: 1 },
      { runId: 'step-run', sequence: 2 },
    ]);
  });
  it('waits for INPUT while stepping, pauses after input, and completes on resume', () => {
    const runId = 'input-step';
    send({ type: 'start', runId, source: 'INPUT answer\nOUTPUT answer', step: true });
    send({ type: 'step', runId });
    expect(types()).toEqual(['step', 'paused', 'input']);
    expect(messages.at(-1)?.event.name).toBe('answer');
    expect(vi.getTimerCount()).toBe(0);
    send({ type: 'input', runId, value: '0042' });
    expect(types().slice(-2)).toEqual(['step', 'paused']);
    expect(messages.at(-2)?.event.variables).toEqual({ answer: 42 });
    expect(types()).not.toContain('output');
    send({ type: 'resume', runId });
    expect(types().slice(-2)).toEqual(['output', 'done']);
    expect(messages.at(-2)?.event.text).toBe('42');
    expect(messages.at(-1)?.event.variables).toEqual({ answer: 42 });
    expect(messages.map((m) => m.sequence)).toEqual(messages.map((_, i) => i + 1));
  });
  it('continues normal execution after INPUT and preserves empty input', () => {
    const runId = 'input-run';
    send({ type: 'start', runId, source: 'INPUT answer\nOUTPUT "value:", answer' });
    expect(types().at(-1)).toBe('input');
    send({ type: 'input', runId, value: '' });
    expect(types().at(-1)).toBe('done');
    expect(messages.find((m) => m.event.type === 'output')?.event.text).toBe('value:');
    expect(messages.at(-1)?.event.variables).toEqual({ answer: '' });
  });
  it('yields long runs to a timer and resume finishes a paused run', () => {
    const runId = 'batched';
    send({ type: 'start', runId, source: longSource });
    expect(vi.getTimerCount()).toBe(1);
    expect(types()).not.toContain('done');
    send({ type: 'pause', runId });
    expect(types().at(-1)).toBe('paused');
    expect(vi.getTimerCount()).toBe(0);
    const count = messages.length;
    vi.runAllTimers();
    expect(messages).toHaveLength(count);
    send({ type: 'resume', runId });
    vi.runAllTimers();
    expect(types().at(-1)).toBe('done');
    expect(messages.find((m) => m.event.type === 'output')?.event.text).toBe('200');
  });
  it('stop cancels a scheduled pump and prevents further execution', () => {
    const runId = 'cancel-timer';
    send({ type: 'start', runId, source: longSource });
    expect(vi.getTimerCount()).toBe(1);
    send({ type: 'stop', runId });
    expect(types().at(-1)).toBe('stopped');
    expect(vi.getTimerCount()).toBe(0);
    const count = messages.length;
    vi.runAllTimers();
    send({ type: 'resume', runId });
    send({ type: 'step', runId });
    expect(messages).toHaveLength(count);
    expect(types()).not.toContain('done');
  });
  it('stop discards pending input so late input cannot restart execution', () => {
    const runId = 'cancel-input';
    send({ type: 'start', runId, source: 'INPUT value\nOUTPUT value' });
    expect(types().at(-1)).toBe('input');
    send({ type: 'stop', runId });
    const count = messages.length;
    send({ type: 'input', runId, value: 'late' });
    send({ type: 'resume', runId });
    vi.runAllTimers();
    expect(messages).toHaveLength(count);
    expect(types().at(-1)).toBe('stopped');
  });
  it.each([false, true])('invalid replacement start clears the old machine (step=%s)', (step) => {
    send({ type: 'start', runId: 'old', source: longSource, step });
    expect(vi.getTimerCount()).toBe(step ? 0 : 1);
    messages.length = 0;
    send({ type: 'start', runId: 'invalid', source: 'IF THEN', step });
    expect(types()).toEqual(['error']);
    expect(messages[0]).toMatchObject({ runId: 'invalid', sequence: 1, event: { variables: {} } });
    expect(messages[0].event.diagnostic).toBeDefined();
    expect(vi.getTimerCount()).toBe(0);
    send({ type: 'resume', runId: 'invalid' });
    send({ type: 'step', runId: 'invalid' });
    send({ type: 'resume', runId: 'old' });
    vi.runAllTimers();
    expect(types()).toEqual(['error']);
  });
  it('ignores obsolete commands and starts a replacement with fresh sequence numbers', () => {
    send({ type: 'start', runId: 'old', source: 'INPUT stale' });
    messages.length = 0;
    send({ type: 'start', runId: 'new', source: 'OUTPUT 9', step: true });
    for (const type of ['stop', 'pause', 'resume', 'step', 'input'])
      send({ type, runId: 'old', value: 'stale' });
    expect(types()).toEqual(['step', 'paused']);
    send({ type: 'resume', runId: 'new' });
    expect(types()).toEqual(['step', 'paused', 'output', 'done']);
    expect(messages.every((m) => m.runId === 'new')).toBe(true);
    expect(messages.map((m) => m.sequence)).toEqual([1, 2, 3, 4]);
  });
});
