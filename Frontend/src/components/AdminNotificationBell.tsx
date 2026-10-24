"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';

interface Notice {
  event_key: string;
  kind: string;
  booking_id: number | null;
  user_id: number;
  client_name: string;
  created_at: string;
  read_at: string | null;
}

export default function AdminNotificationBell() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const hideCard = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await apiFetch(getApiUrl() + '/admin-notifications', { signal });
    const result = await response.json();
    if (!response.ok) throw Error(result.message || 'Unable to load notifications.');
    setRows(result.notifications);
    setUnread(result.unread);
    setError('');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => void load(controller.signal).catch(err => {
      if (!controller.signal.aborted) setError(err.message);
    });
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (detailsRef.current && detailsRef.current.open && !detailsRef.current.contains(event.target as Node)) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  async function read(key?: string) {
    setBusy(true);
    try {
      const response = await apiFetch(getApiUrl() + '/admin-notifications/' + (key ? encodeURIComponent(key) + '/read' : 'read-all'), { method: 'PUT' });
      if (!response.ok) throw Error('Unable to mark notifications read.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update notifications.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details
      ref={detailsRef}
      className="marc-admin-bell"
      onKeyDown={event => {
        if (event.key === 'Escape') hideCard();
      }}
    >
      <summary aria-label={'Admin notifications, ' + unread + ' unread'}>
        <Bell size={20} />
        <span>Notifications</span>
        {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}
      </summary>
      <section aria-label="Admin notifications">
        <div className="marc-admin-bell-heading">
          <h2>Notifications</h2>
          <button type="button" disabled={busy} onClick={() => void read()}>
            Mark all read
          </button>
        </div>
        {error && (
          <p role="alert">
            {error}
            <button type="button" onClick={() => void load().catch(err => setError(err.message))}>
              Retry
            </button>
          </p>
        )}
        {!rows.length && !error && <p>No new bookings or messages.</p>}
        <ul>
          {rows.map(row => (
            <li key={row.event_key} data-unread={!row.read_at}>
              <Link
                href={row.kind === 'support' ? '/admin/clients?client=' + row.user_id : '/admin/quotes?booking=' + row.booking_id}
                onClick={() => {
                  hideCard();
                  void read(row.event_key);
                }}
              >
                <strong>
                  {row.kind === 'booking'
                    ? 'New booking #' + row.booking_id
                    : row.kind === 'project'
                    ? 'Project message #' + row.booking_id
                    : row.kind === 'quote_accepted'
                    ? 'Quotation accepted #' + row.booking_id
                    : row.kind === 'quote_changes'
                    ? 'Quotation changes requested #' + row.booking_id
                    : 'Support message'}
                </strong>
                <span>{row.client_name}</span>
                <time>{new Date(row.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</time>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </details>
  );
}
