"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, ChevronLeft, Loader2, ShieldCheck, Layers, Eye, EyeOff } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface ClientAccount {
  id: number;
  fullname: string;
  email: string;
  phone: string;
  address: string;
  landmark?: string;
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

interface PsgcBarangay {
  code: string;
  name: string;
  province?: { name?: string } | string | null;
  city_municipality?: { name?: string } | string | null;
}

const VISAYAS_REGION_CODES = ['0600000000', '0700000000', '0800000000', '1800000000'];
const VISAYAS_ADDRESS_FALLBACKS = [
  'Cordova, Cebu',
];
let cachedVisayasBarangays: string[] | null = null;

const getLocationName = (location: PsgcBarangay['province'] | PsgcBarangay['city_municipality']) => {
  if (!location) return '';
  return typeof location === 'string' ? location : location.name || '';
};

const loadVisayasBarangayAddresses = async () => {
  if (cachedVisayasBarangays) return cachedVisayasBarangays;

  const responses = await Promise.allSettled(
    VISAYAS_REGION_CODES.map(async (regionCode) => {
      const response = await fetch(`https://psgc.cloud/api/v2/regions/${regionCode}/barangays`);
      if (!response.ok) return [];
      const result: { data?: PsgcBarangay[] } = await response.json();
      return result.data || [];
    })
  );

  const barangays = responses.flatMap((response) => response.status === 'fulfilled' ? response.value : []);
  cachedVisayasBarangays = Array.from(new Set([...VISAYAS_ADDRESS_FALLBACKS, ...barangays.map((barangay) => {
    const cityMunicipality = getLocationName(barangay.city_municipality);
    const province = getLocationName(barangay.province);
    return [barangay.name, cityMunicipality, province].filter(Boolean).join(', ');
  }).filter(Boolean)])).sort((first, second) => first.localeCompare(second));

  return cachedVisayasBarangays;
};

export default function ClientRegisterPage({ onRegisterSuccess, onBackToLogin }: RegisterViewProps) {
  const router = useRouter();

  // Input States
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [visayasBarangayAddresses, setVisayasBarangayAddresses] = useState<string[]>([]);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const addressSuggestions = useMemo(() => {
    const typedAddress = projectAddress.trim();
    if (typedAddress.length < 2) return [];

    const search = typedAddress.toLowerCase();
    const matchingAddresses = visayasBarangayAddresses.filter((suggestion) =>
      suggestion.toLowerCase().includes(search)
    );

    return matchingAddresses.sort((first, second) => {
      const firstBarangay = first.split(',')[0].trim().toLowerCase();
      const secondBarangay = second.split(',')[0].trim().toLowerCase();
      const firstStartsWithBarangay = firstBarangay.startsWith(search);
      const secondStartsWithBarangay = secondBarangay.startsWith(search);
      if (firstStartsWithBarangay !== secondStartsWithBarangay) return firstStartsWithBarangay ? -1 : 1;

      const firstStartsWithAddress = first.toLowerCase().startsWith(search);
      const secondStartsWithAddress = second.toLowerCase().startsWith(search);
      if (firstStartsWithAddress !== secondStartsWithAddress) return firstStartsWithAddress ? -1 : 1;

      return first.localeCompare(second);
    }).slice(0, 8);
  }, [projectAddress, visayasBarangayAddresses]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Confirm Password must match Password.');
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
          landmark,
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
        router.push('/');
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

  useEffect(() => {
    if (projectAddress.trim().length < 2) return;
    if (cachedVisayasBarangays) {
      setVisayasBarangayAddresses(cachedVisayasBarangays);
      return;
    }

    let isCurrent = true;
    setAddressLookupLoading(true);
    void loadVisayasBarangayAddresses()
      .then((addresses) => {
        if (isCurrent) setVisayasBarangayAddresses(addresses);
      })
      .catch(() => {
        if (isCurrent) setVisayasBarangayAddresses([]);
      })
      .finally(() => {
        if (isCurrent) setAddressLookupLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [projectAddress]);

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
                  placeholder="Enter your full name"
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
                  placeholder="09XXXXXXXXX"
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
                list="project-address-suggestions"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder={addressLookupLoading ? 'Loading Visayas barangays...' : 'Start typing barangay, city, or province'}
                required
                className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium" 
              />
              <datalist id="project-address-suggestions">
                {addressSuggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                placeholder="e.g. name@example.com"
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Nearest Landmark</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Beside the barangay hall"
                required
                className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    placeholder="At least 8 characters"
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    required
                    className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl pl-4 pr-11 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition tracking-widest"
                  />
                  {password && (
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white bg-transparent border-none cursor-pointer">
                      {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                <p className="px-1 text-[9px] text-slate-500">Use at least 8 characters.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    placeholder="Re-enter your password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    className="w-full bg-[#09223c] border border-white/5 text-white placeholder-slate-500 rounded-xl pl-4 pr-11 py-3 text-xs outline-none focus:border-sky-500/50 focus:bg-[#0b2848] transition tracking-widest"
                  />
                  {confirmPassword && (
                    <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white bg-transparent border-none cursor-pointer">
                      {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {confirmPassword && password !== confirmPassword && <p className="px-1 text-[9px] text-red-400">Passwords do not match.</p>}
              </div>
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


        </div>

      </div>
    </div>
  );
}
