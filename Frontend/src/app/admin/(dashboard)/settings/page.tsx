"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import ProfileAvatar from '@/components/ProfileAvatar';
import ChangePassword from '@/components/ChangePassword';
import { getApiUrl, requestProfile } from '@/lib/api';

export default function ProfileSettings() {
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

  return (
    <div className="min-h-screen bg-slate-50/50 w-full p-4 sm:p-6 md:p-8 space-y-6">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-[#0070c0] text-white rounded-3xl p-4 sm:p-8 shadow-md flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Profile Settings
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-100 uppercase font-serif">
            Personal Identity
          </p>
        </div>
        <Link
          href="/admin"
          onClick={() => {
            const token = localStorage.getItem('adminToken');
            if (token) {
              void fetch(`${getApiUrl()}/auth/presence/offline`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                keepalive: true,
              }).catch(() => undefined);
            }
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminAccount');
          }}
          aria-label="Log out"
          title="Log out"
          className="md:hidden shrink-0 h-11 w-11 flex items-center justify-center rounded-xl border border-white/30 bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Link>
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

        {/* PROFILE FORM SECTION */}
        <div className="space-y-4">
          
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
                <p id="admin-phone-help" className="mt-2 text-xs text-slate-500">Keep this contact number up to date. Admin password recovery uses your registered email address.</p>
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
          <ChangePassword role="admin" />

        </div>

      </div>

    </div>
  );
}
