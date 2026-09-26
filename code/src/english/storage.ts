import {
  isGrade,
  skillNames,
  tools,
  type Attempt,
  type Exercise,
  type Grade,
  type Revision,
} from './model';

type DeviceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> &
  Partial<Pick<Storage, 'key' | 'length'>>;
export const GUEST_KEY = 'pseudostar:english:guest:v1';
const corrupt =
  'English stored data could not be read. Its stored data was kept. Copy your draft before repairing device storage.';
const unavailable = 'Device storage is unavailable. Copy your draft before leaving.';
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const positive = (v: unknown) => integer(v) && v > 0;
const response = (v: unknown) => record(v) && Object.values(v).every(text);
const strings = (v: unknown) => Array.isArray(v) && v.every(text);
function exercise(v: unknown): v is Exercise {
  return (
    record(v) &&
    text(v.id) &&
    !!v.id &&
    positive(v.version) &&
    isGrade(v.grade) &&
    tools.some((t) => t.id === v.tool && t.id !== 'editing') &&
    ['title', 'genre', 'instructions', 'passage'].every((k) => text(v[k])) &&
    record(v.example) &&
    ['prompt', 'response', 'explanation'].every((k) =>
      text((v.example as Record<string, unknown>)[k]),
    ) &&
    Array.isArray(v.fields) &&
    v.fields.length > 0 &&
    v.fields.every(
      (f) =>
        record(f) &&
        ['id', 'label', 'hint'].every((k) => text(f[k])) &&
        (f.options === undefined || strings(f.options)),
    ) &&
    Array.isArray(v.criteria) &&
    v.criteria.length > 0 &&
    v.criteria.every(
      (c) =>
        record(c) && text(c.skill) && Object.hasOwn(skillNames, c.skill) && text(c.description),
    ) &&
    Array.isArray(v.wordTarget) &&
    v.wordTarget.length === 2 &&
    v.wordTarget.every(integer) &&
    v.wordTarget[0] <= v.wordTarget[1] &&
    positive(v.minutes) &&
    (v.source === 'curated' || v.source === 'generated')
  );
}
function revision(v: unknown): v is Revision {
  // Guest history never trusts stored evaluations or awards.
  return (
    record(v) &&
    text(v.id) &&
    !!v.id &&
    response(v.response) &&
    text(v.plan) &&
    integer(v.submittedAt) &&
    typeof v.assisted === 'boolean' &&
    typeof v.overTime === 'boolean' &&
    v.feedback === null &&
    (v.error === null || text(v.error)) &&
    positive(v.rubricVersion)
  );
}
function valid(v: unknown): v is Attempt {
  return (
    record(v) &&
    text(v.id) &&
    !!v.id &&
    exercise(v.exercise) &&
    isGrade(v.grade) &&
    v.grade === v.exercise.grade &&
    positive(v.version) &&
    response(v.response) &&
    text(v.plan) &&
    ['practice', 'independent'].includes(v.mode as string) &&
    typeof v.assisted === 'boolean' &&
    ['plan', 'write', 'proofread'].includes(v.stage as string) &&
    (v.startedAt === null || integer(v.startedAt)) &&
    integer(v.updatedAt) &&
    integer(v.createdAt) &&
    (v.parentId === null || text(v.parentId)) &&
    Array.isArray(v.revisions) &&
    v.revisions.every(revision) &&
    new Set(v.revisions.map((r) => r.id)).size === v.revisions.length
  );
}
function device(storage?: DeviceStorage) {
  try {
    return storage ?? localStorage;
  } catch {
    throw new Error(unavailable);
  }
}
function read(key: string, storage: DeviceStorage): unknown {
  let raw;
  try {
    raw = storage.getItem(key);
  } catch {
    throw new Error(unavailable);
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(corrupt);
  }
}
function write(key: string, data: unknown, storage: DeviceStorage) {
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch {
    throw new Error(unavailable);
  }
}
export function readGuest(storage?: DeviceStorage): { grade: Grade | null; attempts: Attempt[] } {
  const data = read(GUEST_KEY, device(storage));
  if (data === undefined) return { grade: null, attempts: [] };
  if (
    !record(data) ||
    data.version !== 1 ||
    !(data.grade === null || isGrade(data.grade)) ||
    !Array.isArray(data.attempts) ||
    !data.attempts.every(valid) ||
    new Set(data.attempts.map((a) => a.id)).size !== data.attempts.length
  )
    throw new Error(corrupt);
  return { grade: data.grade as Grade | null, attempts: data.attempts };
}
export function saveGuestGrade(grade: Grade, storage?: DeviceStorage): void {
  if (!isGrade(grade)) throw new Error('Choose Grade 8, 9 or 10.');
  const target = device(storage),
    library = readGuest(target);
  write(GUEST_KEY, { version: 1, ...library, grade }, target);
}
export function saveGuestAttempt(
  attempt: Attempt,
  expectedVersion?: number,
  storage?: DeviceStorage,
): Attempt {
  const target = device(storage),
    library = readGuest(target);
  if (!valid(attempt))
    throw new Error('The guest attempt is invalid. Copy your draft before leaving.');
  const previous = library.attempts.find((a) => a.id === attempt.id);
  if (previous) {
    if (previous.version !== expectedVersion || attempt.version !== expectedVersion)
      throw new Error('A newer guest version exists. Copy your draft before reloading.');
    if (previous.version === Number.MAX_SAFE_INTEGER)
      throw new Error('Start a new copy of this attempt.');
    if (
      JSON.stringify(previous.exercise) !== JSON.stringify(attempt.exercise) ||
      previous.grade !== attempt.grade ||
      previous.createdAt !== attempt.createdAt ||
      previous.parentId !== attempt.parentId ||
      previous.revisions.some((r, i) => JSON.stringify(r) !== JSON.stringify(attempt.revisions[i]))
    )
      throw new Error('Saved submissions cannot be changed or removed.');
  } else if (attempt.version !== 1 || expectedVersion !== undefined)
    throw new Error('This guest attempt is missing. Copy your draft before reloading.');
  const saved = { ...attempt, version: previous ? previous.version + 1 : 1 };
  if (previous) library.attempts[library.attempts.indexOf(previous)] = saved;
  else library.attempts.push(saved);
  write(GUEST_KEY, { version: 1, ...library }, target);
  return saved;
}
function recoveryTab(storage?: DeviceStorage) {
  if (storage) return 'injected';
  try {
    const key = 'pseudostar:english:recovery-tab';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    throw new Error(unavailable);
  }
}
const recoveryKey = (owner: string, id: string, storage?: DeviceStorage) => {
  if (!owner || !id) throw new Error('Recovery needs an account and attempt.');
  return `pseudostar:english:recovery:v1:${encodeURIComponent(owner)}:${encodeURIComponent(id)}:${encodeURIComponent(recoveryTab(storage))}`;
};
type Recovery = { attempt: Attempt; baseVersion: number };
function readRecoveryKey(
  key: string,
  owner: string,
  id: string,
  target: DeviceStorage,
): Recovery | null {
  const data = read(key, target);
  if (data === undefined) return null;
  if (
    !record(data) ||
    data.version !== 1 ||
    data.owner !== owner ||
    !positive(data.baseVersion) ||
    !valid(data.attempt) ||
    data.attempt.id !== id ||
    data.attempt.version !== data.baseVersion ||
    data.attempt.revisions.length !== 0
  )
    throw new Error(corrupt);
  return { attempt: data.attempt, baseVersion: data.baseVersion as number };
}
function recoveryKeys(owner: string, id: string, storage?: DeviceStorage) {
  const own = recoveryKey(owner, id, storage),
    target = device(storage);
  const prefix = own.slice(0, own.lastIndexOf(':') + 1);
  const keys = new Set([own]);
  try {
    for (let i = 0; i < (target.length ?? 0); i++) {
      const key = target.key?.(i);
      if (key?.startsWith(prefix)) keys.add(key);
    }
  } catch {
    throw new Error(unavailable);
  }
  return [...keys];
}
function selectedRecovery(owner: string, id: string, storage?: DeviceStorage) {
  const target = device(storage),
    keys = recoveryKeys(owner, id, storage);
  const own = readRecoveryKey(keys[0], owner, id, target);
  if (own) return { key: keys[0], data: own };
  const candidates: { key: string; data: Recovery }[] = [];
  let failure: unknown;
  for (const key of keys.slice(1)) {
    try {
      const data = readRecoveryKey(key, owner, id, target);
      if (data) candidates.push({ key, data });
    } catch (error) {
      failure = error;
    }
  }
  candidates.sort(
    (a, b) =>
      b.data.attempt.updatedAt - a.data.attempt.updatedAt ||
      b.data.baseVersion - a.data.baseVersion ||
      a.key.localeCompare(b.key),
  );
  if (candidates.length) return candidates[0];
  if (failure) throw failure;
  return null;
}
export function readRecovery(owner: string, id: string, storage?: DeviceStorage): Recovery | null {
  return selectedRecovery(owner, id, storage)?.data ?? null;
}
export function writeRecovery(
  owner: string,
  attempt: Attempt,
  baseVersion: number,
  storage?: DeviceStorage,
): void {
  const target = device(storage),
    key = recoveryKey(owner, attempt.id, storage);
  const previous = readRecovery(owner, attempt.id, storage);
  if (previous && previous.baseVersion > baseVersion)
    throw new Error('A newer recovery version exists. Copy your draft before reloading.');
  const draft = { ...attempt, revisions: [] };
  if (!valid(draft) || !positive(baseVersion) || draft.version !== baseVersion)
    throw new Error('The recovery draft version is invalid. Copy your draft before leaving.');
  write(key, { version: 1, owner, attempt: draft, baseVersion }, target);
}
export function clearRecovery(owner: string, id: string, storage?: DeviceStorage): void {
  const target = device(storage);
  const selected = selectedRecovery(owner, id, storage);
  if (!selected) return;
  try {
    target.removeItem(selected.key);
  } catch {
    throw new Error(unavailable);
  }
}

export function clearSavedRecovery(
  owner: string,
  attempt: Attempt,
  baseVersion: number,
  storage?: DeviceStorage,
): boolean {
  const target = device(storage);
  let removed = false;
  for (const key of recoveryKeys(owner, attempt.id, storage)) {
    let recovery: Recovery | null;
    try {
      recovery = readRecoveryKey(key, owner, attempt.id, target);
    } catch {
      continue;
    } // Keep unrelated or corrupt recovery records intact.
    if (!recovery || recovery.baseVersion !== baseVersion) continue;
    const saved = recovery.attempt,
      keys = Object.keys(attempt.response);
    if (
      keys.length !== Object.keys(saved.response).length ||
      keys.some((key) => attempt.response[key] !== saved.response[key]) ||
      attempt.plan !== saved.plan ||
      attempt.stage !== saved.stage ||
      attempt.startedAt !== saved.startedAt ||
      attempt.assisted !== saved.assisted ||
      attempt.mode !== saved.mode
    )
      continue;
    try {
      target.removeItem(key);
    } catch {
      throw new Error(unavailable);
    }
    removed = true;
  }
  return removed;
}
