"use client";
import React, { useState } from 'react';
import { Camera, ShieldCheck, Trash2, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AccountProfileProps {
  userName?: string;
  setActiveTab?: (tab: string) => void;
}

export default function AccountProfile({ userName = 'John Doe', setActiveTab }: AccountProfileProps) {
  const [fullName, setFullName] = useState(userName);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState('');
  
  // Feedback states for interactive actions
  const [saveMessage, setSaveMessage] = useState(false);
  const [tfaActive, setTfaActive] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const router = useRouter();

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(true);
    setTimeout(() => setSaveMessage(false), 3000);
  };

  const handleToggleTfa = () => {
    setTfaActive(!tfaActive);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    router.push('/');
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6 animate-fadeIn pb-24 md:pb-12">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80">
        <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-slate-900">
          Profile Settings
        </h1>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 mt-0.5">
          Personal Identity & App Configuration
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border border-slate-300 bg-white flex items-center justify-center text-3xl font-serif font-bold text-slate-800 shadow-sm">
              {fullName ? fullName.charAt(0).toUpperCase() : 'J'}
            </div>
            <button 
              type="button"
              onClick={() => alert("Upload photo functionality triggered.")}
              className="absolute bottom-0 right-0 p-2 bg-[#111c3a] text-white rounded-full shadow-md hover:bg-black transition cursor-pointer border-2 border-white"
              title="Change Avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
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

        {/* Form Container */}
        <form onSubmit={handleSaveChanges} className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Full Name
              </label>
              <input 
                type="text" 
                value={fullName}
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

          </div>

          {/* Save Changes Button */}
          <button 
            type="submit"
            className="w-full bg-[#111c3a] hover:bg-[#1b2a54] text-white text-xs font-black uppercase tracking-widest py-4 rounded-2xl shadow-md transition cursor-pointer border-none"
          >
            Save Changes
          </button>
        </form>

        {/* App Configuration / Extra Settings */}
        <div className="pt-2 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
            App Configuration
          </p>
          
          <div className="space-y-2.5">
            <button 
              type="button"
              onClick={handleToggleTfa}
              className={`w-full border rounded-2xl p-4 flex items-center justify-between text-xs font-bold shadow-sm transition cursor-pointer ${
                tfaActive 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className={`w-4 h-4 ${tfaActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>Two-Factor Authentication</span>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tfaActive ? 'bg-emerald-200/60 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                {tfaActive ? 'ENABLED' : 'DISABLED'}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="w-full bg-white hover:bg-rose-50/50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-center space-x-2 text-xs font-bold text-rose-600 shadow-sm transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-fadeIn">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-base font-serif font-black text-slate-900">Are you sure you want to delete your account?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This action is irreversible and will permanently clear all your project layouts and history.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition cursor-pointer border-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-3.5 rounded-2xl transition cursor-pointer border-none shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}