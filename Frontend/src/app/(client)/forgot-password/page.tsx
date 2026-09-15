"use client";

import { FormEvent, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  challenge?: string;
  errors?: Array<{ message: string }>;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);

  const requestCode = async () => {
    if (isLoading) return;
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/auth/forgot-password/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = (await response.json()) as ForgotPasswordResponse;

      if (!response.ok || !result.success || !result.challenge) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Unable to request a password reset.');
      }

      setChallenge(result.challenge);
      setCode('');
      setMessage(result.message || 'If the account exists, a recovery code has been sent to its registered email.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to request a password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    if (!challenge) return requestCode();
    setError(''); setMessage('');
    if (password !== confirmation) { setError('Passwords must match.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Password is too long. Use fewer characters.'); return; }
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/reset-password/code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, code, password }),
      });
      const result = (await response.json()) as ForgotPasswordResponse;
      if (!response.ok || !result.success) throw new Error(result.errors?.[0]?.message || result.message || 'Unable to reset your password.');
      localStorage.removeItem('clientToken'); localStorage.removeItem('clientAccount');
      setPassword(''); setConfirmation(''); setCode(''); setChallenge('');
      setDone(true); setMessage(result.message || 'Password updated. You can now sign in.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reset your password.');
    } finally { setIsLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#072448] px-4 py-10 text-slate-100 flex items-center justify-center">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-gradient-to-b from-[#00529b] to-[#002d62] p-7 shadow-2xl md:p-9">
        <button type="button" onClick={() => router.push('/login')} className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>

        <div className="mb-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#102243]">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Enter the email you used to register. We will send a 6-digit code to that inbox so you can reset your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          {message && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div>}

          {!done && <fieldset disabled={isLoading} className="space-y-5 disabled:opacity-60">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-200">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="reset-email" type="email" required maxLength={254} readOnly={Boolean(challenge)} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-transparent bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-sky-400" />
            </div>
          </div>

          {challenge && <>
            <label htmlFor="email-code" className="block text-sm">Verification code
              <input id="email-code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900" />
            </label>
            <p className="text-xs text-slate-300">Check your inbox and spam folder. Use the newest code within 10 minutes.</p>
            <label htmlFor="new-password" className="block text-sm">New password
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900" />
            </label>
            <label htmlFor="confirm-password" className="block text-sm">Confirm new password
              <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl bg-white px-4 py-3 text-slate-900" />
            </label>
          </>}

          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#161f38] py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#10172a] disabled:opacity-60 cursor-pointer">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Please wait...' : challenge ? 'Verify code and reset password' : 'Send verification code'}
          </button>
          {challenge && <div className="flex justify-between gap-3 text-sm text-sky-200">
            <button type="button" onClick={() => void requestCode()} className="cursor-pointer hover:underline">Resend code</button>
            <button type="button" onClick={() => { setChallenge(''); setCode(''); setPassword(''); setConfirmation(''); setMessage(''); setError(''); }} className="cursor-pointer hover:underline">Change email</button>
          </div>}
          </fieldset>}
        </form>
      </section>
    </main>
  );
}
