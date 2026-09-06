import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type SavedProgram } from '../../src/programs/api';
import { createDocumentController, type Document } from '../../src/programs/document-controller';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const program = (id = 'server-1', revision = 1): SavedProgram => ({
  id,
  revision,
  title: 'Remote',
  draft: 'remote draft',
  problemId: null,
  updatedAt: 1788652800000,
  deletedAt: null,
});
const stored: Document = {
  localId: 'restored',
  id: 'server-1',
  title: 'Recovered',
  draft: 'unsent edits',
  problemId: 'p1',
  revision: 3,
};
function harness(owner: string | null = 'alice', seed?: Document) {
  const values = new Map<string, string>();
  if (seed) values.set('pseudostar:draft:' + (owner ?? 'guest'), JSON.stringify(seed));
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
  const pending: Array<ReturnType<typeof deferred<{ program: SavedProgram }>>> = [];
  const request = vi.fn((_path: string, _options: RequestInit) => {
    const work = deferred<{ program: SavedProgram }>();
    pending.push(work);
    return work.promise;
  });
  let serial = 0;
  const deps = { storage, request, uuid: () => `local-${++serial}` };
  const controller = createDocumentController(owner, 'initial', deps);
  controller.start();
  return { controller, storage, values, request, pending, deps };
}
const tick = async () => {
  for (let n = 0; n < 12; n++) await Promise.resolve();
};
const body = (h: ReturnType<typeof harness>, index: number) =>
  JSON.parse(h.request.mock.calls[index][1].body as string);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('document save queue', () => {
  it('serializes callers and saves the latest edits after first create with revision 1', async () => {
    const h = harness(),
      c = h.controller;
    const first = c.save();
    await tick();
    c.setDoc((d) => ({ ...d, draft: 'second' }));
    c.setDoc((d) => ({ ...d, draft: 'newest', title: 'Renamed', problemId: 'p2' }));
    const second = c.save();
    expect(second).toBe(first);
    await vi.advanceTimersByTimeAsync(1500);
    expect(h.request).toHaveBeenCalledTimes(1);
    h.pending[0].resolve({ program: program() });
    await tick();
    expect(h.request.mock.calls[1][0]).toBe('/programs/server-1');
    expect(h.request.mock.calls[1][1].method).toBe('PUT');
    expect(body(h, 1)).toEqual({
      title: 'Renamed',
      draft: 'newest',
      problemId: 'p2',
      lastValidSource: 'initial',
      expectedRevision: 1,
    });
    expect(c.getSnapshot().status).toBe('Saving…');
    h.pending[1].resolve({ program: program('server-1', 2) });
    await Promise.all([first, second]);
    expect(c.getSnapshot().doc).toMatchObject({ draft: 'newest', id: 'server-1', revision: 2 });
    expect(c.getSnapshot().status).toBe('Saved');
    await c.save();
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.request).toHaveBeenCalledTimes(2);
  });

  it('debounces consecutive edits and uses each acknowledged revision in order', async () => {
    const h = harness('alice', stored),
      c = h.controller;
    c.setDoc((d) => ({ ...d, draft: 'one' }));
    await vi.advanceTimersByTimeAsync(900);
    c.setDoc((d) => ({ ...d, draft: 'two' }));
    await vi.advanceTimersByTimeAsync(900);
    expect(h.request).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(body(h, 0).expectedRevision).toBe(3);
    c.setDoc((d) => ({ ...d, draft: 'three' }));
    h.pending[0].resolve({ program: program('server-1', 4) });
    await tick();
    expect(body(h, 1)).toMatchObject({ draft: 'three', expectedRevision: 4 });
    h.pending[1].resolve({ program: program('server-1', 5) });
    await tick();
    expect(c.getSnapshot().doc.revision).toBe(5);
  });

  it('releases failed flights and retries the newest local draft', async () => {
    const h = harness('alice', stored),
      c = h.controller;
    const first = c.save(),
      outcome = expect(first).rejects.toThrow('offline');
    await tick();
    c.setDoc((d) => ({ ...d, draft: 'edited while offline' }));
    h.pending[0].reject(new ApiError('offline', 0));
    await outcome;
    expect(c.getSnapshot().status).toBe('Offline draft');
    expect(JSON.parse(h.values.get('pseudostar:draft:alice')!).draft).toBe('edited while offline');
    await vi.advanceTimersByTimeAsync(10000);
    expect(h.request).toHaveBeenCalledTimes(1);
    const retry = c.save();
    await tick();
    expect(body(h, 1)).toMatchObject({ draft: 'edited while offline', expectedRevision: 3 });
    h.pending[1].resolve({ program: program('server-1', 4) });
    await retry;
    expect(c.getSnapshot()).toMatchObject({ status: 'Saved', error: '' });
  });

  it('recovers even when the request implementation throws synchronously', async () => {
    const h = harness();
    h.request.mockImplementationOnce(() => {
      throw new Error('sync failure');
    });
    await expect(h.controller.save()).rejects.toThrow('sync failure');
    const retry = h.controller.save();
    await tick();
    h.pending[0].resolve({ program: program() });
    await retry;
    expect(h.controller.getSnapshot().status).toBe('Saved');
  });
});

