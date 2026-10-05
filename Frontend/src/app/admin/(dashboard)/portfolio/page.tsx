"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import AdminImageUpload, { imageSource } from '@/components/AdminImageUpload';
import { getApiUrl } from '@/lib/api';

interface PortfolioItem { id: number; title: string; category: string; description: string; image: string }
const empty = { title: '', category: '', description: '', image: '' };

export default function PortfolioUpdates() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<PortfolioItem | null>(null);

  async function load(signal?: AbortSignal) {
    const response = await fetch(`${getApiUrl()}/portfolio`, { cache: 'no-store', signal });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result)) throw new Error('Unable to load portfolio. Please try again.');
    setItems(result);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${getApiUrl()}/portfolio`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) throw new Error('Unable to load portfolio. Please try again.');
        if (!controller.signal.aborted) setItems(result);
      }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function start(item?: PortfolioItem) {
    setEditingId(item?.id ?? null);
    setForm(item ? { title: item.title, category: item.category || '', description: item.description || '', image: item.image || '' } : empty);
    setError(''); setNotice(''); setOpen(true);
  }
  async function mutate(method: string, id?: number, body?: typeof empty) {
    const response = await fetch(`${getApiUrl()}/portfolio${id == null ? '' : `/${id}`}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save portfolio changes.');
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || uploading) return;
    if (!form.image || !form.title.trim() || !form.category.trim() || !form.description.trim()) { setError('Complete the project details and upload an image.'); return; }
    setSaving(true); setError('');
    try {
      await mutate(editingId == null ? 'POST' : 'PUT', editingId ?? undefined, { ...form, title: form.title.trim(), category: form.category.trim(), description: form.description.trim() });
      setOpen(false); setNotice(editingId == null ? 'Portfolio created.' : 'Portfolio updated.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save portfolio.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting || saving) return;
    setSaving(true); setError('');
    try {
      await mutate('DELETE', deleting.id);
      setItems(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null); setNotice('Portfolio deleted.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete portfolio.'); }
    finally { setSaving(false); }
  }

  const field = 'w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500';
  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
    <div className="flex flex-col gap-4 rounded-2xl bg-[#0070c0] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold font-serif">Portfolio Updates</h1><p className="mt-1 text-sm text-blue-100">Manage your published projects.</p></div>
      <button aria-label="Create Portfolio" title="Create Portfolio" onClick={() => start()} className="flex h-11 w-11 shrink-0 self-end items-center justify-center gap-2 rounded-xl bg-white sm:w-auto sm:self-auto sm:px-4 text-sm font-bold text-blue-800"><Plus size={18} /><span className="hidden sm:inline">Create Portfolio</span></button>
    </div>
    {error && !open && !deleting && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button className="ml-3 underline" onClick={() => { setError(''); void load().catch(err => setError(err.message)); }}>Retry</button></div>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {loading ? <p role="status">Loading portfolio...</p> : items.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">No portfolio projects yet. Create your first project.</p> :
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {item.image && <Image src={imageSource(item.image)} alt={item.title} width={640} height={360} unoptimized className="h-48 w-full object-cover" />}
        <div className="space-y-3 p-4"><p className="break-words text-xs font-bold uppercase text-blue-700">{item.category}</p><h2 className="break-words text-lg font-bold">{item.title}</h2><p className="line-clamp-3 break-words text-sm text-slate-600">{item.description}</p>
          <div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={() => start(item)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-50 p-2 text-sm font-semibold text-blue-800"><Pencil size={16} />Edit</button><button disabled={saving} onClick={() => { setError(''); setDeleting(item); }} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-700"><Trash2 size={16} />Delete</button></div>
        </div>
      </article>)}</div>}
    {open && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="portfolio-form-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="portfolio-form-title" className="text-xl font-bold">{editingId == null ? 'Create Portfolio' : 'Edit Portfolio'}</h2><button disabled={saving || uploading} aria-label="Close portfolio form" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center"><X size={20} /></button></div>
        <form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
          <label className="block space-y-1 text-sm font-semibold"><span>Project Title</span><input autoFocus required maxLength={150} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold"><span>Category</span><input required maxLength={100} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold"><span>Project Stories &amp; Materials</span><textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={field} /></label>
          <AdminImageUpload value={form.image} onChange={image => setForm(current => ({ ...current, image }))} onBusyChange={setUploading} disabled={saving} />
        </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-3"><button disabled={saving || uploading} className="min-h-11 rounded-xl bg-[#102243] p-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId == null ? 'Publish Work' : 'Save Changes'}</button><button type="button" disabled={saving || uploading} onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-slate-200 p-3 text-sm font-semibold">Cancel</button></div>
        </form>
      </section>
    </div>}
    {deleting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="portfolio-delete-title" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6">
      <h2 id="portfolio-delete-title" className="text-lg font-bold">Delete portfolio?</h2><p className="break-words text-sm text-slate-600">Delete “{deleting.title}” from the published portfolio?</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-600 p-3 text-sm font-bold text-white">{saving ? 'Deleting...' : 'Delete'}</button><button disabled={saving} onClick={() => setDeleting(null)} className="min-h-11 rounded-xl border p-3 text-sm">Cancel</button></div>
    </section></div>}
  </div>;
}
