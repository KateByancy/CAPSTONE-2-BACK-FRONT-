"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Smartphone } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

type Status = 'Awaiting payment' | 'For verification' | 'Paid' | 'Returned' | 'Cancelled';
interface Payment {
  id: number; booking_id: number; amount: string; description: string; status: Status;
  account_name: string; account_number: string; reference_number: string | null;
  review_note: string | null; has_proof: boolean; created_at: string; reviewed_at: string | null;
  service_type: string; client_name: string; booking_status: string;
  payment_provider: string; checkout_session_id: string | null; checkout_creating: boolean;
}
interface Booking { id: number; service_type: string; client_name: string }
interface Legacy { id: number; booking_id: number; amount: string; status: string; reference_number: string; client_name: string }
const peso = (amount: string | number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(amount));
const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';
const button = 'rounded-xl bg-[#0070c0] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export default function GCashPayments({ role, onBack }: { role: 'admin' | 'client'; onBack?: () => void }) {
  const admin = role === 'admin';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [legacy, setLegacy] = useState<Legacy[]>([]);
  const [configured, setConfigured] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const inFlight = useRef(false);
  const headers = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem(`${role}Token`) || ''}` }), [role]);
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${getApiUrl()}/payment${path}`, { ...options, headers: { ...headers(), ...options.headers }, cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.message || 'Unable to load or save payments.');
    if (path === '' && (!result || !Array.isArray(result.payments) || !Array.isArray(result.bookings) || !Array.isArray(result.legacy))) {
      throw new Error('The payment API returned an outdated or invalid response. Restart the backend and refresh this page.');
    }
    return result;
  }, [headers]);
  const load = useCallback(async () => {
    const result = await request('');
    setPayments(result.payments); setBookings(result.bookings); setLegacy(result.legacy);
    if (result.syncWarning) setError(result.syncWarning);
  }, [request]);
  useEffect(() => {
    let active = true;
    void Promise.all([request(''), request('/settings')]).then(([billing, result]) => {
      if (!active) return;
      setPayments(billing.payments); setBookings(billing.bookings); setLegacy(billing.legacy);
      setConfigured(result.provider === 'PayMongo' && result.configured === true);
      setTestMode(result.testMode === true);
      if (billing.syncWarning) setError(billing.syncWarning);
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    const refresh = () => { if (!inFlight.current && document.visibilityState === 'visible') void load().catch(err => setError(err.message)); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [load, request]);
  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl); }, [proofUrl]);
  async function mutate(path: string, body: object | FormData, message: string, method = 'POST') {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await request(path, { method, headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, body: body instanceof FormData ? body : JSON.stringify(body) });
      setNotice(message);
      await load();
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save payment.'); return false; }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function checkout(id: number) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      const result = await request(`/${id}/checkout`, { method: 'POST' });
      if (result.paid) { setNotice('PayMongo confirmed this payment.'); await load(); return; }
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.paymongo.com') throw new Error('Invalid PayMongo checkout response.');
      window.location.assign(url.href);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to start checkout.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  async function showProof(id: number) {
    setError('');
    try {
      const response = await fetch(`${getApiUrl()}/payment/${id}/proof`, { headers: headers(), cache: 'no-store' });
      if (!response.ok) throw new Error('Unable to open this receipt. Please sign in again or refresh.');
      setProofUrl(URL.createObjectURL(await response.blob()));
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to open receipt.'); }
  }
  async function submitProof(event: FormEvent<HTMLFormElement>, id: number) {
    event.preventDefault(); const form = event.currentTarget; const body = new FormData(form);
    const file = body.get('proof');
    if (!(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024) { setError('Choose a receipt image no larger than 5 MB.'); return; }
    if (await mutate(`/${id}/proof`, body, 'Receipt submitted. Please wait for admin verification.')) form.reset();
  }
  const total = (status: Status) => payments.filter(p => p.status === status).reduce((sum, p) => sum + Number(p.amount), 0);
  return <div className="space-y-6 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">{onBack && <button onClick={onBack} aria-label="Back" className="rounded-xl p-2 hover:bg-slate-100"><ArrowLeft size={20} /></button>}<Smartphone className="text-blue-600" /><div><h1 className="text-2xl font-bold">GCash Payments</h1><p className="text-sm text-slate-500">{admin ? 'Request payments and verify received funds.' : 'Pay your booking requests and track verification.'}</p></div></div>
      <button disabled={busy} onClick={() => { setError(''); void load().catch(err => setError(err.message)); }} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"><RefreshCw size={16} />Refresh</button>
    </div>
    <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Booking accepted → Admin requests an amount → Client pays with GCash through PayMongo → PayMongo confirms payment</p>
    {testMode && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">PayMongo test mode — checkout simulates payments; no real money is collected.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {admin && <div className="grid gap-5 lg:grid-cols-2">
      <section className={card}><h2 className="font-bold">GCash via PayMongo</h2><p className="mt-3 text-sm">{configured ? testMode ? 'GCash checkout is in test mode.' : 'Live GCash checkout is enabled.' : 'GCash checkout is unavailable. Contact the system operator.'}</p><p className="mt-3 text-sm text-slate-500">Clients authorize payments on PayMongo checkout. Payments are confirmed automatically after PayMongo verifies the funds. Refresh to see the latest status.</p></section>
      <form className={card} onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); if (await mutate('', Object.fromEntries(fields), 'Payment request sent to the client.')) form.reset(); }}>
        <h2 className="font-bold">Request a booking payment</h2><p className="mt-1 text-xs text-slate-500">Set the agreed amount for a deposit, installment, or final payment. One open request per booking.</p>
        <label className="mt-3 block text-sm">Accepted booking<select name="booking_id" required className={input} defaultValue=""><option value="">Select booking</option>{bookings.map(b => <option key={b.id} value={b.id}>#{b.id} · {b.client_name} · {b.service_type}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="mt-3 block text-sm">Amount (PHP)<input name="amount" required type="number" min="100" max="99999999.99" step="0.01" className={input} /></label><label className="mt-3 block text-sm">Payment for<input name="description" required maxLength={200} placeholder="e.g. Agreed booking deposit" className={input} /></label></div>
        <button disabled={busy || loading || !configured || !bookings.length} className={`${button} mt-4`}>Send payment request</button>
        {!configured && <p className="mt-2 text-xs text-amber-700">Configure PayMongo on the backend first.</p>}
        {!loading && !bookings.length && <p className="mt-2 text-xs text-slate-500">No accepted bookings without an open payment request.</p>}
      </form>
    </div>}
    <div className="grid gap-3 sm:grid-cols-3">{(['Awaiting payment', 'For verification', 'Paid'] as Status[]).map(status => <div key={status} className={card}><p className="text-xs text-slate-500">{status}</p><p className="mt-1 text-xl font-bold">{peso(total(status))}</p></div>)}</div>
    <div className="flex flex-wrap gap-2" aria-label="Filter payment status">{['All','Awaiting payment','For verification','Paid','Returned','Cancelled'].map(status => <button key={status} onClick={() => setFilter(status)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${filter === status ? 'bg-blue-700 text-white' : 'bg-white'}`}>{status} ({payments.filter(p => status === 'All' || p.status === status).length})</button>)}</div>
    {loading ? <p className={card}>Loading payments...</p> : !payments.some(p => filter === 'All' || p.status === filter) ? <p className={card}>{admin ? 'No payment requests in this view.' : 'No payment requests yet in this view. Your admin will request payment after accepting your booking.'}</p> : null}
    {payments.filter(p => filter === 'All' || p.status === filter).map(payment => <article key={payment.id} className={card}>
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">#{payment.booking_id} · {payment.service_type}</h2><p className="mt-1 text-sm text-slate-500">{payment.description}{admin ? ` · ${payment.client_name}` : ''}</p><p className="mt-1 text-xs text-slate-400">Request #{payment.id} · {new Date(payment.created_at).toLocaleDateString()}</p></div><div className="text-right"><p className="text-xl font-bold">{peso(payment.amount)}</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${payment.status === 'Paid' ? 'bg-green-100 text-green-800' : payment.status === 'Returned' ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'}`}>{payment.status}</span></div></div>
      {payment.reference_number && <p className="mt-3 break-all text-sm">GCash reference: <strong>{payment.reference_number}</strong></p>}
      {payment.review_note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Admin note: {payment.review_note}</p>}
      {!!payment.has_proof && <button disabled={busy} className="mt-3 text-sm font-semibold text-blue-700 underline" onClick={() => void showProof(payment.id)}>View submitted receipt</button>}
      {payment.reviewed_at && <p className="mt-2 text-xs text-slate-500">Reviewed {new Date(payment.reviewed_at).toLocaleString()}</p>}
      {!admin && payment.payment_provider === 'PayMongo' && payment.status === 'Awaiting payment' && !['rejected','cancelled'].includes(payment.booking_status.toLowerCase()) && <div className="mt-4 border-t pt-4"><p className="mb-3 text-sm">Pay the requested amount through PayMongo’s GCash checkout. Returning from checkout does not itself confirm payment.</p><button disabled={busy || !configured} className={button} onClick={() => void checkout(payment.id)}>{busy ? 'Please wait...' : payment.checkout_session_id ? 'Resume GCash checkout' : 'Pay with GCash'}</button></div>}
      {!admin && payment.payment_provider === 'Manual' && ['Awaiting payment','Returned'].includes(payment.status) && !['rejected','cancelled'].includes(payment.booking_status.toLowerCase()) && <div className="mt-4 border-t pt-4">
        <p className="text-sm">{payment.status === 'Returned' ? 'Check the admin note and correct your receipt or reference. Do not pay again if funds were already sent.' : 'Open GCash and send the exact requested amount to the account below. Check the recipient before confirming.'}</p>
        <div className="my-3 rounded-xl bg-blue-50 p-4"><p className="text-xs text-slate-500">GCash recipient</p><p className="font-bold">{payment.account_name}</p><p className="text-lg font-bold tracking-wide">{payment.account_number}</p><p className="mt-1 text-sm">Amount: {peso(payment.amount)}</p></div>
        <form onSubmit={e => void submitProof(e, payment.id)} className="grid items-end gap-3 md:grid-cols-3">
          <label className="text-sm">GCash reference number<input name="reference_number" required pattern="[0-9]{10,30}" maxLength={30} inputMode="numeric" defaultValue={payment.reference_number || ''} className={input} /></label>
          <label className="text-sm">Receipt image (max 5 MB)<input name="proof" required type="file" accept="image/png,image/jpeg,image/webp" className={`${input} text-xs`} /></label>
          <button disabled={busy} className={button}>{busy ? 'Please wait...' : payment.status === 'Returned' ? 'Resubmit receipt' : 'Submit payment receipt'}</button>
        </form>
      </div>}
      {!admin && payment.status === 'For verification' && <p className="mt-3 text-sm text-blue-800">Your receipt is awaiting admin verification. Please do not pay this request again.</p>}
      {payment.status === 'Cancelled' && <p className="mt-3 text-sm text-slate-600">Do not pay this cancelled request. If you already sent funds, contact the admin with your GCash reference; cancellation does not refund a transfer.</p>}
      {admin && payment.status === 'Awaiting payment' && !payment.checkout_session_id && !payment.checkout_creating && <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm text-slate-500">Cancel an incorrect payment request</summary><form className="mt-3 space-y-3" onSubmit={async event => { event.preventDefault(); const fields = new FormData(event.currentTarget); await mutate(`/${payment.id}/cancel`, { note: fields.get('note') }, 'Request cancelled. You can create a corrected request.', 'PUT'); }}><p className="text-xs text-slate-500">Check with the client that no money was sent before cancelling. This does not issue a refund.</p><label className="block text-sm">Cancellation reason<input name="note" required maxLength={500} className={input} /></label><button disabled={busy} className="rounded-xl border px-4 py-2 text-sm">Cancel request</button></form></details>}
      {admin && payment.payment_provider === 'Manual' && payment.status === 'For verification' && <form className="mt-4 space-y-3 border-t pt-4" onSubmit={async event => {
        event.preventDefault(); const fields = new FormData(event.currentTarget); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const decision = submitter?.value || 'Paid';
        await mutate(`/${payment.id}/review`, { decision, note: fields.get('note'), confirmed: fields.get('confirmed') === 'on' }, decision === 'Paid' ? 'Payment confirmed.' : 'Receipt returned with your note.', 'PUT');
      }}>
        <p className="text-sm text-slate-600">Match the amount, reference, and recipient with the received transaction in your GCash account.</p>
        <label className="flex items-start gap-2 text-sm"><input name="confirmed" type="checkbox" className="mt-1" />I checked my GCash transaction history and received this exact amount and reference.</label>
        <label className="block text-sm">Reason if returning this receipt<textarea name="note" maxLength={500} className={input} placeholder="Explain what the client needs to correct." /></label>
        <div className="flex flex-wrap gap-3"><button disabled={busy} value="Paid" className={button}>Confirm paid</button><button disabled={busy} value="Returned" className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">Return for correction</button></div>
      </form>}
    </article>)}
    {!!legacy.length && <section className={card}><h2 className="font-bold">Previous checkout records</h2><p className="mt-1 text-xs text-slate-500">Records from the previous payment flow. Pending checkout records need separate provider reconciliation before requesting the same payment again.</p><div className="mt-3 space-y-3">{legacy.map(p => <p className="text-sm" key={p.id}>Booking #{p.booking_id} {admin && `· ${p.client_name}`} · {peso(p.amount)} · {p.status} · {p.reference_number}</p>)}</div></section>}
    {proofUrl && <div role="dialog" aria-modal="true" aria-label="Payment receipt" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" onClick={() => setProofUrl('')}><div className="max-h-[90vh] max-w-3xl overflow-auto rounded-2xl bg-white p-4" onClick={event => event.stopPropagation()}><button autoFocus className="mb-3 rounded-lg border px-4 py-2 text-sm" onClick={() => setProofUrl('')}>Close receipt</button>
      {/* Private authenticated blob cannot use the public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={proofUrl} alt="Submitted GCash receipt" className="max-h-[75vh] w-auto max-w-full object-contain" />
    </div></div>}
  </div>;
}

