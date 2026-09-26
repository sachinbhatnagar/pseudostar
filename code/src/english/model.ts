export type Grade = 8 | 9 | 10;
export const tools = [
  {
    id: 'sentence-surgery',
    name: 'Sentence Surgery',
    description: 'Repair grammar, punctuation and sentence boundaries.',
  },
  {
    id: 'sentence-upgrades',
    name: 'Sentence Upgrades',
    description: 'Make each word earn its place.',
  },
  {
    id: 'vocabulary',
    name: 'Vocabulary in Context',
    description: 'Infer meanings and choose words with precision.',
  },
  {
    id: 'writers-effect',
    name: 'Writer’s Effect',
    description: 'Explain what a writer’s language does.',
  },
  {
    id: 'evidence',
    name: 'Evidence-Based Responses',
    description: 'Build an interpretation from the text.',
  },
  { id: 'micro-writing', name: 'Micro-Writing', description: 'Try a voice, genre or viewpoint.' },
  { id: 'editing', name: 'Editing Lab', description: 'Turn feedback into a stronger draft.' },
  { id: 'timed-writing', name: 'Timed Writing', description: 'Plan, write, then proofread.' },
] as const;
export type ToolId = (typeof tools)[number]['id'];
export type Skill =
  'understanding' | 'evidence' | 'effect' | 'vocabulary' | 'structure' | 'audience' | 'accuracy';
export const skillNames: Record<Skill, string> = {
  understanding: 'Reading understanding',
  evidence: 'Evidence and reasoning',
  effect: 'Writer’s effects',
  vocabulary: 'Vocabulary and style',
  structure: 'Organisation',
  audience: 'Audience and purpose',
  accuracy: 'Sentence accuracy',
};
export type Rating = 'Developing' | 'Secure' | 'Strong' | 'Not assessed';
export const scoreDescriptors = [
  'No relevant evidence',
  'Limited',
  'Developing',
  'Secure',
  'Strong',
] as const;
export interface Exercise {
  id: string;
  version: number;
  grade: Grade;
  tool: Exclude<ToolId, 'editing'>;
  title: string;
  genre: string;
  instructions: string;
  passage: string;
  example: { prompt: string; response: string; explanation: string };
  fields: { id: string; label: string; hint: string; options?: string[] }[];
  criteria: { skill: Skill; description: string }[];
  wordTarget: [number, number];
  minutes: number;
  source: 'curated' | 'generated';
}
export interface Feedback {
  strengths: string[];
  corrections: { quote: string; explanation: string; suggestion: string }[];
  nextStep: string;
  ratings: {
    skill: Skill;
    rating: Rating;
    score?: number;
    evidence: string;
    explanation: string;
  }[];
  improvement: { meaningful: boolean; explanation: string };
  substantive: boolean;
}
export interface Revision {
  id: string;
  response: Record<string, string>;
  plan: string;
  submittedAt: number;
  assisted: boolean;
  overTime: boolean;
  feedback: Feedback | null;
  error: string | null;
  rubricVersion: number;
}
export interface Attempt {
  id: string;
  exercise: Exercise;
  grade: Grade;
  version: number;
  response: Record<string, string>;
  plan: string;
  mode: 'practice' | 'independent';
  assisted: boolean;
  stage: 'plan' | 'write' | 'proofread';
  startedAt: number | null;
  updatedAt: number;
  createdAt: number;
  parentId: string | null;
  revisions: Revision[];
}
export interface Award {
  id: string;
  exerciseId: string;
  exerciseVersion: number;
  attemptId: string;
  kind: 'completion' | 'revision';
  points: number;
  earnedAt: number;
}
export const RUBRIC_VERSION = 2;
export function assessmentScore(feedback: Feedback | null | undefined) {
  if (
    !feedback?.ratings.length ||
    feedback.ratings.some(
      ({ score }) => !Number.isInteger(score) || score === undefined || score < 0 || score > 4,
    )
  )
    return null;
  const total = feedback.ratings.reduce((sum, { score }) => sum + score!, 0);
  const maximum = feedback.ratings.length * 4;
  return { total, maximum, percent: Math.round((total / maximum) * 100) };
}
export const wordCount = (text: string) => text.trim().match(/\S+/g)?.length ?? 0;
export const responseText = (response: Record<string, string>) =>
  Object.values(response).join('\n');
export const isGrade = (value: unknown): value is Grade =>
  value === 8 || value === 9 || value === 10;
export function newAttempt(
  exercise: Exercise,
  mode: Attempt['mode'] = 'practice',
  parentId: string | null = null,
): Attempt {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    exercise,
    grade: exercise.grade,
    version: 1,
    response: {},
    plan: '',
    mode,
    assisted: false,
    stage: exercise.tool === 'timed-writing' ? 'plan' : 'write',
    startedAt: null,
    createdAt: now,
    updatedAt: now,
    parentId,
    revisions: [],
  };
}
