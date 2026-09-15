"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/lib/api';

export default function AdminEmailRecovery() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const resetting = params.has('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(''); setMessage('');
    if (resetting && !/^[a-f0-9]{64}$/.test(token)) { setError('This reset link is invalid. Request a new link below.'); return; }
    if (resetting && password !== confirmation) { setError('Passwords must match.'); return; }
    if (resetting && new TextEncoder().encode(password).length > 72) { setError('Password is too long. Use fewer characters.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/admin/${resetting ? 'reset-password' : 'forgot-password'}/email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetting ? { token, password } : { email: email.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.errors?.[0]?.message || result.message || 'Unable to complete password recovery.');
      setMessage(result.message);
      if (resetting) {
        localStorage.removeItem('adminToken'); localStorage.removeItem('adminAccount');
        setPassword(''); setConfirmation(''); setDone(true);
        window.history.replaceState(null, '', '/admin/forgot-password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete password recovery.');
    } finally { setBusy(false); }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500';
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-12 text-white flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Reset admin password</h1>
        <p className="mt-3 text-sm text-slate-400">{resetting ? 'Choose a new password for your admin account.' : 'Enter the email registered to your admin account. We will email you a reset link valid for 15 minutes.'}</p>
        {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
        {!done && <form onSubmit={submit} className="mt-5 space-y-4">
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
            {resetting ? <>
              <label className="block text-sm" htmlFor="new-password">New password
                <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
              </label>
              <p className="text-xs text-slate-400">Use 8 to 72 characters.</p>
              <label className="block text-sm" htmlFor="confirm-password">Confirm new password
                <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} className={inputClass} />
              </label>
            </> : <label className="block text-sm" htmlFor="admin-email">Admin email address
              <input id="admin-email" type="email" autoComplete="email" placeholder="admin@example.com" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </label>}
            <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 cursor-pointer">{busy ? 'Please wait…' : resetting ? 'Save new password' : 'Send reset link'}</button>
          </fieldset>
          {!resetting && <p className="text-xs text-slate-400">Check your inbox and spam folder. Use the newest reset email if you requested more than one.</p>}
        </form>}
        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-sky-300">
          <Link href="/admin" className="hover:underline">Back to admin login</Link>
          {resetting && !done && <Link href="/admin/forgot-password" className="hover:underline">Request a new link</Link>}
        </div>
      </section>
    </main>
  );
}
