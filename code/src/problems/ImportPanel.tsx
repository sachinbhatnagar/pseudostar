import { useEffect, useRef, useState } from 'react';
import { api, type User } from '../programs/api';
import type { Problem } from './types';
import { topics, type Candidate, type ImportItem, type ImportSource } from './shared';
import { Blockly, programToWorkspace, theme } from '../editor/blocks';
import { parse } from '../language/parse';
import './imports.css';
const blank: ImportSource = {
  url: '',
  title: '',
  statement: '',
  constraints: '',
  samples: [{ inputs: [''], outputs: [''] }],
  rights: 'original',
  attribution: '',
};
function BlockPreview({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const ws = Blockly.inject(host.current, {
      readOnly: true,
      theme,
      renderer: 'zelos',
      scrollbars: true,
      zoom: { startScale: 0.9, maxScale: 1, minScale: 0.4 },
    });
    const p = parse(source);
    if (p.ok) {
      programToWorkspace(p.program, ws);
      ws.zoomToFit();
    }
    return () => ws.dispose();
  }, [source]);
  return <div className="import-block-preview" ref={host} aria-label="Solution blocks" />;
}
export function ImportPanel({
  user,
  onRefresh,
  onPractice,
}: {
  user: User;
  onRefresh: () => Promise<void>;
  onPractice: (p: Problem) => Promise<void>;
}) {
  const [rows, setRows] = useState<ImportItem[]>([]),
    [admin, setAdmin] = useState(false),
    [selected, setSelected] = useState<ImportItem | null>(null);
  const [source, setSource] = useState<ImportSource>(blank),
    [candidate, setCandidate] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [reason, setReason] = useState(''),
    [preview, setPreview] = useState(false),
    [dirty, setDirty] = useState(false);
  const alive = useRef(true);
  const request = <T,>(path: string, options: RequestInit = {}) =>
    api<T>(path, { ...options, headers: { ...options.headers, 'X-Pseudostar-User': user.id } });
  const reload = async () => {
    const r = await request<{ imports: ImportItem[]; admin: boolean }>('/imports');
    if (alive.current) {
      setRows(r.imports);
      setAdmin(r.admin);
    }
  };
  useEffect(() => {
    alive.current = true;
    void reload().catch((e) => setNotice(e.message));
    return () => {
      alive.current = false;
    };
  }, []);
  const select = (row: ImportItem | null) => {
    setSelected(row);
    setSource(row?.source ?? structuredClone(blank));
    setCandidate(row?.candidate ?? null);
    setReason('');
    setPreview(false);
    setDirty(false);
    setNotice('');
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNotice('');
    try {
      await fn();
    } catch (e) {
      if (alive.current) setNotice(e instanceof Error ? e.message : 'The request failed.');
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const receive = async (row: ImportItem) => {
    if (!alive.current) return;
    select(row);
    await reload();
    await onRefresh();
  };
  const editSource = (patch: Partial<ImportSource>) => {
    setSource((s) => ({ ...s, ...patch }));
    setDirty(true);
  };
  const editCandidate = (patch: Partial<Candidate>) => {
    if (candidate) {
      setCandidate({ ...candidate, ...patch });
      setDirty(true);
    }
  };
  const save = () =>
    act(async () => {
      if (selected) {
        const r = await request<{ item: ImportItem }>('/imports/' + selected.id, {
          method: 'PUT',
          body: JSON.stringify({ revision: selected.revision, source, candidate }),
        });
        await receive(r.item);
      } else {
        const r = await request<{ item?: ImportItem; message?: string }>('/imports', {
          method: 'POST',
          body: JSON.stringify(source),
        });
        if (r.item) await receive(r.item);
        if (r.message) setNotice(r.message);
      }
    });
  const mutate = (action: 'generate' | 'review', data: object = {}) =>
    act(async () => {
      if (!selected) return;
      const r = await request<{ item: ImportItem }>('/imports/' + selected.id + '/' + action, {
        method: 'POST',
        signal: AbortSignal.timeout(145000),
        body: JSON.stringify({ revision: selected.revision, ...data }),
      });
      await receive(r.item);
    });
  return (
    <div className="import-panel">
      <p>
        {admin
          ? 'Review community problems. Only checked, approved revisions appear for everyone.'
          : 'Contribute a problem for everyone to learn. An admin reviews it before publication.'}
      </p>
      <div className="import-picker">
        <label>
          Open a draft
          <select
            disabled={busy || dirty}
            value={selected?.id ?? ''}
            onChange={(e) => select(rows.find((r) => r.id === e.target.value) ?? null)}
          >
            <option value="">New contribution</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.source.title} ({r.status})
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy || dirty}
          onClick={() =>
            void act(async () => {
              await reload();
              if (selected) {
                const r = await request<{ item: ImportItem }>('/imports/' + selected.id);
                select(r.item);
              }
            })
          }
        >
          Refresh list
        </button>
      </div>
      {notice && <p role="alert">{notice}</p>}
      {busy && (
        <p role="status">
          {selected ? 'Working. Generation can take about two minutes.' : 'Saving your draft…'}
        </p>
      )}
      {selected && (
        <p>
          Revision {selected.revision} · {selected.status}
          {selected.published ? ' · An approved version is in the library.' : ''}
        </p>
      )}
      {selected?.error && <p role="alert">{selected.error}</p>}
      <fieldset disabled={busy}>
        <legend>Problem statement</legend>
        <label>
          LeetCode reference link
          <input
            value={source.url}
            disabled={!!selected}
            placeholder="https://leetcode.com/problems/problem-name/"
            onChange={(e) => editSource({ url: e.target.value })}
          />
        </label>
        <p className="import-note">
          Write your own statement or use material licensed for sharing. The link is a reference;
          PseudoStar does not copy LeetCode text.
        </p>
        <label>
          Title
          <input
            maxLength={120}
            value={source.title}
            onChange={(e) => editSource({ title: e.target.value })}
          />
        </label>
        <label>
          What should the learner do?
          <textarea
            rows={5}
            value={source.statement}
            onChange={(e) => editSource({ statement: e.target.value })}
          />
        </label>
        <label>
          Input limits
          <textarea
            rows={2}
            placeholder="For example: 1 to 100 whole numbers, each from 0 to 1000."
            value={source.constraints}
            onChange={(e) => editSource({ constraints: e.target.value })}
          />
        </label>
        <label>
          Permission to share
          <select
            value={source.rights}
            onChange={(e) => editSource({ rights: e.target.value as ImportSource['rights'] })}
          >
            <option value="original">I wrote this statement</option>
            <option value="licensed">I have a licence to share it</option>
          </select>
        </label>
        <label>
          {source.rights === 'original' ? 'Author name' : 'Licence and attribution'}
          <input
            value={source.attribution}
            onChange={(e) => editSource({ attribution: e.target.value })}
          />
        </label>
        <p>
          Examples use one input or output per line. Write lists as [2, 4, 6]. Output lists use
          compact form: [2,4,6].
        </p>
        {source.samples.map((sample, i) => (
          <div className="import-example" key={i}>
            <label>
              Example {i + 1} inputs
              <textarea
                rows={2}
                value={sample.inputs.join('\n')}
                onChange={(e) =>
                  editSource({
                    samples: source.samples.map((x, j) =>
                      i === j
                        ? { ...x, inputs: e.target.value === '' ? [] : e.target.value.split('\n') }
                        : x,
                    ),
                  })
                }
              />
            </label>
            <label>
              Expected output
              <textarea
                rows={2}
                value={sample.outputs.join('\n')}
                onChange={(e) =>
                  editSource({
                    samples: source.samples.map((x, j) =>
                      i === j ? { ...x, outputs: e.target.value.split('\n') } : x,
                    ),
                  })
                }
              />
            </label>
            {source.samples.length > 1 && (
              <button
                onClick={() => editSource({ samples: source.samples.filter((_, j) => i !== j) })}
              >
                Remove example {i + 1}
              </button>
            )}
          </div>
        ))}
        <button
          disabled={source.samples.length >= 12}
          onClick={() =>
            editSource({ samples: [...source.samples, { inputs: [], outputs: [''] }] })
          }
        >
          Add example
        </button>
      </fieldset>
      {candidate && (
        <fieldset disabled={busy}>
          <legend>Generated solution</legend>
          <label>
            Algorithm explanation
            <textarea
              rows={3}
              value={candidate.explanation}
              onChange={(e) => editCandidate({ explanation: e.target.value })}
            />
          </label>
          <label>
            Pseudocode
            <textarea
              className="import-code"
              rows={14}
              spellCheck={false}
              value={candidate.solution}
              onChange={(e) => editCandidate({ solution: e.target.value })}
            />
          </label>
          <label>
            Difficulty
            <select
              value={candidate.problem.difficulty}
              onChange={(e) =>
                editCandidate({
                  problem: {
                    ...candidate.problem,
                    difficulty: e.target.value as Problem['difficulty'],
                  },
                })
              }
            >
              {['Easy', 'Medium', 'Hard'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <div className="import-topics">
            {topics.map((t) => (
              <label key={t}>
                <input
                  type="checkbox"
                  checked={candidate.problem.topics?.includes(t) ?? false}
                  onChange={(e) =>
                    editCandidate({
                      problem: {
                        ...candidate.problem,
                        topics: e.target.checked
                          ? [...(candidate.problem.topics ?? []), t]
                          : candidate.problem.topics?.filter((x) => x !== t),
                      },
                    })
                  }
                />
                {t}
              </label>
            ))}
          </div>
          <label>
            Prerequisites (one per line)
            <textarea
              rows={2}
              value={candidate.problem.prerequisites?.join('\n') ?? ''}
              onChange={(e) =>
                editCandidate({
                  problem: { ...candidate.problem, prerequisites: e.target.value.split('\n') },
                })
              }
            />
          </label>
          <label>
            Starter program
            <textarea
              rows={3}
              value={candidate.problem.starter}
              onChange={(e) =>
                editCandidate({ problem: { ...candidate.problem, starter: e.target.value } })
              }
            />
          </label>
          {candidate.problem.hints.map((h, i) => (
            <label key={i}>
              Hint {i + 1}
              <input
                value={h}
                onChange={(e) =>
                  editCandidate({
                    problem: {
                      ...candidate.problem,
                      hints: candidate.problem.hints.map((x, j) =>
                        i === j ? e.target.value : x,
                      ) as [string, string, string],
                    },
                  })
                }
              />
            </label>
          ))}
          <button onClick={() => setPreview((v) => !v)}>
            {preview ? 'Hide blocks' : 'Preview blocks'}
          </button>
          {preview && <BlockPreview source={candidate.solution} />}
          <details>
            <summary>Generated test cases</summary>
            {candidate.problem.cases.map((c, i) => (
              <div className="import-example" key={i}>
                <label>
                  Test {i + 1} inputs
                  <textarea
                    rows={2}
                    value={c.inputs.join('\n')}
                    onChange={(e) =>
                      editCandidate({
                        problem: {
                          ...candidate.problem,
                          cases: candidate.problem.cases.map((x, j) =>
                            i === j
                              ? {
                                  ...x,
                                  inputs: e.target.value === '' ? [] : e.target.value.split('\n'),
                                }
                              : x,
                          ),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Test {i + 1} result
                  <textarea
                    rows={2}
                    value={c.expectedOutput?.join('\n')}
                    onChange={(e) =>
                      editCandidate({
                        problem: {
                          ...candidate.problem,
                          cases: candidate.problem.cases.map((x, j) =>
                            i === j ? { ...x, expectedOutput: e.target.value.split('\n') } : x,
                          ),
                        },
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </details>
        </fieldset>
      )}
      {selected?.validation && (
        <details open={!selected.validation.passed}>
          <summary>
            {selected.validation.passed
              ? 'Checks passed. Admin review is still required.'
              : 'Checks need attention.'}
          </summary>
          <ul>
            {selected.validation.checks.map((c, i) => (
              <li key={i}>
                {c.passed ? 'Pass' : 'Fail'}: {c.name}
                {!c.passed && `: ${c.detail}`}
              </li>
            ))}
          </ul>
          <p>Automated agreement does not prove that a solution is correct.</p>
        </details>
      )}
      <div className="import-actions">
        <button disabled={busy} onClick={save}>
          {selected ? 'Save changes and check' : 'Save draft'}
        </button>
        {dirty && selected && (
          <button disabled={busy} onClick={() => select(selected)}>
            Discard unsaved changes
          </button>
        )}
        {selected && (
          <button
            disabled={busy || dirty || selected.status === 'generating'}
            onClick={() => mutate('generate')}
          >
            Generate solution
          </button>
        )}
        {selected?.status === 'review' && selected.validation?.passed && candidate && (
          <button
            disabled={busy || dirty}
            onClick={() =>
              void act(async () => {
                await onRefresh();
                await onPractice(candidate.problem);
              })
            }
          >
            Practise draft
          </button>
        )}
      </div>
      {admin && selected && (
        <fieldset disabled={busy || dirty}>
          <legend>Admin review</legend>
          <label>
            Review note
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="import-actions">
            <button
              disabled={selected.status !== 'review' || !selected.validation?.passed}
              onClick={() => mutate('review', { action: 'approve', reason })}
            >
              Approve for everyone
            </button>
            <button
              disabled={!reason.trim()}
              onClick={() => mutate('review', { action: 'reject', reason })}
            >
              Reject with note
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
