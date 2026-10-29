"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X, Check, Trash2, Compass, AlertCircle, Calendar, MessageSquare, Wallet } from 'lucide-react';
import { apiFetch, getApiUrl, getClientSession } from '@/lib/api';

interface ClientNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean | number;
  created_at: string;
}

interface ClientNotificationBellProps {
  onNavigate?: (tab: string) => void;
  className?: string;
}

export default function ClientNotificationBell({ onNavigate, className }: ClientNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const client = getClientSession();
    if (!client) return;
    try {
      const response = await apiFetch(`${getApiUrl()}/notifications?user_id=${client.id}`, { signal });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load notifications.');
      const rows: ClientNotification[] = result.notifications || [];
      setNotifications(rows);
      setUnread(rows.filter(n => !Boolean(n.is_read)).length);
      setError('');
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const timer = setInterval(() => void load(controller.signal), 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [open]);

  const markRead = async (id: number) => {
    try {
      await apiFetch(`${getApiUrl()}/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setBusy(true);
    try {
      await apiFetch(`${getApiUrl()}/notifications/read-all`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnread(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark all read.');
    } finally {
      setBusy(false);
    }
  };

  const deleteNotification = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation();
    try {
      await apiFetch(`${getApiUrl()}/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnread(prev => notifications.find(n => n.id === id && !n.is_read) ? Math.max(0, prev - 1) : prev);
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (item: ClientNotification) => {
    void markRead(item.id);
    setOpen(false);
    if (!onNavigate) return;

    const lower = (item.title + ' ' + item.message).toLowerCase();
    const idMatch = (item.title + ' ' + item.message).match(/#(\d+)/);
    const bookingId = idMatch ? idMatch[1] : null;

    // Booking Accepted: Direct to Progress Tracking (tab: 'track') and highlight confirmed project
    if (lower.includes('booking accepted') || lower.includes('accepted by the admin') || lower.includes('has been accepted') || (lower.includes('booking') && lower.includes('accepted'))) {
      if (bookingId && typeof window !== 'undefined') {
        sessionStorage.setItem('highlight_project_id', bookingId);
      }
      onNavigate('track');
      return;
    }

    // Booking Rejected: Direct to Pending Bookings (tab: 'book') and highlight rejected booking form
    if (lower.includes('booking rejected') || lower.includes('rejected by the admin') || lower.includes('was rejected') || (lower.includes('booking') && lower.includes('rejected'))) {
      if (bookingId && typeof window !== 'undefined') {
        sessionStorage.setItem('highlight_rejected_id', bookingId);
      }
      onNavigate('book');
      return;
    }

    if (lower.includes('milestone') || lower.includes('stage') || lower.includes('progress') || lower.includes('handover') || lower.includes('rating') || lower.includes('track')) {
      if (bookingId && typeof window !== 'undefined') {
        sessionStorage.setItem('highlight_project_id', bookingId);
      }
      onNavigate('track');
    } else if (lower.includes('quote') || lower.includes('quotation')) {
      onNavigate('quotes');
    } else if (lower.includes('payment') || lower.includes('gcash') || lower.includes('billing')) {
      onNavigate('payments');
    } else if (lower.includes('booking') || lower.includes('schedule') || lower.includes('reschedule')) {
      onNavigate('book');
    } else if (lower.includes('chat') || lower.includes('support')) {
      onNavigate('chat');
    }
  };

  const getIconForNotification = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('milestone') || lower.includes('stage') || lower.includes('track') || lower.includes('progress')) {
      return <Compass size={16} className="text-brand-600 shrink-0 mt-0.5" />;
    }
    if (lower.includes('payment') || lower.includes('billing')) {
      return <Wallet size={16} className="text-amber-600 shrink-0 mt-0.5" />;
    }
    if (lower.includes('quote')) {
      return <MessageSquare size={16} className="text-stone-700 shrink-0 mt-0.5" />;
    }
    if (lower.includes('booking') || lower.includes('schedule')) {
      return <Calendar size={16} className="text-brand-700 shrink-0 mt-0.5" />;
    }
    return <AlertCircle size={16} className="text-brand-500 shrink-0 mt-0.5" />;
  };

  const defaultButtonClass = "relative flex shrink-0 min-h-11 min-w-11 items-center justify-center p-2 md:p-2.5 rounded-xl text-white bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 transition shadow-sm cursor-pointer";

  return (
    <div ref={containerRef} className="relative z-40">
      <button
        type="button"
        aria-label={`Notifications, ${unread} unread`}
        title="Notifications & Project Updates"
        onClick={() => setOpen(prev => !prev)}
        className={className || defaultButtonClass}
      >
        <Bell size={18} className="text-white" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black font-mono text-white bg-brand-700 rounded-full border-2 border-stone-800 shadow-xs">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Client notification tray"
          className="marc-client-notification-tray absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden animate-fadeIn text-black z-50 text-left"
        >
          {/* Header */}
          <div className="marc-notif-header flex items-center justify-between px-4 py-3 bg-stone-900 text-white">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-amber-400" />
              <h3 className="text-xs font-bold font-serif tracking-wide uppercase">Project Updates</h3>
              {unread > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-800 text-brand-100 font-bold">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void markAllRead()}
                  className="text-[11px] text-stone-300 hover:text-white underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100">
            {error && (
              <p role="alert" className="p-3 text-xs text-red-600 bg-red-50">
                {error}
              </p>
            )}

            {!notifications.length && !error && (
              <div className="p-8 text-center text-black space-y-2">
                <Bell size={24} className="mx-auto text-black stroke-1" />
                <p style={{ color: '#000000' }} className="text-xs font-bold !text-black">No project updates yet</p>
                <p style={{ color: '#000000' }} className="text-[11px] !text-black">Milestone updates and booking alerts will appear here in real time.</p>
              </div>
            )}

            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3 sm:p-3.5 flex items-start justify-between gap-3 cursor-pointer transition-colors hover:bg-stone-50 ${
                  !Boolean(item.is_read) ? 'bg-amber-50/40 border-l-3 border-amber-600' : 'bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {getIconForNotification(item.title)}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p
                        style={{ color: '#000000' }}
                        className={`text-xs leading-tight !text-black ${!Boolean(item.is_read) ? 'font-black' : 'font-bold'}`}
                      >
                        {item.title}
                      </p>
                      {!Boolean(item.is_read) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                      )}
                    </div>
                    <p
                      style={{ color: '#000000' }}
                      className="text-[11px] !text-black leading-snug break-words"
                    >
                      {item.message}
                    </p>
                    <time
                      style={{ color: '#000000' }}
                      className="block text-[10px] !text-black pt-0.5"
                    >
                      {new Date(item.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                    </time>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    title="Dismiss notification"
                    onClick={(e) => void deleteNotification(e, item.id)}
                    className="p-1 text-black hover:text-red-700 rounded-md hover:bg-stone-100 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}