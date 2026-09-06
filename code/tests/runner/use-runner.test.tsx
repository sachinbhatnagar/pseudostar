// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useRunner } from '../../src/runner/use-runner';

type Envelope = { runId: string; sequence: number; event: Record<string, unknown> };
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((message: { data: Envelope }) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
  get runId(): string {
    return this.postMessage.mock.calls[0][0].runId;
  }
}

describe('runner callback lifetime', () => {
  let runner: ReturnType<typeof useRunner>;
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  function Harness() {
    runner = useRunner();
    return null;
  }
  beforeEach(async () => {
    vi.useFakeTimers();
    FakeWorker.instances = [];
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<Harness />));
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  const start = async () => {
    await act(async () => runner.start('INPUT n'));
    return FakeWorker.instances.at(-1)!;
  };
  const state = () => ({
    status: runner.status,
    output: runner.output,
    variables: runner.variables,
    diagnostic: runner.diagnostic,
    inputName: runner.inputName,
    line: runner.line,
  });
  const emit = async (worker: FakeWorker, sequence: number, event: Record<string, unknown>) => {
    await act(async () => worker.onmessage?.({ data: { runId: worker.runId, sequence, event } }));
  };

  it.each(['reset', 'stop'] as const)(
    'ignores queued messages and errors after %s',
    async (action) => {
      const worker = await start();
      await emit(worker, 1, { type: 'input', name: 'n', line: 1, variables: { total: 5 } });
      const message = worker.onmessage!,
        error = worker.onerror!;
      await act(async () => {
        if (action === 'reset') runner.reset();
        else runner.command('stop');
      });
      const expected = state();
      await act(async () => {
        message({
          data: {
            runId: worker.runId,
            sequence: 2,
            event: { type: 'input', name: 'stale', line: 99, variables: { stale: true } },
          },
        });
        message({
          data: {
            runId: worker.runId,
            sequence: 3,
            event: { type: 'output', text: 'stale output' },
          },
        });
        error();
        runner.command('input', 'old answer');
        runner.command('resume');
        vi.advanceTimersByTime(10000);
      });
      expect(state()).toEqual(expected);
      expect(runner.status).toBe(action === 'reset' ? 'idle' : 'stopped');
      expect(runner.inputName).toBe('');
      expect(worker.terminate).toHaveBeenCalledTimes(1);
      expect(worker.postMessage).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects callbacks from a replaced worker even with the current run ID', async () => {
    const old = await start(),
      message = old.onmessage!,
      error = old.onerror!;
    const current = await start();
    await act(async () => {
      message({
        data: {
          runId: current.runId,
          sequence: 999,
          event: { type: 'input', name: 'stale', variables: { stale: true } },
        },
      });
      error();
    });
    expect(runner.status).toBe('running');
    expect(runner.inputName).toBe('');
    expect(runner.diagnostic).toBeUndefined();
    expect(runner.variables).toEqual({});
    expect(current.terminate).not.toHaveBeenCalled();
    await emit(current, 1, { type: 'output', text: 'current', variables: { n: 2 } });
    expect(runner.output).toEqual(['current']);
    expect(runner.variables).toEqual({ n: 2 });
  });

  it('ignores duplicate, out-of-order, and wrong-run messages without suppressing the next valid message', async () => {
    const worker = await start();
    await emit(worker, 2, { type: 'output', text: 'first' });
    await emit(worker, 2, { type: 'output', text: 'duplicate' });
    await emit(worker, 1, { type: 'input', name: 'old' });
    await act(async () =>
      worker.onmessage!({ data: { runId: 'wrong', sequence: 100, event: { type: 'done' } } }),
    );
    await emit(worker, 3, { type: 'output', text: 'second' });
    expect(runner.output).toEqual(['first', 'second']);
    expect(runner.status).toBe('running');
  });

  it('does not let an obsolete watchdog terminate the replacement worker', async () => {
    const intervals = vi.spyOn(globalThis, 'setInterval');
    await start();
    const oldWatchdog = intervals.mock.calls.at(-1)![0] as () => void;
    const current = await start();
    await act(async () => {
      vi.setSystemTime(Date.now() + 6000);
      oldWatchdog();
    });
    expect(runner.status).toBe('running');
    expect(current.terminate).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1000));
    expect(runner.diagnostic?.code).toBe('WATCHDOG');
    expect(current.terminate).toHaveBeenCalledTimes(1);
  });

  it('invalidates callbacks when the active watchdog expires', async () => {
    const worker = await start(),
      message = worker.onmessage!,
      error = worker.onerror!;
    await act(async () => vi.advanceTimersByTime(6000));
    const expected = state();
    await act(async () => {
      message({
        data: { runId: worker.runId, sequence: 1, event: { type: 'input', name: 'late' } },
      });
      error();
    });
    expect(state()).toEqual(expected);
    expect(runner.diagnostic?.code).toBe('WATCHDOG');
  });

  it('excludes input and pause time from the watchdog', async () => {
    const worker = await start();
    await emit(worker, 1, { type: 'input', name: 'n' });
    await act(async () => vi.advanceTimersByTime(20000));
    expect(runner.status).toBe('input');
    await act(async () => {
      runner.command('input', '2');
      vi.advanceTimersByTime(4000);
    });
    expect(runner.status).toBe('running');
    await emit(worker, 2, { type: 'paused' });
    await act(async () => vi.advanceTimersByTime(20000));
    expect(runner.status).toBe('paused');
    await act(async () => {
      runner.command('resume');
      vi.advanceTimersByTime(4000);
    });
    expect(runner.status).toBe('running');
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it('keeps a dispatched step running until the worker acknowledges the pause', async () => {
    const worker = await start();
    await emit(worker, 1, { type: 'paused' });
    await act(async () => vi.advanceTimersByTime(20000));
    await act(async () => runner.command('step'));
    expect(runner.status).toBe('running');
    expect(worker.postMessage).toHaveBeenLastCalledWith({
      type: 'step',
      runId: worker.runId,
      value: undefined,
    });
    await act(async () => vi.advanceTimersByTime(4000));
    expect(runner.diagnostic).toBeUndefined();
    await emit(worker, 2, { type: 'paused' });
    await act(async () => vi.advanceTimersByTime(20000));
    expect(runner.status).toBe('paused');
    expect(worker.terminate).not.toHaveBeenCalled();
  });

  it('terminates an unresponsive step after its active-work deadline', async () => {
    const worker = await start();
    await emit(worker, 1, { type: 'paused' });
    await act(async () => {
      runner.command('step');
      vi.advanceTimersByTime(6000);
    });
    expect(runner.status).toBe('error');
    expect(runner.diagnostic?.code).toBe('WATCHDOG');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it.each(['done', 'error'] as const)('invalidates callbacks after terminal %s', async (type) => {
    const worker = await start(),
      message = worker.onmessage!,
      error = worker.onerror!;
    await emit(worker, 1, {
      type,
      diagnostic: type === 'error' ? { code: 'EXPECTED_NUMBER' } : undefined,
    });
    const expected = state();
    await act(async () => {
      error();
      message({
        data: { runId: worker.runId, sequence: 2, event: { type: 'input', name: 'late' } },
      });
    });
    expect(state()).toEqual(expected);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('releases the worker and watchdog on unmount', async () => {
    const worker = await start(),
      error = worker.onerror!;
    await act(async () => root.render(null));
    const expected = state();
    await act(async () => {
      error();
      vi.advanceTimersByTime(10000);
    });
    expect(state()).toEqual(expected);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