describe('restore and device storage', () => {
  it('restores all fields before the first write and persists server acknowledgements', async () => {
    const h = harness('alice', stored);
    expect(h.controller.getSnapshot().doc).toEqual(stored);
    expect(JSON.parse(h.storage.setItem.mock.calls[0][1])).toEqual(stored);
    const work = h.controller.save();
    await tick();
    expect(body(h, 0).expectedRevision).toBe(3);
    h.pending[0].resolve({ program: program('server-1', 4) });
    await work;
    const restored = createDocumentController('alice', 'fallback', h.deps);
    expect(restored.getSnapshot().doc).toEqual({ ...stored, revision: 4 });
  });

  it.each([
    { draft: 'bad', localId: 'partial' },
    { ...stored, revision: '3' },
    { ...stored, title: 12 },
    { ...stored, problemId: {} },
    { ...stored, id: 17 },
    { ...stored, revision: 0 },
  ])('rejects malformed restored documents: %j', (value) => {
    const h = harness('alice', value as Document);
    expect(h.controller.getSnapshot().doc.draft).toBe('initial');
    expect(h.controller.getSnapshot().error).toContain('could not be restored');
  });

  it('reports malformed JSON and storage read exceptions without crashing', () => {
    const h = harness();
    for (const getItem of [
      () => '{',
      () => {
        throw new Error('denied');
      },
    ]) {
      const c = createDocumentController('alice', 'safe', {
        ...h.deps,
        storage: { ...h.storage, getItem },
      });
      expect(c.getSnapshot()).toMatchObject({
        doc: { draft: 'safe' },
        error: 'A saved local draft could not be restored.',
      });
    }
  });

  it('never labels failed guest storage as saved, blocks switching, and supports recovery', async () => {
    const h = harness(null),
      c = h.controller;
    h.storage.setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    c.setDoc((d) => ({ ...d, draft: 'valuable' }));
    expect(c.getSnapshot().status).toBe('Save failed');
    expect(c.hasUnsavedChanges()).toBe(true);
    await expect(c.save()).rejects.toThrow('Device storage');
    await expect(c.fresh('New', 'new', null)).rejects.toThrow('Device storage');
    expect(c.getSnapshot().doc.draft).toBe('valuable');
    h.storage.setItem.mockImplementation((key, value) => {
      h.values.set(key, value);
    });
    await c.save();
    expect(c.getSnapshot()).toMatchObject({ status: 'Saved on this device', error: '' });
    expect(c.hasUnsavedChanges()).toBe(false);
    expect(h.request).not.toHaveBeenCalled();
  });

  it('keeps storage warnings visible through a successful cloud save', async () => {
    const h = harness();
    h.storage.setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    const work = h.controller.save();
    await tick();
    h.pending[0].resolve({ program: program() });
    await work;
    expect(h.controller.getSnapshot()).toMatchObject({
      status: 'Saved to cloud',
      error: expect.stringContaining('Device storage'),
    });
  });
});

