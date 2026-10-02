"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function ClientProfileIcon() {
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    let active = true;
    let revision = 0;
    const controller = new AbortController();
    const load = async () => {
      const request = ++revision;
      try {
        const response = await fetch(`${getApiUrl()}/profile/me/avatar`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${localStorage.getItem('clientToken') || ''}` },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const blob = await response.blob();
        if (active && request === revision) setPhoto(URL.createObjectURL(blob));
      } catch {
        // Keep the profile icon when the picture cannot be loaded.
      }
    };
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('client-avatar-updated', refresh);
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener('client-avatar-updated', refresh);
    };
  }, []);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 md:h-7 md:w-7">
      {photo ? (
        <Image src={photo} alt="Your profile picture" width={32} height={32} unoptimized className="h-full w-full object-cover" onError={() => setPhoto('')} />
      ) : <User className="h-5 w-5 text-white md:h-3.5 md:w-3.5" aria-hidden="true" />}
    </span>
  );
}
