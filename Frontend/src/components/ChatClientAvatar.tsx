"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { getApiUrl } from '@/lib/api';

export default function ChatClientAvatar({ clientId, initial, name }: { clientId: string; initial: string; name: string }) {
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    let active = true;
    let loading = false;
    const controller = new AbortController();
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch(`${getApiUrl()}/profile/chat/client-avatar/${encodeURIComponent(clientId)}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
          signal: controller.signal,
        });
        if (!response.ok) return;
        const blob = await response.blob();
        if (active) setPhoto(URL.createObjectURL(blob));
      } catch {
        // Keep the initial or last loaded picture during connection failures.
      } finally { loading = false; }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [clientId]);

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);

  return <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold text-white">
    {photo ? <Image src={photo} alt={`${name}'s profile picture`} width={36} height={36} unoptimized className="h-full w-full object-cover" onError={() => setPhoto('')} /> : initial}
  </div>;
}
