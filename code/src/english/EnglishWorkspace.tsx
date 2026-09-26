import { Button, Input, Settings, SelectControl } from '../components/ui/controls';
import { useEffect, useRef, useState } from 'react';
import { api, type User } from '../programs/api';
import { AccountName, Brand } from '../app/App';
import { canLeaveWorkspace, navigate, RouteLink, usePath, WorkspaceSwitcher } from '../workspaces';
import { exercises as curated } from './content';
import {
  tools,
  assessmentScore,
  skillNames,
  newAttempt,
  type Attempt,
  type Award,
  type Exercise,
  type Grade,
  type ToolId,
} from './model';
import { readGuest, saveGuestGrade, saveGuestAttempt } from './storage';
import { assessmentHistory, monthlyProgress, recommend, skillEvidence } from './progress';
import { AttemptPage } from './AttemptPage';
import './english.css';

export const message = (e: unknown) =>
  e instanceof Error ? e.message : 'The request failed. Try again.';
export function dateLabel(time: number) {
  return new Date(time).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
export default function EnglishWorkspace({
  user,
  onUserChange,
  onSignIn,
  onSignOut,
}: {
  user: User | null;
  onUserChange: (user: User) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const path = usePath();
  const [grade, setGrade] = useState<Grade | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]),
    [awards, setAwards] = useState<Award[]>([]);
  const [generated, setGenerated] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const request = <T,>(route: string, options: RequestInit = {}) =>
    api<T>('/english' + route, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(65000),
      headers: { ...options.headers, ...(user ? { 'X-Pseudostar-User': user.id } : {}) },
    });
  async function load(signal?: AbortSignal) {
    if (!user) {
      const data = readGuest();
      setGrade(data.grade);
      setAttempts(data.attempts);
      return;
    }
    const profile = await request<{ grade: Grade | null }>('/profile', { signal });
    const extra: Exercise[] = [];
    let exerciseCursor: string | null = null;
    do {
      const page: { exercises: Exercise[]; nextBefore?: string | null } = await request(
        '/exercises' + (exerciseCursor ? '?before=' + encodeURIComponent(exerciseCursor) : ''),
        { signal },
      );
      extra.push(...page.exercises);
      exerciseCursor = page.nextBefore ?? null;
    } while (exerciseCursor && !signal?.aborted);
    const all: Attempt[] = [],
      allAwards = new Map<string, Award>();
    let before: string | number | null = null;
    do {
      const page: { attempts: Attempt[]; awards: Award[]; nextBefore?: string | number | null } =
        await request(
          '/attempts' + (before === null ? '' : '?before=' + encodeURIComponent(before)),
          { signal },
        );
      all.push(...page.attempts);
      for (const award of page.awards ?? []) allAwards.set(award.id, award);
      before = page.nextBefore ?? null;
    } while (before !== null && !signal?.aborted);
    if (mounted.current && !signal?.aborted) {
      setGrade((current) => current ?? profile.grade);
      setAttempts((current) => {
        const merged = new Map(all.map((attempt) => [attempt.id, attempt]));
        for (const attempt of current) {
          const loaded = merged.get(attempt.id);
          if (!loaded || attempt.version > loaded.version) merged.set(attempt.id, attempt);
        }
        return [...merged.values()];
      });
      setGenerated((current) => [
        ...new Map([...extra, ...current].map((exercise) => [exercise.id, exercise])).values(),
      ]);
      setAwards((current) => [
        ...new Map([...allAwards.values(), ...current].map((award) => [award.id, award])).values(),
      ]);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [user?.id]);
  const update = (attempt: Attempt) =>
    setAttempts((current) => [attempt, ...current.filter((a) => a.id !== attempt.id)]);
  async function action(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function chooseGrade(value: Grade) {
    await action(async () => {
      if (user)
        await request('/profile', { method: 'PUT', body: JSON.stringify({ grade: value }) });
      else saveGuestGrade(value);
      setGrade(value);
    });
  }
  const allExercises = [
    ...new Map(
      [...attempts.map((a) => a.exercise), ...generated, ...curated].map((e) => [e.id, e]),
    ).values(),
  ];
  const selected = allExercises.filter((e) => e.grade === grade);
  const id = path.split('/')[3];
  const exercise = allExercises.find((e) => e.id === id);
  const attempt = attempts.find((a) => a.id === id);
  async function start(ex: Exercise, mode: Attempt['mode'], parentId?: string) {
    const originPath = location.pathname;
    await action(async () => {
      const next = user
        ? (
            await request<{ attempt: Attempt }>('/attempts', {
              method: 'POST',
              body: JSON.stringify({ exerciseId: ex.id, mode, parentId }),
            })
          ).attempt
        : saveGuestAttempt(newAttempt(ex, mode, parentId ?? null));
      if (!mounted.current || location.pathname !== originPath) return;
      update(next);
      navigate('/english/attempts/' + next.id);
    });
  }
  async function generate(tool: ToolId, skill?: string) {
    if (!grade || !user || tool === 'editing') return;
    const originPath = location.pathname;
    await action(async () => {
      const { exercise: ex } = await request<{ exercise: Exercise }>('/exercises', {
        method: 'POST',
        body: JSON.stringify({ grade, tool, skill }),
      });
      if (!mounted.current || location.pathname !== originPath) return;
      setGenerated((current) => [...current.filter((e) => e.id !== ex.id), ex]);
      navigate('/english/exercises/' + ex.id);
    });
  }
  const recommendation = grade ? recommend(attempts, allExercises, grade) : null;
  const recommendedAttempt = attempts.find((a) => a.id === recommendation?.attemptId);
  const recommendedExercise = allExercises.find((e) => e.id === recommendation?.exerciseId);
  const latestFeedback = attempts
    .flatMap((a) => a.revisions.filter((r) => r.feedback).map((r) => ({ a, r })))
    .sort((a, b) => b.r.submittedAt - a.r.submittedAt)[0];
  const scored = grade ? assessmentHistory(attempts, grade) : [];
  const title = tools.find((t) => t.id === id)?.name;
  const [practiceMode, setPracticeMode] = useState<Attempt['mode']>('practice');
  const toolGrid = (
    <div className="en-tools">
      {tools.map((tool) => (
        <RouteLink className="en-tool" key={tool.id} to={'/english/tools/' + tool.id}>
          <strong>{tool.name}</strong>
          <span>{tool.description}</span>
        </RouteLink>
      ))}
    </div>
  );
  const historyRows = (list: Attempt[]) =>
    list.length ? (
      <div className="en-history">
        {[...list]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((a) => (
            <RouteLink key={a.id} to={'/english/attempts/' + a.id} className="en-history-row">
              <div>
                <strong>{a.exercise.title}</strong>
                <span>
                  {tools.find((t) => t.id === a.exercise.tool)?.name} · Grade {a.grade}
                </span>
              </div>
              <div>
                <span>
                  {a.revisions.length
                    ? `${a.revisions.length} submitted version${a.revisions.length === 1 ? '' : 's'}`
                    : 'Draft'}
                </span>
                {assessmentScore(a.revisions.at(-1)?.feedback) && (
                  <strong>
                    Latest score: {assessmentScore(a.revisions.at(-1)?.feedback)!.percent}/100
                  </strong>
                )}
                <small>{dateLabel(a.updatedAt)}</small>
              </div>
            </RouteLink>
          ))}
      </div>
    ) : (
      <p className="en-empty">
        Your work will appear here after you start an exercise.{' '}
        <RouteLink to="/english">Choose your first practice.</RouteLink>
      </p>
    );
  return (
    <div className="en-workspace">
      <header className="topbar workspace-header">
        <Brand />
        <WorkspaceSwitcher value="english" />
        <nav className="workspace-nav" aria-label="English">
          <RouteLink className={path === '/english' ? 'current' : ''} to="/english">
            My dashboard
          </RouteLink>
          <RouteLink
            className={
              path.includes('/tools') || path.includes('/exercises') || path.includes('/attempts')
                ? 'current'
                : ''
            }
            to="/english/tools"
          >
            Practice tools
          </RouteLink>
          <RouteLink className={path === '/english/history' ? 'current' : ''} to="/english/history">
            Writing history
          </RouteLink>
          <RouteLink
            className={path === '/english/progress' ? 'current' : ''}
            to="/english/progress"
          >
            My progress
          </RouteLink>
        </nav>
        <div className="account-area en-account">
          <Settings subject="english" label={user?.name || user?.email || 'Guest settings'}>
            {user ? (
              <AccountName user={user} onChange={onUserChange} />
            ) : (
              <p>Guest · saved on this device</p>
            )}
            {grade && (
              <label>
                Your grade{' '}
                <SelectControl
                  label="Your grade"
                  value={String(grade)}
                  disabled={busy}
                  subject="english"
                  onValueChange={(value) => void chooseGrade(Number(value) as Grade)}
                  options={[8, 9, 10].map((g) => ({ value: String(g), label: String(g) }))}
                />
              </label>
            )}
          </Settings>
          {user && (
            <Button
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  if (!canLeaveWorkspace()) return;
                  await api('/auth/logout', {
                    method: 'POST',
                    headers: { 'X-Pseudostar-User': user.id },
                  });
                  onSignOut();
                })
              }
            >
              Sign out
            </Button>
          )}
          {!user && (
            <Button
              onClick={() => {
                if (canLeaveWorkspace()) onSignIn();
              }}
            >
              Sign in for AI coaching
            </Button>
          )}
        </div>
      </header>
      <main className="en-main" id="english-main">
        {error && (
          <div className="en-error" role="alert">
            <p>{error}</p>
            <Button disabled={busy} onClick={() => void action(() => load())}>
              Retry loading
            </Button>
          </div>
        )}
        {busy && <p role="status">Working… Your saved work stays available.</p>}
        {loading ? (
          <p role="status">Opening your English workspace…</p>
        ) : !grade ? (
          <section className="en-onboarding">
            <h1>Your words. Your next chapter.</h1>
            <p>
              Choose your school grade so practice and feedback start at the right level. You can
              change it later without losing your work.
            </p>
            <div className="en-grade-options">
              {[8, 9, 10].map((g) => (
                <Button key={g} disabled={busy} onClick={() => void chooseGrade(g as Grade)}>
                  <strong>Grade {g}</strong>
                  <span>
                    {g === 8
                      ? 'Build clear sentences and supported ideas'
                      : g === 9
                        ? 'Develop analysis and sustained writing'
                        : 'Refine style and independent responses'}
                  </span>
                </Button>
              ))}
            </div>
            <p className="en-small">
              Original practice informed by Cambridge English objectives. These are not official
              examination materials.
            </p>
          </section>
        ) : (
          <>
            {path === '/english' && (
              <>
                <header className="en-heading">
                  <h1>
                    A little practice.
                    <br className="en-mobile-break" /> A clearer voice.
                  </h1>
                  <p>Your next step is ready. Or choose something to explore.</p>
                </header>
                <div className="en-dashboard-focus">
                  <section className="en-next">
                    <h2>
                      {recommendedAttempt?.exercise.title ??
                        recommendedExercise?.title ??
                        'Find your starting point'}
                    </h2>
                    <p>{recommendation?.reason ?? 'Choose a tool and try a short exercise.'}</p>
                    {latestFeedback && (
                      <div className="en-coach-note">
                        <strong>Your last next step</strong>
                        <p>{latestFeedback.r.feedback!.nextStep}</p>
                        <RouteLink to={'/english/attempts/' + latestFeedback.a.id}>
                          Revisit this feedback
                        </RouteLink>
                      </div>
                    )}
                    <RouteLink
                      className="en-primary"
                      to={
                        recommendedAttempt
                          ? '/english/attempts/' + recommendedAttempt.id
                          : recommendedExercise
                            ? '/english/exercises/' + recommendedExercise.id
                            : '/english/tools'
                      }
                    >
                      {recommendedAttempt ? 'Continue my work' : 'Start practice'}
                    </RouteLink>
                  </section>
                  <section className="en-learning">
                    <h2>What your work is showing</h2>
                    {scored[0] && (
                      <RouteLink to={'/english/attempts/' + scored[0].attemptId}>
                        <strong>Latest assessment: {scored[0].percent}/100</strong>
                        <span>
                          {scored[0].title} · {scored[0].assisted ? 'Coached' : 'Independent'}
                        </span>
                      </RouteLink>
                    )}
                    {skillEvidence(attempts, grade)
                      .slice(0, 3)
                      .map((e, i) => (
                        <RouteLink key={i} to={'/english/attempts/' + e.attemptId}>
                          <strong>{skillNames[e.skill]}</strong>
                          <span>
                            {e.rating} · {e.assisted ? 'with coaching' : 'independently'}
                          </span>
                          <small>{dateLabel(e.submittedAt)}</small>
                        </RouteLink>
                      ))}
                    {!attempts.some((a) => a.revisions.some((r) => r.feedback)) && (
                      <p>
                        No ratings yet. Your feedback will show what you can do and what to try
                        next.
                      </p>
                    )}
                    <RouteLink to="/english/progress">
                      {awards.reduce((n, a) => n + a.points, 0)} practice points · View progress
                    </RouteLink>
                  </section>
                </div>
                <section>
                  <h2>Make room for every skill</h2>
                  {toolGrid}
                </section>
                <section>
                  <h2>Pick up where you left off</h2>
                  {historyRows(attempts.slice(0, 3))}
                </section>
              </>
            )}
            {path === '/english/tools' && (
              <>
                <h1>Practice tools</h1>
                <p>
                  Choose a skill. Every tool leads to your saved work, feedback and a next step.
                </p>
                {toolGrid}
              </>
            )}
            {path.startsWith('/english/tools/') && title && (
              <>
                <RouteLink to="/english/tools">All practice tools</RouteLink>
                <h1>{title}</h1>
                {id === 'editing' ? (
                  <>
                    <p>
                      Choose a response to revise. Your earlier words and feedback stay available
                      alongside your new version.
                    </p>
                    {historyRows(attempts.filter((a) => a.revisions.length > 0))}
                  </>
                ) : (
                  <>
                    <p>
                      {tools.find((t) => t.id === id)?.description} Choose an original task or ask
                      for fresh practice.
                    </p>
                    <div className="en-actions">
                      <Button
                        className="en-primary"
                        disabled={busy || !user}
                        onClick={() => void generate(id as ToolId)}
                      >
                        + Create New Practice
                      </Button>
                      {!user && (
                        <Button
                          onClick={() => {
                            if (canLeaveWorkspace()) onSignIn();
                          }}
                        >
                          Sign in to generate practice
                        </Button>
                      )}
                    </div>
                    <div className="en-exercise-list">
                      {selected
                        .filter((e) => e.tool === id)
                        .map((ex) => (
                          <RouteLink
                            className="en-exercise"
                            key={ex.id}
                            to={'/english/exercises/' + ex.id}
                          >
                            <div>
                              <h2>{ex.title}</h2>
                              <p>
                                {ex.genre} · {ex.minutes} min ·{' '}
                                {ex.source === 'curated'
                                  ? 'Original exercise'
                                  : 'AI-generated practice'}
                              </p>
                            </div>
                            <span>Open exercise ↗</span>
                          </RouteLink>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
            {path.startsWith('/english/exercises/') && exercise && (
              <>
                <RouteLink to={'/english/tools/' + exercise.tool}>
                  Back to {tools.find((t) => t.id === exercise.tool)?.name}
                </RouteLink>
                <h1>{exercise.title}</h1>
                <p>
                  Grade {exercise.grade} · {exercise.genre} · {exercise.minutes} minutes
                </p>
                <div className="en-reading">
                  <h2>Your task</h2>
                  <p>{exercise.instructions}</p>
                  {exercise.passage && <blockquote>{exercise.passage}</blockquote>}
                  <h3>What to aim for</h3>
                  <ul>
                    {exercise.criteria.map((c) => (
                      <li key={c.skill}>{c.description}</li>
                    ))}
                  </ul>
                </div>

                <fieldset className="en-mode">
                  <legend>How would you like to practise?</legend>
                  <label>
                    <Input
                      type="radio"
                      name="practice-mode"
                      checked={practiceMode === 'practice'}
                      onChange={() => setPracticeMode('practice')}
                    />{' '}
                    Practice with coaching available
                  </label>
                  <label>
                    <Input
                      type="radio"
                      name="practice-mode"
                      checked={practiceMode === 'independent'}
                      onChange={() => setPracticeMode('independent')}
                    />{' '}
                    Independent check, feedback after submission
                  </label>
                </fieldset>
                <Button
                  className="en-primary"
                  disabled={busy}
                  onClick={() => void start(exercise, practiceMode)}
                >
                  Start this exercise
                </Button>
              </>
            )}
            {path.startsWith('/english/attempts/') && attempt && (
              <AttemptPage
                key={attempt.id}
                initial={attempt}
                user={user}
                request={request}
                onUpdate={update}
                onEvaluated={() => void action(() => load())}
                onSignIn={() => {
                  if (canLeaveWorkspace()) onSignIn();
                }}
                exercises={allExercises}
                onStart={start}
                onGenerate={generate}
              />
            )}
            {path === '/english/history' && (
              <>
                <h1>Your writing history</h1>
                <p>
                  Original responses, feedback and revisions stay together. Reopen any piece to
                  continue.
                </p>
                {user && (
                  <GuestCopies
                    onCopy={async (a) => {
                      const created = (
                        await request<{ attempt: Attempt }>('/attempts', {
                          method: 'POST',
                          body: JSON.stringify({ exerciseId: a.exercise.id, mode: a.mode }),
                        })
                      ).attempt;
                      const saved = (
                        await request<{ attempt: Attempt }>('/attempts/' + created.id, {
                          method: 'PUT',
                          body: JSON.stringify({
                            expectedVersion: created.version,
                            response: a.response,
                            plan: a.plan,
                            stage: a.stage,
                            startedAt: null,
                            assisted: a.assisted,
                          }),
                        })
                      ).attempt;
                      update(saved);
                      navigate('/english/attempts/' + saved.id);
                    }}
                  />
                )}
                {historyRows([...attempts])}
              </>
            )}
            {path === '/english/progress' && (
              <>
                <h1>Practice that adds up.</h1>
                <p>
                  Assessment scores show the quality of each response. Practice points recognise
                  effort.
                </p>
                <h2>Assessment scores · Grade {grade}</h2>
                <p className="en-small">
                  Each submission keeps its own score. Compare the same tool, grade and criteria
                  version over time. Coached revisions and independent responses are labelled
                  separately; old feedback-only results have no score.
                </p>
                {scored.length ? (
                  <div className="en-table-scroll">
                    <table aria-label="Assessment score history">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Activity</th>
                          <th>Version</th>
                          <th>Conditions</th>
                          <th>Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scored.map((row) => (
                          <tr key={row.revisionId}>
                            <td>{dateLabel(row.submittedAt)}</td>
                            <th>
                              <RouteLink to={'/english/attempts/' + row.attemptId}>
                                {row.title}
                              </RouteLink>
                              <small>{tools.find((t) => t.id === row.tool)?.name}</small>
                            </th>
                            <td>
                              {row.version} · Criteria v{row.rubricVersion}
                            </td>
                            <td>{row.assisted ? 'Coached' : 'Independent'}</td>
                            <td>
                              <strong>{row.percent}/100</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Submit an activity for assessment to start your score history.</p>
                )}
                <h2>Practice points</h2>
                <div className="en-points">
                  <strong>{awards.reduce((sum, a) => sum + a.points, 0)}</strong>
                  <span>practice points earned</span>
                </div>
                <p className="en-small">
                  10 points for an evaluated first response. 5 for one evidenced revision. Repeated
                  unchanged work earns no extra points.
                </p>
                <h2>Month by month</h2>
                {monthlyProgress(attempts, awards).length ? (
                  <div className="en-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Month (UTC)</th>
                          <th>Points</th>
                          <th>Practice days</th>
                          <th>Completed tasks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyProgress(attempts, awards).map((m) => (
                          <tr key={m.month}>
                            <th>{m.month}</th>
                            <td>{m.points}</td>
                            <td>{m.practiceDays}</td>
                            <td>{m.completed}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Complete your first response to start your practice history.</p>
                )}
                <h2>Skill evidence · Grade {grade}</h2>
                <p className="en-small">
                  Each entry links to the response behind it. Coaching and independent practice are
                  shown separately. Change your grade in User settings to view another grade.
                </p>
                <div className="en-evidence-list">
                  {skillEvidence(attempts, grade).map((e, i) => (
                    <RouteLink key={i} to={'/english/attempts/' + e.attemptId}>
                      <strong>
                        {skillNames[e.skill]} · {e.rating}
                      </strong>
                      <span>
                        {e.assisted ? 'With coaching' : 'Independent'} · {dateLabel(e.submittedAt)}{' '}
                        · Criteria v{e.rubricVersion}
                      </span>
                      <p>{e.evidence}</p>
                    </RouteLink>
                  ))}
                </div>
                {!skillEvidence(attempts, grade).length && (
                  <p>No evaluated work for this grade yet.</p>
                )}
              </>
            )}
            {!['/english', '/english/tools', '/english/history', '/english/progress'].includes(
              path,
            ) &&
              !(path.startsWith('/english/tools/') && title) &&
              !(path.startsWith('/english/exercises/') && exercise) &&
              !(path.startsWith('/english/attempts/') && attempt) && (
                <>
                  <h1>This page is not available.</h1>
                  <p>The exercise or attempt may belong to another account.</p>
                  <RouteLink to="/english">Return to your dashboard</RouteLink>
                </>
              )}
          </>
        )}
      </main>
    </div>
  );
}
function GuestCopies({ onCopy }: { onCopy: (a: Attempt) => Promise<void> }) {
  const [data] = useState(() => {
      try {
        return readGuest().attempts;
      } catch {
        return [];
      }
    }),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  if (!data.length) return null;
  return (
    <details className="en-example">
      <summary>Copy a guest draft into this account</summary>
      <p>
        Device work stays separate until you choose to copy it. Its guest history remains on this
        device.
      </p>
      {error && <p role="alert">{error}</p>}
      {data.map((a) => (
        <p key={a.id}>
          {a.exercise.title}{' '}
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onCopy(a);
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Copy draft
          </Button>
        </p>
      ))}
    </details>
  );
}
