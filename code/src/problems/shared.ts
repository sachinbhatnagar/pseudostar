import type { Problem } from './types';
export const topics = [
  'Arrays',
  'Strings',
  'Maps and Sets',
  'Searching',
  'Sorting',
  'Recursion',
  'Dynamic Programming',
  'Maths',
  'Input and Output',
  'Variables',
  'Conditions',
  'Loops',
  'Subroutines',
] as const;
export type ImportSource = {
  url: string;
  title: string;
  statement: string;
  constraints: string;
  samples: { inputs: string[]; outputs: string[] }[];
  rights: 'original' | 'licensed';
  attribution: string;
};
export type Candidate = {
  problem: Problem;
  solution: string;
  explanation: string;
};
export type Validation = {
  passed: boolean;
  checks: { name: string; passed: boolean; detail: string }[];
};
export type ImportItem = {
  id: string;
  owner: string;
  source: ImportSource;
  revision: number;
  status: 'draft' | 'generating' | 'failed' | 'review' | 'rejected' | 'published';
  candidate: Candidate | null;
  validation: Validation | null;
  error: string | null;
  published: boolean;
  updatedAt: number;
};
export function problemTopics(p: Problem): string[] {
  if (p.topics?.length) return p.topics;
  const text = p.concepts.join(' ').toLowerCase();
  const labels: string[] = [];
  if (/input|output|print/.test(text)) labels.push('Input and Output');
  if (/variable|assignment/.test(text)) labels.push('Variables');
  if (/if|selection|condition|decision/.test(text)) labels.push('Conditions');
  if (/loop|iteration|for/.test(text)) labels.push('Loops');
  if (/routine/.test(text)) labels.push('Subroutines');
  if (/arithmetic|math|mod/.test(text)) labels.push('Maths');
  return labels.length ? labels : ['Input and Output'];
}

export const progressKey = (id: string, version = 1) =>
  id.startsWith('lc_') ? `${id}@${version}` : id;
