"use client";
import Link from '@/components/WorkspaceLink';
import Image from 'next/image';
import { imageSource } from '@/components/AdminImageUpload';
import { useDesignCatalog } from '@/lib/use-design-catalog';
import BookingEstimate, { type EstimateSnapshot } from '@/components/BookingEstimate';
import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, X, ChevronLeft, ChevronRight, ChevronDown, Clock, AlertCircle } from 'lucide-react';
import { apiFetch, getApiUrl, getClientSession } from '@/lib/api';

interface RejectedBooking {
  id: number;
  service_type: string;
  project_description: string;
  status: string;
  preferred_date?: string;
  preferred_time?: string;
  design_snapshot?: { name: string; image: string } | string | null;
  estimate?: EstimateSnapshot | string | null;
}

export default function Book({ setActiveTab }: { setActiveTab?: (tab: string) => void } = {}) {
  const {designs}=useDesignCatalog();
  const [designSnapshot,setDesignSnapshot]=useState<{name:string;image:string}|null>(null);
  const [modalMode, setModalMode] = useState<'none' | 'book_form' | 'book_done' | 'schedule_form' | 'schedule_done'>('none');
  const [selectedDate, setSelectedDate] = useState('');
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [project, setProject] = useState({ serviceType: '', description: '' });
  const legacyName=project.description.match(/^Selected design: (.+)$/m)?.[1] || project.description.split(':')[0];
  const aliases:Record<string,string>={'Standard Living Room':'Bronze Living Room','Standard Kitchen':'Bronze Kitchen','Deluxe Living Room':'Silver Living Room'};
  const selectedDesign=designSnapshot || designs.find(design=>design.name===(aliases[legacyName] || legacyName));
  const [savedEstimate, setSavedEstimate] = useState<EstimateSnapshot | string | null>(null);
  const [rejectedBookings, setRejectedBookings] = useState<RejectedBooking[]>([]);
  const [highlightRejectedId, setHighlightRejectedId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkHighlight = () => {
      const stored = sessionStorage.getItem('highlight_rejected_id');
      if (stored) {
        const rid = Number(stored);
        setHighlightRejectedId(rid);
        setTimeout(() => {
          const el = document.getElementById(`rejected-booking-${rid}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 350);
      }
    };
    checkHighlight();
  }, [rejectedBookings]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track submission/confirmation workflow state ('none' | 'pending' | 'confirmed')
  const [scheduleStatus, setScheduleStatus] = useState<'none' | 'pending' | 'confirmed'>('none');
  
  // Track the calendar view using active year and month indices
  const [currentYear, setCurrentYear] = useState(()=>new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(()=>new Date().getMonth());
  
  // Track visibility of the year/month quick select form dropdown
  const [showQuickSelect, setShowQuickSelect] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Dynamically generate years from 2026 to 2036
  const availableYears = Array.from({ length: 2036 - 2026 + 1 }, (_, i) => 2026 + i);

  // Programmatically generate details for the active month view
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getMonthPadding = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const totalDays = getDaysInMonth(currentYear, currentMonthIndex);
  const paddingDays = getMonthPadding(currentYear, currentMonthIndex);
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Pagination Handlers with strict safety limits (2026 to 2036)
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      if (currentYear > 2026) {
        setCurrentYear(currentYear - 1);
        setCurrentMonthIndex(11);
      }
    } else {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      if (currentYear < 2036) {
        setCurrentYear(currentYear + 1);
        setCurrentMonthIndex(0);
      }
    } else {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
  };

  // Boundary checks to disable pagination arrows
  const isPrevDisabled = currentYear === 2026 && currentMonthIndex === 0;
  const isNextDisabled = currentYear === 2036 && currentMonthIndex === 11;

  // Effect to automatically hide modal after 3 seconds ONLY when 'book_done' or 'schedule_done' is active
  useEffect(() => {
    if (modalMode === 'book_done' || modalMode === 'schedule_done') {
      const timer = setTimeout(() => {
        setModalMode('none');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [modalMode]);

  useEffect(() => {
    const loadActiveBooking = async () => {
      const client = getClientSession();
      if (!client) return;
      const response = await apiFetch(`${getApiUrl()}/booking?user_id=${client.id}`);
      const result: { success: boolean; bookings?: Array<{ id: number; design_snapshot?: {name:string;image:string} | string | null; estimate?: EstimateSnapshot | string | null; service_type: string; project_description: string; status: string; accepted_at?: string | null }> } = await response.json();
      if (!response.ok || !result.success) throw new Error('Unable to load your booking.');
      const allBookings = result.bookings ?? [];
      const rejectedList = allBookings.filter((item) => (item.status || '').toLowerCase() === 'rejected');
      setRejectedBookings(rejectedList);

      const booking = allBookings.find((item) => !['rejected','cancelled','completed'].includes(item.status.toLowerCase()));
      if (!booking) {
        setBookingId(null);
        setProject({ serviceType: '', description: '' });
        setSelectedDate('');
        setScheduleStatus('none');
        return;
      }
      setSavedEstimate(booking.estimate ?? null);
      if (booking.accepted_at) {
        setBookingId(null);
        setProject({ serviceType: '', description: '' });
        setSelectedDate('');
        setScheduleStatus('none');
        return;
      }
      let snapshot=booking.design_snapshot;
      if(typeof snapshot==='string'){try{snapshot=JSON.parse(snapshot);}catch{snapshot=null;}}
      setDesignSnapshot(snapshot && typeof snapshot==='object' && typeof snapshot.image==='string' && typeof snapshot.name==='string' ? snapshot:null);
      setBookingId(booking.id);
      setProject({ serviceType: booking.service_type, description: booking.project_description });
      setScheduleStatus('pending');
    };

    void loadActiveBooking().catch((err) => setError(err instanceof Error ? err.message : 'Unable to load your booking.'));
    const timer = window.setInterval(() => void loadActiveBooking().catch(() => undefined), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const submitSchedule = async () => {
    if (!bookingId || !selectedDate) {
      setError('Create a booking and select a date first.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const visitDate = new Date(selectedDate).toISOString().slice(0, 10);
      const response = await apiFetch(`${getApiUrl()}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, visit_date: visitDate }),
      });
      const result: { success: boolean; message?: string } = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to submit schedule.');
      setScheduleStatus('pending');
      setModalMode('schedule_done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-0 md:p-4 space-y-3 md:space-y-4 animate-fadeIn relative w-full">
      
      {/* Top Action Header Panel */}
      <div className="flex items-center">
        <div className="flex items-center space-x-2 text-[11px] md:text-xs leading-snug font-bold tracking-normal md:tracking-wider text-stone-400">
          <Calendar className="w-4 h-4 shrink-0 text-brand-500" />
          <h1>My Pending Bookings</h1>
        </div>
      </div>
      <p className="text-xs text-stone-500">View and reschedule your bookings while awaiting admin confirmation.</p><Link href="/?screen=dashboard&tab=quotes" className="inline-flex rounded-xl bg-marc-charcoal px-4 py-3 text-sm text-white">Review quotations</Link>

      {savedEstimate && <section aria-label="Latest booking estimate"><BookingEstimate estimate={savedEstimate} /></section>}

      {/* Rejected Bookings Form Section */}
      {rejectedBookings.length > 0 && (
        <section className="space-y-4" aria-label="Rejected Booking Requests">
          <div className="flex items-center space-x-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Rejected Booking Requests ({rejectedBookings.length})</span>
          </div>

          {rejectedBookings.map((b) => {
            let snapshot = b.design_snapshot;
            if (typeof snapshot === 'string') {
              try { snapshot = JSON.parse(snapshot); } catch { snapshot = null; }
            }
            const designImage = (snapshot && typeof snapshot === 'object' && typeof snapshot.image === 'string') ? snapshot.image : null;
            const designName = (snapshot && typeof snapshot === 'object' && typeof snapshot.name === 'string') ? snapshot.name : b.service_type;
            const isHighlighted = highlightRejectedId === b.id;

            return (
              <div
                key={b.id}
                id={`rejected-booking-${b.id}`}
                className={`bg-white border-2 border-rose-300 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn transition-all duration-300 ${
                  isHighlighted ? 'ring-4 ring-rose-400/50 shadow-md' : ''
                }`}
              >
                {/* Top header of rejected form */}
                <div className="flex items-center justify-between pb-3 border-b border-rose-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                      <X className="w-3.5 h-3.5" />
                      Booking Rejected
                    </span>
                    <span className="text-xs font-bold text-stone-600">
                      Request #{b.id}
                    </span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700">
                    Rejected by Admin
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {designImage && (
                    <div className="relative h-36 w-full sm:w-48 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200">
                      <Image
                        src={imageSource(designImage)}
                        alt={designName}
                        fill
                        unoptimized
                        sizes="(max-width:640px) 90vw,192px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <h3 className="text-sm font-bold text-stone-900">{designName}</h3>
                    <p className="text-xs text-stone-600 leading-relaxed italic">
                      &quot;{b.project_description || b.service_type}&quot;
                    </p>
                    {b.preferred_date && (
                      <p className="text-[11px] text-stone-500 font-medium">
                        Requested Target Date: {new Date(b.preferred_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {b.preferred_time ? ` at ${b.preferred_time}` : ''}
                      </p>
                    )}
                    <div className="rounded-xl bg-rose-50 border border-rose-200/80 p-3 text-xs text-rose-800 space-y-1">
                      <p className="font-bold">This booking request was declined by the administrator.</p>
                      <p className="text-[11px] text-rose-700">You can submit a new booking request with an alternative date, style preference, or updated requirements.</p>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-rose-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (setActiveTab) {
                        setActiveTab('home');
                      } else if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('tab', 'home');
                        window.history.pushState({}, '', url.toString());
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    }}
                    className="bg-marc-charcoal hover:bg-stone-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    Submit New Booking
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Baseline Overview Card - Visible only while not yet fully confirmed by admin */}
      {scheduleStatus !== 'confirmed' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {selectedDesign && bookingId && <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-32 sm:w-48"><Image src={imageSource(selectedDesign.image)} alt={selectedDesign.name} fill unoptimized sizes="(max-width:640px) 90vw,192px" className="object-cover"/></div>}
          <div className="min-w-0 flex-1 space-y-1.5">
            {scheduleStatus === 'pending' && (
              <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>Pending</span>
              </span>
            )}
            <h3 className="text-xs font-bold text-stone-800">{selectedDesign?.name || project.serviceType || 'No pending bookings.'}</h3>
            <p className="text-[11px] text-stone-500 italic">
              {selectedDate ? `Scheduled for: ${selectedDate}` : project.description || 'Confirmed bookings will no longer appear here.'}
            </p>
          </div>
          {scheduleStatus === 'pending' && <button 
            onClick={() => { setModalMode('schedule_form'); setShowQuickSelect(false); }} 
            className="bg-marc-charcoal text-white text-[9px] font-bold tracking-widest px-3 py-2 rounded-lg hover:bg-stone-800 transition w-full sm:w-auto text-center cursor-pointer"
          >
            RESCHEDULE DATE
          </button>
          }
        </div>
      )}

      {/* LAYER OVERLAYS: MODAL CONFIGURATIONS */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 border border-stone-100 my-auto animate-scaleIn relative">
            {error && <p className="rounded-xl bg-red-50 p-3 text-center text-xs text-red-700">{error}</p>}
            
            {/* Show X Close button for all modes except book_done and schedule_done */}
            {modalMode !== 'book_done' && modalMode !== 'schedule_done' && (
              <button onClick={() => setModalMode('none')} className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:bg-stone-100 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Schedule form */}
            {modalMode === 'schedule_form' && (
              <div className="space-y-4 text-center pt-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black tracking-widest uppercase text-stone-800">Schedule Project</h3>
                  <p className="text-[10px] text-stone-400 font-medium">SELECT YOUR TARGET START DATE</p>
                </div>

                {/* Inline Architectural Responsive Custom Grid Engine Calendar */}
                <div className="border border-stone-100 rounded-2xl p-3 md:p-4 bg-stone-50/50 space-y-3 w-full relative">
                  
                  {/* Calendar Header Controls */}
                  <div className="flex justify-between items-center px-1">
                    <button 
                      type="button"
                      onClick={() => setShowQuickSelect(!showQuickSelect)}
                      className="text-xs font-bold text-stone-700 hover:text-brand-600 flex items-center space-x-1 p-1 rounded-lg hover:bg-stone-200/50 transition cursor-pointer"
                    >
                      <span>{monthNames[currentMonthIndex]} {currentYear}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showQuickSelect ? 'rotate-180 text-brand-600' : 'text-stone-400'}`} />
                    </button>

                    <div className="flex space-x-1 text-stone-400">
                      <button 
                        type="button" 
                        disabled={isPrevDisabled}
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-stone-200/60 disabled:opacity-20 rounded transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button" 
                        disabled={isNextDisabled}
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-stone-200/60 disabled:opacity-20 rounded transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* QUICK SELECT CONDITIONAL INLINE FORM OVERLAY */}
                  {showQuickSelect && (
                    <div className="absolute top-11 left-3 right-3 bg-white border border-stone-200 rounded-2xl p-3 shadow-xl z-20 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Month</label>
                          <select 
                            value={currentMonthIndex} 
                            onChange={(e) => setCurrentMonthIndex(parseInt(e.target.value))}
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-1.5 text-xs font-semibold text-stone-700 focus:outline-none"
                          >
                            {monthNames.map((name, index) => (
                              <option key={name} value={index}>{name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">Year</label>
                          <select 
                            value={currentYear} 
                            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg p-1.5 text-xs font-semibold text-stone-700 focus:outline-none"
                          >
                            {availableYears.map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button 
                        type="button" 
                        onClick={() => setShowQuickSelect(false)}
                        className="w-full bg-stone-900 text-white text-[10px] font-bold py-1.5 rounded-lg tracking-wider"
                      >
                        APPLY SELECTION
                      </button>
                    </div>
                  )}
                  
                  {/* Calendar Matrix Headers */}
                  <div className="grid grid-cols-7 gap-1 text-[9px] font-bold text-stone-400 uppercase text-center">
                    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-xs">
                    {Array.from({ length: paddingDays }).map((_, idx) => (
                      <span 
                        key={`pad-${idx}`} 
                        className="text-transparent pointer-events-none select-none aspect-square flex items-center justify-center"
                      >
                        0
                      </span>
                    ))}
                    
                    {daysArray.map((d) => {
                      const dateString = `${monthNames[currentMonthIndex].substring(0,3)} ${d}, ${currentYear}`;
                      const isSelected = selectedDate === dateString;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDate(dateString)}
                          className={`w-full aspect-square rounded-xl flex items-center justify-center transition font-semibold text-[11px] sm:text-xs cursor-pointer ${
                            isSelected
                              ? 'bg-marc-charcoal text-white font-bold shadow-md'
                              : 'text-stone-700 hover:bg-stone-200/80'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-left">
                  <label className="text-[9px] tracking-widest font-bold text-stone-400 block mb-1 uppercase">Work Date</label>
                  <input type="text" readOnly value={selectedDate} placeholder="Select date from calendar" className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-center text-stone-800 focus:outline-none font-bold placeholder:font-normal placeholder:text-stone-400" />
                </div>

                <div className="space-y-2">
                  <button 
                    disabled={!selectedDate || isSubmitting} 
                    onClick={submitSchedule}
                    className="w-full bg-marc-charcoal text-white text-[10px] font-bold tracking-widest py-3 rounded-xl disabled:opacity-40 shadow-md cursor-pointer hover:bg-brand-600 transition disabled:cursor-not-allowed"
                  >
                    CONFIRM SCHEDULE
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 4: SCHEDULE SUBMISSION DONE (Auto-hides after 3 seconds, no X button or text) */}
            {modalMode === 'schedule_done' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-bold text-stone-800">Schedule Submitted!</h3>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
