"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, ChevronLeft, Loader2, ShieldCheck, Layers } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { renderGoogleButton } from '@/lib/google-auth';

interface ClientAccount {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
}

interface RegisterViewProps {
  onRegisterSuccess?: (client: ClientAccount) => void;
  onBackToLogin?: () => void;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: ClientAccount;
}

export default function ClientRegisterPage({ onRegisterSuccess, onBackToLogin }: RegisterViewProps) {
  const router = useRouter();

  // Input States
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: fullName,
          phone: phoneNumber,
          address: projectAddress,
          email,
          password,
        }),
      });
      const result: RegisterResponse = await response.json();

      if (!response.ok || !result.success || !result.user) {
        throw new Error(result.message || 'Unable to create your account.');
      }

      localStorage.setItem('clientAccount', JSON.stringify(result.user));
      if (result.token) localStorage.setItem('clientToken', result.token);

      if (onRegisterSuccess) {
        onRegisterSuccess(result.user);
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    } finally {
      setIsLoading(false);
    }

    /*
    // Simulated API Call
    setTimeout(() => {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      
      // 💾 SAVE TO LOCALSTORAGE: Stash user details temporarily so the login view can find them!
      localStorage.setItem('mockRegisteredUser', JSON.stringify({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase()
      }));
      
      // If a success listener is wired to a top-level wrapper component, pass the real name up
      if (onRegisterSuccess) {
        onRegisterSuccess(fullName);
      } else {
        // Fallback or development redirect strategy
        router.push('/home');
      }
    }, 1500);
    */
  };

  const handleReturnToLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      router.push('/login');
    }
  };

  const handleGoogleRegister = async (credential: string) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiUrl()}/auth/google`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
      });
      const result: RegisterResponse = await response.json();
      if (!response.ok || !result.success || !result.user) throw new Error(result.message || 'Unable to register with Google.');
      localStorage.setItem('clientAccount', JSON.stringify(result.user));
      if (result.token) localStorage.setItem('clientToken', result.token);
      if (onRegisterSuccess) onRegisterSuccess(result.user);
      else router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleButtonRef.current) return;
    void renderGoogleButton(googleButtonRef.current, (credential) => void handleGoogleRegister(credential))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load Google sign-in.'));
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#031525] flex justify-center items-center p-0 md:p-6 text-slate-100 font-sans">
      
      {/* Main Split Layout Container */}
      <div className="w-full h-screen md:h-auto md:max-w-5xl md:min-h-[750px] bg-[#051a30] md:rounded-[24px] overflow-hidden shadow-2xl flex flex-col md:flex-row border border-white/5 relative">
        
        {/* ================= LEFT SIDE: BRAND PANEL ================= */}
        <div className="hidden md:flex md:w-[45%] bg-gradient-to-b from-[#004b8d] to-[#012a52] p-10 flex-col justify-between relative border-r border-white/5">
          <div>
            <button 
              type="button"
              onClick={handleReturnToLogin}
              className="inline-flex items-center space-x-2 text-[10px] font-black tracking-widest text-white/80 hover:text-white uppercase transition bg-transparent border-none cursor-pointer p-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Login</span>
            </button>
          </div>

          <div className="my-auto space-y-6">
            <div className="w-16 h-16 bg-[#031930] rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
              <Home className="w-8 h-8 text-slate-100" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-4xl font-bold font-serif tracking-wide text-white">MARC</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-200 font-bold">
                Custom Interior Design Portal
              </p>
            </div>

            <p className="text-xs text-slate-200/80 leading-relaxed max-w-xs font-light">
              Create your account to manage your custom structural requests, track real-time design timelines, and collaborate directly with our team.
            </p>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-6">
            <div className="flex items-center space-x-3 text-xs text-slate-200/90">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Client Workspace</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-200/90">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Interactive Concept Mapping</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE: FORM PANEL ================= */}
        <div className="flex-1 bg-[#051a30] p-6 md:p-12 flex flex-col justify-between overflow-y-auto">
          
          <div className="flex justify-between items-center w-full md:hidden pt-2 pb-6">
            <button 
              type="button"
              onClick={handleReturnToLogin}
              className="p-2 bg-white/10 hover:bg-white/15 rounded-xl transition text-white border-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] opacity-40 font-mono tracking-widest">MARC DESIGN</span>
          </div>

          <div className="space-y-1.5 mb-6 md:mb-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Create Account</h2>
            <p className="text-xs text-slate-400 font-light">Please fill out your details to sign up with us.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 flex-1 flex flex-col justify-center">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                  className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Phone Number</label>
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required 
                  className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Project Address</label>
              <input 
                type="text" 
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                required
                className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition tracking-widest" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#102542] hover:bg-[#16335a] active:bg-[#0d1d33] disabled:opacity-75 text-white font-bold text-xs py-3.5 rounded-xl transition uppercase tracking-widest shadow-lg mt-2 flex items-center justify-center space-x-2 border border-white/10 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Register Now</span>
              )}
            </button>
          </form>

          <div className="w-full space-y-4 mt-6">
            <div className="flex items-center justify-center space-x-2 text-[8px] text-slate-400 uppercase tracking-wider">
              <div className="h-px bg-white/5 flex-1"></div>
              <span>Or continue with</span>
              <div className="h-px bg-white/5 flex-1"></div>
            </div>

            <div ref={googleButtonRef} className={`flex min-h-11 w-full justify-center overflow-hidden rounded-xl bg-white ${isLoading ? 'pointer-events-none opacity-60' : ''}`} />

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={handleReturnToLogin}
                className="text-[9px] font-black tracking-widest text-slate-300 hover:text-white hover:underline uppercase transition bg-transparent border-none cursor-pointer"
              >
                Already a member? Log In
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
