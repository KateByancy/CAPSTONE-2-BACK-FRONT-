"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getApiUrl } from '@/lib/api';
import { renderGoogleButton } from '@/lib/google-auth';
import { Eye, EyeOff } from 'lucide-react';
import MarcBrand from '@/components/MarcBrand';

interface LoginViewProps {
  onLoginSuccess?: (userName?: string) => void; // pass the authenticated user name back to the parent
  onBackToLanding?: () => void;
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

export default function ClientLoginPage({ onLoginSuccess, onBackToLanding }: LoginViewProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [googleAttempt, setGoogleAttempt] = useState(0);
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

  const handleGoogleSignIn = useCallback(async (credential: string) => {
    setError('');
    setIsLoading(true);
    try {
      const response = await apiFetch(`${getApiUrl()}/auth/google`, {
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
  }, [onLoginSuccess, router]);

  useEffect(() => {
    if (!googleButtonRef.current) return;
    let active = true;
    void renderGoogleButton(googleButtonRef.current, credential => { if (active) void handleGoogleSignIn(credential); })
      .catch(err => { if (active) setGoogleError(err instanceof Error ? err.message : 'Unable to load Google sign-in.'); });
    return () => { active = false; };
  }, [handleGoogleSignIn, googleAttempt]);

  return (
    <div className="marc-login-page"><div className="marc-login-panel">
      <section className="marc-login-form-panel">
        <button type="button" className="marc-return" onClick={() => onBackToLanding ? onBackToLanding() : router.push('/')}>Return Main</button>
        <MarcBrand /><h1>Login</h1>
        <form onSubmit={handleSubmit} className="marc-login-form">
          {error && <p role="alert" className="marc-form-error">{error}</p>}
          <label htmlFor="marc-email">Email</label><input id="marc-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={isLoading} />
          <label htmlFor="marc-password">Password</label><div className="marc-password"><input id="marc-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={isLoading} />{password && <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>}</div>
          <button type="button" className="marc-forgot" onClick={() => router.push('/forgot-password')}>Forgot Password?</button>
          <button type="submit" className="marc-primary marc-login-submit" disabled={isLoading}>{isLoading ? 'Signing in...' : 'Sign in'}</button>
        </form>
        <p className="marc-login-or">or</p><div className="marc-login-divider"><span>Continue with</span></div>
        <div ref={googleButtonRef} aria-label="Google sign-in" className={isLoading ? 'marc-google pointer-events-none opacity-60' : 'marc-google'} />
        {googleError && <div className="marc-google-error" role="status"><p>{googleError}</p><button type="button" onClick={() => { setGoogleError(''); setGoogleAttempt(attempt => attempt + 1); }}>Retry Google sign-in</button></div>}
        <p className="marc-register-link">New client? <button onClick={() => router.push('/?screen=register')}>Create an account</button></p>
      </section><div className="marc-login-photo" role="img" aria-label="Interior design inspiration" />
    </div></div>
  );
}
