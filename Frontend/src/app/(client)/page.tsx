"use client";

import { useState } from 'react';

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
import DashboardShell from './dashboardshell/page';

interface ClientAccount {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
}

const formatDashboardName = (fullName: string) => {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length < 2) return nameParts[0] || 'Client User';

  return `${nameParts.at(-1)}, ${nameParts.slice(0, -1).join(' ')}`;
};

export default function ClientMasterController() {
  // Start on 'landing' so your landing page shows first
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'login' | 'register' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState('home');
  const [userName, setUserName] = useState('Doe, John');

  // 1. Landing Page: "Launch Client Workspace" button triggers login
  if (currentScreen === 'landing') {
    return (
      <LandingPage 
        onNavigateToLogin={() => setCurrentScreen('login')}
        onNavigateToRegister={() => setCurrentScreen('register')}
        onNavigateToDashboard={(tab = 'home') => {
          setActiveTab(tab);
          setCurrentScreen('dashboard');
        }}
      />
    );
  }

  // 2. Login Page: Has link/button to switch to register ("New client?")
  if (currentScreen === 'login') {
    return (
      <LoginPage
        onLoginSuccess={(name = 'Client User') => {
          setUserName(formatDashboardName(name));
          setCurrentScreen('dashboard');
        }}
        onNavigateToRegister={() => setCurrentScreen('register')}
        onBackToLanding={() => setCurrentScreen('landing')}
      />
    );
  }

  // 3. Register Page: Allows account creation and back to login
  if (currentScreen === 'register') {
    return (
      <RegisterPage 
        onRegisterSuccess={(client: ClientAccount) => {
          setUserName(formatDashboardName(client.fullname));
          setCurrentScreen('dashboard');
        }}
        onBackToLogin={() => setCurrentScreen('login')}
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
            setActiveTab={setActiveTab} 
            userName={userName} 
          />
        );
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
    >
      {renderActiveTabContent()}
    </DashboardShell>
  );
}
