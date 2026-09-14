"use client";

import { useState } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function AdminForgotPassword() {
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function requestCode() {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(`${getApiUrl()}/auth/admin/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to request a code.');
      setChallenge(result.challenge); setCode(''); setMessage(result.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to request a code.'); }
    finally { setBusy(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return requestCode();
    setError(''); setMessage('');
    if (password !== confirmation) { setError('Passwords must match.'); return; }
    setBusy(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/admin/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ challenge, code, password }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to reset your password.');
      localStorage.removeItem('adminToken'); localStorage.removeItem('adminAccount');
      setPassword(''); setConfirmation(''); setCode(''); setChallenge('');
      setDone(true); setMessage(result.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to reset your password.'); }
    finally { setBusy(false); }
  }

  const inputClass = 'mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500';
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-12 text-white flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Reset admin password</h1>
        <p className="mt-3 text-sm text-slate-400">Verify using the mobile number saved in your Admin Profile Settings.</p>
        {message && <p role="status" className="mt-4 text-sm text-emerald-300">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
        {!done && <form onSubmit={submit} className="mt-5 space-y-4">
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
            <label className="block text-sm" htmlFor="admin-phone">Admin Phone Number 
              <input id="admin-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="Enter the phone Number" required maxLength={30} readOnly={Boolean(challenge)} value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} />
            </label>
            {challenge && <>
              <label className="block text-sm" htmlFor="sms-code">SMS verification code
                <input id="sms-code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{4,10}" minLength={4} maxLength={10} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className={inputClass} />
              </label>
              <label className="block text-sm" htmlFor="new-password">New password
                <input id="new-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} className={inputClass} />
              </label>
              <p className="text-xs text-slate-400">Use 8–72 characters.</p>
              <label className="block text-sm" htmlFor="confirm-password">Confirm new password
                <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={e => setConfirmation(e.target.value)} className={inputClass} />
              </label>
            </>}
            <button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 cursor-pointer">{busy ? 'Please wait…' : challenge ? 'Verify code & reset password' : 'Send SMS code'}</button>
            {challenge && <div className="flex justify-between text-sm text-sky-300">
              <button type="button" onClick={() => void requestCode()} className="hover:underline cursor-pointer">Resend code</button>
              <button type="button" onClick={() => { setChallenge(''); setCode(''); setPassword(''); setConfirmation(''); setMessage(''); setError(''); }} className="hover:underline cursor-pointer">Change phone number</button>
            </div>}
          </fieldset>
          <p className="text-xs text-slate-400">If no mobile number is saved or you no longer have access to it, contact the system operator for account recovery.</p>
        </form>}
        <Link href="/admin" className="mt-6 inline-block text-sm text-sky-300 hover:underline">Back to admin login</Link>
      </section>
    </main>
  );
}
