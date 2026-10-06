"use client";

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function ChangePassword({ role }: { role: 'client' | 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, new: false, confirmation: false });
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
    setVisiblePasswords({ current: false, new: false, confirmation: false });
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
      setVisiblePasswords({ current: false, new: false, confirmation: false });
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
      {([
        { key: 'current', label: 'Current password', value: currentPassword, setValue: setCurrentPassword },
        { key: 'new', label: 'New password', value: newPassword, setValue: setNewPassword },
        { key: 'confirmation', label: 'Confirm new password', value: confirmation, setValue: setConfirmation },
      ] as const).map(field => <div key={field.key}>
        <label htmlFor={`${formId}-${field.key}`} className="block text-xs font-bold text-slate-600">{field.label}</label>
        <div className="relative mt-2">
          <input
            id={`${formId}-${field.key}`}
            ref={field.key === 'current' ? currentPasswordRef : undefined}
            type={visiblePasswords[field.key] ? 'text' : 'password'}
            placeholder={field.label}
            autoComplete={field.key === 'current' ? 'current-password' : 'new-password'}
            required
            minLength={field.key === 'current' ? undefined : 8}
            maxLength={field.key === 'current' ? undefined : 72}
            value={field.value}
            onChange={event => {
              field.setValue(event.target.value);
              if (!event.target.value) setVisiblePasswords(current => ({ ...current, [field.key]: false }));
            }}
            className="w-full rounded-xl border border-slate-200 p-3 pr-12 text-sm text-slate-900"
          />
          {field.value.length > 0 && <button
            type="button"
            aria-label={`${visiblePasswords[field.key] ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`}
            aria-pressed={visiblePasswords[field.key]}
            aria-controls={`${formId}-${field.key}`}
            onClick={() => setVisiblePasswords(current => ({ ...current, [field.key]: !current[field.key] }))}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {visiblePasswords[field.key] ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
          </button>}
        </div>
        {field.key === 'new' && <p className="mt-2 text-xs text-slate-500">Use at least 8 characters and a different password from your current one.</p>}
      </div>)}
      <button type="submit" className="w-full rounded-xl bg-[#111c3a] p-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Changing password...' : 'Change Password'}</button>
      <button type="button" onClick={closeForm} className="w-full rounded-xl border border-slate-200 p-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
    </form>}
  </div>;
}
