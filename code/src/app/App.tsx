import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { api, type SavedProgram, type User } from '../programs/api';
import { SignIn } from '../auth/SignIn';
import { useDocument } from '../programs/use-document';
import {
  listGuestPrograms,
  getGuestProgram,
  deleteGuestProgram,
  restoreGuestProgram,
} from '../programs/local-library';
import { parse } from '../language/parse';
import { format } from '../language/format';
import { useRunner } from '../runner/use-runner';
import { catalog } from '../problems/catalog';
import type { Problem } from '../problems/types';
import type { CaseResult } from '../problems/check';
import type { BlockHandle } from '../editor/BlockEditor';
const BlockEditor = lazy(() =>
  import('../editor/BlockEditor').then((m) => ({ default: m.BlockEditor })),
);
const TextEditor = lazy(() =>
  import('../editor/TextEditor').then((m) => ({ default: m.TextEditor })),
);
function Brand() {
  return (
    <a className="brand" href="/" aria-label="PseudoStar home">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path d="m16 2 3.6 9.5L30 16l-10.4 4.5L16 30l-3.6-9.5L2 16l10.4-4.5Z" fill="currentColor" />
        <path d="m12 16 3 3 6-7" fill="none" stroke="#f7f9f5" strokeWidth="2" />
      </svg>
      <span>PseudoStar</span>
    </a>
  );
}
function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <div className="modal-heading">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close aria-label="Close">Close</Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Choose an item or close this window to return to your program.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [guest, setGuest] = useState(() => {
      try {
        return sessionStorage.getItem('pseudostar:guest') === 'yes';
      } catch {
        return false;
      }
    });
  useEffect(() => {
    api<{ user: User | null }>('/session')
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  if (!ready)
    return (
      <div className="loading-app" role="status">
        Opening PseudoStar…
      </div>
    );
  if (!user && !guest)
    return (
      <>
        <header className="topbar">
          <Brand />
        </header>
        <SignIn
          onSuccess={setUser}
          onGuest={() => {
            try {
              sessionStorage.setItem('pseudostar:guest', 'yes');
            } catch {}
            setGuest(true);
          }}
        />
      </>
    );
  return (
    <Studio
      key={user?.id ?? 'guest'}
      user={user}
      onSignIn={() => {
        try {
          sessionStorage.removeItem('pseudostar:guest');
        } catch {}
        setGuest(false);
      }}
      onSignOut={() => {
        setUser(null);
        setGuest(false);
      }}
    />
  );
}
function Studio({
  user,
  onSignIn,
  onSignOut,
}: {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const document = useDocument(user, 'OUTPUT "What will you build today?"'),
    { doc, setDoc, status, error } = document;
  const [leaving, setLeaving] = useState(false);
  const scopedApi = <T,>(path: string, options: RequestInit = {}) =>
    api<T>(path, {
      ...options,
      headers: { ...options.headers, ...(user ? { 'X-Pseudostar-User': user.id } : {}) },
    });
  const [library, setLibrary] = useState(false),
    [savedOpen, setSavedOpen] = useState(false),
    [help, setHelp] = useState(false),
    [query, setQuery] = useState(''),
    [difficulty, setDifficulty] = useState('All'),
    [saved, setSaved] = useState<SavedProgram[]>([]),
    [trash, setTrash] = useState(false),
    [savedQuery, setSavedQuery] = useState(''),
    [message, setMessage] = useState(''),
    [conflictCloud, setConflictCloud] = useState<SavedProgram | null>(null),
    [mode, setMode] = useState<'blocks' | 'text' | 'split'>(() =>
      innerWidth < 1000 ? 'blocks' : 'split',
    ),
    [hints, setHints] = useState<Record<string, number>>({}),
    [completed, setCompleted] = useState<Set<string>>(() => new Set()),
    [results, setResults] = useState<CaseResult[] | null>(null),
    [checking, setChecking] = useState(false),
    [input, setInput] = useState(''),
    [helpOpen, setHelpOpen] = useState(false);
  const blocks = useRef<BlockHandle>(null),
    checkWorker = useRef<Worker | null>(null),
    checkTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const runner = useRunner();
  const parsed = useMemo(() => parse(doc.draft), [doc.draft]);
  const problem = catalog.find((p) => p.id === doc.problemId);
  const currentHints = problem ? (hints[problem.id] ?? 0) : 0;
  const lastValid = useRef({
    id: doc.localId,
    source: parsed.ok ? doc.draft : (doc.lastValidSource ?? ''),
  });
  if (lastValid.current.id !== doc.localId)
    lastValid.current = {
      id: doc.localId,
      source: parsed.ok ? doc.draft : (doc.lastValidSource ?? ''),
    };
  else if (parsed.ok) lastValid.current.source = doc.draft;
  useEffect(() => {
    checkWorker.current?.terminate();
    checkWorker.current = null;
    clearTimeout(checkTimer.current);
    setChecking(false);
    setResults(null);
    runner.reset();
  }, [doc.draft, doc.problemId, doc.localId]);
  useEffect(() => {
    if (user)
      scopedApi<{
        progress: Array<{
          problemId: string;
          highestHint?: number;
          highestHintViewed?: number;
          status?: string;
        }>;
      }>('/progress')
        .then((r) => {
          const values: Record<string, number> = {};
          for (const p of r.progress ?? [])
            values[p.problemId] = p.highestHint ?? p.highestHintViewed ?? 0;
          setHints((current) => {
            const merged = { ...values };
            for (const [id, count] of Object.entries(current))
              merged[id] = Math.max(merged[id] ?? 0, count);
            return merged;
          });
          setCompleted(
            (current) =>
              new Set([
                ...current,
                ...r.progress.filter((p) => p.status === 'passed').map((p) => p.problemId),
              ]),
          );
        })
        .catch(() => {});
    return () => {
      checkWorker.current?.terminate();
      clearTimeout(checkTimer.current);
    };
  }, []);
  const update = (source: string) => {
    if (leaving) return;
    setDoc((value) => ({
      ...value,
      draft: source,
      lastValidSource: parse(source).ok ? source : value.lastValidSource,
    }));
  };
  const perform = async (action: () => Promise<void>) => {
    setMessage('');
    try {
      await action();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  const choose = async (p: Problem) => {
    await document.fresh(p.title, p.starter, p.id);
    runner.reset();
    setResults(null);
    setLibrary(false);
  };
  const listSaved = async (showTrash = trash) => {
    await document.save();
    const programs = user
      ? (
          await scopedApi<{ programs: SavedProgram[] }>(
            `/programs${showTrash ? '?deleted=true' : ''}`,
          )
        ).programs
      : listGuestPrograms(showTrash);
    setSaved(programs);
    setSavedOpen(true);
  };
  const check = () => {
    if (!problem || !parsed.ok) return;
    setChecking(true);
    setResults(null);
    checkWorker.current?.terminate();
    const w = new Worker(new URL('../problems/check.worker.ts', import.meta.url), {
      type: 'module',
    });
    checkWorker.current = w;
    const draft = doc.draft;
    const timer = (checkTimer.current = setTimeout(() => {
      if (checkWorker.current !== w) return;
      w.terminate();
      checkWorker.current = null;
      setChecking(false);
      setMessage('The checks took too long. Check your loop bounds.');
    }, 10000));
    w.onmessage = ({ data }: { data: CaseResult[] }) => {
      if (checkWorker.current !== w) return;
      clearTimeout(timer);
      setChecking(false);
      setResults(data);
      w.terminate();
      checkWorker.current = null;
      if (data.every((r) => r.passed)) setCompleted((current) => new Set([...current, problem.id]));
      if (user)
        void scopedApi('/progress/' + problem.id, {
          method: 'PUT',
          body: JSON.stringify({
            problemId: problem.id,
            contentVersion: problem.version,
            status: data.every((r) => r.passed) ? 'passed' : 'started',
            highestHintViewed: currentHints,
          }),
        }).catch(() => {});
    };
    w.onerror = () => {
      if (checkWorker.current !== w) return;
      w.terminate();
      checkWorker.current = null;
      clearTimeout(timer);
      setChecking(false);
      setMessage('The checks could not run. Try again.');
    };
    w.postMessage({ problem, source: draft });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([doc.draft], { type: 'text/plain' }));
    const a = documentGlobal.createElement('a');
    a.href = url;
    a.download = doc.title.replace(/[^\w -]/g, '').slice(0, 80) + '.pseudo.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  const active = ['running', 'paused', 'input'].includes(runner.status);
  const diagnosticLine = parsed.ok
    ? runner.diagnostic?.range?.line
    : parsed.diagnostics[0].range?.line;
  return (
    <>
      <header className="topbar">
        <Brand />
        <nav aria-label="Main" inert={leaving || undefined}>
          <button onClick={() => setLibrary(true)}>
            Problems <span>{catalog.length}</span>
          </button>
          <button onClick={() => void perform(() => listSaved())}>My programs</button>
          <button onClick={() => setHelp(true)}>Help</button>
        </nav>
        <div className="account-area">
          {user ? (
            <>
              <span>{user.email}</span>
              <button
                disabled={leaving}
                onClick={() =>
                  void perform(async () => {
                    setLeaving(true);
                    try {
                      await document.save();
                      await scopedApi('/auth/logout', { method: 'POST' });
                      try {
                        localStorage.removeItem('pseudostar:draft:' + user.id);
                      } catch {}
                      onSignOut();
                    } catch (e) {
                      setLeaving(false);
                      throw e;
                    }
                  })
                }
              >
                Sign out
              </button>
            </>
          ) : (
            <button onClick={onSignIn}>Sign in to save</button>
          )}
        </div>
      </header>
      {leaving && (
        <p className="session-notice" role="status">
          Saving your work and signing out…
        </p>
      )}
      <main className="production-studio" inert={leaving || undefined}>
        <aside className={`lesson ${helpOpen ? 'lesson-open' : ''}`}>
          <button
            className="mobile-challenge"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(!helpOpen)}
          >
            {helpOpen ? 'Hide challenge' : 'Show challenge & hints'}
          </button>
          <div className="lesson-content">
            {problem ? (
              <>
                <div className="lesson-top">
                  <span className="difficulty">{problem.difficulty}</span>
                  <span>{problem.concepts[0]}</span>
                </div>
                <h1>{problem.title}</h1>
                <p className="problem-statement">{problem.statement}</p>
                <section className="examples">
                  <h2>Try these inputs</h2>
                  {problem.samples.map((s, i) => (
                    <div className="sample" key={i}>
                      <span>
                        Input: <code>{s.inputs.join(', ') || 'None'}</code>
                      </span>
                      <span>Output: {s.outputs.join(' · ')}</span>
                    </div>
                  ))}
                </section>
                <section className="hint-area">
                  <h2>A nudge, not the answer.</h2>
                  {currentHints === 0 ? (
                    <p>Try an idea first. A small test can tell you a lot.</p>
                  ) : (
                    problem.hints.slice(0, currentHints).map((hint, i) => (
                      <p key={i} className="hint-text">
                        {hint}
                      </p>
                    ))
                  )}
                  <button
                    className="hint-button"
                    disabled={currentHints >= 3}
                    onClick={() => {
                      const next = Math.min(3, currentHints + 1);
                      setHints((v) => ({ ...v, [problem.id]: next }));
                      if (user)
                        void scopedApi('/progress/' + problem.id, {
                          method: 'PUT',
                          body: JSON.stringify({
                            problemId: problem.id,
                            contentVersion: problem.version,
                            status: 'started',
                            highestHintViewed: next,
                          }),
                        }).catch(() => {});
                    }}
                  >
                    {currentHints >= 3
                      ? 'All hints explored'
                      : currentHints
                        ? 'Explore the next hint'
                        : 'Give me a hint'}
                  </button>
                  <span className="hint-count">{currentHints} of 3 hints explored</span>
                </section>
              </>
            ) : (
              <>
                <h1>
                  A blank page.
                  <br />A new idea.
                </h1>
                <p className="intro">
                  Build something of your own, or choose a challenge to get started.
                </p>
                <button className="primary" onClick={() => setLibrary(true)}>
                  Choose a problem
                </button>
                <section className="hint-area">
                  <h2>Start small</h2>
                  <p>
                    Ask for a value with INPUT. Use it in a calculation. Show the result with
                    OUTPUT.
                  </p>
                </section>
              </>
            )}
            <button className="change-problem" onClick={() => setLibrary(true)}>
              Browse all problems
            </button>
          </div>
        </aside>
        <section className="editor-workbench">
          <div className="document-heading">
            <input
              aria-label="Program name"
              maxLength={120}
              value={doc.title}
              onChange={(e) => setDoc((v) => ({ ...v, title: e.target.value }))}
            />
            <div className="document-actions">
              <button
                onClick={() =>
                  void perform(() => document.fresh('Untitled program', 'OUTPUT "Hello"', null))
                }
              >
                New
              </button>
              <button onClick={document.copy}>Save copy</button>
              <button onClick={download}>Download</button>
            </div>
          </div>
          <div className="editor-toolbar">
            <div className="mode-switch" role="group" aria-label="Editor mode">
              {(['blocks', 'text', 'split'] as const).map((value) => (
                <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
            <div className="edit-actions">
              <button
                onClick={() => blocks.current?.undo()}
                disabled={mode === 'text' || !parsed.ok}
              >
                Undo
              </button>
              <button
                onClick={() => blocks.current?.redo()}
                disabled={mode === 'text' || !parsed.ok}
              >
                Redo
              </button>
              <button onClick={() => blocks.current?.fit()} disabled={mode === 'text'}>
                Fit
              </button>
              <button
                disabled={!parsed.ok}
                onClick={() => {
                  if (parsed.ok) update(format(parsed.program).source);
                }}
              >
                Format
              </button>
            </div>
          </div>
          <div className={`editor-surfaces mode-${mode}`}>
            <Suspense
              fallback={
                <div className="panel-loading" role="status">
                  Opening editor…
                </div>
              }
            >
              <div className="block-surface" hidden={mode === 'text'}>
                <BlockEditor
                  key={doc.localId}
                  ref={blocks}
                  source={doc.draft}
                  onChange={update}
                  invalid={!parsed.ok}
                  lastValidSource={doc.lastValidSource}
                  activeLine={active ? runner.line : undefined}
                  diagnosticLine={diagnosticLine}
                />
              </div>
              <div className="text-surface" hidden={mode === 'blocks'}>
                <TextEditor
                  key={doc.localId}
                  source={doc.draft}
                  onChange={update}
                  activeLine={active ? runner.line : undefined}
                  diagnosticLine={diagnosticLine}
                />
              </div>
            </Suspense>
          </div>
          {!parsed.ok && (
            <div className="diagnostic" role="alert">
              <strong>
                Line {parsed.diagnostics[0].range?.line ?? 1}: {parsed.diagnostics[0].message}
              </strong>
              <span>{parsed.diagnostics[0].nextAction}</span>
              {lastValid.current.source && (
                <button onClick={() => update(lastValid.current.source)}>
                  Restore last valid program
                </button>
              )}
            </div>
          )}
          <div className="run-toolbar">
            <button
              className="primary"
              disabled={!parsed.ok || active}
              onClick={() => runner.start(doc.draft)}
            >
              Run program
            </button>
            {runner.status === 'running' ? (
              <button onClick={() => runner.command('pause')}>Pause</button>
            ) : (
              <button
                disabled={runner.status !== 'paused'}
                onClick={() => runner.command('resume')}
              >
                Resume
              </button>
            )}
            <button
              disabled={!parsed.ok || runner.status === 'running' || runner.status === 'input'}
              onClick={() =>
                runner.status === 'paused' ? runner.command('step') : runner.start(doc.draft, true)
              }
            >
              Step
            </button>
            <button disabled={!active} onClick={() => runner.command('stop')}>
              Stop
            </button>
            <button disabled={active} onClick={runner.reset}>
              Reset
            </button>
            <button
              className="check-button"
              disabled={!problem || !parsed.ok || checking || active}
              onClick={check}
            >
              {checking ? 'Checking…' : 'Check my logic'}
            </button>
          </div>
          <div className="execution-panels">
            <section className="output-panel">
              <div className="panel-heading">
                <h2>Output</h2>
                <span role="status">
                  {runner.status === 'idle'
                    ? 'Ready to try'
                    : runner.status[0].toUpperCase() + runner.status.slice(1)}
                </span>
              </div>
              <div className="output-lines" aria-label="Program output" role="log">
                {runner.output.length ? (
                  runner.output.map((line, i) => <pre key={i}>{line}</pre>)
                ) : (
                  <p>Run your program to see what happens.</p>
                )}
              </div>
              {runner.status === 'input' && (
                <form
                  className="runner-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    runner.command('input', input);
                    setInput('');
                  }}
                >
                  <label>
                    Input for {runner.inputName}
                    <input
                      aria-label={`Input for ${runner.inputName}`}
                      value={input}
                      maxLength={10000}
                      onChange={(e) => setInput(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <button type="submit">Submit input</button>
                </form>
              )}
              {runner.diagnostic && (
                <div className="diagnostic" role="alert">
                  <strong>
                    {runner.diagnostic.range?.line ? `Line ${runner.diagnostic.range.line}: ` : ''}
                    {runner.diagnostic.message}
                  </strong>
                  <span>{runner.diagnostic.nextAction}</span>
                </div>
              )}
            </section>
            <section className="variables-panel">
              <h2>Variables</h2>
              {Object.keys(runner.variables).length ? (
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(runner.variables).map(([name, value]) => (
                      <tr key={name}>
                        <td>
                          <code>{name}</code>
                        </td>
                        <td>{JSON.stringify(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>Values appear here as your program runs.</p>
              )}
            </section>
          </div>
          {results && (
            <section className="check-results" aria-label="Challenge results">
              <h2>
                {results.every((r) => r.passed)
                  ? 'Your program passed these checks.'
                  : 'A useful clue for your next try.'}
              </h2>
              <p>
                {results.filter((r) => r.passed).length} of {results.length} checks passed
              </p>
              {results.map((r, i) => (
                <details key={i} open={!r.passed}>
                  <summary>
                    Check {i + 1}: {r.passed ? 'Passed' : 'Try again'} · Input{' '}
                    {r.inputs.join(', ') || 'none'}
                  </summary>
                  {r.error && <p>{r.error}</p>}
                  <div>
                    <p>
                      <strong>Expected</strong>
                      <br />
                      {r.expected.join(' · ')}
                    </p>
                    <p>
                      <strong>Your result</strong>
                      <br />
                      {r.actual.join(' · ') || 'No output'}
                    </p>
                  </div>
                </details>
              ))}
            </section>
          )}
          <footer className="workspace-status">
            <span role="status">{status}</span>
            <button onClick={() => void perform(document.save)}>Save now</button>
            <span>{user ? 'Private to your account' : 'Guest session · this device only'}</span>
          </footer>
          {(error || message) && (
            <div className="diagnostic" role="alert">
              {message || error}
              {status === 'Conflict' && (
                <>
                  <button onClick={document.copy}>Keep my changes as a copy</button>
                  <button
                    onClick={() =>
                      void perform(async () => {
                        if (doc.id) {
                          const result = await scopedApi<{ program: SavedProgram }>(
                            `/programs/${doc.id}`,
                          );
                          setConflictCloud(result.program);
                        }
                      })
                    }
                  >
                    Compare cloud version
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      </main>
      <Modal open={library} onOpenChange={setLibrary} title="Choose your next challenge">
        <div className="library-filters">
          <input
            aria-label="Search problems"
            placeholder="Search a topic or problem"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="Difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {['All', 'Easy', 'Medium', 'Hard'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {message && <p role="alert">{message}</p>}
        <div className="problem-list">
          {!catalog.some(
            (p) =>
              (difficulty === 'All' || p.difficulty === difficulty) &&
              `${p.title} ${p.concepts.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
          ) && <p className="empty-state">No problems match. Try another topic or difficulty.</p>}
          {catalog
            .filter(
              (p) =>
                (difficulty === 'All' || p.difficulty === difficulty) &&
                `${p.title} ${p.concepts.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
            )
            .map((p) => (
              <button
                className="problem-row"
                key={p.id}
                onClick={() => void perform(() => choose(p))}
              >
                <span className={'level level-' + p.difficulty.toLowerCase()}>{p.difficulty}</span>
                <span>
                  <strong>{p.title}</strong>
                  <small>{p.concepts.join(' · ')}</small>
                </span>
                <span className="row-action">
                  {completed.has(p.id) ? 'Passed · practise again' : 'Start'}
                </span>
              </button>
            ))}
        </div>
      </Modal>
      <Modal open={savedOpen} onOpenChange={setSavedOpen} title="My programs">
        {!user && (
          <p className="local-library-note">
            Saved in this browser. Sign in to keep programs online across devices.
          </p>
        )}
        {message && <p role="alert">{message}</p>}
        <input
          className="saved-search"
          aria-label="Search saved programs"
          placeholder="Search your programs"
          value={savedQuery}
          onChange={(e) => setSavedQuery(e.target.value)}
        />
        <div className="saved-heading">
          <button
            onClick={() =>
              void perform(async () => {
                setTrash(!trash);
                await listSaved(!trash);
              })
            }
          >
            {trash ? 'Show active programs' : 'Recently deleted'}
          </button>
          <span>Deleted programs can be restored for 30 days.</span>
        </div>
        {!saved.filter((p) => p.title.toLowerCase().includes(savedQuery.toLowerCase())).length ? (
          <p className="empty-state">
            {savedQuery
              ? 'No saved programs match.'
              : trash
                ? 'No deleted programs.'
                : 'Your saved programs will appear here.'}
          </p>
        ) : (
          saved
            .filter((p) => p.title.toLowerCase().includes(savedQuery.toLowerCase()))
            .map((p) => (
              <div className="saved-row" key={p.id}>
                <button
                  className="saved-title"
                  disabled={trash}
                  onClick={() =>
                    void perform(async () => {
                      await document.save();
                      const program = user
                        ? (await scopedApi<{ program: SavedProgram }>(`/programs/${p.id}`)).program
                        : getGuestProgram(p.id);
                      await document.load(program);
                      setSavedOpen(false);
                      runner.reset();
                    })
                  }
                >
                  {p.title}
                </button>
                <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                <button
                  onClick={() =>
                    void perform(async () => {
                      if (user)
                        await scopedApi(`/programs/${p.id}${trash ? '/restore' : ''}`, {
                          method: trash ? 'POST' : 'DELETE',
                          body: JSON.stringify({ expectedRevision: p.revision }),
                        });
                      else if (trash) restoreGuestProgram(p.id);
                      else deleteGuestProgram(p.id);
                      if (!trash && (user ? doc.id : doc.localId) === p.id) document.copy();
                      await listSaved();
                    })
                  }
                >
                  {trash ? 'Restore' : 'Delete'}
                </button>
              </div>
            ))
        )}
      </Modal>
      <Modal
        open={!!conflictCloud}
        onOpenChange={(open) => {
          if (!open) setConflictCloud(null);
        }}
        title="Compare saved versions"
      >
        <p>Your current draft stays safe. Save it as a copy before opening the cloud version.</p>
        <div className="version-comparison">
          <section>
            <h3>Your draft</h3>
            <pre>{doc.draft}</pre>
          </section>
          <section>
            <h3>Cloud revision {conflictCloud?.revision}</h3>
            <pre>{conflictCloud?.draft}</pre>
          </section>
        </div>
        <button
          className="primary"
          onClick={() => {
            document.copy();
            setConflictCloud(null);
          }}
        >
          Keep my changes as a copy
        </button>
      </Modal>
      <Modal open={help} onOpenChange={setHelp} title="A little help with your logic">
        <div className="help-copy">
          <h3>Build in blocks or write in text</h3>
          <p>
            Drag blocks from the tray, or click to add. Select a block to move, nest, or delete it
            with the labelled controls. Right-click an IF block to add an ELSEIF branch, or a FOR
            block to change its loop form. Text edits update the blocks when the program is valid.
            Invalid text stays safe until you correct it.
          </p>
          <h3>Run a small experiment</h3>
          <p>
            Run starts from a clean set of variables. Pause and Step help you follow one instruction
            at a time. Stop ends a run immediately. INPUT asks you for a value: numeric entries
            become numbers; other entries stay as text.
          </p>
          <h3>Keep the textbook conventions</h3>
          <p>
            OUTPUT and PRINT both display results. Use = for assignment, and = or == for equality in
            conditions. TO includes its end value; RANGE stops before it. Indent nested instructions
            with four spaces. Sub-routines share variables with the main program.
          </p>
          <h3>Learn from a failed check</h3>
          <p>
            Read the input, compare expected and actual results, and try tracing your conditions.
            Hints give you a direction, not the complete answer. Passing the listed checks does not
            prove every possible input works.
          </p>
        </div>
      </Modal>
    </>
  );
}
const documentGlobal = window.document;
