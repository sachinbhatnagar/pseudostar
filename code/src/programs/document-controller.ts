import { ApiError, type SavedProgram } from './api';
import { saveGuestProgram } from './local-library';

export type Document = {
  named?: boolean;
  localId: string;
  id?: string;
  title: string;
  description?: string;
  draft: string;
  lastValidSource?: string;
  problemId: string | null;
  revision: number;
  localRevision?: number;
};
type Snapshot = { doc: Document; status: string; error: string };
type Dependencies = {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  request: (path: string, options: RequestInit) => Promise<{ program: SavedProgram }>;
  uuid: () => string;
};
const storageMessage = 'Device storage is unavailable. Download your work before leaving.';
const signature = (doc: Document) =>
  JSON.stringify([
    doc.localId,
    doc.title,
    doc.description,
    doc.draft,
    doc.problemId,
    doc.lastValidSource,
  ]);
function isDocument(value: unknown): value is Document {
  if (!value || typeof value !== 'object') return false;
  const d = value as Document;
  return (
    typeof d.localId === 'string' &&
    d.localId.length > 0 &&
    typeof d.title === 'string' &&
    (d.description === undefined || typeof d.description === 'string') &&
    (d.named === undefined || typeof d.named === 'boolean') &&
    typeof d.draft === 'string' &&
    (d.lastValidSource === undefined || typeof d.lastValidSource === 'string') &&
    (d.problemId === null || typeof d.problemId === 'string') &&
    (d.localRevision === undefined ||
      (Number.isSafeInteger(d.localRevision) && d.localRevision > 0)) &&
    Number.isSafeInteger(d.revision) &&
    (d.id === undefined
      ? d.revision === 0
      : typeof d.id === 'string' && d.id.length > 0 && d.revision >= 1)
  );
}