describe('switches and conflicts', () => {
  it('saves each new document when two fresh operations arrive together', async () => {
    const h = harness(),
      c = h.controller;
    const one = c.fresh('One', 'one', null),
      two = c.fresh('Two', 'two', 'p2');
    await tick();
    h.pending[0].resolve({ program: program() });
    await one;
    await tick();
    expect(body(h, 1)).toMatchObject({ title: 'One', draft: 'one', expectedRevision: 0 });
    expect(h.request.mock.calls[1][1].method).toBe('POST');
    h.pending[1].resolve({ program: program('server-2') });
    await two;
    expect(c.getSnapshot().doc).toMatchObject({
      title: 'Two',
      draft: 'two',
      revision: 0,
      problemId: 'p2',
    });
    expect(c.getSnapshot().doc.id).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1000);
    expect(body(h, 2)).toMatchObject({ title: 'Two', expectedRevision: 0 });
  });

  it('flushes edits during save before loading, then leaves the loaded program clean', async () => {
    const h = harness(),
      c = h.controller;
    const work = c.load(program('loaded', 7));
    await tick();
    c.setDoc((d) => ({ ...d, draft: 'late edit' }));
    h.pending[0].resolve({ program: program() });
    await tick();
    expect(body(h, 1).draft).toBe('late edit');
    h.pending[1].resolve({ program: program('server-1', 2) });
    await work;
    expect(c.getSnapshot().doc).toMatchObject({ id: 'loaded', revision: 7, draft: 'remote draft' });
    expect(c.hasUnsavedChanges()).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.request).toHaveBeenCalledTimes(2);
    c.setDoc((d) => ({ ...d, draft: 'loaded edit' }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.request.mock.calls[2][0]).toBe('/programs/loaded');
    expect(body(h, 2).expectedRevision).toBe(7);
  });

  it('preserves a conflict through edits, blocks retries, and saves a copy without overwriting', async () => {
    const h = harness('alice', stored),
      c = h.controller;
    const work = c.save(),
      outcome = expect(work).rejects.toThrow('stale revision');
    await tick();
    h.pending[0].reject(new ApiError('stale revision', 409));
    await outcome;
    c.setDoc((d) => ({ ...d, draft: 'keep this' }));
    await vi.advanceTimersByTimeAsync(5000);
    await expect(c.save()).rejects.toThrow('stale revision');
    await expect(c.load(program('other'))).rejects.toThrow('stale revision');
    expect(h.request).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().status).toBe('Conflict');
    c.copy();
    const copy = c.save();
    await tick();
    expect(h.request.mock.calls[1][0]).toBe('/programs');
    expect(body(h, 1)).toMatchObject({
      draft: 'keep this',
      title: 'Recovered copy',
      expectedRevision: 0,
    });
    h.pending[1].resolve({ program: program('copy') });
    await copy;
    expect(c.getSnapshot()).toMatchObject({
      status: 'Saved',
      error: '',
      doc: { id: 'copy', revision: 1 },
    });
  });

  it.each(['success', 'conflict'] as const)(
    'isolates a copy from the old request %s and cancels a pending switch',
    async (result) => {
      const h = harness('alice', stored),
        c = h.controller;
      const switchWork = c.fresh('Do not open', 'unused', null);
      await tick();
      c.copy();
      const copyId = c.getSnapshot().doc.localId;
      if (result === 'success') h.pending[0].resolve({ program: program('server-1', 4) });
      else h.pending[0].reject(new ApiError('old conflict', 409));
      await tick();
      expect(c.getSnapshot().doc).toMatchObject({ localId: copyId, revision: 0 });
      expect(c.getSnapshot().doc.id).toBeUndefined();
      expect(h.request.mock.calls[1][0]).toBe('/programs');
      h.pending[1].resolve({ program: program('copy') });
      await switchWork;
      expect(c.getSnapshot().doc).toMatchObject({ id: 'copy', title: 'Recovered copy' });
      expect(c.getSnapshot().error).toBe('');
    },
  );
});

describe('account lifecycle', () => {
  it.each(['success', 'failure'] as const)(
    'ignores old-account %s and never drains after unmount',
    async (result) => {
      const h = harness('alice', stored),
        a = h.controller;
      const work = a.save();
      await tick();
      a.setDoc((d) => ({ ...d, draft: 'alice latest' }));
      a.stop();
      const b = createDocumentController('bob', 'bob initial', h.deps);
      b.start();
      const before = b.getSnapshot();
      const writes = h.storage.setItem.mock.calls.length;
      if (result === 'success') h.pending[0].resolve({ program: program('server-1', 4) });
      else h.pending[0].reject(new ApiError('old conflict', 409));
      await work;
      expect(b.getSnapshot()).toBe(before);
      expect(h.storage.setItem).toHaveBeenCalledTimes(writes);
      expect(h.request).toHaveBeenCalledTimes(1);
      expect(JSON.parse(h.values.get('pseudostar:draft:alice')!).draft).toBe('alice latest');
      expect(JSON.parse(h.values.get('pseudostar:draft:bob')!).draft).toBe('bob initial');
    },
  );

  it('cancels timers and queued saves when stopped, and supports effect restart', async () => {
    const h = harness(),
      c = h.controller;
    const work = c.save();
    c.stop();
    await work;
    await vi.advanceTimersByTimeAsync(2000);
    expect(h.request).not.toHaveBeenCalled();
    c.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(h.request).toHaveBeenCalledTimes(1);
    h.pending[0].resolve({ program: program() });
    await tick();
    expect(c.getSnapshot().status).toBe('Saved');
  });
});

