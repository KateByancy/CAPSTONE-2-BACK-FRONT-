"use client";

import GCashPayments from '@/components/GCashPayments';
import { useRouter } from 'next/navigation';

export default function AdminPayments() {
  const router = useRouter();
  return <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8"><GCashPayments role="admin" onBack={() => router.push('/admin/dashboard')} /></div>;
}
