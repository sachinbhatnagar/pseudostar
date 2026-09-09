export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      credentials: 'same-origin',
      ...options,
      signal: options.signal ?? AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('The connection is unavailable. Your draft stays on this device.', 0);
  }
  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {}
  if (!response.ok) {
    const error = data.error;
    throw new ApiError(
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : typeof data.message === 'string'
            ? data.message
            : 'The request could not be completed.',
      response.status,
      data,
    );
  }
  return data as T;
}
export type User = { id: string; email: string; name?: string; admin?: boolean };
export type SavedProgram = {
  id: string;
  title: string;
  description?: string;
  problemId: string | null;
  draft: string;
  lastValidSource?: string | null;
  revision: number;
  updatedAt: number;
  deletedAt: number | null;
};
