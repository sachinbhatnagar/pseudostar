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
import { catalog as bundledCatalog } from '../problems/catalog';
import { display } from '../language/collections';
const PublishPanel = lazy(() =>
  import('../problems/PublishPanel').then((m) => ({ default: m.PublishPanel })),
);
import { progressKey } from '../problems/shared';
import { advancedReference } from '../learning/advanced-reference';
import type { Problem } from '../problems/types';
import type { CaseResult } from '../problems/check';
import { SolutionComparison } from '../learning/SolutionComparison';
import type { BlockHandle } from '../editor/BlockEditor';
const BlockEditor = lazy(() =>
  import('../editor/BlockEditor').then((m) => ({ default: m.BlockEditor })),
);
const TextEditor = lazy(() =>
  import('../editor/TextEditor').then((m) => ({ default: m.TextEditor })),
);
function ActionIcon({
  kind,
}: {
  kind: 'new' | 'save' | 'copy' | 'download' | 'expand' | 'publish';
}) {
  const paths = {
    new: 'M12 4v16M4 12h16',
    save: 'M5 3h12l3 3v15H4V3h1m3 0v6h8V3M8 21v-8h8v8',
    copy: 'M8 8h12v13H8V8M16 5V2H3v15h2',
    download: 'M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4',
    publish: 'M12 15V3m-5 5 5-5 5 5M4 17v4h16v-4',
    expand: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  };
  return (
    <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={paths[kind]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function AccountName({ user, onChange }: { user: User; onChange: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!editing)
    return (
      <button
        className="account-name"
        title="Edit your name"
        onClick={() => {
          setName(user.name ?? user.email);
          setError('');
          setEditing(true);
        }}
      >
        {user.name ?? user.email}
      </button>
    );
  return (
    <form
      className="account-name-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        if (!name.trim()) {
          setError('Enter a name.');
          return;
        }
        setBusy(true);
        setError('');
        try {
          const result = await api<{ user: User }>('/profile', {
            method: 'PATCH',
            headers: { 'X-Pseudostar-User': user.id },
            body: JSON.stringify({ name: name.trim() }),
          });
          onChange(result.user);
          setEditing(false);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Name could not be saved.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        autoFocus
        aria-label="Your name"
        aria-describedby={error ? 'account-name-error' : undefined}
        aria-invalid={!!error}
        maxLength={100}
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) setEditing(false);
        }}
      />
      <button disabled={busy || !name.trim()} type="submit">
        {busy ? 'Saving…' : 'Save name'}
      </button>
      <button disabled={busy} type="button" onClick={() => setEditing(false)}>
        Cancel
      </button>
      {error && (
        <p id="account-name-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
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
  className = '',
}: {
  className?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={globalThis.document.fullscreenElement as HTMLElement | null}>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className={`modal ${className}`}>
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
function Credits() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="credits-link" onClick={() => setOpen(true)}>
        © 2026 Studio 8 Collective
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Studio 8 Collective"
        className="learning-modal credits-modal"
      >
        <p>PseudoStar 0.3</p>
        <p>Built by Sachin Bhatnagar for Studio 8 Collective</p>
      </Modal>
    </>
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
        <footer className="signin-credits">
          <Credits />
        </footer>
      </>
    );
  return (
    <Studio
      key={user?.id ?? 'guest'}
      user={user}
      onUserChange={(updated) =>
        setUser((current) => (current?.id === updated.id ? updated : current))
      }
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
  onUserChange,
  onSignIn,
  onSignOut,
}: {
  user: User | null;
  onUserChange: (user: User) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const document = useDocument(user, 'OUTPUT "What will you build today?"'),
    { doc, setDoc, status, error } = document;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [sharedError, setSharedError] = useState('');
  const [algorithmExplanation, setAlgorithmExplanation] = useState('');
  const [editingPublication, setEditingPublication] = useState<{
    id: string;
    statement: string;
    solution: string;
    revision: number;
  } | null>(null);
  const [community, setCommunity] = useState(false),
    [shared, setShared] = useState<Problem[]>([]);
  const catalog = [...bundledCatalog, ...shared];
  const refreshShared = async (signal?: AbortSignal) => {
    const problems: Problem[] = [];
    let cursor: string | null = null;
    do {
      const r: { problems: Problem[]; nextCursor?: string | null } = await api(
        '/problems' + (cursor ? '?after=' + encodeURIComponent(cursor) : ''),
        { signal, headers: user ? { 'X-Pseudostar-User': user.id } : {} },
      );
      problems.push(...r.problems);
      cursor = r.nextCursor ?? null;
    } while (cursor);
    if (!signal?.aborted) {
      setShared(problems);
      setSharedError('');
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    void refreshShared(controller.signal).catch(() => {
      if (!controller.signal.aborted)
        setSharedError('Shared problems could not load. Existing lessons are still available.');
    });
    return () => controller.abort();
  }, [user?.id]);
  const [naming, setNaming] = useState<'copy' | 'save' | null>(null);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const namingApplied = useRef(false);
  const namingOriginal = useRef('');
  const beginCopy = () => {
    namingApplied.current = false;
    namingOriginal.current = doc.title;
    setNewName('');
    setNameError('');
    setNaming('copy');
  };
  const saveNamed = async () => {
    const title = newName.trim();
    if (!title || Array.from(title).length > 120) {
      setNameError('Use a name with 1 to 120 characters.');
      return;
    }
    if (title.toLowerCase() === namingOriginal.current.trim().toLowerCase()) {
      setNameError('Choose a different name.');
      return;
    }
    setNameBusy(true);
    setNameError('');
    try {
      const programs = user
        ? (await scopedApi<{ programs: SavedProgram[] }>('/programs')).programs
        : listGuestPrograms();
      const excludeId = namingApplied.current ? (user ? doc.id : doc.localId) : undefined;
      if (
        programs.some(
          (p) => p.id !== excludeId && p.title.trim().toLowerCase() === title.toLowerCase(),
        )
      ) {
        setNameError('A program already uses this name. Choose another name.');
        return;
      }
      if (!namingApplied.current) {
        if (naming === 'save') setDoc((value) => ({ ...value, title, named: true }));
        else document.copy(title);
        namingApplied.current = true;
      } else setDoc((value) => ({ ...value, title }));
      await document.save();
      setNaming(null);
    } catch (e) {
      setNameError((e as Error).message);
    } finally {
      setNameBusy(false);
    }
  };

  const workbench = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [solutionOpen, setSolutionOpen] = useState(false);
  const [replaceSolution, setReplaceSolution] = useState(false);
  const [solution, setSolution] = useState('');
  const [solutionError, setSolutionError] = useState('');
  const [solutionBusy, setSolutionBusy] = useState(false);
  const [comparisonSource, setComparisonSource] = useState('');
  const [explanation, setExplanation] = useState<{
    kind: 'block' | 'program';
    source: string;
    block?: string;
    problemId: string | null;
    paragraph?: string;
    steps?: string[];
    nextSteps?: string[];
    remaining?: number;
    error?: string;
    busy: boolean;
  } | null>(null);
  const explanationRequest = useRef<AbortController | null>(null);
  const explainCode = async (
    kind: 'block' | 'program',
    source: string,
    block?: string,
    problemId = doc.problemId,
  ) => {
    if (!user) return;
    explanationRequest.current?.abort();
    const request = new AbortController();
    explanationRequest.current = request;
    setExplanation({ kind, source, block, problemId, busy: true });
    try {
      const result = await scopedApi<{
        paragraph: string;
        steps: string[];
        nextSteps: string[];
        remaining: number;
      }>('/explanations', {
        method: 'POST',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(35000)]),
        body: JSON.stringify({ kind, source, block, problemId }),
      });
      if (explanationRequest.current === request)
        setExplanation({ kind, source, block, problemId, ...result, busy: false });
    } catch (error) {
      if (explanationRequest.current === request)
        setExplanation({
          kind,
          source,
          block,
          problemId,
          busy: false,
          error: (error as Error).message,
        });
    }
  };
  useEffect(
    () => () => {
      explanationRequest.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const changed = () => setExpanded(globalThis.document.fullscreenElement === workbench.current);
    globalThis.document.addEventListener('fullscreenchange', changed);
    return () => globalThis.document.removeEventListener('fullscreenchange', changed);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (globalThis.document.fullscreenElement) await globalThis.document.exitFullscreen();
      else await workbench.current?.requestFullscreen();
    } catch {
      setMessage('Full screen is unavailable in this browser.');
    }
  };
  const scopedApi = <T,>(path: string, options: RequestInit = {}) =>
    api<T>(path, {
      ...options,
      headers: { ...options.headers, ...(user ? { 'X-Pseudostar-User': user.id } : {}) },
    });
  const [library, setLibrary] = useState(false),
    [savedOpen, setSavedOpen] = useState(false),
    [help, setHelp] = useState(false),
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
  const blockDraft = useRef<{ id: string; source: string } | null>(null);
  const invalidText =
    !parsed.ok &&
    !(blockDraft.current?.id === doc.localId && blockDraft.current.source === doc.draft);
  const problem = catalog.find((p) => p.id === doc.problemId);
  const currentHints = problem ? (hints[progressKey(problem.id, problem.version)] ?? 0) : 0;
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
          contentVersion?: number;
        }>;
      }>('/progress')
        .then((r) => {
          const values: Record<string, number> = {};
          for (const p of r.progress ?? [])
            values[progressKey(p.problemId, p.contentVersion)] =
              p.highestHint ?? p.highestHintViewed ?? 0;
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
                ...r.progress
                  .filter((p) => p.status === 'passed')
                  .map((p) => progressKey(p.problemId, p.contentVersion)),
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
    blockDraft.current = null;
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
  const freshProgram = async (title: string, source: string, problemId: string | null) => {
    const programs = user
      ? (await scopedApi<{ programs: SavedProgram[] }>('/programs')).programs
      : listGuestPrograms();
    const names = new Set(programs.map((p) => p.title.trim().toLowerCase()));
    let candidate = title,
      number = 2;
    while (names.has(candidate.toLowerCase())) candidate = `${title.slice(0, 110)} (${number++})`;
    await document.fresh(candidate, source, problemId);
  };
  const choose = async (p: Problem) => {
    await freshProgram(p.title, p.starter, p.id);
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
      if (data.every((r) => r.passed))
        setCompleted((current) => new Set([...current, progressKey(problem.id, problem.version)]));
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
              <AccountName user={user} onChange={onUserChange} />
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
      <main
        className={`production-studio ${!problem ? 'own-problem' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        inert={leaving || undefined}
      >
        <aside id="problem-panel" className={`lesson ${helpOpen ? 'lesson-open' : ''}`}>
          <button
            className="mobile-challenge"
            aria-expanded={helpOpen}
            onClick={() => setHelpOpen(!helpOpen)}
          >
            {problem
              ? helpOpen
                ? 'Hide challenge'
                : 'Show challenge & hints'
              : helpOpen
                ? 'Hide problem details'
                : 'Add or edit problem details'}
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
                {problem.reviewLabel && <p>{problem.reviewLabel}</p>}
                {problem.attribution && <p>{problem.attribution}</p>}
                {!!problem.prerequisites?.length && (
                  <p>Before you start: {problem.prerequisites.join('; ')}</p>
                )}
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
                      setHints((v) => ({ ...v, [progressKey(problem.id, problem.version)]: next }));
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
                <section className="problem-brief" aria-label="Your problem">
                  <h1>Your problem</h1>
                  <label>
                    <input
                      aria-label="Program name"
                      maxLength={120}
                      value={doc.title}
                      placeholder="Give your problem a name"
                      onChange={(e) =>
                        setDoc((v) => ({
                          ...v,
                          title: e.target.value,
                          named: Boolean(e.target.value.trim()),
                        }))
                      }
                    />
                  </label>
                  <label>
                    <textarea
                      aria-label="Detailed problem statement"
                      rows={3}
                      maxLength={12000}
                      value={doc.description ?? ''}
                      placeholder="What should the program do? Include the values or inputs, the expected result, and any limits."
                      onChange={(e) => setDoc((v) => ({ ...v, description: e.target.value }))}
                    />
                  </label>
                  <p>Describe the task, not the code. You can change this as you work.</p>
                </section>
              </>
            )}
          </div>
        </aside>
        <section className="editor-workbench" ref={workbench}>
          <button
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? 'Show problem panel' : 'Hide problem panel'}
            title={sidebarCollapsed ? 'Show problem panel' : 'Hide problem panel'}
            aria-controls="problem-panel"
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path
                d={sidebarCollapsed ? 'm7 5 5 5-5 5' : 'm12 5-5 5 5 5'}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="document-heading">
            {problem && (
              <input
                aria-label="Program name"
                maxLength={120}
                value={doc.title}
                placeholder="Name your program"
                onChange={(e) =>
                  setDoc((v) => ({
                    ...v,
                    title: e.target.value,
                    named: Boolean(e.target.value.trim()),
                  }))
                }
              />
            )}
            <div className="document-actions">
              <button
                onClick={() =>
                  void perform(async () => {
                    await document.fresh('', 'OUTPUT "Hello"', null);
                    setHelpOpen(true);
                  })
                }
              >
                <ActionIcon kind="new" />
                New
              </button>
              <button
                onClick={() => {
                  if (doc.named === false || !doc.title.trim()) {
                    beginCopy();
                    setNaming('save');
                  } else void perform(document.save);
                }}
              >
                <ActionIcon kind="save" />
                Save now
              </button>
              {user && (
                <button
                  onClick={() => {
                    setEditingPublication(null);
                    setCommunity(true);
                  }}
                >
                  <ActionIcon kind="publish" />
                  Publish
                </button>
              )}
              <button onClick={beginCopy}>
                <ActionIcon kind="copy" />
                Save copy
              </button>
              <button onClick={download}>
                <ActionIcon kind="download" />
                Download
              </button>
              <button onClick={() => void toggleFullscreen()} aria-pressed={expanded}>
                <ActionIcon kind="expand" />
                {expanded ? 'Exit full screen' : 'Full screen'}
              </button>
            </div>
          </div>
          <div className="editor-toolbar">
            <div className="mode-switch" role="group" aria-label="Editor mode">
              {(['blocks', 'text', 'split'] as const).map((value) => (
                <button key={value} aria-pressed={mode === value} onClick={() => setMode(value)}>
                  {{ blocks: 'Blocks', text: 'Pseudocode', split: 'Split Screen' }[value]}
                </button>
              ))}
            </div>
            <div className="edit-actions">
              <div className="learning-toolbar">
                <button
                  className="learning-action"
                  disabled={!user || !doc.draft.trim()}
                  title={!user ? 'Sign in to use AI explanations' : undefined}
                  onClick={() => void explainCode('program', doc.draft)}
                >
                  Explain Pseudocode
                </button>
                {problem && (
                  <button
                    className="learning-action solution-button"
                    onClick={() => {
                      setComparisonSource(doc.draft);
                      setSolution('');
                      setReplaceSolution(false);
                      setSolutionError('');
                      setSolutionOpen(true);
                    }}
                  >
                    Show Solution
                  </button>
                )}
              </div>
              <button
                onClick={() => blocks.current?.undo()}
                disabled={mode === 'text' || invalidText}
              >
                Undo
              </button>
              <button
                onClick={() => blocks.current?.redo()}
                disabled={mode === 'text' || invalidText}
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
                  onChange={(source) => {
                    update(source);
                    blockDraft.current = { id: doc.localId, source };
                  }}
                  invalid={invalidText}
                  onExplain={
                    user
                      ? (block, source) => {
                          void explainCode('block', source, block);
                        }
                      : undefined
                  }
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
                        <td>
                          {typeof value === 'object' ? display(value) : JSON.stringify(value)}
                        </td>
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
            <Credits />
            <span role="status">{status}</span>
            {!user && <span>Guest session · this device only</span>}
          </footer>
          {(error || message) && (
            <div className="diagnostic" role="alert">
              {message || error}
              {status === 'Conflict' && (
                <>
                  <button onClick={beginCopy}>Keep my changes as a copy</button>
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
        {sharedError && (
          <p role="alert">
            {sharedError}{' '}
            <button
              className="learning-action"
              onClick={() =>
                void refreshShared().catch(() =>
                  setSharedError('Shared problems are still unavailable. Try again shortly.'),
                )
              }
            >
              Retry shared problems
            </button>
          </p>
        )}
        <div className="library-filters">
          <label>
            Difficulty
            <select
              aria-label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {['All', 'Easy', 'Medium', 'Hard'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        {message && <p role="alert">{message}</p>}
        <div className="problem-list">
          {!catalog.some((p) => difficulty === 'All' || p.difficulty === difficulty) && (
            <p className="empty-state">No problems at this level yet.</p>
          )}
          {catalog
            .filter((p) => difficulty === 'All' || p.difficulty === difficulty)
            .map((p) => (
              <div key={p.id} className="library-entry" role="group" aria-label={p.title}>
                <button className="problem-row" onClick={() => void perform(() => choose(p))}>
                  <span className={'level level-' + p.difficulty.toLowerCase()}>
                    {p.difficulty}
                  </span>
                  <span>
                    <strong>{p.title}</strong>
                    <small>
                      {p.concepts.join(' · ')}
                      {p.reviewLabel ? ` · ${p.reviewLabel}` : ''}
                    </small>
                  </span>
                  <span className="row-action">
                    {completed.has(progressKey(p.id, p.version))
                      ? 'Passed · practise again'
                      : 'Start'}
                  </span>
                </button>
                {p.canEdit && user && (
                  <button
                    className="library-author-action"
                    aria-label={`Edit ${p.title}`}
                    onClick={() =>
                      void perform(async () => {
                        const item = await api<{
                          statement: string;
                          solution: string;
                          revision: number;
                        }>(`/problems/${p.id}/author`, {
                          headers: { 'X-Pseudostar-User': user.id },
                        });
                        setEditingPublication({ id: p.id, ...item });
                        setLibrary(false);
                        setCommunity(true);
                      })
                    }
                  >
                    Edit / delete
                  </button>
                )}
              </div>
            ))}
        </div>
      </Modal>
      {user && (
        <Modal
          open={community}
          onOpenChange={setCommunity}
          title={editingPublication ? 'Edit your problem' : 'Publish your program'}
        >
          <Suspense fallback={<p role="status">Opening publication…</p>}>
            <PublishPanel
              key={editingPublication?.id ?? 'new'}
              editing={editingPublication}
              onDeleted={async () => {
                setCommunity(false);
                setEditingPublication(null);
                await refreshShared().catch(() =>
                  setSharedError('Deleted. Refresh the library to update the list.'),
                );
              }}
              user={user}
              solution={doc.draft}
              initialStatement={doc.description ?? problem?.statement ?? ''}
              onPublished={async () => {
                await refreshShared().catch(() =>
                  setSharedError('Published. Refresh the library to see the new problem.'),
                );
              }}
            />
          </Suspense>
        </Modal>
      )}
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
                      runner.reset();
                      setResults(null);
                      setSavedOpen(false);
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
                      if (!trash) {
                        document.discardDeleted(p.id);
                        runner.reset();
                      }
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
            beginCopy();
            setConflictCloud(null);
          }}
        >
          Keep my changes as a copy
        </button>
      </Modal>
      <Modal
        open={naming !== null}
        onOpenChange={(open) => {
          if (!open && !nameBusy) setNaming(null);
        }}
        title={naming === 'save' ? 'Name your program' : 'Save a copy'}
        className="naming-modal"
      >
        <form
          className="naming-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveNamed();
          }}
        >
          <label htmlFor="copy-name">Program name</label>
          <input
            id="copy-name"
            autoFocus
            aria-describedby={
              nameError ? 'program-name-help program-name-error' : 'program-name-help'
            }
            aria-invalid={!!nameError}
            maxLength={120}
            value={newName}
            disabled={nameBusy}
            onChange={(e) => setNewName(e.target.value)}
          />
          <p id="program-name-help" className="form-help">
            {naming === 'save'
              ? 'Later changes will save to this program.'
              : 'Later changes will save to this copy.'}
          </p>
          {nameError && (
            <p id="program-name-error" className="form-error" role="alert">
              {nameError}
            </p>
          )}
          <div className="naming-actions">
            <button type="button" disabled={nameBusy} onClick={() => setNaming(null)}>
              Cancel
            </button>
            <button className="primary" type="submit" disabled={nameBusy}>
              {nameBusy ? 'Saving…' : 'Save program'}
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={solutionOpen}
        onOpenChange={setSolutionOpen}
        className={`learning-modal ${solution ? 'comparison-modal' : ''}`}
        title={solution ? 'Compare your approach' : 'Do you really want to see the solution?'}
      >
        {solution ? (
          <>
            <>{algorithmExplanation && <p>{algorithmExplanation}</p>}</>
            <SolutionComparison source={comparisonSource} solution={solution} />
            <div className="solution-replace">
              {replaceSolution ? (
                <>
                  <p>Replace your current program with this solution?</p>
                  <p className="comparison-note">
                    Your current edits will be replaced. Saved programs will auto-save this change.
                  </p>
                  <div className="learning-actions">
                    <button className="learning-action" onClick={() => setReplaceSolution(false)}>
                      Keep my program
                    </button>
                    <button
                      className="learning-action"
                      onClick={() => {
                        update(solution);
                        setSolutionOpen(false);
                        setReplaceSolution(false);
                      }}
                    >
                      Replace program
                    </button>
                  </div>
                </>
              ) : (
                <button className="learning-action" onClick={() => setReplaceSolution(true)}>
                  Use solution in my program
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p>You can return to your program and try another idea first.</p>
            <div className="learning-actions">
              <button
                className="learning-action"
                disabled={solutionBusy}
                onClick={() => setSolutionOpen(false)}
              >
                Keep thinking
              </button>
              <button
                className="learning-action"
                disabled={solutionBusy}
                onClick={async () => {
                  if (!problem) return;
                  setSolutionBusy(true);
                  setSolutionError('');
                  try {
                    const result = await api<{ source: string; explanation?: string }>(
                      `/problems/${problem.id}/solution`,
                      {
                        method: 'POST',
                        body: JSON.stringify({ confirmed: true }),
                      },
                    );
                    setSolution(result.source);
                    setAlgorithmExplanation(result.explanation ?? '');
                  } catch (e) {
                    setSolutionError((e as Error).message);
                  } finally {
                    setSolutionBusy(false);
                  }
                }}
              >
                {solutionBusy ? 'Opening solution…' : 'Yes, show the solution'}
              </button>
            </div>
            {solutionError && <p role="alert">{solutionError}</p>}
          </>
        )}
      </Modal>
      <Modal
        open={explanation !== null}
        onOpenChange={(open) => {
          if (!open) {
            explanationRequest.current?.abort();
            explanationRequest.current = null;
            setExplanation(null);
          }
        }}
        title={explanation?.kind === 'block' ? 'Explain Purpose' : 'Explain Pseudocode'}
        className="learning-modal explanation-modal"
      >
        {explanation && (
          <>
            {explanation.busy ? (
              <p role="status" className="explanation-loading">
                Reading your pseudocode…
              </p>
            ) : explanation.error ? (
              <>
                <p role="alert">{explanation.error}</p>
                <button
                  className="learning-action"
                  onClick={() =>
                    void explainCode(
                      explanation.kind,
                      explanation.source,
                      explanation.block,
                      explanation.problemId,
                    )
                  }
                >
                  Try again
                </button>
              </>
            ) : (
              <div className="explanation-copy">
                <p>{explanation.paragraph}</p>
                {!!explanation.steps?.length && (
                  <ol>
                    {explanation.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}
                {explanation.problemId && (
                  <section className="explanation-next" aria-label="What's next for you?">
                    <h3>What's next for you?</h3>
                    {explanation.nextSteps?.length ? (
                      <ol>
                        {explanation.nextSteps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    ) : (
                      <p>No missing steps identified. Use Check my logic to test your program.</p>
                    )}
                  </section>
                )}
                <details className="explanation-details">
                  <summary>Code and usage</summary>
                  <pre>{explanation.block ?? explanation.source}</pre>
                  <p className="explanation-allowance">
                    {explanation.remaining} explanations left today · Resets at midnight UTC
                  </p>
                </details>
              </div>
            )}
          </>
        )}
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
            OUTPUT and PRINT both display results. Use SET name = value to store a value. Use
            COMPUTE name AS expression to calculate and store a result. Existing name = value
            instructions still work. Use = or == for equality in conditions. TO includes its end
            value; RANGE stops before it. Use NEXT counter + 2 to increase a loop counter by two.
            Indent nested instructions with four spaces. Sub-routines share variables with the main
            program.
          </p>
          <h3>Learn from a failed check</h3>
          <p>
            Read the input, compare expected and actual results, and try tracing your conditions.
            Hints give you a direction, not the complete answer. Passing the listed checks does not
            prove every possible input works.
          </p>
          <details className="language-guide">
            <summary>Language guide: variables, lists, and functions</summary>
            <pre>{advancedReference}</pre>
          </details>
        </div>
      </Modal>
    </>
  );
}
const documentGlobal = window.document;
