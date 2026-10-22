"use client";
import AdminNotificationBell from '@/components/AdminNotificationBell';
import MarcBrand from '@/components/MarcBrand';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Wallet, MessageSquare, LayoutDashboard, 
  BookOpen, 
  Hammer,
  Images,
  Settings, 
  LogOut
} from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useEffect(()=>{const expired=()=>window.location.assign('/admin?reason=session-expired');window.addEventListener('session-expired',expired);return()=>window.removeEventListener('session-expired',expired);},[]);
  
  // State to track if user is hovering over the sidebar
  const [isHovered, setIsHovered] = useState(false);
  const isSchedulePage = pathname === '/admin/schedule';
  const isSidebarExpanded = isHovered || isSchedulePage;

  const markAdminOffline = React.useCallback(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    void apiFetch(`${getApiUrl()}/auth/presence/offline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    });
  }, []);

  useEffect(() => {
    const sendHeartbeat = () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      void apiFetch(`${getApiUrl()}/auth/presence`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    };
    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 20000);
    window.addEventListener('pagehide', markAdminOffline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', markAdminOffline);
    };
  }, [markAdminOffline]);

  const navItems = [
    { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Quotations', path: '/admin/quotes', icon: BookOpen },
    { label: 'Bookings', path: '/admin/book', icon: BookOpen },
    { label: 'Builds', path: '/admin/build', icon: Hammer },
    { label: 'Designs', path: '/admin/designs', icon: Images },
    { label: 'Payments', path: '/admin/payments', icon: Wallet },
    { label: 'Clients & Support', path: '/admin/clients', icon: MessageSquare },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const checkActive = (path: string) => {
    if (path === '/admin/dashboard') return pathname === '/admin/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <div className="min-w-0 w-full max-w-full min-h-screen bg-white text-stone-800 flex flex-col md:flex-row relative">
      
      {/* DESKTOP HOVER-EXPANDABLE SIDEBAR */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-marc-charcoal text-white border-r border-white/5 transition-all duration-300 ease-in-out z-50 overflow-x-hidden ${
          isSchedulePage ? 'w-[230px]' : isHovered ? 'w-64 shadow-2xl' : 'w-20'
        }`}
      >
        {/* Added overflow-x-hidden here to kill the horizontal scroll button */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          
          {/* Top Branding Section */}
          <Link href="/admin/dashboard" aria-label="Admin dashboard" className="marc-navigation-brand px-4 h-[81px] border-b border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
            <MarcBrand light />
          </Link>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-hidden">
            {navItems.map((item) => {
              const active = checkActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                    active ? 'bg-brand-400 text-marc-charcoal shadow-md' : 'text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`ml-3 transition-opacity duration-200 whitespace-nowrap ${
                    isSidebarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'
                  }`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Session Management Block */}
        <div className="p-4 border-t border-white/10 shrink-0 overflow-hidden">
          <Link 
            href="/admin" 
            onClick={() => {
              markAdminOffline();
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminAccount');
            }}
            className="flex items-center px-4 py-3 rounded-xl text-xs font-bold tracking-wider uppercase text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className={`ml-3 transition-opacity duration-200 whitespace-nowrap ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'
            }`}>
              Exit Session
            </span>
          </Link>
        </div>
      </aside>

      {/* INTERACTIVE WORK AREA */}
      <main data-dashboard-content className="min-w-0 w-full flex-1 bg-white overflow-y-auto p-3 sm:p-4 md:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        <div className="mb-4 flex justify-end"><AdminNotificationBell/></div>
        {children}
      </main>

      {/* MOBILE BOTTOM NAV BAR */}
      <nav data-mobile-navigation aria-label="Admin navigation" className="md:hidden fixed bottom-0 left-0 right-0 min-h-16 bg-marc-charcoal border-t border-white/15 grid grid-cols-5 items-center gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const active = checkActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center h-12 rounded-lg transition-colors ${
                active ? 'bg-brand-200 text-brand-900 font-bold shadow-sm' : 'text-white/80'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-normal font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
