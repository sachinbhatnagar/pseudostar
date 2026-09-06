import type { Env } from './env';
import { renderOtpEmail } from '../emails/render';
export async function sendCode(env: Env, email: string, code: string, challengeId: string) {
  const rendered = await renderOtpEmail({ code, expiresInMinutes: 10 });
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `otp/${challengeId}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [email],
      subject: 'Your PseudoStar sign-in code',
      ...rendered,
    }),
  });
  if (!response.ok) throw new Error('Email delivery was not accepted.');
  const result = (await response.json()) as { id?: unknown };
  if (typeof result.id !== 'string') throw new Error('Email delivery was not accepted.');
}
