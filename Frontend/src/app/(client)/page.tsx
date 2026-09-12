"use client";

import { useEffect, useState } from 'react';

// Import your existing pages and views
import LandingPage from './landing/page';
import LoginPage from './login/page';
import RegisterPage from './register/page';
import HomeView from './home/page';
import WorkView from './work/page';
import BookView from './book/page';
import TrackView from './track/page';
import ChatView from './chat/page';
import ProfileView from './profile/page';
import PaymentsView from './payments/page';
import DashboardShell from './dashboardshell/page';
import { formatClientName, getApiUrl, getClientSession } from '@/lib/api';

interface ClientAccount {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
}

export default function ClientMasterController() {
  // Start on 'landing' so your landing page shows first
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'login' | 'register' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState('home');
  const [userName, setUserName] = useState('Doe, John');

  useEffect(() => {
    const refreshName = () => {
      const client = getClientSession();
      if (client) setUserName(formatClientName(client.fullname));
    };
    window.addEventListener('profile-updated', refreshName);
    return () => window.removeEventListener('profile-updated', refreshName);
  }, []);

  useEffect(() => {
    const restoreSession = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem('clientAccount');
        if (!stored) return;
        const client = JSON.parse(stored) as ClientAccount;
        setUserName(formatClientName(client.fullname));
        setCurrentScreen('dashboard');
        if (new URLSearchParams(window.location.search).has('payment')) setActiveTab('payments');
      } catch {
        localStorage.removeItem('clientAccount');
        localStorage.removeItem('clientToken');
      }
    }, 0);
    return () => window.clearTimeout(restoreSession);
  }, []);

  useEffect(() => {
    if (currentScreen !== 'dashboard') return;
    const sendHeartbeat = () => {
      const token = localStorage.getItem('clientToken');
      if (!token) return;
      void fetch(`${getApiUrl()}/auth/presence`, { method:'POST', headers:{ Authorization:`Bearer ${token}` } });
    };
    sendHeartbeat();
    const timer = window.setInterval(sendHeartbeat, 20000);
    return () => window.clearInterval(timer);
  }, [currentScreen]);

  // 1. Landing Page: "Launch Client Workspace" button triggers login
  if (currentScreen === 'landing') {
    return (
      <LandingPage 
        onNavigateToLogin={() => setCurrentScreen('login')}
        onNavigateToRegister={() => setCurrentScreen('register')}
      />
    );
  }

  // 2. Login Page: Has link/button to switch to register ("New client?")
  if (currentScreen === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(name = 'Client User') => {
          setUserName(formatClientName(name));
          setCurrentScreen('dashboard');
        }}
        onBackToLanding={() => setCurrentScreen('landing')}
      />
    );
  }

  // 3. Register Page: Returns to main or opens login after account creation
  if (currentScreen === 'register') {
    return (
      <RegisterPage 
        onRegisterSuccess={() => setCurrentScreen('login')}
        onBackToMain={() => setCurrentScreen('landing')}
      />
    );
  }

  // Helper to render dashboard subpages inside the Shell
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView setActiveTab={setActiveTab} userName={userName} />;
      case 'work':
        return <WorkView />;
      case 'book':
        return <BookView />;
      case 'track':
        return <TrackView />;
      case 'chat':
        return <ChatView />;
      case 'profile':
        return (
          <ProfileView 
            userName={userName} 
          />
        );
      case 'payments':
        return <PaymentsView onBack={() => setActiveTab('home')} />;
      default:
        return <HomeView setActiveTab={setActiveTab} userName={userName} />;
    }
  };

  // 4. Main Dashboard Shell
  return (
    <DashboardShell 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      userName={userName}
      onLogout={() => {
        localStorage.removeItem('clientAccount');
        localStorage.removeItem('clientToken');
        setCurrentScreen('landing');
      }}
    >
      {renderActiveTabContent()}
    </DashboardShell>
  );
}
