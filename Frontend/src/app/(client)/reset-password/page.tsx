"use client";

import { FormEvent, Suspense, useState } from 'react';
import { ArrowLeft, Eye, KeyRound, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
  errors?: Array<{ message: string }>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState(() => searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!/^[a-fA-F0-9]{64}$/.test(token.trim())) {
      setError('Enter the 64-character reset token from your reset instructions.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Password must contain 8 to 128 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      const result = (await response.json()) as ResetPasswordResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.errors?.[0]?.message || result.message || 'Unable to reset the password.');
      }
      setMessage(result.message || 'Password reset successful.');
      setPassword('');
      setConfirmPassword('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to reset the password.');
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
        <div className="mb-7">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#102243]"><KeyRound className="h-7 w-7" /></div>
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Enter your reset token and use a password containing at least 8 characters.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          {message && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p>{message}</p>
              <button type="button" onClick={() => router.push('/login')} className="mt-3 font-bold underline cursor-pointer">Sign in with your new password</button>
            </div>
          )}

          <div>
            <label htmlFor="reset-token" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-200">Reset token</label>
            <textarea id="reset-token" required value={token} onChange={(event) => setToken(event.target.value)} rows={3} placeholder="Paste the 64-character token" className="w-full resize-none rounded-xl border border-transparent bg-white px-4 py-3 font-mono text-xs text-slate-900 outline-none focus:border-sky-400" />
          </div>

          <div>
            <label htmlFor="new-password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-200">New password</label>
            <div className="relative">
              <input id="new-password" type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-transparent bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none focus:border-sky-400" />
              {password.length > 0 && (
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 cursor-pointer">
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <Eye className="h-4 w-4" />
                    {!showPassword && <span className="absolute text-[17px] font-extrabold leading-none -rotate-[12deg]">/</span>}
                  </span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-200">Confirm new password</label>
            <div className="relative">
              <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-xl border border-transparent bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none focus:border-sky-400" />
              {confirmPassword.length > 0 && (
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 cursor-pointer">
                  <span className="relative flex h-5 w-5 items-center justify-center">
                    <Eye className="h-4 w-4" />
                    {!showConfirmPassword && <span className="absolute text-[17px] font-extrabold leading-none -rotate-[12deg]">/</span>}
                  </span>
                </button>
              )}
            </div>
          </div>

          <button type="submit" disabled={isLoading || Boolean(message)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#161f38] py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-[#10172a] disabled:opacity-60 cursor-pointer">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#072448]" />}><ResetPasswordForm /></Suspense>;
}
