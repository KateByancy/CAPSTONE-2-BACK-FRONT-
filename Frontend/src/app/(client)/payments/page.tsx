// src/components/Payments.tsx
"use client";
import React, { useState } from 'react';
import { Smartphone, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface PaymentsProps {
  onBack?: () => void;
}

export default function Payments({ onBack = () => undefined }: PaymentsProps) {
  const [amount, setAmount] = useState('');
  const [refNum, setRefNum] = useState('');
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className="p-6 text-center space-y-4 flex flex-col justify-center items-center min-h-[500px] animate-scaleIn">
        <CheckCircle className="w-16 h-16 text-emerald-500" />
        <h3 className="text-lg font-serif font-bold text-slate-800">Reference Received!</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">Your GCash sequence has been submitted for verification processing.</p>
        <button onClick={onBack} className="mt-4 bg-slate-900 text-white text-xs font-bold tracking-widest px-6 py-2.5 rounded-lg">RETURN</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 animate-fadeIn">
      <div className="flex items-center space-x-2">
        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg transition text-slate-600">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-sm font-serif font-black text-slate-800 tracking-wide">Payments</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">GCash Reference Confirmation</p>
        </div>
      </div>

      {/* Interactive Merchant Card Element */}
      <div className="bg-[#f0f6fc] border border-blue-100 rounded-2xl p-5 text-center shadow-inner space-y-2">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm mx-auto flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">GCash Direct Pay</h3>
        <p className="text-[11px] text-slate-500">Send layout billing allocation payment to:</p>
        <p className="text-sm font-black text-slate-800 tracking-wider">0917-123-4567</p>
        <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">(Mark Custom Design)</p>
      </div>

      {/* Financial Declaration Inputs */}
      <form onSubmit={(e) => { e.preventDefault(); setSuccess(true); }} className="space-y-4">
        <div>
          <label className="text-[9px] tracking-widest font-black text-slate-500 block mb-1 uppercase">Amount (PHP)</label>
          <input required type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <label className="text-[9px] tracking-widest font-black text-slate-500 block mb-1 uppercase">Reference Number</label>
          <input required type="text" placeholder="13-digit reference number" value={refNum} onChange={(e) => setRefNum(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500" />
        </div>

        <button type="submit" className="w-full bg-[#111c3a] text-white text-xs font-bold tracking-widest py-3 rounded-xl shadow-md transition hover:bg-[#16254e]">
          CONFIRM PAYMENT
        </button>
      </form>

      {/* Manual Processing Notice */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start space-x-3">
        <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-slate-400 leading-normal font-medium">
          MANUAL VERIFICATION WITHIN 24 HOURS. PLEASE KEEP AN UNEDITED DIGITAL SCREENSHOT RECEIPT IMAGE SECURE FOR SECURITY VERIFICATION.
        </p>
      </div>
    </div>
  );
}