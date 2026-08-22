"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Direct credentials verification
    if (normalizedEmail === 'marc@gmail.com' && password === '12345678') {
      setError('');
      // 🚀 Redirect straight to the admin dashboard!
      router.push('/admin/dashboard');
    } else {
      setError('Invalid administrator credentials.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500 mb-2">Admin Access</p>
          <h1 className="text-3xl font-serif font-black tracking-tight">Sign in to Admin</h1>
          <p className="mt-3 text-sm text-slate-400">Enter your administrator credentials to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.3em] text-slate-500 mb-2">Password</label>
            <div className="relative w-full flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 pl-4 pr-12 py-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {/* FIXED LOGIC: When showPassword is false (hidden), it shows EyeOff (\). When true, it shows Eye. */}
              {password.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-200 transition bg-transparent border-none cursor-pointer z-20 flex items-center justify-center p-1"
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-blue-500 cursor-pointer"
          >
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          This page is the admin login entry point for <span className="font-semibold text-slate-200">/admin</span>.
        </p>
      </div>
    </main>
  );
}