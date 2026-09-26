import { Button, Textarea } from '../components/ui/controls';
import { useEffect, useRef, useState } from 'react';
import type { User } from '../programs/api';
import { guardNavigation, RouteLink } from '../workspaces';
import {
  clearRecovery,
  clearSavedRecovery,
  readRecovery,
  saveGuestAttempt,
  writeRecovery,
} from './storage';
import {
  RUBRIC_VERSION,
  assessmentScore,
  scoreDescriptors,
  responseText,
  skillNames,
  tools,
  wordCount,
  type Attempt,
  type Exercise,
  type Feedback,
  type ToolId,
} from './model';

const errorText = (e: unknown) =>
  e instanceof Error ? e.message : 'Your work could not be saved.';
const draftKey = (a: Attempt) =>
  JSON.stringify([a.response, a.plan, a.stage, a.startedAt, a.assisted]);
export function AttemptPage({
  initial,
  user,
  request,
  onUpdate,
  onEvaluated,
  onSignIn,
  exercises,
  onStart,
  onGenerate,
}: {
  initial: Attempt;
  user: User | null;
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
  onUpdate: (a: Attempt) => void;
  onEvaluated: () => void;
  onSignIn: () => void;
  exercises: Exercise[];
  onStart: (e: Exercise, mode: Attempt['mode'], parentId?: string) => Promise<void>;
  onGenerate: (tool: ToolId, skill?: string) => Promise<void>;
}) {
  const [recovery] = useState(() => {
    try {
      return user ? readRecovery(user.id, initial.id) : null;
    } catch (e) {
      return { error: errorText(e) };
    }
  });
  const collision = recovery && !('error' in recovery) && recovery.baseVersion !== initial.version;
  const [conflict, setConflict] = useState(!!collision);
  const [attempt, setAttempt] = useState<Attempt>(() =>
    recovery && !('error' in recovery) && !collision
      ? { ...initial, ...recovery.attempt, revisions: initial.revisions }
      : initial,
  );
  const current = useRef(attempt),
    remote = useRef(initial),
    flight = useRef<Promise<void> | null>(null),
    live = useRef(true),
    unsafe = useRef(false);
  const [edit, setEdit] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(recovery && 'error' in recovery ? recovery.error : ''),
    [status, setStatus] = useState('Saved'),
    [hint, setHint] = useState('');
  const [clock, setClock] = useState(Date.now());
  const owner = user?.id ?? 'guest';
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    if (attempt.exercise.tool !== 'timed-writing') return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [attempt.exercise.tool]);
  useEffect(
    () =>
      guardNavigation(() => {
        if (unsafe.current) {
          setError(
            'Device recovery is unavailable. Copy your response or restore saving before leaving.',
          );
          return false;
        }
        return true;
      }),
    [],
  );
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsafe.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  function accept(a: Attempt) {
    current.current = a;
    setAttempt(a);
  }
  function change(patch: Partial<Attempt>) {
    const next = { ...current.current, ...patch, updatedAt: Date.now() };
    accept(next);
    setError('');
    try {
      if (user) {
        writeRecovery(owner, next, remote.current.version);
        setStatus('Saved on this device · syncing');
      } else {
        const stored = saveGuestAttempt(next, remote.current.version);
        remote.current = stored;
        accept(stored);
        onUpdate(stored);
        setStatus('Saved on this device');
      }
      unsafe.current = false;
    } catch (e) {
      unsafe.current = true;
      setStatus('Save failed');
      setError(errorText(e));
    }
    setEdit((n) => n + 1);
  }
  async function save() {
    if (conflict)
      throw new Error(
        'A newer saved version exists. Copy the recovered draft, then use the saved version.',
      );
    if (!user) {
      if (unsafe.current) {
        const saved = saveGuestAttempt(current.current, remote.current.version);
        remote.current = saved;
        accept(saved);
        onUpdate(saved);
        unsafe.current = false;
      }
      return;
    }
    if (flight.current) {
      await flight.current;
    }
    if (draftKey(current.current) === draftKey(remote.current)) return;
    const run = async () => {
      while (live.current && draftKey(current.current) !== draftKey(remote.current)) {
        const snapshot = current.current,
          baseVersion = remote.current.version;
        writeRecovery(owner, snapshot, baseVersion);
        unsafe.current = false;
        setStatus('Saving…');
        const result = await request<{ attempt: Attempt }>('/attempts/' + initial.id, {
          method: 'PUT',
          body: JSON.stringify({
            expectedVersion: remote.current.version,
            response: snapshot.response,
            plan: snapshot.plan,
            stage: snapshot.stage,
            startedAt: snapshot.startedAt,
            assisted: snapshot.assisted,
          }),
        });
        if (!live.current) return;
        remote.current = result.attempt;
        const unchanged = draftKey(current.current) === draftKey(snapshot);
        const merged = unchanged
          ? result.attempt
          : {
              ...current.current,
              version: result.attempt.version,
              revisions: result.attempt.revisions,
            };
        accept(merged);
        onUpdate(result.attempt);
        if (unchanged) {
          clearSavedRecovery(owner, snapshot, baseVersion);
          setStatus('Saved to your account');
        } else writeRecovery(owner, merged, result.attempt.version);
      }
    };
    flight.current = run();
    try {
      await flight.current;
    } finally {
      flight.current = null;
    }
  }
  useEffect(() => {
    if (!user || conflict) return;
    const timer = setTimeout(
      () =>
        void save().catch((e) => {
          if (live.current) {
            setError(errorText(e));
            setStatus('Local recovery only');
          }
        }),
      700,
    );
    return () => clearTimeout(timer);
  }, [edit, user?.id, conflict]);
  const exercise = attempt.exercise;
  const last = attempt.revisions.at(-1);
  const changedSinceSubmit =
    !last ||
    JSON.stringify(last.response) !== JSON.stringify(attempt.response) ||
    last.plan !== attempt.plan;
  const complete = exercise.fields.every((f) => attempt.response[f.id]?.trim());
  const elapsed = attempt.startedAt
    ? Math.max(0, Math.floor((clock - attempt.startedAt) / 1000))
    : 0;
  const duration = exercise.minutes * 60;
  const remaining = Math.max(0, duration - elapsed);
  async function submit() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await save();
      if (user) {
        const result = await request<{ attempt: Attempt }>('/attempts/' + initial.id + '/submit', {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: remote.current.version }),
        });
        if (!live.current) return;
        remote.current = result.attempt;
        accept(result.attempt);
        onUpdate(result.attempt);
        onEvaluated();
        setStatus(
          result.attempt.revisions.at(-1)?.error
            ? 'Response saved · coaching needs a retry'
            : 'Response and feedback saved',
        );
      } else {
        const a = current.current;
        const saved = saveGuestAttempt(
          {
            ...a,
            revisions: [
              ...a.revisions,
              {
                id: crypto.randomUUID(),
                response: { ...a.response },
                plan: a.plan,
                submittedAt: Date.now(),
                assisted: a.assisted,
                overTime: !!a.startedAt && Date.now() - a.startedAt > duration * 1000,
                feedback: null,
                error: null,
                rubricVersion: RUBRIC_VERSION,
              },
            ],
          },
          remote.current.version,
        );
        remote.current = saved;
        accept(saved);
        onUpdate(saved);
        setStatus('Response saved on this device. Sign in for AI coaching.');
      }
    } catch (e) {
      if (live.current) {
        setError(errorText(e));
        if (user)
          try {
            const fresh = (await request<{ attempt: Attempt }>('/attempts/' + initial.id)).attempt;
            if (live.current) {
              remote.current = fresh;
              if (
                JSON.stringify(fresh.response) === JSON.stringify(current.current.response) &&
                fresh.plan === current.current.plan
              ) {
                accept(fresh);
                onUpdate(fresh);
              } else setConflict(true);
            }
          } catch {
            /* Keep the local recovery when the account or connection is unavailable. */
          }
      }
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function help() {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      await save();
      const result = await request<{ attempt: Attempt; hint: string; error?: string }>(
        '/attempts/' + initial.id + '/help',
        { method: 'POST', body: JSON.stringify({ expectedVersion: remote.current.version }) },
      );
      if (!live.current) return;
      remote.current = result.attempt;
      accept(result.attempt);
      onUpdate(result.attempt);
      setHint(result.hint);
      if (result.error) setError(result.error);
    } catch (e) {
      if (live.current) {
        setError(errorText(e));
        try {
          const fresh = (await request<{ attempt: Attempt }>('/attempts/' + initial.id)).attempt;
          if (live.current) {
            remote.current = fresh;
            if (
              JSON.stringify(fresh.response) === JSON.stringify(current.current.response) &&
              fresh.plan === current.current.plan
            ) {
              accept(fresh);
              onUpdate(fresh);
            } else setConflict(true);
          }
        } catch {
          /* Keep the local draft if the account or connection is unavailable. */
        }
      }
    } finally {
      if (live.current) setBusy(false);
    }
  }
  function recoveryText(a: Attempt) {
    return [a.exercise.title, a.plan, ...Object.values(a.response)].join('\n\n');
  }
  const next = exercises.find(
    (e) => e.grade === attempt.grade && e.tool === exercise.tool && e.id !== exercise.id,
  );
  return (
    <article className="en-attempt">
      <header className="en-heading en-task-header">
        <RouteLink to={'/english/tools/' + exercise.tool}>
          Back to {tools.find((t) => t.id === exercise.tool)?.name}
        </RouteLink>
        <h1>{exercise.title}</h1>
        <p>
          Grade {attempt.grade} · {exercise.genre} ·{' '}
          {attempt.assisted
            ? 'With coaching'
            : attempt.mode === 'independent'
              ? 'Independent check'
              : 'Practice'}
        </p>
      </header>
      {conflict && (
        <div className="en-error" role="alert">
          <h2>A newer version was saved elsewhere.</h2>
          <p>
            Your recovered draft is below. Copy any changes you want to keep before using the
            account version.
          </p>
          <label>
            Recovered response
            <Textarea
              readOnly
              value={recoveryText(
                recovery && !('error' in recovery) ? recovery.attempt : current.current,
              )}
            />
          </label>
          <Button
            onClick={() => {
              try {
                clearRecovery(owner, initial.id);
                accept(remote.current);
                setConflict(false);
                setError('');
              } catch (e) {
                setError(errorText(e));
              }
            }}
          >
            Use the account version
          </Button>
        </div>
      )}
      {error && (
        <div className="en-error" role="alert">
          <p>{error}</p>
          {unsafe.current && (
            <Button
              onClick={() => {
                unsafe.current = false;
                setError('You can now leave. Your copied response is your backup.');
              }}
            >
              I have copied my response
            </Button>
          )}
          <Button
            disabled={busy || conflict}
            onClick={() => {
              setError('');
              void save().catch((e) => setError(errorText(e)));
            }}
          >
            Retry save
          </Button>
        </div>
      )}
      <div className="en-attempt-columns">
        <section className="en-task">
          <h2>Your task</h2>
          <p>{exercise.instructions}</p>
          {exercise.passage && <blockquote>{exercise.passage}</blockquote>}
          <h3>Assessment criteria</h3>
          <p className="en-small">
            Each criterion earns 0–4 marks, with equal weight. The total is shown out of 100.
          </p>
          <p className="en-small">
            0: no relevant evidence · 1: limited · 2: developing · 3: secure · 4: strong.
          </p>
          <ul>
            {exercise.criteria.map((c) => (
              <li key={c.skill}>{c.description}</li>
            ))}
          </ul>
        </section>
        <section className="en-response">
          <h2>{last ? 'Your next version' : 'Your response'}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <fieldset disabled={busy || conflict}>
              {exercise.tool === 'timed-writing' && (
                <div className="en-timer">
                  <div>
                    <strong>
                      {attempt.startedAt
                        ? remaining
                          ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} remaining`
                          : 'Time complete · continued practice'
                        : `${exercise.minutes} minute task`}
                    </strong>
                    <span>
                      {elapsed > duration
                        ? 'Your words are safe. Submit now or continue; this response will be marked over time.'
                        : 'Plan for 15%, write for 70%, proofread for 15% of the available time.'}
                    </span>
                  </div>
                  {!attempt.startedAt ? (
                    <Button type="button" onClick={() => change({ startedAt: Date.now() })}>
                      Start timer
                    </Button>
                  ) : null}
                  <div className="en-stages">
                    {(['plan', 'write', 'proofread'] as const).map((stage) => (
                      <Button
                        type="button"
                        aria-pressed={attempt.stage === stage}
                        key={stage}
                        onClick={() => change({ stage })}
                      >
                        {stage === 'plan' ? 'Plan' : stage === 'write' ? 'Write' : 'Proofread'}
                      </Button>
                    ))}
                  </div>
                  <label>
                    Planning notes
                    <Textarea
                      value={attempt.plan}
                      onChange={(e) => change({ plan: e.target.value })}
                      maxLength={6000}
                      rows={4}
                    />
                  </label>
                </div>
              )}
              {exercise.fields.map((field) => (
                <label key={field.id} className="en-field">
                  {field.label}
                  <span id={'hint-' + field.id}>{field.hint}</span>
                  {field.options ? (
                    <select
                      required
                      aria-describedby={'hint-' + field.id}
                      value={attempt.response[field.id] ?? ''}
                      onChange={(e) =>
                        change({ response: { ...attempt.response, [field.id]: e.target.value } })
                      }
                    >
                      <option value="">Choose an answer</option>
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <Textarea
                      required
                      aria-describedby={'hint-' + field.id}
                      rows={exercise.wordTarget[1] > 200 ? 10 : 5}
                      maxLength={16000}
                      value={attempt.response[field.id] ?? ''}
                      onChange={(e) =>
                        change({ response: { ...attempt.response, [field.id]: e.target.value } })
                      }
                    />
                  )}
                </label>
              ))}
              <p className="en-wordcount">
                {wordCount(responseText(attempt.response))} words · Suggested target{' '}
                {exercise.wordTarget[0]}–{exercise.wordTarget[1]}
              </p>
              <div className="en-actions">
                <Button
                  className="en-primary"
                  type="submit"
                  disabled={!complete || (!changedSinceSubmit && (!user || !!last?.feedback))}
                >
                  {last && !last.feedback && user && !changedSinceSubmit
                    ? 'Retry assessment'
                    : last
                      ? 'Submit revision'
                      : user
                        ? 'Submit for assessment'
                        : 'Save my response'}
                </Button>
                {user && (
                  <Button type="button" onClick={() => void help()}>
                    {attempt.mode === 'independent' && !attempt.assisted
                      ? 'Use coaching instead'
                      : 'Ask for a hint'}
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
          {attempt.mode === 'independent' && !attempt.assisted && (
            <p className="en-small">
              A hint changes this attempt to coached practice. Your independent record stays
              separate.
            </p>
          )}
          <p role="status" className="en-save-status">
            {busy ? 'Saving and reviewing your response…' : status}
          </p>

          {!user && (
            <div className="en-coach-note">
              <p>
                Your response is saved locally. AI feedback and practice points require an account.
              </p>
              <Button onClick={onSignIn}>Sign in for coaching</Button>
              <p className="en-small">
                After sign-in, use Writing history to copy this guest draft into your account.
              </p>
            </div>
          )}
          {hint && (
            <section className="en-coach-note" aria-live="polite">
              <h3>A small step to try</h3>
              <p>{hint}</p>
            </section>
          )}
        </section>
        <section className="en-review" aria-label="Assessment and revision history">
          <h2>Assessment</h2>
          {!last ? (
            <p className="en-empty">
              {user
                ? 'Submit your response to receive a score and feedback.'
                : 'Save your response here. Sign in to receive an assessment score and feedback.'}
            </p>
          ) : (
            <>
              <h3>Assessment and revision history</h3>
              <p>
                Each submission stays unchanged. Edit your response above to make a new version.
              </p>
              {attempt.revisions.map((revision, index) => (
                <details
                  className="en-revision"
                  key={revision.id}
                  open={index === attempt.revisions.length - 1}
                >
                  <summary>
                    Version {index + 1} · {new Date(revision.submittedAt).toLocaleString()} ·{' '}
                    {revision.assisted ? 'Coached' : 'Independent'}
                    {revision.overTime ? ' · Over time' : ''}
                    {assessmentScore(revision.feedback) &&
                      ` · ${assessmentScore(revision.feedback)!.percent}/100`}
                  </summary>
                  {revision.feedback ? (
                    <FeedbackView
                      feedback={revision.feedback}
                      previous={index ? attempt.revisions[index - 1].feedback : null}
                    />
                  ) : (
                    <p role="status">
                      {revision.error ??
                        (user
                          ? 'Feedback is pending. Use Retry assessment if this request was interrupted.'
                          : 'Saved without AI evaluation.')}
                    </p>
                  )}
                  <div className="en-submitted">
                    <h3>Your submitted response</h3>
                    {Object.entries(revision.response).map(([field, value]) => (
                      <div key={field}>
                        <strong>
                          {exercise.fields.find((f) => f.id === field)?.label ?? field}
                        </strong>
                        <p>{value}</p>
                      </div>
                    ))}
                    {revision.plan && (
                      <details>
                        <summary>Planning notes</summary>
                        <p>{revision.plan}</p>
                      </details>
                    )}
                  </div>
                </details>
              ))}
              <div className="en-followup">
                <h2>Try it in a new context</h2>
                <p>
                  After revising, check the skill on a different task without hints. Completion and
                  improvement are recorded separately.
                </p>
                <div className="en-actions">
                  {next && (
                    <Button
                      className="en-primary"
                      disabled={busy}
                      onClick={() => void onStart(next, 'independent', attempt.id)}
                    >
                      Try a fresh independent task
                    </Button>
                  )}
                  {user && (
                    <Button
                      disabled={busy}
                      onClick={() => void onGenerate(exercise.tool, exercise.criteria[0]?.skill)}
                    >
                      Generate another practice task
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </article>
  );
}
function FeedbackView({ feedback, previous }: { feedback: Feedback; previous: Feedback | null }) {
  const score = assessmentScore(feedback);
  const earlier = assessmentScore(previous);
  return (
    <div className="en-feedback">
      <section className="en-assessment-result" aria-label="Assessment score">
        <h3>Assessment score</h3>
        {score ? (
          <>
            <p className="en-assessment-total">
              <strong>{score.percent}</strong>
              <span>/100</span>
            </p>
            <p>
              {score.total} of {score.maximum} criterion marks earned.
            </p>
            {earlier && (
              <p>
                {score.percent - earlier.percent > 0 ? '+' : ''}
                {score.percent - earlier.percent} percentage points from the previous scored version
                ({earlier.percent}/100).
              </p>
            )}
          </>
        ) : (
          <p>This earlier assessment has feedback only. Submit a new version to receive a score.</p>
        )}
        <p className="en-small">
          AI-assessed using PseudoStar criteria, not official Cambridge marks or a predicted exam
          grade.
        </p>
      </section>
      <h3>What is working</h3>
      <ul>
        {feedback.strengths.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      {feedback.corrections.length > 0 && (
        <>
          <h3>What to improve</h3>
          {feedback.corrections.map((c, i) => (
            <div className="en-correction" key={i}>
              <blockquote>{c.quote}</blockquote>
              <p>{c.explanation}</p>
              <p>
                <strong>Try:</strong> {c.suggestion}
              </p>
            </div>
          ))}
        </>
      )}
      <h3>Your skill evidence</h3>
      <div className="en-ratings">
        {feedback.ratings.map((r) => (
          <div key={r.skill}>
            <strong>{skillNames[r.skill]}</strong>
            <span>
              {r.score === undefined ? r.rating : `${r.score}/4 · ${scoreDescriptors[r.score]}`}
            </span>
            <p>{r.explanation}</p>
            {r.evidence && <blockquote>{r.evidence}</blockquote>}
          </div>
        ))}
      </div>
      <div className="en-coach-note">
        <h3>One next step</h3>
        <p>{feedback.nextStep}</p>
        {feedback.improvement.explanation && (
          <p>
            <strong>Revision guidance:</strong> {feedback.improvement.explanation}
          </p>
        )}
      </div>
    </div>
  );
}
