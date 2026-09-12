"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Hammer, 
  Settings, 
  LogOut
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // State to track if user is hovering over the sidebar
  const [isHovered, setIsHovered] = useState(false);

  const markAdminOffline = React.useCallback(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    void fetch(`${getApiUrl()}/auth/presence/offline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    });
  }, []);

  useEffect(() => {
    const sendHeartbeat = () => {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      void fetch(`${getApiUrl()}/auth/presence`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
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
    { label: 'Bookings', path: '/admin/book', icon: BookOpen },
    { label: 'Builds', path: '/admin/build', icon: Hammer },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const checkActive = (path: string) => {
    if (path === '/admin/dashboard') return pathname === '/admin/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row relative">
      
      {/* DESKTOP HOVER-EXPANDABLE SIDEBAR */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-[#102243] text-white border-r border-white/5 transition-all duration-300 ease-in-out z-50 overflow-x-hidden ${
          isHovered ? 'w-64 shadow-2xl' : 'w-20'
        }`}
      >
        {/* Added overflow-x-hidden here to kill the horizontal scroll button */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          
          {/* Top Branding Section */}
          <div className="p-5 h-[81px] border-b border-white/15 flex items-center space-x-3 shrink-0 overflow-hidden">
            <div className="w-9 h-9 bg-[#0070c0] rounded-xl flex items-center justify-center font-bold text-base shadow-md shrink-0">
              M
            </div>
            <div className={`transition-opacity duration-200 whitespace-nowrap ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <h1 className="text-sm font-bold tracking-wider uppercase font-serif">Marc Interior</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Admin Workspace</p>
            </div>
          </div>

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
                    active ? 'bg-[#0070c0] text-white shadow-md' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`ml-3 transition-opacity duration-200 whitespace-nowrap ${
                    isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'
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
              isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none w-0'
            }`}>
              Exit Session
            </span>
          </Link>
        </div>
      </aside>

      {/* INTERACTIVE WORK AREA */}
      <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-8 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">
        {children}
      </main>

      {/* MOBILE BOTTOM NAV BAR */}
      <nav aria-label="Admin navigation" className="md:hidden fixed bottom-0 left-0 right-0 min-h-16 bg-[#0070c0] border-t border-white/15 grid grid-cols-4 items-center gap-1 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const active = checkActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center h-12 rounded-lg transition-colors ${
                active ? 'bg-white text-[#0070c0] font-bold shadow-sm' : 'text-white/80'
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
