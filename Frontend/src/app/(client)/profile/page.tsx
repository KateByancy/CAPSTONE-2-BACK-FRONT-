"use client";
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import ProfileAvatar from '@/components/ProfileAvatar';
import { requestProfile, getClientSession } from '@/lib/api';

interface AccountProfileProps {
  userName?: string;
  setActiveTab?: (tab: string) => void;
}

export default function AccountProfile({ userName = 'John Doe', setActiveTab }: AccountProfileProps) {
  const [fullName, setFullName] = useState(userName);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  
  // Feedback states for interactive actions
  const [saveMessage, setSaveMessage] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  

  useEffect(() => {
    const client = getClientSession();
    if (!client) { setError('Please sign in again to load your profile.'); setLoading(false); return; }
    const controller = new AbortController();
    void requestProfile('client', client.id, undefined, controller.signal).then(profile => {
      setFullName(profile.fullname);
      setPhoneNumber(profile.phone || '');
      setPrimaryAddress(profile.address || '');
      setLandmark(profile.landmark || '');
    }).catch(err => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load profile.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || saving) return;
    setError('');
    setSaveMessage(false);
    const client = getClientSession();
    if (!client) { setError('Please sign in again before saving your profile.'); return; }
    const token = localStorage.getItem('clientToken');
    if (!token) { setError('Please sign in again before saving your profile.'); return; }
    setSaving(true);
    try {
      const profile = await requestProfile('client', client.id, { fullname: fullName, phone: phoneNumber, address: primaryAddress, landmark });
      setFullName(profile.fullname);
      setPhoneNumber(profile.phone || '');
      setPrimaryAddress(profile.address || '');
      setLandmark(profile.landmark || '');
      setSaveMessage(true);
      setTimeout(() => setSaveMessage(false), 3000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update profile.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 space-y-6 animate-fadeIn pb-24 md:pb-12">
      
      {/* Top Header */}
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

      <div className="w-full max-w-2xl mx-auto space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center pt-2">
          <ProfileAvatar role="client" name={fullName} />
          <h2 className="mt-3 text-base sm:text-lg font-serif font-bold text-slate-900">
            {fullName || 'John Doe'}
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
            Client
          </span>
        </div>

        {/* Success Banner */}
        {saveMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-2xl text-xs flex items-center space-x-2 animate-fadeIn">
            <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Profile changes saved successfully!</span>
          </div>
        )}
        {error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-2xl text-xs">{error}</div>}

        {/* Form Container */}
        <form onSubmit={handleSaveChanges} className="space-y-6">
          <fieldset disabled={loading || saving} className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Full Name
              </label>
              <input 
                type="text" 
                value={fullName}
                required
                maxLength={150}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0070c0] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Phone Number
              </label>
              <input 
                type="tel" 
                value={phoneNumber}
                maxLength={30}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0070c0] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Primary Address
              </label>
              <input 
                type="text" 
                value={primaryAddress}
                onChange={(e) => setPrimaryAddress(e.target.value)}
                placeholder="Enter your primary address"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0070c0] transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Nearest Landmark
              </label>
              <input
                type="text"
                value={landmark}
                maxLength={255}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Beside the barangay hall"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0070c0] transition"
              />
            </div>

          </div>

          {/* Save Changes Button */}
          <button 
            type="submit"
            className="w-full bg-[#111c3a] hover:bg-[#1b2a54] text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl shadow-md transition cursor-pointer border-none"
          >
            {loading ? 'Loading...' : saving ? 'Saving...' : 'Save Changes'}
          </button>
          </fieldset>
        </form>

      </div>
    </div>
  );
}
