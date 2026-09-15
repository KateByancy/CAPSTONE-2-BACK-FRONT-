import { Suspense } from 'react';
import AdminEmailRecovery from '@/components/AdminEmailRecovery';

export const metadata = {
  title: 'Reset admin password',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};

export default function AdminForgotPassword() {
  return <Suspense fallback={<main className="min-h-dvh bg-slate-950" />}><AdminEmailRecovery /></Suspense>;
}