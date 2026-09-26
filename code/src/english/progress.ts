import {
  responseText,
  assessmentScore,
  skillNames,
  type Attempt,
  type Award,
  type Exercise,
  type Grade,
  type Rating,
  type Skill,
} from './model';

// UTC dates keep month and practice-day boundaries consistent across devices.
export function monthlyProgress(attempts: Attempt[], awards: Award[]) {
  const months = new Map<
    string,
    { month: string; points: number; days: Set<string>; completed: Set<string> }
  >();
  const bucket = (date: number) => {
    const month = new Date(date).toISOString().slice(0, 7);
    if (!months.has(month))
      months.set(month, { month, points: 0, days: new Set(), completed: new Set() });
    return months.get(month)!;
  };
  const completions = new Map<string, number>();
  for (const attempt of attempts)
    for (const revision of attempt.revisions) {
      const row = bucket(revision.submittedAt);
      row.days.add(new Date(revision.submittedAt).toISOString().slice(0, 10));
      const key = `${attempt.exercise.id}:${attempt.exercise.version}`;
      if (revision.feedback?.substantive)
        completions.set(key, Math.min(completions.get(key) ?? Infinity, revision.submittedAt));
    }
  const seen = new Set<string>();
  for (const award of awards) {
    const key = `${award.exerciseId}:${award.exerciseVersion}:${award.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const row = bucket(award.earnedAt);
    row.points += award.points;
    if (award.kind === 'completion')
      completions.set(`${award.exerciseId}:${award.exerciseVersion}`, award.earnedAt);
  }
  for (const [key, date] of completions) bucket(date).completed.add(key);
  return [...months.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ month, points, days, completed }) => ({
      month,
      points,
      practiceDays: days.size,
      completed: completed.size,
    }));
}

// Preserve each observation, newest first. Compare only matching grade, rubric and assistance.
export function skillEvidence(
  attempts: Attempt[],
  grade: Grade,
): {
  skill: Skill;
  rating: Rating;
  assisted: boolean;
  attemptId: string;
  submittedAt: number;
  evidence: string;
  rubricVersion: number;
}[] {
  return attempts
    .filter((a) => a.grade === grade)
    .flatMap((attempt) =>
      attempt.revisions.flatMap((revision) =>
        (revision.feedback?.ratings ?? []).map((rating) => ({
          skill: rating.skill,
          rating: rating.rating,
          assisted: revision.assisted,
          attemptId: attempt.id,
          submittedAt: revision.submittedAt,
          evidence: rating.evidence,
          rubricVersion: revision.rubricVersion,
        })),
      ),
    )
    .sort((a, b) => b.submittedAt - a.submittedAt || a.attemptId.localeCompare(b.attemptId));
}

export function recommend(
  attempts: Attempt[],
  exercises: Exercise[],
  grade: Grade,
): { attemptId?: string; exerciseId?: string; reason: string } {
  const work = attempts.filter((a) => a.grade === grade).sort((a, b) => b.updatedAt - a.updatedAt);
  const unfinished = work.find(
    (a) =>
      !a.revisions.length ||
      JSON.stringify(a.response) !== JSON.stringify(a.revisions.at(-1)!.response) ||
      a.plan !== a.revisions.at(-1)!.plan,
  );
  if (unfinished) return { attemptId: unfinished.id, reason: 'Continue your unfinished response.' };
  const revision = work.find((a) => {
    const feedback = a.revisions.at(-1)?.feedback;
    return feedback && feedback.nextStep && feedback.ratings.some((r) => r.rating === 'Developing');
  });
  if (revision)
    return { attemptId: revision.id, reason: revision.revisions.at(-1)!.feedback!.nextStep };
  const practiced = new Set(
    work.filter((a) => a.revisions.length).map((a) => `${a.exercise.id}:${a.exercise.version}`),
  );
  const fresh = exercises.filter(
    (e) => e.grade === grade && !practiced.has(`${e.id}:${e.version}`),
  );
  const latest = new Map<string, ReturnType<typeof skillEvidence>[number]>();
  for (const evidence of skillEvidence(work, grade)) {
    const key = `${evidence.skill}:${evidence.rubricVersion}`;
    if (evidence.rating !== 'Not assessed' && !latest.has(key)) latest.set(key, evidence);
  }
  const coached = [...latest.values()].find((e) => e.assisted);
  const followup = coached && fresh.find((e) => e.criteria.some((c) => c.skill === coached.skill));
  if (followup)
    return {
      exerciseId: followup.id,
      reason: `Try ${skillNames[coached.skill].toLowerCase()} in a fresh independent response.`,
    };
  const counts = Object.fromEntries(Object.keys(skillNames).map((s) => [s, 0])) as Record<
    Skill,
    number
  >;
  for (const a of work)
    if (a.revisions.some((r) => responseText(r.response).trim()))
      for (const c of a.exercise.criteria) counts[c.skill]++;
  const choices = fresh.length ? fresh : exercises.filter((e) => e.grade === grade);
  const next = [...choices].sort(
    (a, b) =>
      Math.min(...a.criteria.map((c) => counts[c.skill])) -
      Math.min(...b.criteria.map((c) => counts[c.skill])),
  )[0];
  return next
    ? { exerciseId: next.id, reason: 'Practise a skill with less recent work.' }
    : { reason: 'Choose a tool to start practising.' };
}

// Keep individual results: repeated coached revisions do not inflate an independent average.
export function assessmentHistory(attempts: Attempt[], grade: Grade) {
  return attempts
    .filter((a) => a.grade === grade)
    .flatMap((attempt) =>
      attempt.revisions.flatMap((revision, index) => {
        const score = assessmentScore(revision.feedback);
        if (!score) return [];
        return [
          {
            attemptId: attempt.id,
            revisionId: revision.id,
            title: attempt.exercise.title,
            tool: attempt.exercise.tool,
            version: index + 1,
            assisted: revision.assisted,
            submittedAt: revision.submittedAt,
            rubricVersion: revision.rubricVersion,
            ...score,
          },
        ];
      }),
    )
    .sort((a, b) => b.submittedAt - a.submittedAt || b.version - a.version);
}
