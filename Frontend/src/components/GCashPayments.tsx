"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Smartphone, Pencil, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import Image from 'next/image';
import AdminImageUpload, { imageSource } from './AdminImageUpload';

type Status = 'Awaiting payment' | 'For verification' | 'Paid' | 'Returned' | 'Cancelled';
interface Payment {
  id: number; booking_id: number; amount: string; description: string; status: Status;
  account_name: string; account_number: string; reference_number: string | null;
  review_note: string | null; has_proof: boolean; created_at: string; reviewed_at: string | null;
  service_type: string; client_name: string; booking_status: string;
  payment_provider: string; checkout_session_id: string | null; checkout_creating: boolean; qr_image?: string;
}
interface Booking { id: number; service_type: string; client_name: string }
interface Legacy { id: number; booking_id: number; amount: string; status: string; reference_number: string; client_name: string }
interface BookingEstimate { id: number; service_type: string; status: string; client_name: string; estimate: { min: number; max: number; area: number; unit: string; style: string; complexity: string } | null }
const peso = (amount: string | number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(amount));
const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900';
const button = 'rounded-xl bg-[#0070c0] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
const gcashVisibilityKey = 'adminGcashAccountHidden';

export default function GCashPayments({ role, onBack }: { role: 'admin' | 'client'; onBack?: () => void }) {
  const admin = role === 'admin';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [legacy, setLegacy] = useState<Legacy[]>([]);
  const [estimates, setEstimates] = useState<BookingEstimate[]>([]);
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrUploading, setQrUploading] = useState(false);
  const [manualReady, setManualReady] = useState(false);
  const [editingAccount, setEditingAccount] = useState(true);
  const [gcashAccountHidden, setGcashAccountHidden] = useState(false);
  const [savedAccount, setSavedAccount] = useState<{ account_name: string; account_number: string; qr_image: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const accountSaveInFlight = useRef(false);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
    setEstimates(result.estimates || []);
    if (result.syncWarning) setError(result.syncWarning);
  }, [request]);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([request(''), request('/settings')]).then(([billingResult, settingsResult]) => {
      if (!active) return;
      if (admin) {
        try { setGcashAccountHidden(localStorage.getItem(gcashVisibilityKey) === 'true'); }
        catch { /* Keep the current view when browser storage is unavailable. */ }
      }
      if (billingResult.status === 'fulfilled') {
        const billing = billingResult.value;
        setPayments(billing.payments); setBookings(billing.bookings); setLegacy(billing.legacy);
        setEstimates(billing.estimates || []);
        if (billing.syncWarning) setError(billing.syncWarning);
      } else setError(billingResult.reason.message);
      if (settingsResult.status === 'fulfilled') {
        const result = settingsResult.value;
        setAccountName(result.settings?.account_name || ''); setAccountNumber(result.settings?.account_number || ''); setQrImage(result.settings?.qr_image || '');
        setManualReady(Boolean(result.settings?.qr_image));
        if (result.settings?.qr_image) {
          setSavedAccount(result.settings);
          setEditingAccount(false);
        }
      } else setError(settingsResult.reason.message);
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    const refresh = () => { if (!inFlight.current && document.visibilityState === 'visible') void load().catch(err => setError(err.message)); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [admin, load, request]);
  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl); }, [proofUrl]);
  function changeGcashVisibility(hidden: boolean) {
    setGcashAccountHidden(hidden);
    try { localStorage.setItem(gcashVisibilityKey, String(hidden)); }
    catch { /* Visibility still works for this visit if storage is blocked. */ }
  }
  async function refreshPayments() {
    if (inFlight.current) return;
    inFlight.current = true; setRefreshing(true); setError(''); setNotice('');
    try {
      const [billing, settings] = await Promise.all([request(''), request('/settings')]);
      setPayments(billing.payments); setBookings(billing.bookings); setLegacy(billing.legacy);
      setEstimates(billing.estimates || []);
      setManualReady(Boolean(settings.settings?.qr_image));
      if (billing.syncWarning) setError(billing.syncWarning);
      else setNotice('Payments refreshed.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to refresh payments.'); }
    finally { inFlight.current = false; setRefreshing(false); }
  }
  async function mutate(path: string, body: object | FormData, message: string, method = 'POST') {
    if (inFlight.current) return false;
    inFlight.current = true; setBusy(true); setBusyAction(path); setError(''); setNotice('');
    try {
      await request(path, { method, headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' }, body: body instanceof FormData ? body : JSON.stringify(body) });
      setNotice(message);
      if (path !== '/settings') await load();
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save payment.'); return false; }
    finally { inFlight.current = false; setBusy(false); setBusyAction(null); }
  }
  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); event.stopPropagation();
    if (accountSaveInFlight.current || qrUploading) return;
    accountSaveInFlight.current = true; setSavingAccount(true); setError(''); setNotice('');
    const account = { account_name: accountName.trim(), account_number: accountNumber.trim(), qr_image: qrImage };
    try {
      await request('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(account) });
      setAccountName(account.account_name); setAccountNumber(account.account_number);
      setManualReady(Boolean(account.qr_image)); setSavedAccount(account); setEditingAccount(false);
      setNotice('GCash account and QR saved.');
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save GCash account.'); }
    finally { accountSaveInFlight.current = false; setSavingAccount(false); }
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
      <div className="flex items-center gap-3">{onBack && <button onClick={onBack} aria-label="Back" className="hidden rounded-xl p-2 hover:bg-slate-100 md:inline-flex"><ArrowLeft size={20} /></button>}<Smartphone className="text-blue-600" /><div><h1 className="text-2xl font-bold">GCash Payments</h1><p className="text-sm text-slate-500">{admin ? 'Request payments and verify received funds.' : 'Pay your booking requests and track verification.'}</p></div></div>
      <button type="button" disabled={busy || refreshing || loading} onClick={() => void refreshPayments()} className="ml-auto flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:gap-2 sm:px-4 sm:text-sm"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing...' : 'Refresh'}</button>
    </div>
    <p className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">Pay using the admin GCash QR, then submit your GCash reference number and receipt for admin verification.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {admin && <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className={`${card} min-w-0 lg:col-span-2`}>
        <div className="flex items-center justify-between gap-2"><h2 className="min-w-0 font-bold">Admin GCash account</h2>
          <div className="flex shrink-0 items-center gap-1">
            {!editingAccount && savedAccount && <button type="button" aria-label="Edit GCash account" title="Edit GCash account" disabled={busy} onClick={() => { setEditingAccount(true); changeGcashVisibility(false); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-blue-700 hover:bg-blue-50 disabled:opacity-50"><Pencil size={18} /></button>}
            <button type="button" disabled={loading} aria-expanded={!loading && !gcashAccountHidden} aria-controls="gcash-account-content" onClick={() => changeGcashVisibility(!gcashAccountHidden)} className="flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {gcashAccountHidden ? <EyeOff size={16} /> : <Eye size={16} />}{gcashAccountHidden ? 'Unhide' : 'Hide'}
            </button>
          </div>
        </div>
        <div id="gcash-account-content" hidden={loading || gcashAccountHidden}>
        {!editingAccount && savedAccount ? <div className="mt-4 space-y-3">
          <dl className="space-y-3"><div><dt className="text-xs text-slate-500">Account name</dt><dd className="mt-1 break-words font-semibold">{savedAccount.account_name}</dd></div><div><dt className="text-xs text-slate-500">GCash mobile number</dt><dd className="mt-1 font-semibold tracking-wide">{savedAccount.account_number}</dd></div></dl>
          <Image src={imageSource(savedAccount.qr_image)} alt={`GCash QR for ${savedAccount.account_name}`} width={288} height={288} unoptimized className="mx-auto block h-auto w-full max-w-60 rounded-lg object-contain md:max-w-72" />
          <p className="text-xs text-green-700">GCash account saved</p>
        </div> : <form id="gcash-account-form" onSubmit={saveAccount}>
        <label className="mt-3 block text-sm">Account name<input required maxLength={100} value={accountName} onChange={event => setAccountName(event.target.value)} className={input} /></label>
        <label className="mt-3 block text-sm">GCash mobile number<input required pattern="09[0-9]{9}" maxLength={11} inputMode="numeric" value={accountNumber} onChange={event => setAccountNumber(event.target.value)} className={input} /></label>
        <p className="my-3 text-sm">Upload the QR exported from your GCash account. Clients will see it on their payment request.</p>
        <AdminImageUpload value={qrImage} onChange={setQrImage} onBusyChange={setQrUploading} disabled={savingAccount} />
        <div className="mt-4 flex flex-wrap gap-3"><button type="submit" form="gcash-account-form" disabled={savingAccount || loading || qrUploading || !qrImage} className={button}>{savingAccount ? 'Saving GCash account...' : 'Save GCash account'}</button>
          {savedAccount && <button type="button" disabled={savingAccount || qrUploading} className="rounded-xl border px-4 py-3 text-sm" onClick={() => { setAccountName(savedAccount.account_name); setAccountNumber(savedAccount.account_number); setQrImage(savedAccount.qr_image); setEditingAccount(false); }}>Cancel</button>}
        </div>
      </form>}
        </div>
      </section>
      <form id="gcash-payment-request-form" className={`${card} min-w-0 lg:col-span-2`} onSubmit={async event => { event.preventDefault(); event.stopPropagation(); const form = event.currentTarget; const fields = new FormData(form); if (await mutate('', Object.fromEntries(fields), 'Payment request sent to the client.')) form.reset(); }}>
        <h2 className="font-bold">Request a booking payment</h2><p className="mt-1 text-xs text-slate-500">Set the agreed amount for a deposit, installment, or final payment. One open request per booking.</p>
        <label className="mt-3 block text-sm">Accepted booking
          <span className="relative mt-1 block">
            <select name="booking_id" required className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-3 pl-3 pr-10 text-sm text-slate-900" defaultValue=""><option value="">Select booking</option>{bookings.map(b => <option key={b.id} value={b.id}>#{b.id} · {b.client_name} · {b.service_type}</option>)}</select>
            <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          </span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="mt-3 block text-sm">Amount (PHP)<input name="amount" required type="number" min="100" max="99999999.99" step="0.01" className={input} /></label><label className="mt-3 block text-sm">Payment for<input name="description" required maxLength={200} placeholder="e.g. Agreed booking deposit" className={input} /></label></div>
        <button type="submit" form="gcash-payment-request-form" disabled={busy || loading || !manualReady || !bookings.length} className={`${button} mt-4`}>{busyAction === '' ? 'Sending payment request...' : 'Send payment request'}</button>
        {!manualReady && <p className="mt-2 text-xs text-amber-700">Save your GCash account and QR first.</p>}
        {!loading && !bookings.length && <p className="mt-2 text-xs text-slate-500">No accepted bookings without an open payment request.</p>}
      </form>
    </div>}
    {!!estimates.length && <section className={card}><h2 className="font-bold">Project estimates</h2><p className="mt-1 text-xs text-slate-500">Estimates submitted with bookings appear here automatically. These are preliminary amounts; the admin requests the agreed payment separately.</p><div className="mt-3 space-y-3">{estimates.filter(row => row.estimate).map(row => <div key={row.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">Booking #{row.id} · {row.service_type}{admin && ` · ${row.client_name}`}</p><p>{peso(row.estimate!.min)} – {peso(row.estimate!.max)} · {row.status}</p><p className="mt-1 text-xs text-slate-500">{row.estimate!.area} {row.estimate!.unit} · {row.estimate!.style} · {row.estimate!.complexity}</p></div>)}</div></section>}
    <div className="grid gap-3 sm:grid-cols-3">{(['Awaiting payment', 'For verification', 'Paid'] as Status[]).map(status => <div key={status} className={card}><p className="text-xs text-slate-500">{status}</p><p className="mt-1 text-xl font-bold">{peso(total(status))}</p></div>)}</div>
    <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:flex sm:flex-wrap" aria-label="Filter payment status">{['All','Awaiting payment','For verification','Paid','Returned','Cancelled'].map(status => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`min-h-11 min-w-0 rounded-xl border px-2 py-2 text-[11px] leading-tight font-semibold sm:min-h-0 sm:rounded-full sm:px-4 sm:text-xs ${filter === status ? 'bg-blue-700 text-white' : 'bg-white'}`}>{status} ({payments.filter(p => status === 'All' || p.status === status).length})</button>)}</div>
    {loading ? <p className={card}>Loading payments...</p> : !payments.some(p => filter === 'All' || p.status === filter) ? <p className={card}>{admin ? 'No payment requests in this view.' : 'No payment requests yet in this view. Your admin will request payment after accepting your booking.'}</p> : null}
    {payments.filter(p => filter === 'All' || p.status === filter).map(payment => <article key={payment.id} className={card}>
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">#{payment.booking_id} · {payment.service_type}</h2><p className="mt-1 text-sm text-slate-500">{payment.description}{admin ? ` · ${payment.client_name}` : ''}</p><p className="mt-1 text-xs text-slate-400">Request #{payment.id} · {new Date(payment.created_at).toLocaleDateString()}</p></div><div className="text-right"><p className="text-xl font-bold">{peso(payment.amount)}</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${payment.status === 'Paid' ? 'bg-green-100 text-green-800' : payment.status === 'Returned' ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'}`}>{payment.status}</span></div></div>
      {payment.reference_number && <p className="mt-3 break-all text-sm">GCash reference: <strong>{payment.reference_number}</strong></p>}
      {payment.review_note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Admin note: {payment.review_note}</p>}
      {!!payment.has_proof && <button disabled={busy} className="mt-3 text-sm font-semibold text-blue-700 underline" onClick={() => void showProof(payment.id)}>View submitted receipt</button>}
      {payment.reviewed_at && <p className="mt-2 text-xs text-slate-500">Reviewed {new Date(payment.reviewed_at).toLocaleString()}</p>}
      {payment.payment_provider === 'PayMongo' && payment.status !== 'Paid' && payment.status !== 'Cancelled' && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Previous PayMongo request. Contact the admin to check whether funds were received before replacing this bill with a GCash QR request.</p>}
      {!admin && payment.payment_provider === 'Manual' && ['Awaiting payment','Returned'].includes(payment.status) && !['rejected','cancelled'].includes(payment.booking_status.toLowerCase()) && <div className="mt-4 border-t pt-4">
        <p className="text-sm">{payment.status === 'Returned' ? 'Check the admin note and correct your receipt or reference. Do not pay again if funds were already sent.' : 'Open GCash and send the exact requested amount to the account below. Check the recipient before confirming.'}</p>
        <div className="my-3 rounded-xl bg-blue-50 p-4"><p className="text-xs text-slate-500">GCash recipient</p><p className="font-bold">{payment.account_name}</p><p className="text-lg font-bold tracking-wide">{payment.account_number}</p><p className="mt-1 text-sm">Amount: {peso(payment.amount)}</p>{payment.qr_image && <Image src={imageSource(payment.qr_image)} alt={`GCash QR for ${payment.account_name}`} width={320} height={320} unoptimized className="mx-auto mt-4 block h-auto w-full max-w-xs rounded-lg object-contain md:max-w-md" />}</div>
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

