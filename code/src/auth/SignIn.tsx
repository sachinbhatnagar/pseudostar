import { useEffect, useState } from 'react';
import { api, type User } from '../programs/api';
export function SignIn({
  onSuccess,
  onGuest,
}: {
  onSuccess: (user: User) => void;
  onGuest: () => void;
}) {
  const [email, setEmail] = useState(''),
    [code, setCode] = useState(''),
    [challenge, setChallenge] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown > 0]);
  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ challengeId: string }>('/auth/request-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setChallenge(result.challengeId);
      setCooldown(60);
      setCode('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: User }>('/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ challengeId: challenge, code }),
      });
      onSuccess(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthForm
      email={email}
      code={code}
      challenge={!!challenge}
      error={error}
      busy={busy}
      cooldown={cooldown}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onSubmit={() => void (challenge ? verify() : send())}
      onResend={() => void send()}
      onChangeEmail={() => {
        setChallenge('');
        setError('');
        setCode('');
      }}
      onGuest={onGuest}
    />
  );
}
export interface AuthFormProps {
  email: string;
  code: string;
  challenge: boolean;
  error: string;
  busy: boolean;
  cooldown: number;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  onGuest: () => void;
}
export function AuthForm({
  email,
  code,
  challenge,
  error,
  busy,
  cooldown,
  onEmailChange,
  onCodeChange,
  onSubmit,
  onResend,
  onChangeEmail,
  onGuest,
}: AuthFormProps) {
  return (
    <main className="signin-layout">
      <div className="signin-story">
        <span className="brand-large">PseudoStar</span>
        <h1>
          Good thinking
          <br /> starts here.
        </h1>
        <p>
          Build a program. Try an idea.
          <br />
          Find out what happens next.
        </p>
        <div className="logic-illustration" aria-hidden="true">
          <span>INPUT curiosity</span>
          <span>IF youTry THEN</span>
          <span className="indented">understanding = understanding + 1</span>
          <span>ENDIF</span>
        </div>
      </div>
      <section className="signin-form">
        <h2>{challenge ? 'Check your inbox.' : 'Your ideas deserve a place.'}</h2>
        <p>
          {challenge
            ? `Enter the six-digit code sent to ${email}. It expires in 10 minutes.`
            : 'Sign in with an email code to save your programs and continue where you left off.'}
        </p>
        <form
          aria-busy={busy}
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy) onSubmit();
          }}
        >
          {!challenge ? (
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                disabled={busy}
                required
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
          ) : (
            <label>
              Sign-in code
              <input
                className="otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                disabled={busy}
                required
                value={code}
                onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ''))}
                autoFocus
                placeholder="000000"
              />
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'Please wait…' : challenge ? 'Sign in' : 'Email me a code'}
          </button>
        </form>
        {challenge && (
          <div className="auth-secondary">
            <button disabled={busy || cooldown > 0} onClick={onResend}>
              {cooldown ? `Resend in ${cooldown}s` : 'Send another code'}
            </button>
            <button disabled={busy} onClick={onChangeEmail}>
              Use another email
            </button>
          </div>
        )}
        <button className="guest-link" disabled={busy} onClick={onGuest}>
          Try a practice session without signing in
        </button>
      </section>
    </main>
  );
}
