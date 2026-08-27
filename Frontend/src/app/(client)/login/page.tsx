"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { renderGoogleButton } from '@/lib/google-auth';
import { ChevronLeft, Home, Loader2, ShieldCheck, Layout, Eye } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess?: (userName?: string) => void; // pass the authenticated user name back to the parent
  onBackToLanding?: () => void;
  onNavigateToRegister?: () => void; // Added prop for registration routing
}

interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: {
    id: number;
    fullname: string;
    email: string;
    phone?: string;
    address?: string;
  };
  admin?: {
    id: number;
    fullname: string;
    email: string;
    role: string;
  };
}

export default function ClientLoginPage({ onLoginSuccess, onBackToLanding, onNavigateToRegister }: LoginViewProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const credentials = { email: email.trim(), password };
      let response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      let result: LoginResponse = await response.json();

      if (!response.ok) {
        response = await fetch(`${apiUrl}/auth/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        result = await response.json();
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Unable to sign in.');
      }

      if (result.admin) {
        if (result.token) localStorage.setItem('adminToken', result.token);
        localStorage.setItem('adminAccount', JSON.stringify(result.admin));
        router.push('/admin/dashboard');
        return;
      }

      if (!result.user) {
        throw new Error('The server did not return an account.');
      }

      if (result.token) localStorage.setItem('clientToken', result.token);
      localStorage.setItem('clientAccount', JSON.stringify(result.user));
      if (onLoginSuccess) {
        onLoginSuccess(result.user.fullname);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential: string) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/google`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
      });
      const result: LoginResponse = await response.json();
      if (!response.ok || !result.success || !result.user) throw new Error(result.message || 'Unable to sign in with Google.');
      if (result.token) localStorage.setItem('clientToken', result.token);
      localStorage.setItem('clientAccount', JSON.stringify(result.user));
      if (onLoginSuccess) onLoginSuccess(result.user.fullname);
      else router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleButtonRef.current) return;
    void renderGoogleButton(googleButtonRef.current, (credential) => void handleGoogleSignIn(credential))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load Google sign-in.'));
  }, []);

  return (
    <div className="min-h-screen bg-[#072448] flex items-center justify-center text-slate-100 font-sans selection:bg-[#00529b]/30">
      
      {/* Dynamic Shell Container: Seamless adaptive desktop flex layout */}
      <div className="w-full min-h-screen lg:min-h-[850px] lg:max-w-6xl lg:grid lg:grid-cols-12 lg:bg-[#102243]/30 lg:backdrop-blur-md lg:rounded-[40px] lg:overflow-hidden lg:shadow-2xl lg:border lg:border-white/5 lg:m-6">
        
        {/* LEFT COLUMN: Cinematic Desktop Brand Panel */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-[#00529b] to-[#002d62] p-12 flex-col justify-between relative overflow-hidden border-r border-white/5">
          <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-black/20 blur-2xl pointer-events-none" />

          {/* Upper Nav Identity */}
          <button 
            type="button" 
            onClick={() => onBackToLanding ? onBackToLanding() : router.push('/')} 
            className="flex items-center space-x-2 text-xs font-semibold tracking-wider uppercase text-slate-200/80 hover:text-white transition group self-start cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return to Main</span>
          </button>

          {/* Central Showcase Modules */}
          <div className="space-y-8 my-auto relative z-10">
            <div className="w-20 h-20 bg-[#102243]/80 rounded-3xl flex items-center justify-center border border-white/10 shadow-xl">
              <Home className="w-10 h-10 text-slate-100" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-wider font-serif text-white">MARC</h1>
              <p className="text-xs uppercase tracking-widest text-slate-300 font-bold">
                Custom Interior Design Portal
              </p>
            </div>

            <p className="text-sm text-slate-200/70 font-medium leading-relaxed max-w-sm">
              Sign in to manage your custom structural requests, track real-time design timelines, and collaborate directly with your admin team.
            </p>

            {/* Quick trust metrics */}
            <div className="pt-6 space-y-3 border-t border-white/10 max-w-xs">
              <div className="flex items-center space-x-3 text-xs text-slate-300/90">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Secure Client Workspace</span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-slate-300/90">
                <Layout className="w-4 h-4 text-sky-400" />
                <span>Interactive Concept Mapping</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] opacity-40 font-mono tracking-widest">
            © {new Date().getFullYear()} MARC SYSTEM INC.
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Form Sheet Container */}
        <div className="col-span-12 lg:col-span-7 flex justify-center items-center py-6 px-4 md:px-8">
          <div className="w-full max-w-md bg-gradient-to-b from-[#00529b] to-[#002d62] lg:from-transparent lg:to-transparent rounded-[32px] lg:rounded-none overflow-hidden shadow-2xl lg:shadow-none p-6 md:p-8 flex flex-col min-h-[740px] lg:min-h-0 justify-between relative border border-white/10 lg:border-none">
            
            {/* Top Header Utilities (Visible on mobile screens) */}
            <div className="flex justify-between items-center w-full pt-2 lg:hidden">
              <button 
                type="button" 
                disabled={isLoading}
                onClick={() => onBackToLanding ? onBackToLanding() : router.push('/')} 
                className="p-2.5 bg-white/15 hover:bg-white/20 active:scale-95 rounded-xl transition text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] opacity-40 font-mono tracking-widest">9:41</span>
            </div>

            {/* Branding Module (Visible on mobile screens) */}
            <div className="flex flex-col items-center text-center my-auto lg:my-0 lg:mb-8 space-y-4 lg:hidden">
              <div className="w-16 h-16 bg-[#102243] rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                <Home className="w-8 h-8 text-slate-100" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wider font-serif">MARC</h1>
                <p className="text-[9px] uppercase tracking-widest text-slate-300 font-semibold mt-0.5">
                  Custom Interior Design
                </p>
              </div>
            </div>

            {/* Desktop Section Header Title */}
            <div className="hidden lg:block space-y-2 mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
              <p className="text-xs text-slate-300/80">Please enter your authentication details below.</p>
            </div>

            {/* Interactive Form Context */}
            <form onSubmit={handleSubmit} className="space-y-5 w-full">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl text-center font-medium">
                  {error}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] lg:text-xs font-bold text-slate-300 lg:text-slate-200 uppercase tracking-wider block px-1">
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white text-slate-900 rounded-xl px-4 py-3 text-xs lg:text-sm outline-none shadow-md font-medium placeholder:text-slate-400 border border-transparent focus:border-[#00529b] transition"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] lg:text-xs font-bold text-slate-300 lg:text-slate-200 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push('/forgot-password')}
                    className="text-[10px] font-semibold text-sky-300 hover:text-white hover:underline transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative w-full">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full bg-white text-slate-900 rounded-xl pl-4 pr-12 py-3 text-xs lg:text-sm outline-none shadow-md placeholder:text-slate-400 border border-transparent focus:border-[#00529b] transition ${
                      !showPassword ? 'tracking-widest' : 'tracking-normal'
                    }`}
                  />
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <div className="relative w-4 h-4 flex items-center justify-center">
                        <Eye className="w-4 h-4 shrink-0" />
                        {!showPassword && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-110">
                            <span className="text-slate-400 font-extrabold text-[15px] leading-none select-none rotate-[12deg] transform translate-y-[-1px]">
                              \
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-[#161f38] hover:bg-[#10172a] focus:ring-2 focus:ring-[#00529b] focus:ring-offset-2 focus:ring-offset-[#072448] disabled:opacity-75 text-white font-bold text-xs lg:text-sm py-3.5 rounded-xl transition uppercase tracking-wider shadow-lg mt-4 flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Profile...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Divider Utilities */}
            <div className="w-full space-y-5 mt-8 lg:mt-6 mb-4">
              <div className="flex items-center justify-center space-x-2 text-[9px] lg:text-xs text-slate-300/60 uppercase tracking-wider">
                <div className="h-px bg-white/20 flex-1"></div>
                <span>Or continue with</span>
                <div className="h-px bg-white/20 flex-1"></div>
              </div>

              <div
                ref={googleButtonRef}
                className={`flex min-h-11 w-full items-center justify-center overflow-hidden [&>div]:w-full ${isLoading ? 'pointer-events-none opacity-60' : ''}`}
              />

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => onNavigateToRegister ? onNavigateToRegister() : router.push('/register')}
                  className="text-[9px] lg:text-xs font-bold tracking-widest text-slate-200 lg:text-slate-300 hover:text-white hover:underline uppercase transition cursor-pointer bg-transparent border-none"
                >
                  New client? Create an account
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
