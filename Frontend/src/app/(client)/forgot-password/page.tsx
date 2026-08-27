"use client";

import { FormEvent, useState } from 'react';
import { ArrowLeft, KeyRound, Loader2, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
  resetToken?: string;
  errors?: Array<{ message: string }>;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setResetToken('');
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = (await response.json()) as ForgotPasswordResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Unable to request a password reset.');
      }

      setMessage(result.message || 'If the account exists, reset instructions will be sent.');
      if (result.resetToken) setResetToken(result.resetToken);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to request a password reset.');
    } finally {
      setIsLoading(false);
    }
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
          <p className="mt-2 text-sm leading-6 text-slate-300">Enter the email connected to your account and we’ll create password-reset instructions.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          {message && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</div>}

          <div>
            <label htmlFor="reset-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-200">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-transparent bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-sky-400" />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#161f38] py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#10172a] disabled:opacity-60 cursor-pointer">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Sending request...' : 'Send reset instructions'}
          </button>
        </form>

        {resetToken && (
          <div className="mt-6 rounded-xl border border-amber-300/30 bg-amber-400/10 p-4">
            <p className="text-xs leading-5 text-amber-100">Local test mode returned a token. Continue to choose a new password.</p>
            <button type="button" onClick={() => router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`)} className="mt-3 w-full rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-amber-200 cursor-pointer">
              Continue to reset password
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
