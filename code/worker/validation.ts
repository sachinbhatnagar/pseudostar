export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new ApiError(status, code, message);
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    fail(415, 'JSON_REQUIRED', 'Send JSON data.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'INVALID_BODY', 'Send a JSON object.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > 1_500_000) {
      await reader.cancel();
      fail(413, 'BODY_TOO_LARGE', 'Reduce the document size.');
    }
    chunks.push(item.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    return fail(400, 'INVALID_BODY', 'Send a JSON object.');
  }
}
export function str(value: unknown, name: string, max: number, empty = false): string {
  if (
    typeof value !== 'string' ||
    (!empty && !value.trim()) ||
    value.length > max ||
    new TextEncoder().encode(value).length > max
  )
    fail(400, 'INVALID_FIELD', `Check ${name}.`);
  return value;
}
function programTitle(value: unknown): string {
  if (typeof value !== 'string') fail(400, 'INVALID_FIELD', 'Check title.');
  const title = value.trim();
  // Count Unicode code points. Source and workspace limits still count bytes.
  if (!title || Array.from(title).length > 120) fail(400, 'INVALID_FIELD', 'Check title.');
  return title;
}
export function integer(value: unknown, name: string, min: number, max: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max)
    fail(400, 'INVALID_FIELD', `Check ${name}.`);
  return value as number;
}
export function programInput(b: Record<string, unknown>) {
  if (b.formatVersion !== undefined && b.formatVersion !== 1)
    fail(422, 'FORMAT_VERSION', 'This document format is not supported. Export the draft first.');
  let workspace: string | null | undefined;
  if (b.workspace !== undefined) {
    if (b.workspace === null) workspace = null;
    else {
      workspace = str(b.workspace, 'workspace', 1_048_576, true);
      try {
        const root = JSON.parse(workspace);
        if (!root || typeof root !== 'object' || Array.isArray(root)) throw new Error();
        const queue: unknown[] = [root];
        let count = 0;
        while (queue.length) {
          const node = queue.pop();
          if (node && typeof node === 'object') {
            if (++count > 5000) throw new Error();
            queue.push(...Object.values(node));
          }
        }
      } catch {
        fail(400, 'INVALID_WORKSPACE', 'Use valid workspace JSON with at most 5000 objects.');
      }
    }
  }
  return {
    title: programTitle(b.title),
    draft: str(b.draft, 'draft', 204800, true),
    workspace,
    problemId:
      b.problemId === undefined
        ? undefined
        : b.problemId === null
          ? null
          : str(b.problemId, 'problemId', 120),
    lastValidSource:
      b.lastValidSource === undefined
        ? undefined
        : b.lastValidSource === null
          ? null
          : str(b.lastValidSource, 'lastValidSource', 204800, true),
  };
}
