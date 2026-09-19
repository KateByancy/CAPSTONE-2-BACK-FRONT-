"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { User, Calculator, ArrowRight, Wallet, CalendarRange, Check, Calendar, ArrowLeft, Clock, ChevronLeft, ChevronRight, X, ChevronUp, ChevronDown } from 'lucide-react';
import { formatClientName, getApiUrl, getClientSession } from '@/lib/api';

interface HomeProps {
  setActiveTab?: (tab: string) => void;
  userName?: string;
}

interface PricingOption { name: string; value: number | string }
interface BookingService { id: number; name: string }

const ESTIMATE_SERVICE_TYPE_OPTIONS = ['Living room', 'Kitchen', 'Office', 'Commercial room'];
const SERVICE_TYPE_MULTIPLIERS: Record<string, number> = {
  'Living room': 1,
  Kitchen: 1.25,
  Office: 1.1,
  'Commercial room': 1.5,
};

export default function Home({ setActiveTab, userName = '' }: HomeProps) {
  const [area, setArea] = useState<number>(0);
  const [measurementUnit, setMeasurementUnit] = useState('sq ft');
  const [estimateServiceType, setEstimateServiceType] = useState<string>('');
  const [style, setStyle] = useState<string>('');
  const [complexity, setComplexity] = useState<string>('');
  const [styleOptions, setStyleOptions] = useState<PricingOption[]>([]);
  const [complexityOptions, setComplexityOptions] = useState<PricingOption[]>([]);
  const [estimateFactors, setEstimateFactors] = useState<PricingOption[]>([]);
  const [clientDisplayName, setClientDisplayName] = useState(userName);
  const [homeError, setHomeError] = useState('');
  const [bookingServices, setBookingServices] = useState<BookingService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // --- VIEW ROUTING STATE ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'schedules'>('dashboard');

  // --- SCHEDULES TOGGLE STATE (Show/Hide Calendar Widget) ---
  const [showCalendarView, setShowCalendarView] = useState<boolean>(false);
  const [clientSchedule, setClientSchedule] = useState<{id:number;service_type:string;project_description:string;visit_date:string;status:string;booking_status:string;accepted_at?:string | null;reschedule_count:number;time_start?:string;time_end?:string} | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isRescheduleSubmitting, setIsRescheduleSubmitting] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<number>(() => new Date().getDate());

  // --- BOOKING MODAL STATE ENGINE ---
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [bookingStep, setBookingStep] = useState<'form' | 'success'>('form');
  const [serviceType, setServiceType] = useState<string>('');
  const [otherService, setOtherService] = useState('');
  const [isServiceTypeOpen, setIsServiceTypeOpen] = useState<boolean>(false);
  const [projectAddress, setProjectAddress] = useState<string>('');
  const [projectLandmark, setProjectLandmark] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [preferredStartDate, setPreferredStartDate] = useState<string>('');
  const [preferredStartTime, setPreferredStartTime] = useState<string>('');
  const [unavailableSlots, setUnavailableSlots] = useState<Array<{visit_date:string;time_start:string}>>([]);
  const [bookingError, setBookingError] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [clientBookedSlots, setClientBookedSlots] = useState<Array<{ visit_date: string; time_start?: string }>>([]);
  useEffect(() => {
    const loadSchedule = async () => {
      const client=getClientSession(); if(!client)return;
      const response=await fetch(`${getApiUrl()}/schedule?user_id=${client.id}`);
      const rows=await response.json();
      if(!response.ok) return;
      const schedule=Array.isArray(rows)&&rows.length?rows[0]:null;
      setClientSchedule(schedule);
      setClientBookedSlots(Array.isArray(rows) ? rows.filter(row => !['cancelled', 'rejected'].includes(String(row.booking_status).toLowerCase()) && !['cancelled', 'rejected'].includes(String(row.status).toLowerCase())) : []);
      if(schedule?.visit_date && !isRescheduling){const [year,month,day]=String(schedule.visit_date).slice(0,10).split('-').map(Number);setCurrentMonth(month-1);setCurrentYear(year);setSelectedDate(day);}
    };
    void loadSchedule();
    const timer=window.setInterval(()=>void loadSchedule(),10000);
    return()=>window.clearInterval(timer);
  }, [isRescheduling]);

  useEffect(() => {
    const loadUnavailableSlots=async()=>{const response=await fetch(`${getApiUrl()}/schedule/unavailable`);const data=await response.json();if(response.ok)setUnavailableSlots(data.slots??[]);};
    void loadUnavailableSlots();
    const timer=window.setInterval(()=>void loadUnavailableSlots(),10000);
    return()=>window.clearInterval(timer);
  },[]);
  const hasDuplicateBooking = Boolean(preferredStartDate && preferredStartTime && clientBookedSlots.some(slot => String(slot.visit_date).slice(0, 10) === preferredStartDate && slot.time_start?.slice(0, 5) === preferredStartTime));
  const hasScheduleConflict=Boolean(preferredStartDate&&preferredStartTime&&unavailableSlots.some(slot=>slot.visit_date===preferredStartDate&&slot.time_start.slice(0,5)===preferredStartTime));

  useEffect(() => {
    const controller = new AbortController();
    const loadHome = async () => {
      const client = getClientSession();
      if (!client) { setHomeError('Please sign in again to load your dashboard.'); setServicesLoading(false); return; }
      setServicesLoading(true);
      try {
        const response = await fetch(`${getApiUrl()}/client-home?user_id=${client.id}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load the dashboard.');
        const styles: PricingOption[] = result.pricing?.styles || [];
        const complexities: PricingOption[] = result.pricing?.complexities || [];
        const factors: PricingOption[] = result.pricing?.estimateFactors || [];
        const services: BookingService[] = result.services || [];
        setBookingServices([...services.filter(service => service.name !== 'Other'), { id: -1, name: 'Other' }]);
        setServiceType(current => current === 'Other' || services.some(service => service.name === current) ? current : '');
        setStyleOptions(styles);
        setComplexityOptions(complexities);
        setEstimateFactors(factors);
        setStyle((current) => current || styles[0]?.name || '');
        setComplexity((current) => current || complexities[0]?.name || '');
        setClientDisplayName(result.client?.fullname ? formatClientName(result.client.fullname) : userName);
        setProjectAddress((currentAddress) => currentAddress || result.client?.address || '');
        setProjectLandmark((currentLandmark) => currentLandmark || result.client?.landmark || '');
        setHomeError('');
      } catch (error) {
        if (controller.signal.aborted) return;
        setBookingServices([]);
        setHomeError(error instanceof Error ? error.message : 'Unable to load the dashboard.');
      } finally {
        if (!controller.signal.aborted) setServicesLoading(false);
      }
    };
    void loadHome();
    return () => controller.abort();
  }, [userName]);

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
  }, [isBookingOpen, bookingStep, setActiveTab]);

  const estimate = useMemo(() => {
    const baseRate = Number(styleOptions.find((option) => option.name === style)?.value || 0);
    const complexityMultiplier = Number(complexityOptions.find((option) => option.name === complexity)?.value || 0);
    const serviceMultiplier = SERVICE_TYPE_MULTIPLIERS[estimateServiceType] || 0;

    const calculatedBase = area * (measurementUnit === 'sq ft' ? 0.09290304 : 1) * baseRate * complexityMultiplier * serviceMultiplier;
    const minFactor = Number(estimateFactors.find((option) => option.name === 'Minimum factor')?.value || 0);
    const maxFactor = Number(estimateFactors.find((option) => option.name === 'Maximum factor')?.value || 0);
    const minEstimate = Math.round(calculatedBase * minFactor);
    const maxEstimate = Math.round(calculatedBase * maxFactor);

    if (!Number.isFinite(area) || area <= 0) {
      return { min: 0, max: 0 };
    }
    return { min: minEstimate, max: maxEstimate };
  }, [area, measurementUnit, estimateServiceType, style, complexity, styleOptions, complexityOptions, estimateFactors]);

  const handleOpenBooking = () => {
    setBookingStep('form');
    setIsServiceTypeOpen(false);
    setIsBookingOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getClientSession();
    if (!client) {
      setBookingError('Please sign in again before creating a booking.');
      return;
    }
    if (servicesLoading || !bookingServices.some(service => service.name === serviceType)) {
      setBookingError('Please select a service type.');
      return;
    }
    if (serviceType === 'Other' && !otherService.trim()) {
      setBookingError('Specify your desired design/service.');
      return;
    }
    if (!projectAddress.trim()) {
      setBookingError('Please enter the complete project address so the admin can locate the job site.');
      return;
    }
    if (!projectLandmark.trim()) {
      setBookingError('Please enter a nearby landmark so the admin can easily locate the project.');
      return;
    }
    if (!preferredStartDate || !preferredStartTime) {
      setBookingError('Please select your preferred project start date and time.');
      return;
    }
    if (hasDuplicateBooking) {
      setBookingError('You already have a booking for this date and time. Please choose another slot.');
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
        body: JSON.stringify({ user_id: client.id, service_type: serviceType, other_service: otherService.trim(), estimate: estimate.min > 0 ? { area, unit: measurementUnit, service: estimateServiceType, style, complexity } : undefined, project_description: projectDescription, project_address: projectAddress.trim(), project_landmark: projectLandmark.trim(), preferred_start_date: preferredStartDate, preferred_start_time: preferredStartTime }),
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

  const bookingIsAccepted = Boolean(clientSchedule?.accepted_at) || ['confirmed', 'approved', 'ongoing', 'completed'].includes(clientSchedule?.booking_status?.toLowerCase() || '');
  const canReschedule = Boolean(clientSchedule) && !bookingIsAccepted && Number(clientSchedule?.reschedule_count || 0) === 0;

  const handleReschedule = async () => {
    if (!clientSchedule || !canReschedule) return;
    const client = getClientSession();
    if (!client) { setScheduleMessage('Please sign in again before rescheduling.'); return; }
    const visitDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
    setIsRescheduleSubmitting(true);
    setScheduleMessage('');
    try {
      const response = await fetch(`${getApiUrl()}/schedule/${clientSchedule.id}/reschedule`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: client.id, visit_date: visitDate }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to reschedule this booking.');
      setClientSchedule({ ...clientSchedule, visit_date: visitDate, reschedule_count: 1 });
      setScheduleMessage('Your project date was rescheduled. The one-time reschedule allowance has now been used.');
      setIsRescheduling(false);
    } catch (error) {
      setScheduleMessage(error instanceof Error ? error.message : 'Unable to reschedule this booking.');
    } finally {
      setIsRescheduleSubmitting(false);
    }
  };

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
                <span className={`text-[10px] font-bold font-mono tracking-wider px-3.5 py-1.5 rounded-full ${bookingIsAccepted ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                  {bookingIsAccepted ? 'CONFIRMED' : 'PENDING APPROVAL'}
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
              {scheduleMessage && <p className="rounded-xl bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-700">{scheduleMessage}</p>}
              {canReschedule && !isRescheduling && (
                <button type="button" onClick={() => { setIsRescheduling(true); setShowCalendarView(true); setScheduleMessage(''); }} className="w-full rounded-xl border border-blue-200 bg-blue-50 py-3 text-[10px] font-black uppercase tracking-widest text-blue-700 transition hover:bg-blue-100">
                  Reschedule date — one time only
                </button>
              )}
              {!bookingIsAccepted && Number(clientSchedule.reschedule_count) >= 1 && (
                <p className="text-center text-[10px] font-bold text-slate-400">Your one-time reschedule allowance has been used.</p>
              )}
              {bookingIsAccepted && (
                <p className="text-center text-[10px] font-bold text-slate-400">The admin accepted this project. Its scheduled date is now locked.</p>
              )}
            </div> : <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-xs text-slate-400">No project schedule is available yet.</div>}
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
                    const candidateDate = new Date(currentYear, currentMonth, dayNum);
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const isPast = candidateDate < todayStart;
                    const canSelectDate = isRescheduling && canReschedule && !isPast;

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        disabled={!canSelectDate}
                        onClick={() => canSelectDate && setSelectedDate(dayNum)}
                        className={`h-9 sm:h-11 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative border-none ${canSelectDate ? 'cursor-pointer' : 'cursor-default'} ${
                          isSelected 
                            ? 'bg-[#0070c0] text-white shadow-md shadow-blue-500/30' 
                            : isToday 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : `bg-slate-50 text-slate-700 ${canSelectDate ? 'hover:bg-slate-100' : 'opacity-70'}`
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

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-medium">{isRescheduling ? 'New requested date:' : 'Scheduled date:'}</span>
                <span className="font-bold text-slate-800">
                  {monthNames[currentMonth]} {selectedDate}, {currentYear}
                </span>
              </div>
              {isRescheduling && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setIsRescheduling(false); setScheduleMessage(''); }} className="flex-1 rounded-xl border border-slate-200 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">Cancel</button>
                  <button type="button" disabled={isRescheduleSubmitting} onClick={() => void handleReschedule()} className="flex-1 rounded-xl bg-[#0070c0] py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60">{isRescheduleSubmitting ? 'Saving...' : 'Confirm new date'}</button>
                </div>
              )}
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
          <h2 className="text-xl font-serif font-black tracking-wide">{clientDisplayName}</h2>
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
      {homeError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{homeError}</p>}

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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
              <div className="relative group/input">
                <label className="block text-xs text-slate-300 mb-2">Measurement unit
                  <select aria-label="Measurement unit" value={measurementUnit} onChange={e => setMeasurementUnit(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 mt-1">
                    <option value="sq ft">Square Feet (sq ft)</option>
                    <option value="m²">Square Meters (m²)</option>
                  </select>
                </label>
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Total Floor Area ({measurementUnit})</label>
                <div className="relative flex items-center">
                  <input 
                    type="number" 
                    min="0" step="any" aria-label="Total floor area"
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
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Service Type</label>
                <select value={estimateServiceType} onChange={(e) => setEstimateServiceType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white font-bold">
                  <option value="">Select service type</option>
                  {ESTIMATE_SERVICE_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Design Style</label>
                <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white font-bold">
                  {styleOptions.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] tracking-widest font-black text-slate-400 block mb-1.5 uppercase">Complexity</label>
                <select value={complexity} onChange={(e) => setComplexity(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 text-white font-bold">
                  {complexityOptions.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}
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
              No active projects yet. Let&apos;s start something beautiful.
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
              onClick={() => setActiveTab?.('payments')}
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
                    {!servicesLoading && bookingServices.length === 0 && <p role="status" className="text-xs text-red-300">{homeError || 'No booking services are currently available.'}</p>}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                        Service Type
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={isServiceTypeOpen}
                          disabled={servicesLoading || bookingServices.length === 0}
                          onClick={() => setIsServiceTypeOpen((isOpen) => !isOpen)}
                          className="flex w-full items-center justify-between gap-3 bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-left text-xs font-medium focus:outline-none focus:border-blue-500 shadow-inner cursor-pointer"
                        >
                          <span className={serviceType ? 'text-slate-200' : 'text-slate-500'}>
                            {servicesLoading ? 'Loading services...' : serviceType || 'Select service type'}
                          </span>
                          {isServiceTypeOpen ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-blue-400" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          )}
                        </button>

                        {isServiceTypeOpen && (
                          <div
                            role="listbox"
                            aria-label="Service type"
                            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-700 bg-[#121620] shadow-xl"
                          >
                            {bookingServices.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                role="option"
                                aria-selected={serviceType === service.name}
                                onClick={() => {
                                  setServiceType(service.name);
                                  setIsServiceTypeOpen(false);
                                  setBookingError('');
                                }}
                                className={`block w-full px-4 py-3 text-left text-xs transition cursor-pointer ${
                                  serviceType === service.name
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-200 hover:bg-slate-800'
                                }`}
                              >
                                {service.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {serviceType === 'Other' && <label className="block text-xs text-slate-300">Specify your desired design/service
                      <input required maxLength={100} value={otherService} onChange={e => setOtherService(e.target.value)} className="mt-2 w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3" />
                    </label>}
                    {estimate.min > 0 && <p className="text-sm text-blue-300">Estimate included: PHP {estimate.min.toLocaleString()} - {estimate.max.toLocaleString()} ({area} {measurementUnit}, {estimateServiceType}, {style}, {complexity}). Preliminary estimate.</p>}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                        Project Address
                      </label>
                      <input
                        type="text"
                        value={projectAddress}
                        onChange={(e) => setProjectAddress(e.target.value)}
                        placeholder="Street, barangay, city, province"
                        autoComplete="street-address"
                        required
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner"
                      />
                      <p className="text-[9px] text-slate-500">This exact location will be shown to the admin and used on the Fleet Map.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">
                        Nearest Landmark
                      </label>
                      <input
                        type="text"
                        value={projectLandmark}
                        onChange={(e) => setProjectLandmark(e.target.value)}
                        placeholder="e.g. Across the public market"
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
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner [color-scheme:dark]"
                      />
                      {(hasDuplicateBooking || hasScheduleConflict) && <p className="text-[10px] text-red-300">{hasDuplicateBooking ? 'You already have a booking for this date and time. Please choose another slot.' : 'This date and time is unavailable. Choose another slot.'}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">Preferred Start Time</label>
                      <input
                        type="time"
                        value={preferredStartTime}
                        onChange={(e) => setPreferredStartTime(e.target.value)}
                        required
                        className="w-full bg-[#121620] border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-blue-500 shadow-inner [color-scheme:dark]"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isBookingSubmitting || hasDuplicateBooking || hasScheduleConflict || servicesLoading || bookingServices.length === 0}
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
                    We have successfully logged your request for <span className="text-white font-bold">{serviceType === 'Other' ? otherService : serviceType}</span>. Our team will contact you shortly.
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
