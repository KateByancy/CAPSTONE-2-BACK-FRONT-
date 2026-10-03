"use client";

import { useRef, useState } from 'react';
import Image from 'next/image';
import { getApiUrl } from '@/lib/api';

export function imageSource(image: string) {
  return image.startsWith('/api/') ? `${getApiUrl().replace(/\/api$/, '')}${image}` : image;
}

export default function AdminImageUpload({ value, onChange, onBusyChange, disabled = false }: {
  value: string; onChange: (image: string) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG or WebP image up to 5 MB.'); return;
    }
    setBusy(true); onBusyChange?.(true);
    try {
      const body = new FormData(); body.append('image', file);
      const response = await fetch(`${getApiUrl()}/portfolio/upload`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` }, body,
      });
      const result = await response.json();
      if (!response.ok || !result.image) throw new Error(result.message || 'Unable to upload image.');
      onChange(result.image);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to upload image.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  }

  return <div className="space-y-2">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose image" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
    <button type="button" disabled={busy || disabled} onClick={() => input.current?.click()} className="min-h-11 w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 disabled:opacity-50">
      {busy ? 'Uploading image...' : 'Upload Image'}
    </button>
    <p className="text-xs text-slate-500">JPEG, PNG or WebP, up to 5 MB.{value && ' Upload another image to replace it.'}</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {value && <Image src={imageSource(value)} alt="Selected image preview" width={640} height={360} unoptimized className="max-h-48 w-full rounded-xl object-contain" />}
  </div>;
}
