import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GUEST_LIBRARY_KEY,
  deleteGuestProgram,
  getGuestProgram,
  listGuestPrograms,
  restoreGuestProgram,
  saveGuestProgram,
} from '../../src/programs/local-library';
import { createDocumentController } from '../../src/programs/document-controller';

function harness() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
  let serial = 0;
  const deps = {
    storage,
    uuid: () => `guest-${++serial}`,
    request: vi.fn(async () => {
      throw new Error('Unexpected network request');
    }),
  };
  const create = () => {
    const c = createDocumentController(null, 'OUTPUT "initial"', deps);
    const start = c.start;
    return {
      ...c,
      start: () => {
        start();
        if (c.getSnapshot().doc.named === false)
          c.setDoc((d) => ({ ...d, title: 'My first program', named: true }));
      },
    };
  };
  const c = create();
  return { values, storage, deps, create, c };
}
const draft = (localId = 'one') => ({
  localId,
  title: 'Original',
  draft: 'IF unfinished',
  lastValidSource: 'OUTPUT 1',
  problemId: 'p1',
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('guest library', () => {
  it('preserves old drafts across new challenges, copies and reloads without network calls', async () => {
    const h = harness();
    h.c.start();
    const original = h.c.getSnapshot().doc.localId;
    h.c.setDoc((d) => ({
      ...d,
      title: 'Keep me',
      draft: 'IF broken',
      lastValidSource: 'OUTPUT 2',
    }));
    await h.c.fresh('Challenge', 'OUTPUT 3', 'p2');
    h.c.copy();
    expect(listGuestPrograms(false, h.storage)).toHaveLength(3);
    expect(getGuestProgram(original, h.storage)).toMatchObject({
      title: 'Keep me',
      draft: 'IF broken',
      lastValidSource: 'OUTPUT 2',
      formatVersion: 1,
    });
    const active = h.c.getSnapshot().doc.localId;
    h.c.stop();
    const restored = h.create();
    restored.start();
    expect(restored.getSnapshot().doc.localId).toBe(active);
    expect(listGuestPrograms(false, h.storage)).toHaveLength(3);
    expect(h.deps.request).not.toHaveBeenCalled();
    restored.stop();
  });

  it('reopens a guest entry using its original identity and updates it without a duplicate', async () => {
    const h = harness();
    h.c.start();
    const id = h.c.getSnapshot().doc.localId;
    await h.c.fresh('Second', 'OUTPUT 2', null);
    await h.c.load(getGuestProgram(id, h.storage));
    expect(h.c.getSnapshot().doc.localId).toBe(id);
    const revision = getGuestProgram(id, h.storage).revision;
    h.c.setDoc((d) => ({ ...d, draft: 'OUTPUT 9' }));
    await h.c.save();
    expect(getGuestProgram(id, h.storage)).toMatchObject({
      draft: 'OUTPUT 9',
      revision: revision + 1,
    });
    expect(listGuestPrograms(false, h.storage)).toHaveLength(2);
    h.c.stop();
  });

  it('keeps no-op saves at one revision and rejects stale writes', () => {
    const h = harness();
    const first = saveGuestProgram(draft(), undefined, h.storage);
    expect(saveGuestProgram(draft(), first.revision, h.storage).revision).toBe(1);
    const next = saveGuestProgram({ ...draft(), draft: 'OUTPUT 2' }, 1, h.storage);
    expect(next.revision).toBe(2);
    expect(() => saveGuestProgram({ ...draft(), draft: 'stale' }, 1, h.storage)).toThrow(
      'newer guest version',
    );
    expect(getGuestProgram('one', h.storage).draft).toBe('OUTPUT 2');
  });

  it('supports active/trash lists, soft deletion, restore and the exact 30-day boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T00:00:00Z'));
    const h = harness();
    saveGuestProgram(draft(), undefined, h.storage);
    const deleted = deleteGuestProgram('one', h.storage);
    expect(deleted).toMatchObject({ revision: 2, deletedAt: Date.now() });
    expect(listGuestPrograms(false, h.storage)).toEqual([]);
    expect(listGuestPrograms(true, h.storage)).toHaveLength(1);
    expect(() => getGuestProgram('one', h.storage)).toThrow('not found');
    expect(() => saveGuestProgram(draft(), 1, h.storage)).toThrow('deleted');
    vi.setSystemTime(Date.now() + 30 * 86400000 - 1);
    expect(restoreGuestProgram('one', h.storage)).toMatchObject({
      revision: 3,
      deletedAt: null,
      draft: 'IF unfinished',
    });
    deleteGuestProgram('one', h.storage);
    vi.setSystemTime(Date.now() + 30 * 86400000);
    expect(listGuestPrograms(true, h.storage)).toEqual([]);
    expect(() => restoreGuestProgram('one', h.storage)).toThrow('not found');
  });

  it('keeps a deleted active entry deleted when the parent makes a copy', () => {
    const h = harness();
    h.c.start();
    const id = h.c.getSnapshot().doc.localId;
    deleteGuestProgram(id, h.storage);
    h.c.copy();
    expect(listGuestPrograms(true, h.storage).map((p) => p.id)).toEqual([id]);
    expect(listGuestPrograms(false, h.storage)).toHaveLength(1);
    expect(h.c.getSnapshot().doc.localId).not.toBe(id);
    h.c.stop();
  });

  it.each(['{', '{"version":2,"programs":[]}', '{"version":1,"programs":[{}]}'])(
    'does not replace corrupt or unsupported library data: %s',
    (raw) => {
      const h = harness();
      h.values.set(GUEST_LIBRARY_KEY, raw);
      for (const call of [
        () => listGuestPrograms(false, h.storage),
        () => getGuestProgram('one', h.storage),
        () => deleteGuestProgram('one', h.storage),
        () => restoreGuestProgram('one', h.storage),
        () => saveGuestProgram(draft(), undefined, h.storage),
      ]) {
        expect(call).toThrow('stored data was kept');
      }
      h.c.start();
      expect(h.c.getSnapshot().status).toBe('Save failed');
      expect(h.values.get(GUEST_LIBRARY_KEY)).toBe(raw);
      expect(JSON.parse(h.values.get('pseudostar:draft:guest')!).named).toBe(false);
      h.c.stop();
    },
  );

  it('retains corrupt active recovery data without overwriting it on startup or edits', () => {
    const h = harness();
    h.values.set('pseudostar:draft:guest', '{');
    const c = h.create();
    c.start();
    c.setDoc((d) => ({ ...d, draft: 'new work' }));
    expect(c.getSnapshot().status).toBe('Save failed');
    expect(h.values.get('pseudostar:draft:guest')).toBe('{');
    c.stop();
  });

  it('reports archive quota errors, keeps the old entry and blocks switching away from edits', async () => {
    const h = harness();
    h.c.start();
    const id = h.c.getSnapshot().doc.localId;
    const before = h.values.get(GUEST_LIBRARY_KEY);
    h.storage.setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    h.c.setDoc((d) => ({ ...d, draft: 'valuable edits' }));
    expect(h.c.getSnapshot().status).toBe('Save failed');
    expect(h.c.hasUnsavedChanges()).toBe(true);
    await expect(h.c.fresh('Next', 'OUTPUT 2', null)).rejects.toThrow('Device storage');
    expect(h.c.getSnapshot().doc).toMatchObject({ localId: id, draft: 'valuable edits' });
    expect(h.values.get(GUEST_LIBRARY_KEY)).toBe(before);
    h.storage.setItem.mockImplementation((k, v) => {
      h.values.set(k, v);
    });
    await h.c.save();
    expect(getGuestProgram(id, h.storage).draft).toBe('valuable edits');
    h.c.stop();
  });

  it('reports recovery-key failures even when archiving succeeds, and retries without revision inflation', async () => {
    const h = harness();
    h.c.start();
    const id = h.c.getSnapshot().doc.localId;
    h.storage.setItem.mockImplementation((k, v) => {
      if (k === 'pseudostar:draft:guest') throw new Error('quota');
      h.values.set(k, v);
    });
    h.c.setDoc((d) => ({ ...d, draft: 'archived edits' }));
    expect(h.c.getSnapshot().status).toBe('Save failed');
    expect(getGuestProgram(id, h.storage)).toMatchObject({ draft: 'archived edits', revision: 2 });
    h.storage.setItem.mockImplementation((k, v) => {
      h.values.set(k, v);
    });
    await h.c.save();
    expect(getGuestProgram(id, h.storage).revision).toBe(2);
    h.c.stop();
  });

  it('keeps stored data when delete or restore hits quota', () => {
    const h = harness();
    saveGuestProgram(draft(), undefined, h.storage);
    const before = h.values.get(GUEST_LIBRARY_KEY);
    h.storage.setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => deleteGuestProgram('one', h.storage)).toThrow('Device storage');
    expect(h.values.get(GUEST_LIBRARY_KEY)).toBe(before);
    h.storage.setItem.mockImplementation((k, v) => {
      h.values.set(k, v);
    });
    deleteGuestProgram('one', h.storage);
    const trash = h.values.get(GUEST_LIBRARY_KEY);
    h.storage.setItem.mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => restoreGuestProgram('one', h.storage)).toThrow('Device storage');
    expect(h.values.get(GUEST_LIBRARY_KEY)).toBe(trash);
  });

  it('uses default browser storage and reports unavailable reads', () => {
    const h = harness();
    vi.stubGlobal('localStorage', h.storage);
    saveGuestProgram(draft(), undefined);
    expect(listGuestPrograms(false)).toHaveLength(1);
    expect(getGuestProgram('one').id).toBe('one');
    deleteGuestProgram('one');
    expect(listGuestPrograms(true)).toHaveLength(1);
    restoreGuestProgram('one');
    expect(() =>
      listGuestPrograms(false, {
        getItem: () => {
          throw new Error('denied');
        },
        setItem: () => {},
      }),
    ).toThrow('Device storage');
  });
});

