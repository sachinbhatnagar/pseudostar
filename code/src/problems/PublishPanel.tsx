import { useEffect, useRef, useState } from 'react';
import { api, ApiError, type User } from '../programs/api';
import type { Problem } from './types';
import type { Validation } from './shared';
import './publish.css';

export function PublishPanel({
  user,
  solution,
  onPublished,
  editing,
  initialStatement = '',
  onDeleted,
}: {
  initialStatement?: string;
  editing?: { id: string; statement: string; solution: string; revision: number } | null;
  onDeleted?: () => Promise<void>;
  user: User;
  solution: string;
  onPublished: (problem: Problem) => Promise<void>;
}) {
  const [statement, setStatement] = useState(editing?.statement ?? initialStatement);
  const [code, setCode] = useState(editing?.solution ?? solution);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checks, setChecks] = useState<Validation['checks']>([]);
  const [published, setPublished] = useState<Problem | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setChecks([]);
    try {
      const result = await api<{ problem: Problem }>(
        editing ? `/problems/${editing.id}/author` : '/problems/publish',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'X-Pseudostar-User': user.id },
          signal: AbortSignal.timeout(145000),
          body: JSON.stringify({ statement, solution: code, revision: editing?.revision }),
        },
      );
      if (!alive.current) return;
      setPublished(result.problem);
      await onPublished(result.problem);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e.message : 'Publication failed. Try again.');
      if (e instanceof ApiError) {
        const detail = e.data.error as { checks?: Validation['checks'] } | undefined;
        setChecks(detail?.checks ?? []);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  async function remove() {
    if (!editing || busy) return;
    setBusy(true);
    setError('');
    try {
      await api(`/problems/${editing.id}/author`, {
        method: 'DELETE',
        headers: { 'X-Pseudostar-User': user.id },
        body: JSON.stringify({ revision: editing.revision }),
      });
      await onDeleted?.();
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : 'Delete failed. Try again.');
        setBusy(false);
      }
    }
  }
  if (published)
    return (
      <div className="publish-panel" role="status">
        <h3>{published.title}</h3>
        <p>Published. Everyone can now find this problem in the library.</p>
        <p>{published.statement}</p>
      </div>
    );
  return (
    <form className="publish-panel" onSubmit={submit}>
      <p>
        Describe the task your program solves. Include the input, expected output, and any limits.
      </p>
      <label>
        Problem statement
        <textarea
          aria-label="Problem statement"
          required
          rows={7}
          maxLength={12000}
          value={statement}
          disabled={busy}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="For example: Read a whole number from 0 to 10. Show twice its value."
        />
      </label>
      <details>
        <summary>Your pseudocode</summary>
        {editing ? (
          <label>
            Pseudocode
            <textarea
              rows={8}
              value={code}
              disabled={busy}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        ) : (
          <pre>{code}</pre>
        )}
      </details>
      <p className="publish-note">
        AI rewrites the statement in simple language for Grade 8 and above, creates a title, and
        checks your program before sharing it. Your code stays unchanged.
      </p>
      {busy && (
        <p role="status">
          Preparing the statement and checking your program. This can take about two minutes.
        </p>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {checks.length > 0 && (
            <ul>
              {checks.map((c, i) => (
                <li key={i}>
                  {c.name}
                  {c.detail ? ': ' + c.detail : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        className="learning-action"
        disabled={busy || !statement.trim() || !code.trim()}
        type="submit"
      >
        {busy ? 'Checking…' : editing ? 'Check and save changes' : 'Check and publish'}
      </button>
      {editing && !confirmDelete && (
        <button
          type="button"
          className="learning-action"
          disabled={busy}
          onClick={() => setConfirmDelete(true)}
        >
          Delete problem
        </button>
      )}
      {editing && confirmDelete && (
        <div role="alert">
          <p>Delete this problem from the shared library? Other learners will no longer see it.</p>
          <button
            type="button"
            className="learning-action"
            disabled={busy}
            onClick={() => void remove()}
          >
            Confirm delete
          </button>{' '}
          <button
            type="button"
            className="learning-action"
            disabled={busy}
            onClick={() => setConfirmDelete(false)}
          >
            Keep problem
          </button>
        </div>
      )}
    </form>
  );
}
