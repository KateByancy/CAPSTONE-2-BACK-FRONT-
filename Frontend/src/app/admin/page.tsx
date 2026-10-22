"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      const response = await apiFetch(`${getApiUrl()}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result: { success: boolean; message?: string; token?: string; admin?: unknown } = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to sign in.');
      if (result.token) localStorage.setItem('adminToken', result.token);
      if (result.admin) localStorage.setItem('adminAccount', JSON.stringify(result.admin));
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
    return;

    // Legacy client-side check is intentionally disabled; authentication above is server-side.
    if (false) {
      setError('');
      // 🚀 Redirect straight to the admin dashboard!
      router.push('/admin/dashboard');
    } else {
      setError('Invalid administrator credentials.');
    }
  };

  return (
    <main className="min-h-screen bg-marc-canvas text-white flex items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="min-w-0 w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-stone-500 mb-2">Admin Access</p>
          <h1 className="text-3xl font-serif font-black tracking-tight">Sign in to Admin</h1>
          <p className="mt-3 text-sm text-stone-300">Enter your administrator credentials to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.3em] text-stone-350 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              className="min-h-11 min-w-0 w-full rounded-xl sm:rounded-2xl border border-stone-700 bg-stone-950 px-3 sm:px-4 py-3 text-xs sm:text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="block text-[10px] sm:text-[11px] uppercase tracking-[0.15em] sm:tracking-[0.3em] text-stone-350 mb-2">Password</label>
            <div className="relative w-full flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="min-h-11 min-w-0 w-full rounded-xl sm:rounded-2xl border border-stone-700 bg-stone-950 pl-3 sm:pl-4 pr-12 py-3 text-xs sm:text-sm text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {/* FIXED LOGIC: When showPassword is false (hidden), it shows EyeOff (\). When true, it shows Eye. */}
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-stone-400 hover:text-stone-200 transition bg-transparent border-none cursor-pointer z-20 flex items-center justify-center p-1"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="text-right"><Link href="/admin/forgot-password" className="text-sm text-brand-300 hover:underline">Forgot password?</Link></div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-brand-500 cursor-pointer"
          >
            Sign In
          </button>
        </form>

      </div>
    </main>
  );
}
