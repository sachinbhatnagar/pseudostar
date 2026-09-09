import type { Env } from './env';
import { requestCode, verify } from './auth';
import { logout, session } from './sessions';
import { cleanup, programs } from './programs';
import { progress } from './progress';
import { ApiError, fail, body } from './validation';
import { internalSolutions } from '../internal/solutions';
import { imports, sharedList, visibleCandidate, isAdmin } from './shared-problems';
import { explain } from './explanations';
async function api(request: Request, env: Env) {
  const url = new URL(request.url);
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (
      request.headers.get('origin') !== new URL(env.APP_ORIGIN).origin ||
      url.origin !== new URL(env.APP_ORIGIN).origin
    )
      fail(403, 'ORIGIN_REJECTED', 'Use the application origin.');
  }
  if (url.pathname === '/api/auth/request-code' && request.method === 'POST')
    return requestCode(request, env);
  if (url.pathname === '/api/auth/verify' && request.method === 'POST') return verify(request, env);
  const user = await session(request, env);
  if (url.pathname === '/api/session' && request.method === 'GET')
    return Response.json({
      user: user ? { ...user, ...(isAdmin(user) ? { admin: true } : {}) } : null,
    });
  const expectedUser = request.headers.get('X-Pseudostar-User');
  if (expectedUser !== null && !user) fail(401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
  if (expectedUser !== null && expectedUser !== user?.id)
    fail(
      409,
      'ACCOUNT_CHANGED',
      'Your signed-in account changed. Download any unsaved work, then reload before continuing.',
    );
  if (url.pathname === '/api/problems' && request.method === 'GET')
    return sharedList(env, user, url.searchParams.get('after') ?? '');
  const solutionRoute = /^\/api\/problems\/([^/]+)\/solution$/.exec(url.pathname);
  if (solutionRoute && request.method === 'POST') {
    const confirmation = await body(request);
    if (confirmation.confirmed !== true)
      fail(400, 'CONFIRM_SOLUTION', 'Confirm before viewing the solution.');
    const imported = Object.hasOwn(internalSolutions, solutionRoute[1])
      ? null
      : await visibleCandidate(env, solutionRoute[1], user);
    const source = Object.hasOwn(internalSolutions, solutionRoute[1])
      ? internalSolutions[solutionRoute[1]]
      : imported?.solution;
    if (!source) fail(404, 'NOT_FOUND', 'Solution not found.');
    return Response.json({ source, ...(imported ? { explanation: imported.explanation } : {}) });
  }
  const isLogout = url.pathname === '/api/auth/logout' && request.method === 'POST';
  const importRoute = /^\/api\/imports(?:\/([^/]+)(?:\/(generate|review))?)?$/.exec(url.pathname);
  const programRoute = /^\/api\/programs(?:\/([^/]+)(\/restore)?)?$/.exec(url.pathname);
  const progressRoute = /^\/api\/progress(?:\/([^/]+))?$/.exec(url.pathname);
  const explanationRoute = url.pathname === '/api/explanations' && request.method === 'POST';
  if (!importRoute && !programRoute && !progressRoute && !isLogout && !explanationRoute)
    fail(404, 'NOT_FOUND', 'API route not found.');
  if (!user) fail(401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
  if (importRoute) return imports(request, env, user, importRoute[1], importRoute[2]);
  if (isLogout) return logout(request, env);
  if (explanationRoute) return explain(request, env, user.id, user);
  if (programRoute) return programs(request, env, user.id, programRoute[1], !!programRoute[2]);
  return progress(request, env, user.id, progressRoute![1]);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (
      new URL(request.url).pathname !== '/api' &&
      !new URL(request.url).pathname.startsWith('/api/')
    )
      return env.ASSETS.fetch(request);
    let response: Response;
    try {
      response = await api(request, env);
    } catch (error) {
      if (
        error instanceof Error &&
        /UNIQUE constraint failed.*programs_unique_name/.test(error.message)
      )
        error = new ApiError(
          409,
          'NAME_TAKEN',
          'A program already uses this name. Choose another name.',
        );
      response =
        error instanceof ApiError
          ? Response.json(
              { error: { code: error.code, message: error.message, ...error.details } },
              { status: error.status },
            )
          : Response.json(
              {
                error: { code: 'INTERNAL_ERROR', message: 'The request failed. Try again later.' },
              },
              { status: 500 },
            );
    }
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'same-origin');
    return response;
  },
  async scheduled(_event: ScheduledController, env: Env) {
    await cleanup(env);
  },
} satisfies ExportedHandler<Env>;
