import { createMachine } from '../language/machine';
import { parse } from '../language/parse';
let machine: ReturnType<typeof createMachine> | null = null;
let runId = '',
  paused = false,
  waiting = false,
  sequence = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const emit = (event: unknown) => postMessage({ runId, sequence: ++sequence, event });
function pump(step = false, input?: string) {
  if (!machine) return;
  clearTimeout(timer);
  const start = performance.now();
  let event = machine.advance(input),
    count = 0;
  while (true) {
    emit(event);
    if (event.type === 'input') {
      waiting = true;
      paused = step;
      return;
    }
    if (event.type === 'done' || event.type === 'error') {
      machine = null;
      return;
    }
    if (event.type === 'step' && step) {
      paused = true;
      emit({ type: 'paused' });
      return;
    }
    if (paused) return;
    if (++count >= 40 || performance.now() - start > 8) {
      timer = setTimeout(() => pump(), 16);
      return;
    }
    event = machine.advance();
  }
}
onmessage = (
  message: MessageEvent<{
    type: string;
    runId: string;
    source?: string;
    value?: string;
    step?: boolean;
  }>,
) => {
  const command = message.data;
  if (command.type === 'start') {
    clearTimeout(timer);
    machine = null;
    runId = command.runId;
    sequence = 0;
    waiting = false;
    paused = false;
    const parsed = parse(command.source ?? '');
    if (!parsed.ok) {
      emit({ type: 'error', diagnostic: parsed.diagnostics[0], variables: {} });
      return;
    }
    machine = createMachine(parsed.program);
    pump(command.step);
    return;
  }
  if (command.runId !== runId) return;
  if (command.type === 'stop') {
    clearTimeout(timer);
    machine = null;
    waiting = false;
    emit({ type: 'stopped', variables: {} });
  } else if (command.type === 'pause') {
    paused = true;
    clearTimeout(timer);
    emit({ type: 'paused' });
  } else if (command.type === 'resume') {
    paused = false;
    if (!waiting) pump();
  } else if (command.type === 'step') {
    paused = false;
    if (!waiting) pump(true);
  } else if (command.type === 'input' && waiting) {
    waiting = false;
    const stepping = paused;
    paused = false;
    pump(stepping, command.value ?? '');
  }
};
