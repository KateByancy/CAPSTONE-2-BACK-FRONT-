"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Calendar, Compass, MessageSquare, LogOut, AlertCircle, SlidersHorizontal, Wallet, UserRound } from 'lucide-react';
import MarcBrand from '@/components/MarcBrand';
import ClientNotificationBell from '@/components/ClientNotificationBell';
import { apiFetch, getApiUrl, getClientSession } from '@/lib/api';

interface ShellProps {
  children?: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  userName?: string;
  onLogout?: () => void;
}

export default function DashboardShell({ 
  children, 
  activeTab: externalActiveTab, 
  setActiveTab: externalSetActiveTab, 
  userName = 'Doe, John',
  onLogout
}: ShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [internalTab, setInternalTab] = useState('home');
  const [bookingAlert, setBookingAlert] = useState<{ id: number; title: string; message: string } | null>(null);
  const dismissedAlertIds = useRef(new Set<number>());

  // Use external states if provided, otherwise fallback to internal state management
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalTab;
  const setActiveTab = externalSetActiveTab || setInternalTab;

  const tabs = [
    { id: 'home', label: 'Browse Designs', icon: Home },
    { id: 'customize', label: 'Customize Design', icon: SlidersHorizontal },
    { id: 'quotes', label: 'Quotations', icon: MessageSquare },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'profile', label: 'Account Profile', icon: UserRound },
    { id: 'book', label: 'Pending Bookings', icon: Calendar },
    { id: 'track', label: 'Progress Tracking', icon: Compass },
    { id: 'chat', label: 'Chat Support', icon: MessageSquare },
  ];

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const loadRejectionAlert = async () => {
      if (loading || controller.signal.aborted) return;
      const client = getClientSession();
      if (!client) return;
      loading = true;
      try {
        const response = await apiFetch(`${getApiUrl()}/notifications?user_id=${client.id}`, { signal: controller.signal });
        if (!response.ok) return;
        const result: { success?: boolean; notifications?: Array<{ id: number; title: string; message: string; is_read: boolean | number }> } = await response.json();
        if (controller.signal.aborted || result?.success === false || !Array.isArray(result?.notifications)) return;
        const rejected = result.notifications.find((notification) =>
          ['Booking Rejected', 'Booking Accepted'].includes(notification.title) && !Boolean(notification.is_read) && !dismissedAlertIds.current.has(notification.id)
        );
        setBookingAlert(rejected ? { id: rejected.id, title: rejected.title, message: rejected.message } : null);
      } catch {
        // Keep the last known alert; the next poll retries transient failures.
      } finally {
        loading = false;
      }
    };

    void loadRejectionAlert();
    const notificationTimer = window.setInterval(() => void loadRejectionAlert(), 10000);
    return () => {
      controller.abort();
      window.clearInterval(notificationTimer);
    };
  }, []);

  const dismissRejectionAlert = useCallback(async (notificationId: number) => {
    dismissedAlertIds.current.add(notificationId);
    setBookingAlert(current => current?.id === notificationId ? null : current);
    await apiFetch(`${getApiUrl()}/notifications/${notificationId}/read`, { method: 'PUT' }).catch(() => undefined);
  }, []);

  const bookingAlertId = bookingAlert?.id;
  useEffect(() => {
    if (bookingAlertId === undefined) return;
    const timer = window.setTimeout(() => void dismissRejectionAlert(bookingAlertId), 5000);
    return () => window.clearTimeout(timer);
  }, [bookingAlertId, dismissRejectionAlert]);

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className={'marc-dashboard-shell ' + (activeTab === 'chat' ? 'marc-chat-shell' : '')}>
      {bookingAlert && (
        <div role="alert" className="marc-booking-alert">
          <AlertCircle size={20} />
          <div>
            <strong>{bookingAlert.title}</strong>
            <p>{bookingAlert.message}</p>
          </div>
          <button aria-label="Dismiss notification" onClick={() => void dismissRejectionAlert(bookingAlert.id)}>
            Close
          </button>
        </div>
      )}
      <aside
        id="marc-client-sidebar"
        className="marc-sidebar"
        data-expanded={sidebarExpanded}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        onFocusCapture={() => setSidebarExpanded(true)}
        onBlurCapture={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setSidebarExpanded(false);
        }}
      >
        <button className="marc-sidebar-brand marc-navigation-brand" aria-label="Dashboard home" onClick={() => setActiveTab('home')}>
          <span className="marc-brand-expanded"><MarcBrand light /></span>
          <span className="marc-brand-compact"><MarcBrand light iconOnly /></span>
        </button>
        <nav id="marc-client-navigation" aria-label="Client navigation">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              aria-label={label}
              title={label}
              key={id}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="marc-sidebar-footer">
          <div className="marc-sidebar-user-info" aria-label={`Logged in as ${userName}`}>
            <span className="marc-user-label">LOGGED IN AS</span>
            <span className="marc-user-name">{userName}</span>
          </div>
          <button aria-label="Log out" onClick={handleLogoutClick}>
            <LogOut size={19} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
      <main data-dashboard-content className={'marc-dashboard-main ' + (activeTab === 'chat' ? 'marc-chat-main' : '')}>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-700">Client Portal</span>
            <h2 className="text-base sm:text-lg font-bold font-serif text-stone-900">
              {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ClientNotificationBell onNavigate={(target) => setActiveTab(target)} />
          </div>
        </div>
        {React.Children.map(children, child =>
          React.isValidElement(child)
            ? React.cloneElement(child, { userName, setActiveTab } as { userName: string; setActiveTab: (tab: string) => void })
            : child
        )}
      </main>
      <nav data-mobile-navigation className="marc-mobile-nav" aria-label="Mobile client navigation">
        {[
          { id: 'home', label: 'Browse', fullLabel: 'Browse Designs', icon: Home },
          { id: 'book', label: 'Bookings', fullLabel: 'Pending Bookings', icon: Calendar },
          { id: 'track', label: 'Tracking', fullLabel: 'Progress Tracking', icon: Compass },
          { id: 'chat', label: 'Chat', fullLabel: 'Chat Support', icon: MessageSquare },
          { id: 'profile', label: 'Account', fullLabel: 'Account Profile', icon: UserRound },
        ].map(({ id, label, fullLabel, icon: Icon }) => (
          <button
            key={id}
            aria-label={fullLabel}
            aria-current={(activeTab === id || (id === 'home' && activeTab === 'customize')) ? 'page' : undefined}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
