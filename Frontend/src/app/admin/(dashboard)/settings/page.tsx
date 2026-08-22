"use client";

import React, { useState } from 'react';
import { Camera, Plus, ShieldCheck, Trash2, X } from 'lucide-react';

export default function ProfileSettings() {
  // --- FORM STATES ---
  const [formData, setFormData] = useState({
    fullName: 'Marc',
    phoneNumber: '+63 912 345 6789',
    address: 'Manila, Philippines',
  });

  // --- PORTFOLIO MODAL STATE ---
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [portfolioData, setPortfolioData] = useState({
    title: '',
    imageUrl: '',
    category: '',
    stories: '',
  });

  // Handle main profile update submit
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Profile settings saved successfully!');
  };

  // Handle portfolio submission
  const handlePublishPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Portfolio item published successfully!');
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
        
        {/* AVATAR SECTION */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-2">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center shadow-inner">
              <span className="text-3xl sm:text-4xl font-serif text-slate-800 font-bold">
                {formData.fullName.charAt(0) || 'M'}
              </span>
            </div>
            
            {/* CAMERA BADGE */}
            <button className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition cursor-pointer border-2 border-white shadow-md">
              <Camera className="w-4 h-4" />
            </button>
          </div>

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
            <div className="bg-[#f0f6fc] border border-blue-100/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
              
              {/* FULL NAME */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold font-serif text-slate-500 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
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
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0070c0]/30 shadow-inner"
                  placeholder="Enter phone number"
                />
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
              Save Changes
            </button>
          </form>

        </div>

        {/* APP CONFIGURATION SECTION */}
        <div className="space-y-3 pt-2">
          <p className="text-[10px] font-bold font-serif text-slate-400 uppercase tracking-widest text-center">
            App Configuration
          </p>

          <div className="space-y-2 max-w-md mx-auto">
            {/* TWO-FACTOR AUTHENTICATION */}
            <button
              onClick={() => alert('Two-Factor Authentication toggled!')}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center space-x-2 text-xs font-serif font-semibold text-slate-700 shadow-sm transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Two-Factor Authentication</span>
            </button>

            {/* DELETE ACCOUNT */}
            <button
              onClick={() => confirm('Are you sure you want to delete your account?')}
              className="w-full py-3 px-4 bg-white hover:bg-rose-50 border border-slate-200 rounded-2xl flex items-center justify-center space-x-2 text-xs font-serif font-semibold text-rose-600 shadow-sm transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete Account</span>
            </button>
          </div>
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

              {/* IMAGE URL */}
              <input
                type="text"
                required
                value={portfolioData.imageUrl}
                onChange={(e) => setPortfolioData({ ...portfolioData, imageUrl: e.target.value })}
                placeholder="Image URL (CDN Link)"
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