import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { readFile, readdir } from 'node:fs/promises';
export const origin = 'https://pseudostar.test';
export async function harness(options: { groq?: boolean } = {}) {
  const built = await build({
    entryPoints: ['worker/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    mainFields: ['module', 'main'],
    conditions: ['workerd', 'worker', 'browser'],
    external: ['node:*'],
    jsx: 'automatic',
  });
  const messages: { to: string[]; html: string; text: string }[] = [];
  let rejectMail = false;
  const explanations: Record<string, unknown>[] = [];
  let groqMode = 'ok';
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      cf: false,
      modules: true,
      script: built.outputFiles[0].text,
      compatibilityDate: '2026-09-06',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: ['DB'],
      bindings: {
        APP_ORIGIN: origin,
        OTP_HMAC_SECRET: 'test-only-secret-with-more-than-32-characters',
        RESEND_API_KEY: 'test-only',
        RESEND_FROM: 'PseudoStar <test@example.com>',
        ...(options.groq === false ? {} : { GROQ_API_KEY: 'test-only-groq' }),
      },
      serviceBindings: { ASSETS: () => new Response('asset') },
      outboundService: async (request) => {
        if (new URL(request.url).hostname === 'api.groq.com') {
          const payload = (await request.json()) as Record<string, unknown>;
          explanations.push(payload);
          if (groqMode === 'retry-once') {
            groqMode = 'ok';
            return new Response('{}', { status: 503 });
          }
          if (groqMode === 'failure')
            return new Response('private provider error', { status: 429 });
          const context = JSON.parse((payload.messages as { content: string }[])[1].content);
          return Response.json({
            choices: [
              {
                finish_reason: groqMode === 'truncated' ? 'length' : 'stop',
                message: {
                  content:
                    groqMode === 'malformed'
                      ? 'not json'
                      : JSON.stringify({
                          paragraph: 'This instruction shows the value on the screen.',
                          nextSteps: context.privateReferenceSolution
                            ? [
                                'Check whether the input is in the required range.',
                                'Show the result for each possible case.',
                              ]
                            : [],
                          steps:
                            groqMode === 'single-step'
                              ? ['Read a value and store it in number.']
                              : context.kind === 'block'
                                ? []
                                : ['Read the value.', 'Show the result.'],
                        }),
                  reasoning: 'Private reasoning must not be returned.',
                },
              },
            ],
          });
        }
        if (new URL(request.url).hostname !== 'api.resend.com')
          throw new Error('Unexpected outbound request.');
        if (rejectMail) return new Response('{}', { status: 503 });
        messages.push((await request.json()) as (typeof messages)[number]);
        return Response.json({ id: crypto.randomUUID() });
      },
    }),
  );
  const db = await mf.getD1Database('DB');
  for (const migration of (await readdir('migrations'))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    const sql = await readFile(`migrations/${migration}`, 'utf8');
    for (const statement of sql.split(';').filter((v) => v.trim()))
      await db.prepare(statement).run();
  }
  async function request(
    path: string,
    method = 'GET',
    data?: unknown,
    cookie?: string,
    requestOrigin = origin,
  ) {
    return mf.dispatchFetch(origin + path, {
      method,
      headers: {
        origin: requestOrigin,
        'content-type': 'application/json',
        'CF-Connecting-IP': '192.0.2.1',
        ...(cookie ? { cookie } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  }
  async function challenge(email = 'learner@example.com') {
    const response = await request('/api/auth/request-code', 'POST', { email });
    if (response.status !== 200) throw new Error(`Challenge failed: ${response.status}`);
    const { challengeId } = (await response.json()) as { challengeId: string };
    const code = messages.at(-1)!.text.match(/\b\d{6}\b/)![0];
    return { challengeId, code };
  }
  async function login(email = 'learner@example.com') {
    const c = await challenge(email);
    const response = await request('/api/auth/verify', 'POST', c);
    if (response.status !== 200) throw new Error(`Verification failed: ${response.status}`);
    return {
      cookie: response.headers.get('set-cookie')!.split(';')[0],
      ...((await response.json()) as { user: { id: string; email: string } }),
    };
  }
  return {
    mf,
    db,
    request,
    challenge,
    login,
    messages,
    explanations,
    groqMode: (mode: string) => {
      groqMode = mode;
    },
    rejectMail: (value: boolean) => {
      rejectMail = value;
    },
    close: () => mf.dispose(),
  };
}
