"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import AdminImageUpload, { imageSource } from '@/components/AdminImageUpload';
import { apiFetch, getApiUrl } from '@/lib/api';

interface DesignItem { id: string; title: string; category: string; description: string; image: string; price: string | number | null; published: boolean; features: string[] | string | null }
const empty = { title: '', category: '', description: '', image: '', price: '', published: true, features: '' };

export default function DesignUpdates() {
  const [items, setItems] = useState<DesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<DesignItem | null>(null);

  async function load(signal?: AbortSignal) {
    const response = await apiFetch(`${getApiUrl()}/design-catalog/manage`, { cache: 'no-store', signal, headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` } });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result)) throw new Error('Unable to load designs. Please try again.');
    setItems(result);
  }
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${getApiUrl()}/design-catalog/manage`, { cache: 'no-store', signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` } })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !Array.isArray(result)) throw new Error('Unable to load designs. Please try again.');
        if (!controller.signal.aborted) setItems(result);
      }).catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function start(item?: DesignItem) {
    setEditingId(item?.id ?? null);
    setForm(item ? { title: item.title, category: item.category || '', description: item.description || '', image: item.image || '', price: item.price == null ? '' : String(item.price), published: Boolean(item.published), features: (Array.isArray(item.features)?item.features:typeof item.features==='string'?JSON.parse(item.features):[]).join('\n') } : empty);
    setError(''); setNotice(''); setOpen(true);
  }
  async function mutate(method: string, id?: string, body?: typeof empty) {
    const response = await apiFetch(`${getApiUrl()}/design-catalog${id == null ? '' : `/${id}`}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` },
      body: body ? JSON.stringify({ ...body, price: body.price === '' ? null : Number(body.price), features: body.features.split('\n').map(value=>value.trim()).filter(Boolean) }) : undefined,
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save designs changes.');
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || uploading) return;
    if (!form.image || !form.title.trim() || !form.category.trim() || !form.description.trim()) { setError('Complete the project details and upload an image.'); return; }
    setSaving(true); setError('');
    try {
      await mutate(editingId == null ? 'POST' : 'PUT', editingId ?? undefined, { ...form, title: form.title.trim(), category: form.category.trim(), description: form.description.trim() });
      setOpen(false); setNotice(editingId == null ? 'Design created.' : 'Design updated.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save designs.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting || saving) return;
    setSaving(true); setError('');
    try {
      await mutate('DELETE', deleting.id);
      setItems(current => current.filter(item => item.id !== deleting.id));
      setDeleting(null); setNotice('Design deleted.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to delete design.'); }
    finally { setSaving(false); }
  }

  const field = 'w-full rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-brand-500';
  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-2xl bg-marc-charcoal p-4 text-white sm:p-5">
      <h1 className="min-w-0 text-xl sm:text-2xl font-bold font-serif">Designs</h1>
      <p className="col-start-1 row-start-2 text-sm text-brand-100">Manage designs, PHP prices, and visibility on the client dashboard.</p>
      <button aria-label="Create Design" title="Create Design" onClick={() => start()} className="col-start-2 row-start-1 flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white sm:row-span-2 sm:w-auto sm:px-4 text-sm font-bold text-brand-800"><Plus size={18} /><span className="hidden sm:inline">Create Design</span></button>
    </div>
    {error && !open && !deleting && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button className="ml-3 underline" onClick={() => { setError(''); void load().catch(err => setError(err.message)); }}>Retry</button></div>}
    {notice && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {loading ? <p role="status">Loading design-catalog...</p> : items.length === 0 ? <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-stone-500">No design-catalog projects yet. Create your first project.</p> :
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map(item => <article key={item.id} className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {item.image && <Image src={imageSource(item.image)} alt={item.title} width={640} height={360} unoptimized className="h-48 w-full object-cover" />}
        <div className="space-y-3 p-4"><p className="break-words text-xs font-bold uppercase text-brand-700">{item.category}</p><h2 className="break-words text-lg font-bold">{item.title}</h2><p className="line-clamp-3 break-words text-sm text-stone-600">{item.description}</p>
          <p className="text-sm font-semibold text-brand-800">{item.price == null ? "Price on request" : "From PHP " + Number(item.price).toLocaleString()} | {item.published ? "Published" : "Draft"}</p><div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={() => start(item)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-50 p-2 text-sm font-semibold text-brand-800"><Pencil size={16} />Edit</button><button disabled={saving} onClick={() => { setError(''); setDeleting(item); }} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 p-2 text-sm font-semibold text-red-700"><Trash2 size={16} />Delete</button></div>
        </div>
      </article>)}</div>}
    {open && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="design-catalog-form-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 id="design-catalog-form-title" className="text-xl font-bold">{editingId == null ? 'Create Design' : 'Edit Design'}</h2><button disabled={saving || uploading} aria-label="Close design-catalog form" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center"><X size={20} /></button></div>
        <form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
          <label className="block space-y-1 text-sm font-semibold"><span>Design Name</span><input autoFocus required maxLength={150} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold"><span>Category</span><select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={field}><option value="">Select category</option>{["Living Room","Kitchen","Office","Bed Room"].map(value=><option key={value}>{value}</option>)}</select></label>
          <label className="block space-y-1 text-sm font-semibold"><span>Design Description</span><textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={field} /></label>
          <label className="block space-y-1 text-sm font-semibold"><span>Starting Price (PHP)</span><input type="number" min="0" max="9999999999.99" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="Leave blank for price on request" className={field}/></label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Publish to client dashboard</label>
          <label className="block space-y-1 text-sm font-semibold"><span>Key Features (one per line, up to 8)</span><textarea rows={3} value={form.features} onChange={event=>setForm({...form,features:event.target.value})} className={field}/></label>
          <AdminImageUpload value={form.image} onChange={image => setForm(current => ({ ...current, image }))} onBusyChange={setUploading} disabled={saving} />
        </fieldset>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-3"><button disabled={saving || uploading} className="min-h-11 rounded-xl bg-marc-charcoal p-3 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : editingId == null ? 'Publish Design' : 'Save Changes'}</button><button type="button" disabled={saving || uploading} onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-stone-200 p-3 text-sm font-semibold">Cancel</button></div>
        </form>
      </section>
    </div>}
    {deleting && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="design-catalog-delete-title" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6">
      <h2 id="design-catalog-delete-title" className="text-lg font-bold">Delete design-catalog?</h2><p className="break-words text-sm text-stone-600">Delete “{deleting.title}” from the published design-catalog?</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-2 gap-3"><button disabled={saving} onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-600 p-3 text-sm font-bold text-white">{saving ? 'Deleting...' : 'Delete'}</button><button disabled={saving} onClick={() => setDeleting(null)} className="min-h-11 rounded-xl border p-3 text-sm">Cancel</button></div>
    </section></div>}
  </div>;
}
