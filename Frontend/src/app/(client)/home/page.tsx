"use client";
import React, { useState, useEffect } from 'react';
// The installed lucide-react package does not ship declaration files.
// @ts-ignore -- preserve the icon imports until the dependency is typed.
import { User, Calculator, ArrowRight, Wallet, CalendarRange, Check, Calendar, AlertCircle, Smartphone, ArrowLeft, Upload, Clock, ChevronLeft, ChevronRight, X, ChevronUp, ChevronDown } from 'lucide-react';
import { getApiUrl, getClientSession } from '@/lib/api';

interface HomeProps {
  onOpenSettings?: () => void;
  onOpenPayments?: () => void;
  setActiveTab?: (tab: string) => void;
  userName?: string;
  onLogout?: () => void;
}

export default function Home({ 
  onOpenSettings = () => console.log('Settings opened'), 
  onOpenPayments = () => console.log('Payments opened'),
  setActiveTab,
  userName = 'Doe, John',
  onLogout
}: HomeProps) {
  const [area, setArea] = useState<number>(0);
  const [style, setStyle] = useState<string>('Modern');
  const [complexity, setComplexity] = useState<string>('Standard');
  const [estimate, setEstimate] = useState<{ min: number; max: number }>({ min: 0, max: 0 });

  // --- VIEW ROUTING STATE ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'payments' | 'schedules'>('dashboard');

  // --- SCHEDULES TOGGLE STATE (Show/Hide Calendar Widget) ---
  const [showCalendarView, setShowCalendarView] = useState<boolean>(false);
  const [clientSchedule, setClientSchedule] = useState<{service_type:string;project_description:string;visit_date:string;status:string;time_start?:string;time_end?:string} | null>(null);

  useEffect(() => {
    const loadSchedule = async () => {
      const client=getClientSession(); if(!client)return;
      const response=await fetch(`${getApiUrl()}/schedule?user_id=${client.id}`);
      const rows=await response.json();
      if(!response.ok) return;
      const schedule=Array.isArray(rows)&&rows.length?rows[0]:null;
      setClientSchedule(schedule);
      if(schedule?.visit_date){const date=new Date(schedule.visit_date);setCurrentMonth(date.getMonth());setCurrentYear(date.getFullYear());setSelectedDate(date.getDate());}
    };
    void loadSchedule();
    const timer=window.setInterval(()=>void loadSchedule(),10000);
    return()=>window.clearInterval(timer);
  }, []);

  // --- BOOKING MODAL STATE ENGINE ---
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<'form' | 'success'>('form');
  const [serviceType, setServiceType] = useState<string>('Living Room Makeover');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [preferredStartDate, setPreferredStartDate] = useState<string>('');
  const [preferredStartTime, setPreferredStartTime] = useState<string>('');
  const [unavailableSlots, setUnavailableSlots] = useState<Array<{visit_date:string;time_start:string}>>([]);
  const [bookingError, setBookingError] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  useEffect(() => {
    const loadUnavailableSlots=async()=>{const response=await fetch(`${getApiUrl()}/schedule/unavailable`);const data=await response.json();if(response.ok)setUnavailableSlots(data.slots??[]);};
    void loadUnavailableSlots();
    const timer=window.setInterval(()=>void loadUnavailableSlots(),10000);
    return()=>window.clearInterval(timer);
  },[]);
  const hasScheduleConflict=Boolean(preferredStartDate&&preferredStartTime&&unavailableSlots.some(slot=>slot.visit_date===preferredStartDate&&slot.time_start.slice(0,5)===preferredStartTime));

  // --- AUTO-CLOSE TIMEOUT EFFECT FOR BOOKING SUCCESS ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBookingOpen && bookingStep === 'success') {
      timer = setTimeout(() => {
        setIsBookingOpen(false);
        setActiveTab?.('book');
      }, 2000); // Automatically closes modal after 2 seconds
    }
    return () => clearTimeout(timer);
  }, [isBookingOpen, bookingStep]);

  // --- SCHEDULES INTERACTION STATE ---
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number>(() => new Date().getDate());

  // --- PAYMENTS PAGE STATE ENGINE ---
  const [paymentAmount, setPaymentAmount] = useState('');
  const [refNum, setRefNum] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([
    { id: 'TXN-94821', date: 'Apr 20, 2026', amount: '₱15,000.00', status: 'Verified', ref: '1938291029384' },
    { id: 'TXN-83712', date: 'Apr 10, 2026', amount: '₱10,000.00', status: 'Pending', ref: '9837426150293' }
  ]);

  // Calculation Logic Engine
  useEffect(() => {
    let baseRate = 2500; 

    if (style === 'Luxury') baseRate = 4500;
    if (style === 'Minimalist') baseRate = 3000;

    const complexityMultiplier = complexity === 'Premium' ? 1.4 : 1.0;

    const calculatedBase = area * baseRate * complexityMultiplier;
    const minEstimate = Math.round(calculatedBase * 0.9);
    const maxEstimate = Math.round(calculatedBase * 1.1);

    if (isNaN(area) || area <= 0) {
      setEstimate({ min: 0, max: 0 });
    } else {
      setEstimate({ min: minEstimate, max: maxEstimate });
    }
  }, [area, style, complexity]);

  const handleOpenBooking = () => {
    setBookingStep('form');
    setIsBookingOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getClientSession();
    if (!client) {
      setBookingError('Please sign in again before creating a booking.');
      return;
    }
    if (!preferredStartDate || !preferredStartTime) {
      setBookingError('Please select your preferred project start date and time.');
      return;
    }
    if (hasScheduleConflict) {
      setBookingError('That date and time is already booked. Please choose another slot.');
      return;
    }
    setIsBookingSubmitting(true);
    setBookingError('');
    try {
      const response = await fetch(`${getApiUrl()}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: client.id, service_type: serviceType, project_description: projectDescription, preferred_start_date: preferredStartDate, preferred_start_time: preferredStartTime }),
      });
      const result: { success: boolean; message?: string; bookingId?: number } = await response.json();
      if (!response.ok || !result.success || !result.bookingId) throw new Error(result.message || 'Unable to create booking.');
      localStorage.setItem('activeBookingId', String(result.bookingId));
      setBookingStep('success');
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Unable to create booking.');
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || !refNum) return;

    const newTxn = {
      id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      amount: `₱${parseFloat(paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      status: 'Pending Verification',
      ref: refNum
    };

    setPaymentHistory([newTxn, ...paymentHistory]);
    setPaymentSuccess(true);
    setPaymentAmount('');
    setRefNum('');
  };

  // Calendar Helper Logic
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // --- RENDER DEDICATED PAYMENTS PAGE ---
  if (currentView === 'payments') {
    return (
      <div className="space-y-6 animate-fadeIn relative">
        <div className="bg-[#0070c0] text-white rounded-2xl p-4 sm:p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 transition cursor-pointer border-none text-white flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-serif font-black tracking-wide">Payments & Billing</h2>
              <p className="text-xs text-blue-100 font-light mt-0.5">Manage invoices, GCash receipts, and verification tracking.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#141b2d] text-white p-6 rounded-2xl shadow-xl border border-slate-800 space-y-2">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Billed Balance</p>
                <p className="text-2xl font-serif font-black text-blue-400">₱25,000.00</p>
                <p className="text-[10px] text-slate-500">Includes active layout milestones.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-2">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Verified Payments</p>
                <p className="text-2xl font-serif font-black text-emerald-600">₱15,000.00</p>
                <p className="text-[10px] text-slate-500">Successfully processed transactions.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-serif font-black text-slate-800 tracking-wide">Transaction History</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Activity</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-3 px-2">Transaction ID</th>
                      <th className="py-3 px-2">Date</th>
                      <th className="py-3 px-2">Reference #</th>
                      <th className="py-3 px-2">Amount</th>
                      <th className="py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paymentHistory.map((txn, index) => (
                      <tr key={index} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-2 font-bold font-mono text-slate-700">{txn.id}</td>
                        <td className="py-3.5 px-2 text-slate-500">{txn.date}</td>
                        <td className="py-3.5 px-2 font-mono text-slate-600">{txn.ref}</td>
                        <td className="py-3.5 px-2 font-serif font-black text-slate-900">{txn.amount}</td>
                        <td className="py-3.5 px-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wider ${
                            txn.status === 'Verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
              <div>
                <h3 className="text-sm font-serif font-black text-slate-800 tracking-wide">Submit GCash Payment</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">Reference Confirmation</p>
              </div>

              <div className="bg-[#f0f6fc] border border-blue-100 rounded-2xl p-4 text-center shadow-inner space-y-1">
                <div className="w-8 h-8 bg-white rounded-xl shadow-sm mx-auto flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-xs font-black tracking-wider text-slate-800 uppercase">GCash Direct Pay</h4>
                <p className="text-[11px] text-slate-500">Send layout billing payment to:</p>
                <p className="text-sm font-black text-slate-800 tracking-wider">0917-123-4567</p>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">(Mark Custom Design)</p>
              </div>

              {paymentSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  <span>Reference submitted successfully! Pending verification.</span>
                </div>
              )}

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="text-[9px] tracking-widest font-black text-slate-500 block mb-1 uppercase">Amount (PHP)</label>
                  <input 
                    required 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={paymentAmount} 
                    onChange={(e) => setPaymentAmount(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-bold" 
                  />
                </div>

                <div>
                  <label className="text-[9px] tracking-widest font-black text-slate-500 block mb-1 uppercase">Reference Number</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="13-digit reference number" 
                    value={refNum} 
                    onChange={(e) => setRefNum(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-[#111c3a] hover:bg-[#16254e] text-white text-xs font-bold tracking-widest py-3 rounded-xl shadow-md transition cursor-pointer border-none flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>SUBMIT REFERENCE</span>
                </button>
              </form>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[9px] text-slate-400 leading-normal font-medium">
                  MANUAL VERIFICATION WITHIN 24 HOURS. PLEASE KEEP AN UNEDITED DIGITAL SCREENSHOT RECEIPT SECURE.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER DEDICATED SCHEDULES PAGE WITH TOGGLEABLE RIGHT CALENDAR VIEW ---
  if (currentView === 'schedules') {
    return (
      <div className="space-y-6 animate-fadeIn relative">
        <div className="bg-[#0070c0] text-white rounded-2xl p-6 shadow-md flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer border-none text-white flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-serif font-black tracking-wide">Schedules</h2>
              <p className="text-xs text-blue-100 font-light mt-0.5">View your upcoming project appointments and confirmed dates.</p>
            </div>
          </div>

          <button 
            onClick={() => setShowCalendarView(!showCalendarView)}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/25 border border-white/20 px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition cursor-pointer border-none text-white"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span>CALENDAR VIEW</span>
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${showCalendarView ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={`${showCalendarView ? 'lg:col-span-5' : 'lg:col-span-12 max-w-xl'} space-y-4 transition-all duration-300`}>
            {clientSchedule ? <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-serif font-black text-slate-900 tracking-wide">{clientSchedule.service_type}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {monthNames[currentMonth]} {selectedDate}, {currentYear}
                  </p>
                </div>
                <span className="text-[10px] font-bold font-mono tracking-wider text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full">
                  CONFIRMED
                </span>
              </div>

              <p className="text-sm text-slate-600 font-serif italic py-1">
                &quot;{clientSchedule.project_description}&quot;
              </p>

              <div className="space-y-2.5">
                <div className="border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center space-x-3 bg-slate-50/70">
                  <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Scheduled Date</p>
                    <p className="text-xs font-serif font-black text-slate-800 tracking-wider">
                      {monthNames[currentMonth].substring(0, 3)} {selectedDate}, {currentYear}
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center space-x-3 bg-slate-50/70">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">Time Slot</p>
                    <p className="text-xs font-serif font-black text-slate-800 tracking-wider">
                      {clientSchedule.time_start ? `${clientSchedule.time_start}${clientSchedule.time_end ? ` - ${clientSchedule.time_end}` : ''}` : 'Start time to be confirmed'}
                    </p>
                  </div>
                </div>
              </div>
            </div> : <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-xs text-slate-400">No confirmed project schedules yet.</div>}
          </div>

          {showCalendarView && (
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-serif font-black text-slate-900 tracking-wide uppercase">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button 
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer border-none bg-transparent flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer border-none bg-transparent flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => (
                    <span key={index} className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-1">
                      {d}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {Array.from({ length: firstDayIndex }).map((_, index) => (
                    <div key={`empty-${index}`} className="h-9 sm:h-11" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, index) => {
                    const dayNum = index + 1;
                    const today = new Date();
                    const isSelected = dayNum === selectedDate;
                    const isToday = dayNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

                    return (
                      <button
                        key={dayNum}
                        onClick={() => setSelectedDate(dayNum)}
                        className={`h-9 sm:h-11 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative cursor-pointer border-none ${
                          isSelected 
                            ? 'bg-[#0070c0] text-white shadow-md shadow-blue-500/30' 
                            : isToday 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span>{dayNum}</span>
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Selected Date Status:</span>
                <span className="font-bold text-slate-800">
                  {monthNames[currentMonth]} {selectedDate}, {currentYear} {clientSchedule ? `(${clientSchedule.service_type})` : '(Available)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STANDARD DASHBOARD VIEW ---
  return (
    <div className="space-y-6 animate-fadeIn relative">
      <div className="bg-[#0070c0] text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-serif font-black tracking-wide">{userName}</h2>
          <p className="text-xs text-blue-100 font-light mt-0.5">Your dream home is in progress.</p>
        </div>
        
        <div 
          onClick={() => {
            if (setActiveTab) {
              setActiveTab('profile');
            }
          }}
          className="flex items-center space-x-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider transition shadow-sm group cursor-pointer"
        >
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-white text-xs shadow-inner group-hover:scale-105 transition">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span>ACCOUNT PROFILE</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#141b2d] text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold tracking-widest text-blue-400">
              <Calculator className="w-4 h-4" />
              <span>ESTIMATE TOOL</span>
            </div>
            <div>
              <h3 className="text-sm font-serif tracking-wide text-slate-200">Quick Quote Calculator</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="relative group/input">
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Total Floor Area (Sqm)</label>
                <div className="relative flex items-center">
                  <input 
                    type="number" 
                    value={area || ''} 
                    onChange={(e) => setArea(parseFloat(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white font-bold [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" 
                  />
                  <div className="absolute right-2 flex flex-col items-center justify-center opacity-0 group-hover/input:opacity-100 transition-opacity duration-200 pointer-events-auto">
                    <button 
                      type="button" 
                      tabIndex={-1} 
                      onClick={() => setArea((prev) => (isNaN(prev) ? 1 : prev + 1))}
                      className="bg-transparent border-none p-0 cursor-pointer flex items-center justify-center hover:opacity-80 transition"
                    >
                      <ChevronUp className="w-3 h-3 text-white bg-transparent" />
                    </button>
                    <button 
                      type="button" 
                      tabIndex={-1} 
                      onClick={() => setArea((prev) => (isNaN(prev) || prev <= 1 ? 0 : prev - 1))}
                      className="bg-transparent border-none p-0 cursor-pointer flex items-center justify-center hover:opacity-80 transition"
                    >
                      <ChevronDown className="w-3 h-3 text-white bg-transparent" />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Design Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white font-bold">
                  <option value="Modern">Modern</option>
                  <option value="Luxury">Luxury</option>
                  <option value="Minimalist">Minimalist</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Complexity</label>
                <select value={complexity} onChange={(e) => setComplexity(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white font-bold">
                  <option value="Standard">Standard</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <p className="text-[9px] tracking-widest font-black text-slate-400 uppercase">Estimated Range</p>
              <p className="text-2xl font-serif font-black text-blue-400 tracking-wide mt-0.5">
                ₱{estimate.min.toLocaleString()} - ₱{estimate.max.toLocaleString()}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 italic leading-relaxed max-w-xs">
              This is a preliminary appraisal and subject to technical site assessment parameters.
            </p>
          </div>
        </div>

        <div className="space-y-4 flex flex-col justify-between">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm flex flex-col justify-center items-center space-y-3 flex-1">
            <p className="text-xs font-serif font-medium text-slate-700 leading-relaxed">
              No active projects yet. Let's start something beautiful.
            </p>
            <button 
              onClick={handleOpenBooking}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] tracking-widest px-6 py-2.5 rounded-xl transition shadow flex items-center space-x-2 cursor-pointer border-none"
            >
              <span>BOOK NOW!</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => setCurrentView('payments')}
              className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center space-y-2 group"
            >
              <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition">
                <Wallet className="w-5 h-5 text-slate-700 group-hover:text-blue-600 transition" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wider text-slate-800 uppercase">Payments</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">View Billing Page</p>
              </div>
            </div>

            <div 
              onClick={() => setCurrentView('schedules')}
              className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center space-y-2 group"
            >
              <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition">
                <CalendarRange className="w-5 h-5 text-slate-700 group-hover:text-blue-600 transition" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wider text-slate-800 uppercase">Schedules</h4>
                <p className="text-[9px] text-slate-400 font-bold mt-0.5">View Calendar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1f2c] text-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-800 relative animate-fadeIn">
            {bookingStep === 'form' && (
              <button 
                onClick={() => setIsBookingOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border-none flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {bookingStep === 'form' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase font-sans">
                    Book Now Form
                  </h3>

                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    {bookingError && <p className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">{bookingError}</p>}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                        Service Type
                      </label>
                      <input 
                        type="text" 
                        value={serviceType}
                        onChange={(e) => setServiceType(e.target.value)}
                        required
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                        Project Description
                      </label>
                      <textarea 
                        rows={4}
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        required
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl p-4 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                        Preferred Project Start Date
                      </label>
                      <input
                        type="date"
                        value={preferredStartDate}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => setPreferredStartDate(e.target.value)}
                        required
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner"
                      />
                      {hasScheduleConflict && <p className="text-[10px] text-red-300">This date and time is unavailable. Choose another slot.</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Preferred Start Time</label>
                      <input
                        type="time"
                        value={preferredStartTime}
                        onChange={(e) => setPreferredStartTime(e.target.value)}
                        required
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isBookingSubmitting || hasScheduleConflict}
                      className="w-full py-3.5 bg-[#141b2f] hover:bg-[#1d2642] text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md border border-slate-700 cursor-pointer"
                    >
                      {isBookingSubmitting ? 'Submitting...' : 'Submit Booking Form'}
                    </button>
                  </form>
                </div>

                <div className="hidden md:flex flex-col items-center justify-center p-8 bg-[#121620] rounded-2xl border border-slate-800 text-center space-y-3">
                  <span className="text-xs font-serif text-slate-400 italic">
                    Ready to transform your space? Fill out the brief details and our design team will review your request immediately.
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 px-6 text-center space-y-6">
                <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase font-sans">
                  Submit Booking Done!
                </h3>
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-serif font-bold text-white">Booking Request Received</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    We have successfully logged your request for <span className="text-white font-bold">{serviceType}</span>. Our team will contact you shortly.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
