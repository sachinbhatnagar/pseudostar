import type { SavedProgram } from './api';

export type GuestStorage = Pick<Storage, 'getItem' | 'setItem'>;
export type GuestProgram = SavedProgram & { formatVersion: 1 };
export const GUEST_LIBRARY_KEY = 'pseudostar:guest-library:v1';
const retention = 30 * 24 * 60 * 60 * 1000;
const unavailable = 'Device storage is unavailable. Download your work before leaving.';
const corrupt =
  'The guest library could not be read. Its stored data was kept. Download your work before repairing device storage.';
type Library = { version: 1; programs: GuestProgram[] };
type GuestDraft = {
  localId: string;
  title: string;
  draft: string;
  problemId: string | null;
  lastValidSource?: string | null;
};

function device(storage?: GuestStorage): GuestStorage {
  try {
    return storage ?? localStorage;
  } catch {
    throw new Error(unavailable);
  }
}
function valid(value: unknown): value is GuestProgram {
  if (!value || typeof value !== 'object') return false;
  const p = value as GuestProgram;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.title === 'string' &&
    typeof p.draft === 'string' &&
    (p.problemId === null || typeof p.problemId === 'string') &&
    (p.lastValidSource == null || typeof p.lastValidSource === 'string') &&
    p.formatVersion === 1 &&
    Number.isSafeInteger(p.revision) &&
    p.revision > 0 &&
    Number.isFinite(p.updatedAt) &&
    (p.deletedAt === null || Number.isFinite(p.deletedAt))
  );
}
function read(storage: GuestStorage): Library {
  let raw: string | null;
  try {
    raw = storage.getItem(GUEST_LIBRARY_KEY);
  } catch {
    throw new Error(unavailable);
  }
  if (raw === null) return { version: 1, programs: [] };
  try {
    const data = JSON.parse(raw) as Library;
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.programs) ||
      !data.programs.every(valid) ||
      new Set(data.programs.map((p) => p.id)).size !== data.programs.length
    )
      throw new Error();
    return data;
  } catch {
    throw new Error(corrupt);
  }
}
function write(storage: GuestStorage, library: Library) {
  try {
    storage.setItem(GUEST_LIBRARY_KEY, JSON.stringify(library));
  } catch {
    throw new Error(unavailable);
  }
}
function nextRevision(program: GuestProgram) {
  if (program.revision >= Number.MAX_SAFE_INTEGER)
    throw new Error('This program needs a new copy before it can be saved.');
  return program.revision + 1;
}

export function listGuestPrograms(showTrash = false, storage?: GuestStorage): GuestProgram[] {
  return read(device(storage))
    .programs.filter((p) =>
      showTrash
        ? p.deletedAt !== null && p.deletedAt > Date.now() - retention
        : p.deletedAt === null,
    )
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
export function getGuestProgram(id: string, storage?: GuestStorage): GuestProgram {
  const program = read(device(storage)).programs.find((p) => p.id === id && p.deletedAt === null);
  if (!program) throw new Error('Guest program not found.');
  return program;
}
export function deleteGuestProgram(id: string, storage?: GuestStorage): GuestProgram {
  const target = device(storage),
    library = read(target);
  const program = library.programs.find((p) => p.id === id && p.deletedAt === null);
  if (!program) throw new Error('Guest program not found.');
  program.revision = nextRevision(program);
  program.deletedAt = program.updatedAt = Date.now();
  write(target, library);
  return program;
}
export function restoreGuestProgram(id: string, storage?: GuestStorage): GuestProgram {
  const target = device(storage),
    library = read(target);
  const program = library.programs.find(
    (p) => p.id === id && p.deletedAt !== null && p.deletedAt > Date.now() - retention,
  );
  if (!program) throw new Error('Recoverable guest program not found.');
  program.revision = nextRevision(program);
  program.deletedAt = null;
  program.updatedAt = Date.now();
  write(target, library);
  return program;
}

// Archive before updating the active recovery key. A failed write leaves old data intact.
export function saveGuestProgram(
  draft: GuestDraft,
  expectedRevision: number | undefined,
  storage?: GuestStorage,
): GuestProgram {
  const target = device(storage),
    library = read(target);
  const previous = library.programs.find((p) => p.id === draft.localId);
  const content = {
    title: draft.title,
    draft: draft.draft,
    problemId: draft.problemId,
    lastValidSource: draft.lastValidSource ?? null,
  };
  if (previous) {
    if (previous.deletedAt !== null)
      throw new Error('This guest program was deleted. Restore it or save a new copy.');
    const unchanged =
      previous.title === content.title &&
      previous.draft === content.draft &&
      previous.problemId === content.problemId &&
      (previous.lastValidSource ?? null) === content.lastValidSource;
    if (unchanged) return previous;
    if (previous.revision !== expectedRevision)
      throw new Error('A newer guest version exists. Save your changes as a copy.');
  }
  const program: GuestProgram = {
    ...content,
    id: draft.localId,
    formatVersion: 1,
    revision: previous ? nextRevision(previous) : 1,
    updatedAt: Date.now(),
    deletedAt: null,
  };
  if (!valid(program))
    throw new Error('The guest program is invalid. Download your work before leaving.');
  if (previous) library.programs[library.programs.indexOf(previous)] = program;
  else library.programs.push(program);
  write(target, library);
  return program;
}
