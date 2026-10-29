"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, X, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';

interface Notice {
  event_key: string;
  kind: string;
  booking_id: number | null;
  user_id: number;
  client_name: string;
  created_at: string;
  read_at: string | null;
  archived_at?: string | null;
}

export default function AdminNotificationBell() {
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [rows, setRows] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const hideCard = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  const load = useCallback(async (currentTab: 'active' | 'archived' = tab, signal?: AbortSignal) => {
    try {
      const response = await apiFetch(`${getApiUrl()}/admin-notifications?status=${currentTab}`, { signal });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Unable to load notifications.');
      setRows(result.notifications || []);
      setUnread(result.unread || 0);
      setActiveCount(result.active_count || 0);
      setArchivedCount(result.archived_count || 0);
      setError('');
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    }
  }, [tab]);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => void load(tab, controller.signal);
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load, tab]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (detailsRef.current && detailsRef.current.open) {
        const target = event.target as Node;
        const section = detailsRef.current.querySelector('section');
        const summary = detailsRef.current.querySelector('summary');
        if (section && !section.contains(target) && summary && !summary.contains(target)) {
          detailsRef.current.open = false;
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  async function markAllRead() {
    setBusy(true);
    try {
      const response = await apiFetch(`${getApiUrl()}/admin-notifications/read-all`, { method: 'PUT' });
      if (!response.ok) throw Error('Unable to mark notifications read.');
      await load(tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update notifications.');
    } finally {
      setBusy(false);
    }
  }

  async function markRead(key: string) {
    try {
      await apiFetch(`${getApiUrl()}/admin-notifications/${encodeURIComponent(key)}/read`, { method: 'PUT' });
      await load(tab);
    } catch {
      // ignore
    }
  }

  async function toggleArchive(event: React.MouseEvent, key: string) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    try {
      const response = await apiFetch(`${getApiUrl()}/admin-notifications/${encodeURIComponent(key)}/archive`, { method: 'PUT' });
      if (!response.ok) throw Error('Unable to archive notification.');
      await load(tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive notification.');
    } finally {
      setBusy(false);
    }
  }

  async function archiveAll() {
    setBusy(true);
    try {
      const response = await apiFetch(`${getApiUrl()}/admin-notifications/archive-all`, { method: 'PUT' });
      if (!response.ok) throw Error('Unable to archive notifications.');
      await load(tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive all.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteNotice(event: React.MouseEvent, key: string) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    try {
      const response = await apiFetch(`${getApiUrl()}/admin-notifications/${encodeURIComponent(key)}`, { method: 'DELETE' });
      if (!response.ok) throw Error('Unable to delete notification.');
      await load(tab);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete notification.');
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
        <span className="hidden sm:inline marc-admin-bell-label">Notifications</span>
        {unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}
      </summary>
      <section aria-label="Admin notifications">
        {/* Header */}
        <div className="marc-admin-bell-heading">
          <h2>Notifications</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {tab === 'active' && (
              <>
                <button type="button" disabled={busy} onClick={() => void markAllRead()}>
                  Mark all read
                </button>
                <button type="button" disabled={busy} onClick={() => void archiveAll()} title="Archive all active notifications">
                  Archive all
                </button>
              </>
            )}
            <button
              type="button"
              aria-label="Close notifications"
              onClick={hideCard}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                opacity: 0.85,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab switcher: Active vs Archived */}
        <div className="flex border-b border-stone-200 bg-stone-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              tab === 'active'
                ? 'border-brand-700 bg-white text-brand-900 font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setTab('archived')}
            className={`flex-1 py-2 text-center transition-colors border-b-2 ${
              tab === 'archived'
                ? 'border-brand-700 bg-white text-brand-900 font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>

        {error && (
          <p role="alert" className="text-red-700 bg-red-50 p-2 text-xs">
            {error}
            <button type="button" className="ml-2 underline font-bold" onClick={() => void load(tab)}>
              Retry
            </button>
          </p>
        )}

        {!rows.length && !error && (
          <p className="p-4 text-xs text-stone-500 text-center">
            {tab === 'active' ? 'No active notifications.' : 'No archived notifications.'}
          </p>
        )}

        <ul>
          {rows.map(row => (
            <li
              key={row.event_key}
              data-unread={!row.read_at}
              data-kind={row.kind}
              className="relative group transition-colors hover:bg-stone-50"
            >
              <div className="flex items-start justify-between">
                <Link
                  href={row.kind === 'support' ? '/admin/clients?client=' + row.user_id : '/admin/quotes?booking=' + row.booking_id}
                  onClick={() => {
                    hideCard();
                    void markRead(row.event_key);
                  }}
                  className="flex-1 pr-2"
                >
                  <strong
                    style={row.kind === 'support' ? { color: '#6b6458' } : undefined}
                    className={row.kind === 'support' ? 'marc-support-notice-title' : undefined}
                  >
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

                {/* Individual Action Buttons: Archive & Delete */}
                <div className="flex items-center gap-1 pt-3 pr-3 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={e => void toggleArchive(e, row.event_key)}
                    title={tab === 'archived' ? 'Restore to Active' : 'Archive notification'}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/70 transition-colors"
                  >
                    {tab === 'archived' ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={e => void deleteNotice(e, row.event_key)}
                    title="Delete notification"
                    className="p-1.5 rounded-lg text-stone-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </details>
  );
}
