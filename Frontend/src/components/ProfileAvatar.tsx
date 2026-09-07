"use client";
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function ProfileAvatar({ role, name }: { role: 'client' | 'admin'; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void fetch(`${getApiUrl()}/profile/me/avatar`, { headers: { Authorization: `Bearer ${localStorage.getItem(`${role}Token`) || ''}` }, signal: controller.signal })
      .then(async response => {
        if (response.status === 404) return;
        if (!response.ok) throw new Error('Please sign in again to load your profile picture.');
        const blob = await response.blob();
        if (active) setPhoto(URL.createObjectURL(blob));
      }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; controller.abort(); };
  }, [role]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  async function changePhoto(file?: File) {
    if (!file) return;
    setMessage('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage('Choose a JPEG, PNG or WebP image up to 5 MB.'); return;
    }
    setBusy(true);
    try {
      const body = new FormData(); body.append('avatar', file);
      const response = await fetch(`${getApiUrl()}/profile/me/avatar`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem(`${role}Token`) || ''}` }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save picture.');
      setPhoto(URL.createObjectURL(file)); setMessage('Profile picture saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save picture.'); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-col items-center gap-2">
    <div className="relative">
      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-3xl font-bold text-slate-800">
        {photo ? <img src={photo} alt={`${name || role}'s profile picture`} className="h-full w-full object-cover" /> : (name.charAt(0).toUpperCase() || 'M')}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose profile picture" onChange={event => { void changePhoto(event.target.files?.[0]); event.target.value = ''; }} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} aria-label="Change profile picture" title="Change profile picture" className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-slate-900 p-2 text-white hover:bg-slate-700 disabled:opacity-50"><Camera className="h-4 w-4" /></button>
    </div>
    <p role="status" className="max-w-xs text-center text-xs text-slate-600">{busy ? 'Uploading picture...' : message}</p>
  </div>;
}
