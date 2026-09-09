import { useEffect, useRef, useState } from 'react';
import type { Diagnostic, Value, MachineEvent } from '../language/types';
export type RunnerStatus =
  'idle' | 'running' | 'paused' | 'input' | 'finished' | 'stopped' | 'error';
export function useRunner() {
  const worker = useRef<Worker | null>(null),
    id = useRef(''),
    lastMessage = useRef(0),
    statusRef = useRef<RunnerStatus>('idle');
  const watchdog = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [status, setStatus] = useState<RunnerStatus>('idle'),
    [output, setOutput] = useState<string[]>([]),
    [variables, setVariables] = useState<Record<string, Value>>({}),
    [diagnostic, setDiagnostic] = useState<Diagnostic | undefined>(),
    [inputName, setInputName] = useState(''),
    [line, setLine] = useState<number | undefined>();
  const change = (value: RunnerStatus) => {
    statusRef.current = value;
    setStatus(value);
  };
  const invalidate = () => {
    const previous = worker.current;
    worker.current = null;
    id.current = '';
    clearInterval(watchdog.current);
    watchdog.current = undefined;
    if (previous) {
      previous.onmessage = null;
      previous.onerror = null;
      previous.terminate();
    }
  };
  const isCurrent = (w: Worker, runId: string) => worker.current === w && id.current === runId;
  useEffect(() => () => invalidate(), []);
  const start = (source: string, step = false) => {
    invalidate();
    const runId = crypto.randomUUID();
    id.current = runId;
    setOutput([]);
    setVariables({});
    setDiagnostic(undefined);
    setInputName('');
    setLine(undefined);
    change('running');
    lastMessage.current = Date.now();
    const w = new Worker(new URL('./execution.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    let sequence = 0;
    w.onmessage = ({
      data,
    }: {
      data: { runId: string; sequence: number; event: MachineEvent & { type: string } };
    }) => {
      if (!isCurrent(w, runId) || data.runId !== runId || data.sequence <= sequence) return;
      sequence = data.sequence;
      lastMessage.current = Date.now();
      const e = data.event;
      if (e.variables) setVariables(e.variables);
      if (e.line) setLine(e.line);
      if (e.type === 'output') setOutput((v) => [...v, e.text ?? '']);
      if (e.type === 'input') {
        setInputName(e.name ?? 'value');
        change('input');
      }
      if (e.type === 'done') {
        invalidate();
        setInputName('');
        change('finished');
      }
      if (e.type === 'error') {
        invalidate();
        setInputName('');
        setDiagnostic(e.diagnostic);
        change('error');
      }
      if ((e.type as string) === 'paused') change('paused');
      if ((e.type as string) === 'stopped') {
        invalidate();
        setInputName('');
        change('stopped');
      }
    };
    w.onerror = () => {
      if (!isCurrent(w, runId)) return;
      invalidate();
      setInputName('');
      change('error');
      setDiagnostic({
        code: 'WORKER_ERROR',
        message: 'The runner could not start.',
        nextAction: 'Reload the page and try again.',
      });
    };
    watchdog.current = setInterval(() => {
      if (
        !isCurrent(w, runId) ||
        statusRef.current !== 'running' ||
        Date.now() - lastMessage.current <= 5000
      )
        return;
      invalidate();
      setInputName('');
      change('error');
      setDiagnostic({
        code: 'WATCHDOG',
        message: 'The program stopped responding.',
        nextAction: 'Check your loop bounds, then run again.',
      });
    }, 1000);
    w.postMessage({ type: 'start', runId, source, step });
  };
  const command = (type: string, value?: string) => {
    if (type === 'stop') {
      invalidate();
      setInputName('');
      change('stopped');
      return;
    }
    const current = worker.current;
    if (!current) return;
    if (type === 'resume' || type === 'input' || type === 'step') {
      setInputName('');
      change('running');
      lastMessage.current = Date.now();
    }
    current.postMessage({ type, runId: id.current, value });
  };
  return {
    status,
    output,
    variables,
    diagnostic,
    inputName,
    line,
    start,
    command,
    reset: () => {
      invalidate();
      change('idle');
      setOutput([]);
      setVariables({});
      setDiagnostic(undefined);
      setInputName('');
      setLine(undefined);
    },
  };
}
