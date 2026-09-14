"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Plus, X } from 'lucide-react';
import ProfileAvatar from '@/components/ProfileAvatar';
import { getApiUrl, requestProfile } from '@/lib/api';

export default function ProfileSettings() {
  const imageInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  async function uploadImage(file?: File) {
    if (!file) return;
    setUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setUploadError('Choose a JPEG, PNG or WebP image up to 5 MB.'); return; }
    setUploading(true);
    try {
      const body = new FormData(); body.append('image', file);
      const response = await fetch(`${getApiUrl()}/portfolio/upload`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('adminToken') || ''}` }, body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Image upload failed.');
      setPortfolioData(current => ({ ...current, imageUrl: result.image }));
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Image upload failed.'); }
    finally { setUploading(false); }
  }
  // --- FORM STATES ---
  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', address: '',
  });
  const [adminId, setAdminId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      try {
        const account = JSON.parse(localStorage.getItem('adminAccount') || 'null');
        if (!account?.id) throw new Error('Please sign in again to load your profile.');
        const profile = await requestProfile('admin', account.id, undefined, controller.signal);
        setAdminId(profile.id);
        setFormData({ fullName: profile.fullname, phoneNumber: profile.phone || '', address: profile.address || '' });
      } catch (err) {
        if (!controller.signal.aborted) setMessage(err instanceof Error ? err.message : 'Unable to load profile.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void loadProfile();
    return () => controller.abort();
  }, []);

  // --- PORTFOLIO MODAL STATE ---
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState({
    title: '',
    imageUrl: '',
    category: '',
    stories: '',
  });

  // Handle main profile update submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || saving) return;
    if(!adminId)return setMessage('Please sign in again.');
    setMessage('');
    setSaving(true);
    try {
      const profile = await requestProfile('admin', adminId, { fullname: formData.fullName, phone: formData.phoneNumber, address: formData.address });
      setFormData({ fullName: profile.fullname, phoneNumber: profile.phone || '', address: profile.address || '' });
      setMessage('Profile settings saved.');
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Unable to save profile.'); }
    finally { setSaving(false); }
  };

  // Handle portfolio submission
  const handlePublishPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading || !portfolioData.imageUrl) { setUploadError('Upload an image before publishing.'); return; }
    const response=await fetch(`${getApiUrl()}/portfolio`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:portfolioData.title,image:portfolioData.imageUrl,category:portfolioData.category,description:portfolioData.stories})});
    if(!response.ok)return setMessage('Unable to publish portfolio item.');
    setMessage('Portfolio item published successfully.');
    setIsPortfolioOpen(false);
    setPortfolioData({ title: '', imageUrl: '', category: '', stories: '' });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 w-full p-4 sm:p-6 md:p-8 space-y-6">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-[#0070c0] text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Profile Settings
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-100 uppercase font-serif">
            Personal Identity
          </p>
        </div>
      </div>

      {/* 2. MAIN SETTINGS CARD CONTAINER */}
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {message && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{message}</p>}
        
        {/* AVATAR SECTION */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-2">
          <ProfileAvatar role="admin" name={formData.fullName} />

          <div className="text-center">
            <h2 className="text-xl font-bold font-serif text-slate-900">
              {formData.fullName || 'User'}
            </h2>
            <p className="text-[11px] font-bold font-mono text-slate-400 uppercase tracking-widest">
              ADMIN
            </p>
          </div>
        </div>

        {/* FORM & PORTFOLIO HEADER SECTION */}
        <div className="space-y-4">
          
          {/* SECTION HEADER WITH ADD PORTFOLIO BUTTON */}
          <div className="flex justify-between items-center px-2">
            <p className="text-xs font-bold font-serif text-slate-500 uppercase tracking-wider">
              Portfolio Updates
            </p>

            <button
              onClick={() => setIsPortfolioOpen(true)}
              className="p-2 bg-slate-200/80 hover:bg-slate-300 text-slate-700 rounded-xl transition cursor-pointer border-none flex items-center justify-center"
              title="Add Portfolio Item"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* MAIN PROFILE INPUT FORM */}
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <fieldset disabled={loading || saving || !adminId} className="space-y-5">
            <div className="bg-[#f0f6fc] border border-blue-100/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              
              {/* FULL NAME */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-serif text-slate-500 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  required
                  maxLength={150}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30 shadow-inner"
                  placeholder="Enter full name"
                />
              </div>

              {/* PHONE NUMBER */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-serif text-slate-500 uppercase tracking-wider block">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phoneNumber}
                  maxLength={30}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30 shadow-inner"
                  placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                  aria-describedby="admin-phone-help"
                />
                <p id="admin-phone-help" className="mt-2 text-xs text-slate-500">SMS password recovery uses this saved mobile number. Keep it up to date.</p>
              </div>

              {/* PRIMARY ADDRESS */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-serif text-slate-500 uppercase tracking-wider block">
                  Primary Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30 shadow-inner"
                  placeholder="Enter primary address"
                />
              </div>

            </div>

            {/* SAVE CHANGES BUTTON */}
            <button
              type="submit"
              className="w-full py-4 bg-[#111827] hover:bg-[#1f2937] active:scale-[0.99] text-white font-serif font-bold text-xs tracking-widest uppercase rounded-2xl transition shadow-md border-none cursor-pointer"
            >
              {loading ? 'Loading...' : saving ? 'Saving...' : 'Save Changes'}
            </button>
            </fieldset>
          </form>

        </div>

      </div>

      {/* 3. PORTFOLIO UPDATES MODAL */}
      {isPortfolioOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 relative">
            
            {/* CLOSE MODAL BUTTON */}
            <button
              onClick={() => setIsPortfolioOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition cursor-pointer border-none bg-transparent"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight border-b border-slate-100 pb-3">
              PORTFOLIO UPDATES
            </h2>

            <form onSubmit={handlePublishPortfolio} className="space-y-4">
              
              {/* PROJECT TITLE */}
              <input
                type="text"
                required
                value={portfolioData.title}
                onChange={(e) => setPortfolioData({ ...portfolioData, title: e.target.value })}
                placeholder="Project Title"
                className="w-full px-4 py-3 bg-[#f0f6fc] border border-blue-100 rounded-2xl text-xs font-serif text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30"
              />

              {/* CATEGORY */}
              <input
                type="text"
                required
                value={portfolioData.category}
                onChange={(e) => setPortfolioData({ ...portfolioData, category: e.target.value })}
                placeholder="Category (e.g. Modern, Minimalist)"
                className="w-full px-4 py-3 bg-[#f0f6fc] border border-blue-100 rounded-2xl text-xs font-serif text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30"
              />

              {/* STORIES & MATERIALS */}
              <textarea
                rows={4}
                required
                value={portfolioData.stories}
                onChange={(e) => setPortfolioData({ ...portfolioData, stories: e.target.value })}
                placeholder="Project Stories & Materials"
                className="w-full px-4 py-3 bg-[#f0f6fc] border border-blue-100 rounded-2xl text-xs font-serif text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30 resize-none"
              />

              <div className="space-y-2">
                <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Choose portfolio image" onChange={event => { void uploadImage(event.target.files?.[0]); event.target.value = ''; }} />
                <button type="button" disabled={uploading} onClick={() => imageInput.current?.click()} className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 disabled:opacity-50">
                  {uploading ? 'Uploading image...' : portfolioData.imageUrl ? 'Change Image' : 'Upload Image'}
                </button>
                <p className="text-xs text-slate-500">JPEG, PNG or WebP, up to 5 MB.</p>
                {uploadError && <p role="alert" className="text-xs text-red-600">{uploadError}</p>}
                {portfolioData.imageUrl && <Image src={portfolioData.imageUrl} alt="Portfolio preview" width={640} height={192} unoptimized className="max-h-48 w-full rounded-xl object-contain" />}
              </div>

              {/* MODAL ACTION BUTTONS */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#111827] hover:bg-[#1f2937] active:scale-[0.98] text-white font-serif font-bold text-xs tracking-wider uppercase rounded-2xl transition border-none cursor-pointer"
                >
                  Publish Work
                </button>

                <button
                  type="button"
                  onClick={() => setIsPortfolioOpen(false)}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-serif font-bold text-xs tracking-wider uppercase rounded-2xl transition cursor-pointer"
                >
                  Discard
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
