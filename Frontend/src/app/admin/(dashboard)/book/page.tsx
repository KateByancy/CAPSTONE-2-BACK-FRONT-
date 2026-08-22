"use client";

import React, { useState } from 'react';
import { Check, X, Clock, CheckCircle2, XCircle, Calendar, User, ShieldCheck, Trash2 } from 'lucide-react';

interface BookingRequest {
  id: string;
  name: string;
  scope: string;
  date: string;
  note: string;
  status: 'pending' | 'confirmed' | 'rejected';
  dismissFromPending?: boolean; // Hides from 'pending' after action
}

type FilterTab = 'pending' | 'confirmed' | 'rejected';

export default function BookingsManagement() {
  // --- STATE SYSTEM ---
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [bookings, setBookings] = useState<BookingRequest[]>([
    {
      id: "B-8831",
      name: "John Doe",
      scope: "Living Room",
      date: "April 24th, 2026",
      note: '"it is small"',
      status: "pending"
    }
  ]);

  // Handle confirmation action
  const handleConfirm = (id: string) => {
    // 1. Mark status as confirmed
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'confirmed' } : b))
    );

    // 2. Dismiss from Pending view after showing success feedback for 1.2s
    setTimeout(() => {
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, dismissFromPending: true } : b))
      );
    }, 1200);
  };

  // Handle rejection action
  const handleReject = (id: string) => {
    // 1. Mark status as rejected
    setBookings(prev =>
      prev.map(b => (b.id === id ? { ...b, status: 'rejected' } : b))
    );

    // 2. Dismiss from Pending view after showing rejection feedback for 1.2s
    setTimeout(() => {
      setBookings(prev =>
        prev.map(b => (b.id === id ? { ...b, dismissFromPending: true } : b))
      );
    }, 1200);
  };

  // Permanently delete a booking entry
  const handleDelete = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  // Metrics Counters
  const pendingCount = bookings.filter(b => b.status === 'pending' && !b.dismissFromPending).length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const rejectedCount = bookings.filter(b => b.status === 'rejected').length;

  // Filter List Computation
  const visibleBookings = bookings.filter(b => {
    if (activeTab === 'pending') return b.status === 'pending' && !b.dismissFromPending;
    if (activeTab === 'confirmed') return b.status === 'confirmed';
    if (activeTab === 'rejected') return b.status === 'rejected';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 w-full p-4 sm:p-6 md:p-8 space-y-6">
      
      {/* 1. TOP HEADER & INTERACTIVE FILTER BADGES */}
      <div className="bg-[#0070c0] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Booking Requests
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-100 uppercase">
            Manage Bookings
          </p>
        </div>

        {/* CLICKABLE STATUS FILTER BADGES */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-sm">
          
          {/* PENDING TAB */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border-none cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-[#0070c0] shadow-sm'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCount})</span>
          </button>

          {/* CONFIRMED TAB */}
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border-none cursor-pointer ${
              activeTab === 'confirmed'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirmed ({confirmedCount})</span>
          </button>

          {/* REJECTED TAB */}
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border-none cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected ({rejectedCount})</span>
          </button>

        </div>
      </div>

      {/* 2. MAIN CONTENT DISPLAY GRID */}
      <div className="w-full max-w-7xl mx-auto">
        {visibleBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
            <p className="font-semibold text-sm">No {activeTab} booking records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleBookings.map((booking) => {
              // CHECK IF CURRENTLY SHOWING TEMPORARY ACTION ANIMATION IN PENDING
              const isJustConfirmed = booking.status === 'confirmed' && activeTab === 'pending';
              const isJustRejected = booking.status === 'rejected' && activeTab === 'pending';

              return (
                <div 
                  key={booking.id}
                  className="bg-[#f0f6fc] border border-blue-100 rounded-3xl p-6 sm:p-7 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between relative group"
                >
                  {/* CASE A: PENDING ACTIVE FORM VIEW */}
                  {booking.status === 'pending' && (
                    <div className="space-y-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <h2 className="text-xl font-bold font-serif text-slate-900 tracking-tight">
                            {booking.name}
                          </h2>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-blue-100 text-[#0070c0] rounded-full">
                            {booking.id}
                          </span>
                        </div>

                        <p className="text-sm font-serif text-slate-700 font-semibold">
                          {booking.scope}
                        </p>
                        <p className="text-xs text-slate-400 font-serif">
                          {booking.date}
                        </p>

                        {booking.note && (
                          <p className="text-xs text-slate-500 font-serif italic pt-2">
                            {booking.note}
                          </p>
                        )}
                      </div>

                      <div className="border-t border-slate-200/60 pt-5 grid grid-cols-2 gap-3">
                        {/* CONFIRM BUTTON */}
                        <button
                          onClick={() => handleConfirm(booking.id)}
                          className="w-full py-3 px-4 bg-[#51ce38] hover:bg-[#46b82f] active:scale-[0.98] text-white font-bold text-xs tracking-wider uppercase rounded-2xl transition shadow-sm border-none cursor-pointer flex items-center justify-center"
                        >
                          Confirm
                        </button>

                        {/* REJECT BUTTON */}
                        <button
                          onClick={() => handleReject(booking.id)}
                          className="w-full py-3 px-4 bg-white hover:bg-rose-50/50 active:scale-[0.98] text-[#e03131] border-2 border-slate-200 font-bold text-xs tracking-wider uppercase rounded-2xl transition cursor-pointer flex items-center justify-center"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CASE B: TEMPORARY SAVED FEEDBACK ANIMATION IN PENDING */}
                  {isJustConfirmed && (
                    <div className="py-10 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 bg-[#51ce38] rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-8 h-8 text-white stroke-[3]" />
                      </div>
                      <p className="text-base font-bold font-serif tracking-wider uppercase text-slate-800">
                        Saved!
                      </p>
                    </div>
                  )}

                  {/* CASE C: TEMPORARY REJECTED FEEDBACK ANIMATION IN PENDING */}
                  {isJustRejected && (
                    <div className="py-10 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 bg-[#e03131] rounded-full flex items-center justify-center shadow-md">
                        <X className="w-8 h-8 text-white stroke-[3]" />
                      </div>
                      <p className="text-base font-bold font-serif tracking-wider uppercase text-slate-800">
                        Rejected!
                      </p>
                    </div>
                  )}

                  {/* CASE D: FULL DETAILS FORM CARD FOR CONFIRMED OR REJECTED TABS WITH DELETE ICON */}
                  {booking.status !== 'pending' && activeTab !== 'pending' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      <div className="flex justify-between items-center border-b border-slate-200/80 pb-3 pr-7">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md">
                          {booking.id}
                        </span>
                        
                        {/* Status Label Pill */}
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          booking.status === 'confirmed' 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {booking.status === 'confirmed' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{booking.status}</span>
                        </span>
                      </div>

                      {/* DELETE ICON BUTTON */}
                      <button
                        onClick={() => handleDelete(booking.id)}
                        className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition border-none bg-transparent cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Client & Project Information */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-slate-900">
                          <User className="w-4 h-4 text-[#0070c0]" />
                          <h3 className="text-lg font-bold font-serif">{booking.name}</h3>
                        </div>

                        <div className="flex items-start space-x-2 text-slate-700 text-xs font-semibold">
                          <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Project Scope Focus</p>
                            <p className="text-slate-800">{booking.scope}</p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2 text-slate-700 text-xs font-semibold">
                          <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Scheduled Target Date</p>
                            <p className="text-slate-800">{booking.date}</p>
                          </div>
                        </div>

                        {booking.note && (
                          <p className="text-xs text-slate-500 font-serif italic bg-white/60 p-2.5 rounded-xl border border-blue-100/50 mt-1">
                            {booking.note}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}