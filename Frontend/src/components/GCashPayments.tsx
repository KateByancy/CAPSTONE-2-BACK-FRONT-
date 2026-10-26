"use client";
import Link from '@/components/WorkspaceLink';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, Smartphone, Eye, EyeOff } from 'lucide-react';
import { apiFetch, getApiUrl } from '@/lib/api';
import PaymentQr from './PaymentQr';
import PaymentHistory from './PaymentHistory';
import AdminImageUpload from './AdminImageUpload';

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
const input = 'mt-1 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900';
const button = 'rounded-xl bg-marc-charcoal px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';
const card = 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm';

export default function GCashPayments({ role, onBack }: { role: 'admin' | 'client'; onBack?: () => void }) {
  const admin = role === 'admin';
  const [payments, setPayments] = useState<Payment[]>([]);
  const [, setBookings] = useState<Booking[]>([]);
  const [legacy, setLegacy] = useState<Legacy[]>([]);
  const [estimates, setEstimates] = useState<BookingEstimate[]>([]);
  const [accountName, setAccountName] = useState('Marc Lecciones');
  const [accountNumber, setAccountNumber] = useState('09954467294');
  const [qrImage, setQrImage] = useState('/designs/gcash%20qr.jpg');
  const [qrUploading, setQrUploading] = useState(false);
  const [, setManualReady] = useState(true);
  const [editingAccount, setEditingAccount] = useState(false);
  const [savedAccount, setSavedAccount] = useState<{ account_name: string; account_number: string; qr_image: string } | null>({
    account_name: 'Marc Lecciones',
    account_number: '09954467294',
    qr_image: '/designs/gcash%20qr.jpg'
  });
  const [, setBusyAction] = useState<string | null>(null);
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
  const lastPaymentAnchor=useRef('');
  useEffect(()=>{const hash=window.location.hash;if(!payments.length||!/^#payment-\d+$/.test(hash)||lastPaymentAnchor.current===hash)return;const target=document.getElementById(hash.slice(1));if(target){lastPaymentAnchor.current=hash;target.scrollIntoView({behavior:'smooth',block:'start'});target.focus({preventScroll:true});}},[payments]);
  const headers = useCallback(() => ({ Authorization: `Bearer ${localStorage.getItem(`${role}Token`) || ''}` }), [role]);
  const request = useCallback(async (path: string, options: RequestInit = {}) => {
    const response = await apiFetch(`${getApiUrl()}/payment${path}`, { ...options, headers: { ...headers(), ...options.headers }, cache: 'no-store' });
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

      if (billingResult.status === 'fulfilled') {
        const billing = billingResult.value;
        setPayments(billing.payments); setBookings(billing.bookings); setLegacy(billing.legacy);
        setEstimates(billing.estimates || []);
        if (billing.syncWarning) setError(billing.syncWarning);
      } else setError(billingResult.reason.message);
      if (settingsResult.status === 'fulfilled') {
        const result = settingsResult.value;
        const name = result.settings?.account_name || 'Marc Lecciones';
        const num = result.settings?.account_number || '09954467294';
        const rawQr = result.settings?.qr_image || '/designs/gcash%20qr.jpg';
        const qr = (rawQr && !rawQr.startsWith('/api/portfolio/images/')) ? rawQr : '/designs/gcash%20qr.jpg';
        setAccountName(name); 
        setAccountNumber(num); 
        setQrImage(qr);
        setManualReady(true);
        setSavedAccount({ account_name: name, account_number: num, qr_image: qr });
        setEditingAccount(false);
      } else setError(settingsResult.reason.message);
    }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    const refresh = () => { if (!inFlight.current && document.visibilityState === 'visible') void load().catch(err => setError(err.message)); };
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [admin, load, request]);
  useEffect(() => () => { if (proofUrl) URL.revokeObjectURL(proofUrl); }, [proofUrl]);
  useEffect(()=>{
    if(!proofUrl)return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    const modal=document.querySelector<HTMLElement>('[aria-label="Payment receipt"]');
    const close=modal?.querySelector<HTMLButtonElement>('button');close?.focus();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setProofUrl('');if(event.key==='Tab'){event.preventDefault();close?.focus();}};
    document.addEventListener('keydown',key);return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',key);previousFocus?.focus();};
  },[proofUrl]);

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
      if (path !== '/settings') { try { await load(); } catch { setError('Your change was saved, but the list could not refresh. Use Refresh to check the latest status; do not submit or pay again.'); } }
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save payment.'); return false; }
    finally { inFlight.current = false; setBusy(false); setBusyAction(null); }
  }
  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); event.stopPropagation();
    if (accountSaveInFlight.current || qrUploading) return;
    accountSaveInFlight.current = true; setSavingAccount(true); setError(''); setNotice('');
    const account = { account_name: accountName.trim() || 'Marc Lecciones', account_number: accountNumber.trim() || '09954467294', qr_image: qrImage || '/designs/gcash%20qr.jpg' };
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
      const response = await apiFetch(`${getApiUrl()}/payment/${id}/proof`, { headers: headers(), cache: 'no-store' });
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
  return <div className="space-y-6 text-stone-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">{onBack && <button onClick={onBack} aria-label="Back" className="hidden rounded-xl p-2 hover:bg-stone-100 md:inline-flex"><ArrowLeft size={20} /></button>}<Smartphone className="text-brand-600" /><div><h1 className="text-2xl font-bold">GCash Payments</h1><p className="text-sm text-stone-500">{admin ? 'Request payments and verify received funds.' : 'Pay your booking requests and track verification.'}</p></div></div>
      <button type="button" disabled={busy || refreshing || loading} onClick={() => void refreshPayments()} className="ml-auto flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:gap-2 sm:px-4 sm:text-sm"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing...' : 'Refresh'}</button>
    </div>
    <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-900">Check the request amount and recipient, pay once using the GCash QR, then submit your reference and receipt. A receipt submission is not confirmation of payment; the admin verifies funds in GCash.</p>
    {!admin && <Link href="/?screen=dashboard&tab=quotes" className="inline-flex rounded-xl border border-brand-200 px-4 py-3 text-sm text-brand-800">Review agreed quotations</Link>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    {/* CLIENT PERMANENT OFFICIAL GCASH QR DISPLAY */}
    {!admin && (
      <section className={`${card} border-brand-200 bg-brand-50/40`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-md space-y-2">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-800 uppercase tracking-wider">
              Official Payment Destination
            </span>
            <h2 className="text-lg font-bold text-stone-900">MCID GCash Account &amp; QR</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Scan this official QR code using your GCash app for all accepted quotation deposits and balance billings. 
              Always verify the recipient name and number before confirming your transfer, then submit your receipt screenshot below for verification.
            </p>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-stone-200 shadow-2xs">
                <dt className="text-stone-500 font-medium">Account Name</dt>
                <dd className="font-bold text-stone-900 text-sm mt-0.5">{accountName || savedAccount?.account_name || 'Marc Lecciones'}</dd>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-stone-200 shadow-2xs">
                <dt className="text-stone-500 font-medium">GCash Number</dt>
                <dd className="font-bold text-stone-900 text-sm mt-0.5 tracking-wider">{accountNumber || savedAccount?.account_number || '09954467294'}</dd>
              </div>
            </dl>
          </div>
          <div className="flex shrink-0 justify-center">
            <PaymentQr src={qrImage || savedAccount?.qr_image || '/designs/gcash%20qr.jpg'} name={accountName || savedAccount?.account_name || 'Marc Lecciones'} />
          </div>
        </div>
      </section>
    )}

    {/* ADMIN PERMANENT OFFICIAL GCASH QR DISPLAY */}
    {admin && <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className={`${card} min-w-0 lg:col-span-2`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="min-w-0 font-bold text-lg">Admin GCash Account &amp; QR Code</h2>
            <p className="text-xs text-stone-500 mt-0.5">This permanent QR code and recipient account are displayed to clients on their payment requests.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-t border-stone-100 pt-5">
          {/* Permanent QR Preview Card */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-center flex flex-col items-center">
            <span className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Active GCash QR Code</span>
            <PaymentQr src={qrImage || savedAccount?.qr_image || '/designs/gcash%20qr.jpg'} name={accountName || savedAccount?.account_name || 'Marc Lecciones'} />
            <p className="mt-3 text-xs text-green-700 font-medium">✓ Permanent public QR: /designs/gcash qr.jpg</p>
          </div>

          {/* Account Details / Edit Form */}
          <div>
            {!editingAccount ? (
              <div className="space-y-4">
                <dl className="space-y-3">
                  <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                    <dt className="text-xs text-stone-500 font-medium">Recipient Account Name</dt>
                    <dd className="mt-1 break-words font-bold text-stone-900 text-base">{accountName || savedAccount?.account_name || 'Marc Lecciones'}</dd>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-3.5 shadow-2xs">
                    <dt className="text-xs text-stone-500 font-medium">GCash Mobile Number</dt>
                    <dd className="mt-1 font-bold tracking-wider text-stone-900 text-base">{accountNumber || savedAccount?.account_number || '09954467294'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <form id="gcash-account-form" onSubmit={saveAccount} className="space-y-3">
                <label className="block text-sm font-medium text-stone-700">Account name
                  <input required maxLength={100} value={accountName} onChange={event => setAccountName(event.target.value)} placeholder="Marc Lecciones" className={input} />
                </label>
                <label className="block text-sm font-medium text-stone-700">GCash mobile number
                  <input required pattern="09[0-9]{9}" maxLength={11} inputMode="numeric" value={accountNumber} onChange={event => setAccountNumber(event.target.value)} placeholder="09954467294" className={input} />
                </label>
                <div className="pt-2">
                  <button 
                    type="button" 
                    disabled={savingAccount || qrUploading} 
                    onClick={() => setQrImage('/designs/gcash%20qr.jpg')} 
                    className="w-full min-h-11 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold text-brand-800"
                  >
                    Reset to Permanent GCash QR (/designs/gcash qr.jpg)
                  </button>
                </div>
                <div className="pt-2 flex flex-wrap gap-2">
                  <button type="submit" form="gcash-account-form" disabled={savingAccount || loading} className={button}>
                    {savingAccount ? 'Saving GCash account...' : 'Save GCash Account'}
                  </button>
                  <button type="button" disabled={savingAccount} className="rounded-xl border px-4 py-3 text-sm font-semibold" onClick={() => setEditingAccount(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
      <section className={card}><h2 className="font-bold">Payments from accepted quotations</h2><p className="mt-2 text-sm">Send an itemized quotation and obtain client approval before requesting the agreed deposit or remaining balance.</p><Link href="/admin/quotes" className="mt-3 inline-block rounded-xl bg-marc-charcoal px-4 py-3 text-sm text-white">Open quotations &amp; client chat</Link></section>
    </div>}
    {!!estimates.length && <section className={card}><h2 className="font-bold">Project estimates</h2><p className="mt-1 text-xs text-stone-500">Estimates submitted with bookings appear here automatically. These are preliminary amounts; the admin requests the agreed payment separately.</p><div className="mt-3 space-y-3">{estimates.filter(row => row.estimate).map(row => <div key={row.id} className="rounded-xl bg-stone-50 p-3 text-sm"><p className="font-semibold">Booking #{row.id} · {row.service_type}{admin && ` · ${row.client_name}`}</p><p>{peso(row.estimate!.min)} – {peso(row.estimate!.max)} · {row.status}</p><p className="mt-1 text-xs text-stone-500">{row.estimate!.area} {row.estimate!.unit} · {row.estimate!.style} · {row.estimate!.complexity}</p></div>)}</div></section>}
    <div className="grid gap-3 sm:grid-cols-3">{(['Awaiting payment', 'For verification', 'Paid'] as Status[]).map(status => <div key={status} className={card}><p className="text-xs text-stone-500">{status}</p><p className="mt-1 text-xl font-bold">{peso(total(status))}</p></div>)}</div>
    <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:flex sm:flex-wrap" aria-label="Filter payment status">{['All','Awaiting payment','For verification','Paid','Returned','Cancelled'].map(status => <button type="button" key={status} aria-pressed={filter === status} onClick={() => setFilter(status)} className={`min-h-11 min-w-0 rounded-xl border px-2 py-2 text-[11px] leading-tight font-semibold sm:min-h-0 sm:rounded-full sm:px-4 sm:text-xs ${filter === status ? 'bg-brand-700 text-white' : 'bg-white'}`}>{status} ({payments.filter(p => status === 'All' || p.status === status).length})</button>)}</div>
    {loading ? <p className={card}>Loading payments...</p> : !payments.some(p => filter === 'All' || p.status === filter) ? <p className={card}>{admin ? 'No payment requests in this view.' : 'No payment requests yet in this view. Your admin will request payment after accepting your booking.'}</p> : null}
    {payments.filter(p => filter === 'All' || p.status === filter).map(payment => <article id={'payment-'+payment.id} tabIndex={-1} key={payment.id} className={card+' scroll-mt-6'}>
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">#{payment.booking_id} · {payment.service_type}</h2><p className="mt-1 text-sm text-stone-500">{payment.description}{admin ? ` · ${payment.client_name}` : ''}</p><p className="mt-1 text-xs text-stone-400">Request #{payment.id} · {new Date(payment.created_at).toLocaleDateString()}</p></div><div className="text-right"><p className="text-xl font-bold">{peso(payment.amount)}</p><span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${payment.status === 'Paid' ? 'bg-green-100 text-green-800' : payment.status === 'Returned' ? 'bg-red-100 text-red-800' : 'bg-brand-50 text-brand-800'}`}>{payment.status}</span></div></div>
      {payment.reference_number && <p className="mt-3 break-all text-sm">GCash reference: <strong>{payment.reference_number}</strong></p>}
      {payment.review_note && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Admin note: {payment.review_note}</p>}
      {payment.status !== 'Cancelled' && <ol className="marc-payment-steps" aria-label="Payment verification progress">{['Request issued','Receipt submitted','Funds verified'].map((label,index)=><li key={label} data-complete={index===0 || (index===1 && ['For verification','Paid'].includes(payment.status)) || (index===2 && payment.status==='Paid')}><span>{index+1}</span>{label}</li>)}</ol>}
      {!!payment.has_proof && <button disabled={busy} className="mt-3 text-sm font-semibold text-brand-700 underline" onClick={() => void showProof(payment.id)}>View submitted receipt</button>}
      {payment.reviewed_at && <p className="mt-2 text-xs text-stone-500">Reviewed {new Date(payment.reviewed_at).toLocaleString()}</p>}
      {payment.payment_provider === 'PayMongo' && payment.status !== 'Paid' && payment.status !== 'Cancelled' && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Previous PayMongo request. Contact the admin to check whether funds were received before replacing this bill with a GCash QR request.</p>}
      {!admin && payment.payment_provider === 'Manual' && ['Awaiting payment','Returned'].includes(payment.status) && !['rejected','cancelled'].includes(payment.booking_status.toLowerCase()) && <div className="mt-4 border-t pt-4">
        <p className="text-sm">{payment.status === 'Returned' ? 'Check the admin note and correct your receipt or reference. Do not pay again if funds were already sent.' : 'Open GCash and send the exact requested amount to the account below. Check the recipient before confirming.'}</p>
        <div className="my-3 rounded-xl bg-brand-50 p-4"><p className="text-xs text-stone-500">GCash recipient</p><p className="font-bold">{payment.account_name}</p><p className="text-lg font-bold tracking-wide">{payment.account_number}</p><p className="mt-1 text-sm">Amount: {peso(payment.amount)}</p><div className="mt-3"><PaymentQr src={payment.qr_image || qrImage || '/designs/gcash%20qr.jpg'} name={payment.account_name || accountName || 'Marc Semblante'} /></div></div>
        <form onSubmit={e => void submitProof(e, payment.id)} className="grid items-end gap-3 md:grid-cols-3">
          <label className="text-sm">GCash reference number<input name="reference_number" required pattern="[0-9]{10,30}" maxLength={30} inputMode="numeric" defaultValue={payment.reference_number || ''} className={input} /></label>
          <label className="text-sm">Receipt image (max 5 MB)<input name="proof" required type="file" accept="image/png,image/jpeg,image/webp" className={`${input} text-xs`} /></label>
          <button disabled={busy} className={button}>{busy ? 'Please wait...' : payment.status === 'Returned' ? 'Resubmit receipt' : 'Submit payment receipt'}</button>
        </form>
      </div>}
      {!admin && payment.status === 'For verification' && <p className="mt-3 text-sm text-brand-800">Your receipt is awaiting admin verification. Please do not pay this request again.</p>}
      {payment.status === 'Cancelled' && <p className="mt-3 text-sm text-stone-600">Do not pay this cancelled request. If you already sent funds, contact the admin with your GCash reference; cancellation does not refund a transfer.</p>}
      {admin && payment.status === 'Awaiting payment' && !payment.checkout_session_id && !payment.checkout_creating && <details className="mt-4 border-t pt-4"><summary className="cursor-pointer text-sm text-stone-500">Cancel an incorrect payment request</summary><form className="mt-3 space-y-3" onSubmit={async event => { event.preventDefault(); const fields = new FormData(event.currentTarget); await mutate(`/${payment.id}/cancel`, { note: fields.get('note') }, 'Request cancelled. You can create a corrected request.', 'PUT'); }}><p className="text-xs text-stone-500">Check with the client that no money was sent before cancelling. This does not issue a refund.</p><label className="block text-sm">Cancellation reason<input name="note" required maxLength={500} className={input} /></label><button disabled={busy} className="rounded-xl border px-4 py-2 text-sm">Cancel request</button></form></details>}
      {admin && payment.payment_provider === 'Manual' && payment.status === 'For verification' && <form className="mt-4 space-y-3 border-t pt-4" onSubmit={async event => {
        event.preventDefault(); const fields = new FormData(event.currentTarget); const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const decision = submitter?.value || 'Paid';
        await mutate(`/${payment.id}/review`, { decision, note: fields.get('note'), confirmed: fields.get('confirmed') === 'on' }, decision === 'Paid' ? 'Payment confirmed.' : 'Receipt returned with your note.', 'PUT');
      }}>
        <p className="text-sm text-stone-600">Match the amount, reference, and recipient with the received transaction in your GCash account.</p>
        <label className="flex items-start gap-2 text-sm"><input name="confirmed" type="checkbox" className="mt-1" />I checked my GCash transaction history and received this exact amount and reference.</label>
        <label className="block text-sm">Reason if returning this receipt<textarea name="note" maxLength={500} className={input} placeholder="Explain what the client needs to correct." /></label>
        <div className="flex flex-wrap gap-3"><button disabled={busy} value="Paid" className={button}>Confirm paid</button><button disabled={busy} value="Returned" className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">Return for correction</button></div>
      </form>}
      <PaymentHistory id={payment.id}/>
    </article>)}
    {!!legacy.length && <section className={card}><h2 className="font-bold">Previous checkout records</h2><p className="mt-1 text-xs text-stone-500">Records from the previous payment flow. Pending checkout records need separate provider reconciliation before requesting the same payment again.</p><div className="mt-3 space-y-3">{legacy.map(p => <p className="text-sm" key={p.id}>Booking #{p.booking_id} {admin && `· ${p.client_name}`} · {peso(p.amount)} · {p.status} · {p.reference_number}</p>)}</div></section>}
    {proofUrl && <div role="dialog" aria-modal="true" aria-label="Payment receipt" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5" onClick={() => setProofUrl('')}><div className="max-h-[90vh] max-w-3xl overflow-auto rounded-2xl bg-white p-4" onClick={event => event.stopPropagation()}><button autoFocus className="mb-3 rounded-lg border px-4 py-2 text-sm" onClick={() => setProofUrl('')}>Close receipt</button>
      {/* Private authenticated blob cannot use the public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={proofUrl} alt="Submitted GCash receipt" className="max-h-[75vh] w-auto max-w-full object-contain" />
    </div></div>}
  </div>;
}

