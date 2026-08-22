"use client";
import React, { useState, useEffect } from 'react';
import { Home, Grid, Calendar, Compass, MessageSquare, LogOut } from 'lucide-react';

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
  const [internalTab, setInternalTab] = useState('home');
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Use external states if provided, otherwise fallback to internal state management
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalTab;
  const setActiveTab = externalSetActiveTab || setInternalTab;

  const tabs = [
    { id: 'home', label: 'HOME', icon: Home, desktopLabel: 'Dashboard Home' },
    { id: 'work', label: 'WORK', icon: Grid, desktopLabel: 'Inspirations Portfolio' },
    { id: 'book', label: 'BOOK', icon: Calendar, desktopLabel: 'Book Consultations' },
    { id: 'track', label: 'TRACK', icon: Compass, desktopLabel: 'Live Build Tracking' },
    { id: 'chat', label: 'CHAT', icon: MessageSquare, desktopLabel: 'Design Concierge' },
  ];

  useEffect(() => {
    setIsCollapsed(true);
  }, []);

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* 1. DESKTOP SIDEBAR NAVIGATION */}
      <aside 
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`hidden md:flex bg-[#0070c0] text-white flex-col justify-between p-4 shadow-xl shrink-0 z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="space-y-8">
          <div className={`flex items-center space-x-3 py-4 border-b border-blue-600/30 transition-all duration-200 ${isCollapsed ? 'justify-center px-0' : 'px-2'}`}>
            <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center font-serif font-black border border-white/20 shrink-0">
              M
            </div>
            {!isCollapsed && (
              <div className="animate-in fade-in zoom-in-95 duration-200 object-contain overflow-hidden whitespace-nowrap">
                <h1 className="text-sm font-serif font-black tracking-widest">MARC CUSTOM</h1>
                <p className="text-[9px] uppercase tracking-wider text-blue-200">Interior Systems</p>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={isCollapsed ? tab.desktopLabel : undefined}
                  className={`w-full flex items-center rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer border-none ${
                    isCollapsed ? 'justify-center p-3.5' : 'space-x-3 px-4 py-3'
                  } ${
                    isSelected 
                      ? 'bg-white text-[#0070c0] shadow-md font-black scale-[1.02]' 
                      : 'text-blue-100/80 hover:bg-white/10 hover:text-white bg-transparent'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {!isCollapsed && (
                    <span className="animate-in fade-in duration-200 whitespace-nowrap">{tab.desktopLabel}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className={`py-3 border-t border-blue-600/30 transition-all duration-200 flex flex-col items-center ${isCollapsed ? 'px-0' : 'px-2 items-start'}`}>
          {!isCollapsed && (
            <button 
              onClick={() => setActiveTab('profile')}
              className="mb-3 text-left w-full px-1 bg-transparent border-none cursor-pointer group hover:opacity-80 transition"
            >
              <p className="text-[9px] uppercase text-blue-200 tracking-wider font-bold">Logged In As</p>
              <p className="text-xs font-bold text-white truncate max-w-[180px] group-hover:underline">{userName}</p>
            </button>
          )}

          <button
            onClick={handleLogoutClick}
            title={isCollapsed ? 'Log Out' : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer border-none text-blue-100/80 hover:bg-red-500/20 hover:text-white bg-transparent mb-2 ${
              isCollapsed ? 'justify-center p-3.5' : 'space-x-3 px-3 py-2.5'
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0 stroke-[1.8]" />
            {!isCollapsed && (
              <span className="animate-in fade-in duration-200 whitespace-nowrap">Log Out</span>
            )}
          </button>

          <p className="text-[9px] text-blue-200/60 tracking-wider font-mono w-full text-center mt-1">
            {isCollapsed ? '©26' : '© 2026 MARC CUSTOM DESIGNS'}
          </p>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto bg-slate-50 relative p-4 md:p-8 pb-24 md:pb-8 w-full max-w-7xl mx-auto">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { userName, setActiveTab } as any);
          }
          return child;
        })}
      </main>

      {/* 3. MOBILE ONLY: BOTTOM NAVIGATION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0070c0] border-t border-blue-600/30 px-2 py-2 flex justify-around items-center z-50 shadow-lg">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-all px-2 py-1 rounded-xl cursor-pointer border-none bg-transparent ${
                isSelected ? 'text-white scale-105 font-black' : 'text-blue-100/70'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isSelected ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[8px] tracking-wider mt-1 uppercase font-bold">{tab.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}