"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, LoaderCircle, RefreshCw, Smartphone, Wallet } from 'lucide-react';
import { getApiUrl, getClientSession } from '@/lib/api';

interface PaymentsProps { onBack?: () => void }
interface Booking { id: number; service_type: string; status: string }
interface Payment {
  id: number;
  booking_id: number;
  amount: string | number;
  reference_number: string;
  status: string;
  created_at: string;
  checkout_url?: string;
  payment_provider: string;
  service_type: string;
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export default function Payments({ onBack = () => undefined }: PaymentsProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookingId, setBookingId] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadBilling = useCallback(async () => {
    const client = getClientSession();
    if (!client) { setError('Please sign in again to view billing.'); setIsLoading(false); return; }
    setError('');
    try {
      const [bookingsResponse, paymentsResponse] = await Promise.all([
        fetch(`${getApiUrl()}/booking?user_id=${client.id}`),
        fetch(`${getApiUrl()}/payment?user_id=${client.id}`),
      ]);
      const bookingsResult = await bookingsResponse.json();
      const paymentsResult = await paymentsResponse.json();
      if (!bookingsResponse.ok) throw new Error(bookingsResult.message || 'Unable to load bookings.');
      if (!paymentsResponse.ok) throw new Error(paymentsResult.message || 'Unable to load payments.');
      const nextBookings = bookingsResult.bookings || [];
      setBookings(nextBookings);
      setPayments(paymentsResult.payments || []);
      setBookingId((current) => current || (nextBookings[0]?.id ? String(nextBookings[0].id) : ''));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load billing information.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const paymentResult = new URLSearchParams(window.location.search).get('payment');
    if (paymentResult === 'success') setNotice('GCash checkout completed. Payment status is being confirmed.');
    if (paymentResult === 'cancelled') setNotice('GCash checkout was cancelled. You were not charged.');
    void loadBilling();
  }, [loadBilling]);

  const paidTotal = useMemo(
    () => payments.filter((payment) => ['paid', 'verified'].includes(payment.status.toLowerCase()))
      .reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  );
  const pendingTotal = useMemo(
    () => payments.filter((payment) => payment.status.toLowerCase() === 'pending')
      .reduce((sum, payment) => sum + Number(payment.amount), 0),
    [payments],
  );

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault();
    const client = getClientSession();
    if (!client) return setError('Please sign in again before paying.');
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${getApiUrl()}/payment/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: client.id, booking_id: Number(bookingId), amount: Number(amount) }),
      });
      const result = await response.json();
      if (!response.ok || !result.checkoutUrl) throw new Error(result.message || 'Unable to start GCash checkout.');
      window.location.assign(result.checkoutUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start GCash checkout.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-xl p-2 text-slate-600 transition hover:bg-white" aria-label="Back to dashboard">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-lg font-serif font-black text-slate-900">Payments & Billing</h2>
          <p className="text-xs text-slate-500">Secure GCash checkout powered by PayMongo</p>
        </div>
      </div>

      {notice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700">{notice}</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmed payments</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{peso.format(paidTotal)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending confirmation</p>
          <p className="mt-2 text-2xl font-black text-amber-600">{peso.format(pendingTotal)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div><h3 className="text-sm font-black text-slate-800">Transaction history</h3><p className="text-[10px] text-slate-400">Payments linked to your bookings</p></div>
            <button type="button" onClick={() => void loadBilling()} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50" aria-label="Refresh payments"><RefreshCw className="h-4 w-4" /></button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-xs text-slate-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading billing...</div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">No payments have been created yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-xs font-bold text-slate-800">{payment.service_type}</p><p className="mt-1 text-[10px] text-slate-400">{payment.reference_number} · {new Date(payment.created_at).toLocaleDateString()}</p></div>
                  <div className="flex items-center gap-3 sm:text-right"><div><p className="text-sm font-black text-slate-900">{peso.format(Number(payment.amount))}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{payment.payment_provider}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${['paid', 'verified'].includes(payment.status.toLowerCase()) ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{payment.status}</span></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl bg-[#111c3a] p-6 text-white shadow-xl">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/20"><Smartphone className="h-5 w-5 text-blue-300" /></div>
          <h3 className="text-base font-black">Pay with GCash</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">You’ll continue to PayMongo’s secure checkout to authorize your payment.</p>
          <form onSubmit={startCheckout} className="mt-6 space-y-4">
            <div><label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-400">Booking</label><select required value={bookingId} onChange={(event) => setBookingId(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-xs text-white"><option value="">Select a booking</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>#{booking.id} — {booking.service_type}</option>)}</select></div>
            <div><label className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-slate-400">Amount (PHP)</label><input required min="100" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-xs text-white" /></div>
            <button disabled={isSubmitting || !bookings.length} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0070c0] py-3 text-xs font-black tracking-wider transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}{isSubmitting ? 'OPENING CHECKOUT' : 'CONTINUE TO GCASH'}<ExternalLink className="h-3.5 w-3.5" /></button>
          </form>
          {!bookings.length && !isLoading && <p className="mt-4 text-[10px] text-amber-300">Create a booking before making a payment.</p>}
        </aside>
      </div>
    </div>
  );
}
