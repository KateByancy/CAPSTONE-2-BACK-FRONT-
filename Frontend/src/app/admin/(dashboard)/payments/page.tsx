"use client";

import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  CreditCard, 
  User, 
  Calendar, 
  Hash, 
  Receipt,
  ArrowRight,
  ShieldCheck,
  FileText
} from 'lucide-react';

interface PaymentTransaction {
  reference: string;
  client: string;
  amount: string;
  date: string;
  method: string;
  status: 'pending' | 'accepted' | 'declined';
  dismissFromPending?: boolean;
}

type FilterTab = 'pending' | 'accepted' | 'declined';

export default function PaymentsVerification() {
  // --- STATE SYSTEM ---
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([
    {
      reference: "4000082236507",
      client: "John Doe",
      amount: "40,000",
      date: "Apr 24, 2026",
      method: "Gcash Transfer",
      status: "pending"
    }
  ]);

  // Handle Accept Action
  const handleAccept = (reference: string) => {
    setTransactions(prev =>
      prev.map(t => (t.reference === reference ? { ...t, status: 'accepted' } : t))
    );

    setTimeout(() => {
      setTransactions(prev =>
        prev.map(t => (t.reference === reference ? { ...t, dismissFromPending: true } : t))
      );
    }, 1200);
  };

  // Handle Decline Action
  const handleDecline = (reference: string) => {
    setTransactions(prev =>
      prev.map(t => (t.reference === reference ? { ...t, status: 'declined' } : t))
    );

    setTimeout(() => {
      setTransactions(prev =>
        prev.map(t => (t.reference === reference ? { ...t, dismissFromPending: true } : t))
      );
    }, 1200);
  };

  // Permanently delete transaction record
  const handleDelete = (reference: string) => {
    setTransactions(prev => prev.filter(t => t.reference !== reference));
  };

  // Metrics Counters
  const pendingCount = transactions.filter(t => t.status === 'pending' && !t.dismissFromPending).length;
  const acceptedCount = transactions.filter(t => t.status === 'accepted').length;
  const declinedCount = transactions.filter(t => t.status === 'declined').length;

  // Visible Items Filter Computation
  const visibleTransactions = transactions.filter(t => {
    if (activeTab === 'pending') return t.status === 'pending' && !t.dismissFromPending;
    if (activeTab === 'accepted') return t.status === 'accepted';
    if (activeTab === 'declined') return t.status === 'declined';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 w-full p-4 sm:p-6 md:p-8 space-y-6">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-[#0070c0] text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight">
            Payment Verification
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-100 uppercase">
            Verify Transactions & Audit Logs
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

          {/* ACCEPTED TAB */}
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border-none cursor-pointer ${
              activeTab === 'accepted'
                ? 'bg-[#1e7e12] text-white shadow-sm'
                : 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Accepted ({acceptedCount})</span>
          </button>

          {/* DECLINED TAB */}
          <button
            onClick={() => setActiveTab('declined')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border-none cursor-pointer ${
              activeTab === 'declined'
                ? 'bg-[#e03131] text-white shadow-sm'
                : 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Declined ({declinedCount})</span>
          </button>

        </div>
      </div>

      {/* 2. MAIN LONG-FORM DISPLAY CONTAINER */}
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {visibleTransactions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <p className="font-semibold text-sm">No {activeTab} payment transactions found.</p>
          </div>
        ) : (
          visibleTransactions.map((txn) => {
            const isJustAccepted = txn.status === 'accepted' && activeTab === 'pending';
            const isJustDeclined = txn.status === 'declined' && activeTab === 'pending';

            return (
              <div 
                key={txn.reference}
                className="bg-white border border-slate-200/90 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                
                {/* CASE A & D: LONG-FORM TRANSACTION VIEW */}
                {!isJustAccepted && !isJustDeclined && (
                  <div>
                    {/* BLUE INNER CARD HEADER BANNER */}
                    <div className="bg-[#0070c0] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
                          <Receipt className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono font-bold text-blue-100 uppercase tracking-widest">
                            Transaction Reference
                          </p>
                          <h2 className="text-lg sm:text-xl font-bold font-serif tracking-tight">
                            REF: {txn.reference}
                          </h2>
                        </div>
                      </div>

                      {/* STATUS BADGE & ACTION DELETE */}
                      <div className="flex items-center space-x-3 self-end sm:self-auto">
                        <span className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          txn.status === 'pending'
                            ? 'bg-amber-400 text-amber-950'
                            : txn.status === 'accepted'
                            ? 'bg-emerald-400 text-emerald-950'
                            : 'bg-rose-400 text-rose-950'
                        }`}>
                          {txn.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                          {txn.status === 'accepted' && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {txn.status === 'declined' && <XCircle className="w-3.5 h-3.5" />}
                          <span>{txn.status}</span>
                        </span>

                        {activeTab !== 'pending' && (
                          <button
                            onClick={() => handleDelete(txn.reference)}
                            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition border-none bg-transparent cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* EXPANDED LONG-FORM CONTENT BODY */}
                    <div className="p-6 sm:p-8 space-y-6 bg-[#f0f6fc]/40">
                      
                      {/* FORM FIELD ROW 1: CLIENT & AMOUNT OVERVIEW */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        
                        {/* CLIENT FIELD */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100/80 shadow-sm space-y-1">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <User className="w-4 h-4 text-[#0070c0]" />
                            <label className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500">
                              Client Name
                            </label>
                          </div>
                          <p className="text-base sm:text-lg font-serif font-bold text-slate-900 pl-6">
                            {txn.client}
                          </p>
                        </div>

                        {/* AMOUNT FIELD */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100/80 shadow-sm space-y-1">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <FileText className="w-4 h-4 text-[#0070c0]" />
                            <label className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500">
                              Transaction Amount
                            </label>
                          </div>
                          <p className="text-xl sm:text-2xl font-serif font-bold text-slate-900 pl-6">
                            ₱ {txn.amount}
                          </p>
                        </div>

                      </div>

                      {/* FORM FIELD ROW 2: PAYMENT METHOD & DATE */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        
                        {/* PAYMENT METHOD */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100/80 shadow-sm space-y-1">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <CreditCard className="w-4 h-4 text-slate-500" />
                            <label className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500">
                              Payment Gateway Method
                            </label>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-slate-800 pl-6">
                            {txn.method}
                          </p>
                        </div>

                        {/* TRANSACTION DATE */}
                        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100/80 shadow-sm space-y-1">
                          <div className="flex items-center space-x-2 text-slate-400">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <label className="text-[10px] font-serif font-bold uppercase tracking-wider text-slate-500">
                              Date Submitted
                            </label>
                          </div>
                          <p className="text-sm sm:text-base font-semibold text-slate-800 pl-6">
                            {txn.date}
                          </p>
                        </div>

                      </div>

                      {/* FORM FIELD ROW 3: AUDIT SUMMARY & SECURITY NOTE */}
                      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-100/80 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 text-slate-600">
                          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          <p className="text-xs font-semibold text-slate-600">
                            Encrypted 256-bit payment verification record ready for manual audit approval.
                          </p>
                        </div>
                      </div>

                      {/* PENDING STATE ACTION FOOTER BUTTONS */}
                      {txn.status === 'pending' && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* ACCEPT BUTTON */}
                          <button
                            onClick={() => handleAccept(txn.reference)}
                            className="w-full py-4 bg-[#1e7e12] hover:bg-[#18660e] active:scale-[0.99] text-white font-serif font-bold text-xs tracking-widest uppercase rounded-2xl transition shadow-md border-none cursor-pointer flex items-center justify-center space-x-2"
                          >
                            <Check className="w-4 h-4" />
                            <span>Accept Payment</span>
                          </button>

                          {/* DECLINE BUTTON */}
                          <button
                            onClick={() => handleDecline(txn.reference)}
                            className="w-full py-4 bg-[#f09595] hover:bg-[#e28383] active:scale-[0.99] text-[#801b1b] font-serif font-bold text-xs tracking-widest uppercase rounded-2xl transition border-none cursor-pointer flex items-center justify-center space-x-2"
                          >
                            <X className="w-4 h-4" />
                            <span>Decline Payment</span>
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* CASE B: TEMPORARY ACCEPTED FEEDBACK ANIMATION */}
                {isJustAccepted && (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-[#1e7e12] rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-10 h-10 text-white stroke-[3]" />
                    </div>
                    <p className="text-lg font-bold font-serif tracking-wider uppercase text-slate-800">
                      TRANSACTION ACCEPTED!
                    </p>
                  </div>
                )}

                {/* CASE C: TEMPORARY DECLINED FEEDBACK ANIMATION */}
                {isJustDeclined && (
                  <div className="py-16 flex flex-col items-center justify-center space-y-3 bg-white animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-20 h-20 bg-[#e03131] rounded-full flex items-center justify-center shadow-lg">
                      <X className="w-10 h-10 text-white stroke-[3]" />
                    </div>
                    <p className="text-lg font-bold font-serif tracking-wider uppercase text-slate-800">
                      TRANSACTION DECLINED!
                    </p>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}