import type { Problem } from './types';
export type Candidate = {
  problem: Problem;
  solution: string;
  explanation: string;
};
export type Validation = {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
};
export const progressKey = (id: string, version = 1) =>
  id.startsWith('lc_') || id.startsWith('shared_') ? `${id}@${version}` : id;