describe('persisted recovery source', () => {
  it('restores invalid local text together with its last valid source', () => {
    const h = harness(null),
      c = h.controller;
    c.setDoc((d) => ({ ...d, draft: 'OUTPUT "safe"', lastValidSource: 'OUTPUT "safe"' }));
    c.setDoc((d) => ({ ...d, draft: 'OUTPUT "broken' }));
    c.stop();
    const restored = createDocumentController(null, 'fallback', h.deps);
    restored.start();
    expect(restored.getSnapshot().doc).toMatchObject({
      draft: 'OUTPUT "broken',
      lastValidSource: 'OUTPUT "safe"',
    });
    restored.setDoc((d) => ({ ...d, draft: d.lastValidSource! }));
    expect(restored.getSnapshot().doc.draft).toBe('OUTPUT "safe"');
  });

  it('loads cloud recovery metadata and carries it through an invalid save and copy', async () => {
    const h = harness(null),
      c = h.controller;
    await c.load({ ...program('cloud', 8), draft: 'IF', lastValidSource: 'OUTPUT "cloud safe"' });
    expect(c.getSnapshot().doc.lastValidSource).toBe('OUTPUT "cloud safe"');
    c.copy();
    const copied = c.getSnapshot().doc;
    expect(copied).toMatchObject({
      draft: 'IF',
      lastValidSource: 'OUTPUT "cloud safe"',
      revision: 0,
    });
    expect(copied.id).toBeUndefined();
    const signed = createDocumentController('alice', 'fallback', h.deps);
    signed.start();
    signed.setDoc(copied);
    const work = signed.save();
    await tick();
    expect(body(h, 0)).toMatchObject({
      draft: 'IF',
      lastValidSource: 'OUTPUT "cloud safe"',
      expectedRevision: 0,
    });
    h.pending[0].resolve({ program: program('copy') });
    await work;
    expect(JSON.parse(h.values.get('pseudostar:draft:alice')!).lastValidSource).toBe(
      'OUTPUT "cloud safe"',
    );
  });

  it('sends the newest recovery source when edits occur during first create', async () => {
    const h = harness(),
      c = h.controller;
    const work = c.save();
    await tick();
    c.setDoc((d) => ({ ...d, draft: 'OUTPUT "new safe"', lastValidSource: 'OUTPUT "new safe"' }));
    c.setDoc((d) => ({ ...d, draft: 'IF' }));
    h.pending[0].resolve({ program: program() });
    await tick();
    expect(body(h, 1)).toMatchObject({
      draft: 'IF',
      lastValidSource: 'OUTPUT "new safe"',
      expectedRevision: 1,
    });
    h.pending[1].resolve({ program: program('server-1', 2) });
    await work;
    const restored = createDocumentController('alice', 'fallback', h.deps);
    expect(restored.getSnapshot().doc).toMatchObject({
      draft: 'IF',
      lastValidSource: 'OUTPUT "new safe"',
      revision: 2,
    });
  });

  it('treats a changed recovery source as unsaved even when invalid text is unchanged', async () => {
    const h = harness(),
      c = h.controller;
    c.setDoc((d) => ({ ...d, draft: 'IF', lastValidSource: 'OUTPUT "old"' }));
    const first = c.save();
    await tick();
    h.pending[0].resolve({ program: program() });
    await first;
    c.setDoc((d) => ({ ...d, lastValidSource: 'OUTPUT "new"' }));
    expect(c.hasUnsavedChanges()).toBe(true);
    const second = c.save();
    await tick();
    expect(body(h, 1).lastValidSource).toBe('OUTPUT "new"');
    h.pending[1].resolve({ program: program('server-1', 2) });
    await second;
  });

  it('rejects malformed recovery metadata but accepts older drafts without it', () => {
    const h = harness('alice', { ...stored, lastValidSource: 12 } as unknown as Document);
    expect(h.controller.getSnapshot().error).toContain('could not be restored');
    const legacy = harness('alice', stored);
    expect(legacy.controller.getSnapshot().doc).toEqual(stored);
  });

  it('clips repeated copies to 120 characters while retaining recovery text', () => {
    const h = harness(null),
      c = h.controller;
    c.setDoc((d) => ({
      ...d,
      title: 'A'.repeat(120),
      draft: 'IF',
      lastValidSource: 'OUTPUT "safe"',
    }));
    for (let i = 0; i < 3; i++) {
      const previousId = c.getSnapshot().doc.localId;
      c.copy();
      expect(c.getSnapshot().doc.title).toHaveLength(120);
      expect(c.getSnapshot().doc.title).toMatch(/ copy$/);
      expect(c.getSnapshot().doc.localId).not.toBe(previousId);
      expect(c.getSnapshot().doc).toMatchObject({
        revision: 0,
        draft: 'IF',
        lastValidSource: 'OUTPUT "safe"',
      });
    }
  });
});
