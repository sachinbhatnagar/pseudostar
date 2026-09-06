import { checkProgram } from './check';
import type { Problem } from './types';
onmessage = (message: MessageEvent<{ source: string; problem: Problem }>) =>
  postMessage(checkProgram(message.data.problem, message.data.source));