// One controller belongs to one account. All document writes pass through this queue.
export function createDocumentController(
  owner: string | null,
  initial: string,
  deps: Dependencies,
) {
  const key = 'pseudostar:draft:' + (owner ?? 'guest');
  let doc: Document = {
    localId: deps.uuid(),
    title: '',
    named: false,
    draft: initial,
    lastValidSource: initial,
    problemId: null,
    revision: 0,
  };
  let localError = '',
    cloudError = '',
    restoreError = '';
  let recoveryBlocked = false;
  try {
    const text = deps.storage.getItem(key);
    if (text !== null) {
      const restored: unknown = JSON.parse(text);
      if (!isDocument(restored)) throw new Error('Invalid draft');
      doc = restored;
    }
  } catch {
    restoreError = 'A saved local draft could not be restored.';
    recoveryBlocked = !owner;
  }
  let status = 'Local draft',
    saved = '',
    active = false,
    epoch = 0,
    switchVersion = 0;
  let conflict: Error | null = null;
  let flight: Promise<void> | null = null;
  let switches: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  let snapshot: Snapshot = { doc, status, error: restoreError };
  const dirty = () => signature(doc) !== saved;
  const emit = () => {
    snapshot = {
      doc,
      status,
      error: [restoreError, localError, cloudError].filter(Boolean).join(' '),
    };
    listeners.forEach((listener) => listener());
  };
  const persist = () => {
    try {
      if (recoveryBlocked)
        throw new Error(
          'The saved guest draft could not be restored. Its stored data was kept. Download your work before repairing device storage.',
        );
      if (!owner && doc.named !== false && doc.title.trim()) {
        const archived = saveGuestProgram(doc, doc.localRevision, deps.storage);
        doc = {
          ...doc,
          localRevision: archived.revision,
          ...(doc.id ? { revision: archived.revision } : {}),
        };
      }
      try {
        deps.storage.setItem(key, JSON.stringify(doc));
      } catch {
        throw new Error(storageMessage);
      }
      localError = '';
    } catch (cause) {
      localError = !owner && cause instanceof Error ? cause.message : storageMessage;
    }
  };
  const settledStatus = () => {
    if (conflict) return 'Conflict';
    if (doc.named === false || !doc.title.trim())
      return localError ? 'Save failed' : 'Unsaved draft';
    if (!owner) return localError ? 'Save failed' : 'Saved on this device';
    return dirty() ? 'Local draft' : localError ? 'Saved to cloud' : 'Saved';
  };
  const schedule = () => {
    clearTimeout(timer);
    if (active && owner && doc.named !== false && doc.title.trim() && dirty() && !conflict) {
      timer = setTimeout(() => {
        void save().catch(() => {});
      }, 1000);
    }
  };
  const setDoc = (update: Document | ((previous: Document) => Document)) => {
    if (!active) return;
    doc = typeof update === 'function' ? update(doc) : update;
    restoreError = '';
    persist();
    status = conflict ? 'Conflict' : flight ? 'Saving…' : settledStatus();
    emit();
    schedule();
  };
  const save = (): Promise<void> => {
    if (!active) return Promise.reject(new Error('This document is no longer active.'));
    clearTimeout(timer);
    persist();
    if (!owner || doc.named === false || !doc.title.trim()) {
      status = settledStatus();
      emit();
      return localError ? Promise.reject(new Error(localError)) : Promise.resolve();
    }
    if (flight) return flight;
    if (conflict) {
      status = 'Conflict';
      emit();
      return Promise.reject(conflict);
    }
    if (!dirty()) {
      status = settledStatus();
      emit();
      return Promise.resolve();
    }
    const generation = epoch;
    // Defer work until flight is assigned, including when request throws synchronously.
    const request = Promise.resolve().then(async () => {
      while (active && epoch === generation && doc.named !== false && doc.title.trim() && dirty()) {
        const current = doc,
          mark = signature(current);
        status = 'Saving…';
        cloudError = '';
        emit();
        try {
          const result = await deps.request(current.id ? `/programs/${current.id}` : '/programs', {
            method: current.id ? 'PUT' : 'POST',
            body: JSON.stringify({
              title: current.title.trim(),
              description: current.description ?? '',
              draft: current.draft,
              problemId: current.problemId,
              lastValidSource: current.lastValidSource,
              expectedRevision: current.revision,
            }),
          });
          if (!active || epoch !== generation) return;
          if (doc.localId !== current.localId) continue;
          saved = mark;
          // Keep edits made during the request, but use the server identity for the next save.
          doc = { ...doc, id: result.program.id, revision: result.program.revision };
          persist();
          status = dirty() ? 'Saving…' : settledStatus();
          emit();
        } catch (cause) {
          if (!active || epoch !== generation) return;
          if (doc.localId !== current.localId) continue;
          const error = cause instanceof Error ? cause : new Error(String(cause));
          if (
            cause instanceof ApiError &&
            cause.status === 409 &&
            !['ACCOUNT_CHANGED', 'NAME_TAKEN'].includes(
              (cause.data.error as { code?: string } | undefined)?.code ?? '',
            )
          )
            conflict = error;
          status = conflict
            ? 'Conflict'
            : cause instanceof ApiError && cause.status === 0
              ? 'Offline draft'
              : 'Save failed';
          cloudError = error.message;
          emit();
          clearTimeout(timer);
          throw error;
        }
      }
    });
    flight = request.then(
      () => {
        flight = null;
      },
      (error) => {
        flight = null;
        throw error;
      },
    );
    return flight;
  };
  const switchTo = (make: () => Document, isSaved: boolean) => {
    const generation = epoch,
      version = switchVersion;
    const operation = switches.then(async () => {
      if (!active || generation !== epoch || version !== switchVersion) return;
      await save();
      if (!active || generation !== epoch || version !== switchVersion) return;
      doc = make();
      saved = isSaved ? signature(doc) : '';
      conflict = null;
      cloudError = '';
      restoreError = '';
      persist();
      status = settledStatus();
      emit();
      schedule();
      if (!owner && localError) throw new Error(localError);
    });
    switches = operation.catch(() => {});
    return operation;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start: () => {
      active = true;
      persist();
      status = settledStatus();
      emit();
      schedule();
    },
    stop: () => {
      active = false;
      epoch++;
      switchVersion++;
      clearTimeout(timer);
    },
    hasUnsavedChanges: () => (owner && doc.named !== false ? dirty() : Boolean(localError)),
    setDoc,
    save,
    fresh: (title: string, draft: string, problemId: string | null) =>
      switchTo(
        () => ({
          localId: deps.uuid(),
          title,
          named: Boolean(title.trim()),
          draft,
          lastValidSource: draft,
          problemId,
          revision: 0,
        }),
        false,
      ),
    load: (program: SavedProgram) =>
      switchTo(
        () => ({
          localId: owner ? deps.uuid() : program.id,
          id: program.id,
          title: program.title,
          description: program.description ?? '',
          named: true,
          draft: program.draft,
          lastValidSource: program.lastValidSource ?? undefined,
          problemId: program.problemId,
          revision: program.revision,
          ...(!owner ? { localRevision: program.revision } : {}),
        }),
        true,
      ),
    copy: (title?: string) => {
      if (!active) return;
      switchVersion++;
      saved = '';
      conflict = null;
      cloudError = '';
      setDoc({
        ...doc,
        localId: deps.uuid(),
        id: undefined,
        revision: 0,
        localRevision: undefined,
        title: title ?? doc.title.slice(0, 115) + ' copy',
        named: true,
      });
    },
    discardDeleted: (id: string) => {
      if ((owner ? doc.id : doc.localId) !== id) return;
      switchVersion++;
      clearTimeout(timer);
      conflict = null;
      cloudError = '';
      saved = '';
      setDoc({
        localId: deps.uuid(),
        title: '',
        named: false,
        draft: '',
        lastValidSource: '',
        problemId: null,
        revision: 0,
      });
    },
  };
}