it('guest names are unique on create, rename and restore', () => {
  const h = harness();
  const first = saveGuestProgram(draft('one'), undefined, h.storage);
  expect(() =>
    saveGuestProgram({ ...draft('two'), title: ' original ' }, undefined, h.storage),
  ).toThrow('already uses');
  const second = saveGuestProgram({ ...draft('two'), title: 'Another' }, undefined, h.storage);
  expect(() =>
    saveGuestProgram({ ...draft('two'), title: 'ORIGINAL' }, second.revision, h.storage),
  ).toThrow('already uses');
  deleteGuestProgram(first.id, h.storage);
  saveGuestProgram(draft('three'), undefined, h.storage);
  expect(() => restoreGuestProgram(first.id, h.storage)).toThrow('already uses');
  expect(listGuestPrograms(false, h.storage)).toHaveLength(2);
});

it('repairs old duplicate guest names without losing programs or drafts', () => {
  const h = harness();
  const one = saveGuestProgram(draft('one'), undefined, h.storage);
  h.values.set(
    GUEST_LIBRARY_KEY,
    JSON.stringify({
      version: 1,
      programs: [one, { ...one, id: 'two', title: 'ORIGINAL', draft: 'OUTPUT 2' }],
    }),
  );
  const programs = listGuestPrograms(false, h.storage);
  expect(new Set(programs.map((p) => p.title.toLowerCase())).size).toBe(2);
  expect(programs.find((p) => p.id === 'two')?.draft).toBe('OUTPUT 2');
});
