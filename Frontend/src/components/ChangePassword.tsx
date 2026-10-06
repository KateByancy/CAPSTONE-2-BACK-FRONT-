"use client";

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { getApiUrl } from '@/lib/api';

export default function ChangePassword({ role }: { role: 'client' | 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    formRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    currentPasswordRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  function closeForm() {
    setIsOpen(false);
    setCurrentPassword(''); setNewPassword(''); setConfirmation('');
    setError(''); setMessage('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(''); setMessage('');
    if (newPassword !== confirmation) { setError('New passwords must match.'); return; }
    if (new TextEncoder().encode(newPassword).length > 72) { setError('Password is too long. Use fewer characters.'); return; }
    const token = localStorage.getItem(`${role}Token`);
    if (!token) { setError('Please sign in again to change your password.'); return; }
    setSaving(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.errors?.[0]?.message || result.message || 'Unable to change password.');
      if (result.token) localStorage.setItem(`${role}Token`, result.token);
      setCurrentPassword(''); setNewPassword(''); setConfirmation('');
      setMessage('Password changed successfully.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to change password.'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-4">
    <button type="button" aria-expanded={isOpen} aria-controls={formId} disabled={saving} onClick={() => { if (isOpen) closeForm(); else setIsOpen(true); }} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
      Change Password
    </button>
    {isOpen && <form ref={formRef} id={formId} onSubmit={submit} className="scroll-mt-4 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4">
    <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
    <fieldset disabled={saving} className="space-y-4">
      <label className="block text-xs font-bold text-slate-600">Current password
        <input ref={currentPasswordRef} type="password" autoComplete="current-password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" />
      </label>
      <label className="block text-xs font-bold text-slate-600">New password
        <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" />
      </label>
      <p className="text-xs text-slate-500">Use at least 8 characters and a different password from your current one.</p>
      <label className="block text-xs font-bold text-slate-600">Confirm new password
        <input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-900" />
      </label>
      <button type="submit" className="w-full rounded-xl bg-[#111c3a] p-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Changing password...' : 'Change Password'}</button>
      <button type="button" onClick={closeForm} className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    </form>}
  </div>;
}
