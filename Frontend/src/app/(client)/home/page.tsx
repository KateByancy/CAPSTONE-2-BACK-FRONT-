"use client";
import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { ArrowRight, Wallet, CalendarRange, Check, Calendar, ArrowLeft, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import DesignGallery from '@/components/DesignGallery';
import customizationRates from '@/lib/customizationRates.json';
import { useDesignCatalog, designPrice } from '@/lib/use-design-catalog';
import DesignCustomizer from '@/components/DesignCustomizer';
import ClientProfileIcon from '@/components/ClientProfileIcon';
import MobileTimePicker from '@/components/MobileTimePicker';
import { apiFetch, formatClientName, getApiUrl, getClientSession } from '@/lib/api';

interface HomeProps {
  setActiveTab?: (tab: string) => void;
  userName?: string;
  initialCustomize?: boolean;
}



const desktopTimeQuery = '(min-width: 768px)';
function subscribeToDesktopTime(onChange: () => void) {
  const media = window.matchMedia(desktopTimeQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const desktopTimeSnapshot = () => window.matchMedia(desktopTimeQuery).matches;
const serverTimeSnapshot = () => false;

export default function Home({ setActiveTab = tab => window.location.assign('/?screen=dashboard&tab=' + encodeURIComponent(tab)), userName = '', initialCustomize = false }: HomeProps) {
  const { designs: marcDesigns, loading: catalogLoading, error: catalogError } = useDesignCatalog();
  const desktopTimePicker = useSyncExternalStore(subscribeToDesktopTime, desktopTimeSnapshot, serverTimeSnapshot);
  const [clientDisplayName, setClientDisplayName] = useState(userName);
  const isCustomizing = initialCustomize;
  const [homeError, setHomeError] = useState('');
  const [servicesLoading, setServicesLoading] = useState(true);

  // --- VIEW ROUTING STATE ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'schedules'>('dashboard');

  // --- SCHEDULES TOGGLE STATE (Show/Hide Calendar Widget) ---
  const [showCalendarView, setShowCalendarView] = useState<boolean>(false);
  const [clientSchedule, setClientSchedule] = useState<{id:number;service_type:string;project_description:string;visit_date:string;status:string;booking_status:string;accepted_at?:string | null;reschedule_count:number;time_start?:string;time_end?:string} | null>(null);
  const [projectSchedules, setProjectSchedules] = useState<Array<{id:number;service_type:string;project_description:string;visit_date:string;status:string;booking_status:string;accepted_at?:string | null;reschedule_count:number;time_start?:string;time_end?:string}>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
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
  const [customization, setCustomization] = useState<Record<string,string> | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState('');
  const selectedDesign = marcDesigns.find(design => design.id === selectedDesignId);
  const customizationAdjustment = Object.entries(customizationRates).reduce((sum,[category,options])=>sum+(customization ? (options as Record<string,number>)[customization[category]] || 0 : 0),0);
  const bookingEstimate = selectedDesign?.price == null ? null : Math.round(selectedDesign.price*(1+customizationAdjustment/100)*100)/100;
  const chooseDesign = (id: string) => {
    const design = marcDesigns.find(item => item.id === id);
    setSelectedDesignId(id);
    setCustomization(null);
    if (design) setServiceType(design.category);
    setBookingError('');
  };
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
    let active = true;
    const loadSchedule = async () => {
      const client=getClientSession(); if(!client)return;
      const response=await apiFetch(`${getApiUrl()}/schedule?user_id=${client.id}`);
      const rows=await response.json();
      if (!active) return;
      if (!response.ok) throw new Error('Unable to load project schedules.');
      const available = Array.isArray(rows) ? rows.filter(row => !['cancelled', 'rejected'].includes(String(row.booking_status).toLowerCase()) && !['cancelled', 'rejected'].includes(String(row.status).toLowerCase())) : [];
      setProjectSchedules(available);
      const schedule = available.find(row => row.id === selectedProjectId) || available.find(row => row.accepted_at || ['confirmed', 'approved', 'ongoing', 'completed'].includes(String(row.booking_status).toLowerCase())) || available[0] || null;
      setClientSchedule(schedule);
      setClientBookedSlots(Array.isArray(rows) ? rows.filter(row => !['cancelled', 'rejected'].includes(String(row.booking_status).toLowerCase()) && !['cancelled', 'rejected'].includes(String(row.status).toLowerCase())) : []);
      if(schedule?.visit_date && !isRescheduling){const [year,month,day]=String(schedule.visit_date).slice(0,10).split('-').map(Number);setCurrentMonth(month-1);setCurrentYear(year);setSelectedDate(day);}
    };
    void loadSchedule().catch(() => { if (active) setScheduleMessage('Unable to load project schedules.'); });
    const timer=window.setInterval(()=>void loadSchedule().catch(() => { if (active) setScheduleMessage('Unable to refresh project schedules.'); }),10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isRescheduling, selectedProjectId]);

  useEffect(() => {
    const loadUnavailableSlots=async()=>{const response=await apiFetch(`${getApiUrl()}/schedule/unavailable`);const data=await response.json();if(response.ok)setUnavailableSlots(data.slots??[]);};
    void loadUnavailableSlots().catch(() => setScheduleMessage('Unable to refresh availability. Please retry before booking.'));
    const timer=window.setInterval(()=>void loadUnavailableSlots().catch(() => setScheduleMessage('Unable to refresh availability. Please retry before booking.')),10000);
    return()=>window.clearInterval(timer);
  },[]);
  const hasDuplicateBooking = Boolean(preferredStartDate && clientBookedSlots.some(slot => String(slot.visit_date).slice(0, 10) === preferredStartDate));
  const hasScheduleConflict=Boolean(preferredStartDate&&unavailableSlots.some(slot=>slot.visit_date===preferredStartDate));

  useEffect(() => {
    const controller = new AbortController();
    const loadHome = async () => {
      const client = getClientSession();
      if (!client) { setHomeError('Please sign in again to load your dashboard.'); setServicesLoading(false); return; }
      setServicesLoading(true);
      try {
        const response = await apiFetch(`${getApiUrl()}/client-home?user_id=${client.id}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load the dashboard.');
        setClientDisplayName(result.client?.fullname ? formatClientName(result.client.fullname) : userName);
        setProjectAddress((currentAddress) => currentAddress || result.client?.address || '');
        setProjectLandmark((currentLandmark) => currentLandmark || result.client?.landmark || '');
        setHomeError('');
        const selectedDesign = marcDesigns.find(design => design.id === sessionStorage.getItem('marcSelectedDesign'));
        if (selectedDesign) {
          sessionStorage.removeItem('marcSelectedDesign');
          setSelectedDesignId(selectedDesign.id);
          setServiceType(selectedDesign.category);
          setBookingStep('form'); setIsBookingOpen(true);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setHomeError(error instanceof Error ? error.message : 'Unable to load the dashboard.');
      } finally {
        if (!controller.signal.aborted) setServicesLoading(false);
      }
    };
    void loadHome();
    return () => controller.abort();
  }, [userName, marcDesigns]);

  useEffect(() => {
    if (!isBookingOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const modal = document.querySelector<HTMLElement>('[aria-label="Book a design consultation"]');
    const elements = () => Array.from(modal?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []).filter(element => element.getClientRects().length > 0);
    elements()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsBookingOpen(false);
      if (event.key !== 'Tab') return;
      const focusable = elements(), first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [isBookingOpen]);

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

  const handleOpenBooking = () => {
    setBookingStep('form');
    setBookingError('');
    setIsBookingOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = getClientSession();
    if (!client) {
      setBookingError('Please sign in again before creating a booking.');
      return;
    }
    if (!selectedDesign || selectedDesign.category !== serviceType) {
      setBookingError('Please choose an interior category and design.');
      return;
    }
    if (!projectDescription.trim()) {
      setBookingError('Please describe your project requirements.');
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
      setBookingError('You already have a booking for this day. Only one booking per day is allowed.');
      return;
    }
    if (hasScheduleConflict) {
      setBookingError('This day is already booked. Please choose another date.');
      return;
    }
    setIsBookingSubmitting(true);
    setBookingError('');
    try {
      const response = await apiFetch(`${getApiUrl()}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: client.id, service_type: serviceType, design_id: selectedDesign.id, customization, project_description: projectDescription.trim(), project_address: projectAddress.trim(), project_landmark: projectLandmark.trim(), preferred_start_date: preferredStartDate, preferred_start_time: preferredStartTime }),
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
      const response = await apiFetch(`${getApiUrl()}/schedule/${clientSchedule.id}/reschedule`, {
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
      <div className="space-y-6 animate-fadeIn relative marc-client-home">
        <div className="bg-marc-charcoal text-white rounded-2xl p-4 md:p-6 shadow-md flex flex-row justify-between items-center gap-3">
          <div className="flex min-w-0 items-center space-x-2 md:space-x-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition cursor-pointer border-none text-white flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base md:text-xl font-serif font-black tracking-wide">Schedules</h2>
              <p className="hidden md:block text-xs text-brand-100 font-light mt-0.5">View your upcoming project appointments and confirmed dates.</p>
            </div>
          </div>

          <button
            aria-expanded={showCalendarView}
            aria-controls="client-schedule-calendar"
            onClick={() => setShowCalendarView(!showCalendarView)}
            className="flex shrink-0 items-center space-x-1.5 md:space-x-2 bg-white/10 hover:bg-white/25 border border-white/20 px-2 md:px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold tracking-normal md:tracking-wider transition cursor-pointer border-none text-white"
          >
            <Calendar className="w-4 h-4 text-white" />
            <span>CALENDAR VIEW</span>
            <ChevronLeft className={`hidden md:block w-4 h-4 transition-transform duration-300 ${showCalendarView ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <label className="block rounded-2xl border border-stone-200 bg-white p-4 text-xs font-bold text-stone-600">
          Select Project
          <select value={clientSchedule?.id ?? ''} onChange={event => { const project = projectSchedules.find(row => row.id === Number(event.target.value)); setSelectedProjectId(Number(event.target.value)); if (project) { setClientSchedule(project); const [year, month, day] = String(project.visit_date).slice(0, 10).split('-').map(Number); setCurrentYear(year); setCurrentMonth(month - 1); setSelectedDate(day); } setIsRescheduling(false); setScheduleMessage(''); setShowCalendarView(false); }} className="mt-2 block w-full rounded-xl border border-stone-200 bg-stone-50 p-3" disabled={!projectSchedules.length}>
            {!projectSchedules.length && <option value="">No project schedules yet</option>}
            {projectSchedules.map(project => <option key={project.id} value={project.id}>{project.service_type} - {project.project_description || `Project #${project.id}`} ({project.accepted_at || ['confirmed', 'approved', 'ongoing', 'completed'].includes(project.booking_status?.toLowerCase()) ? 'Confirmed' : 'Pending approval'})</option>)}
          </select>
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className={`${showCalendarView ? 'lg:col-span-5' : 'lg:col-span-12 max-w-xl'} space-y-4 transition-all duration-300`}>
            {clientSchedule ? <div className="bg-white border border-stone-200/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6 relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-serif font-black text-stone-900 tracking-wide">{clientSchedule.service_type}</h3>
                  <p className="text-xs text-stone-500 font-medium mt-1">
                    {monthNames[currentMonth]} {selectedDate}, {currentYear}
                  </p>
                </div>
                <span className={`text-[10px] font-bold font-mono tracking-wider px-3.5 py-1.5 rounded-full ${bookingIsAccepted ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                  {bookingIsAccepted ? 'CONFIRMED' : 'PENDING APPROVAL'}
                </span>
              </div>

              <p className="text-sm text-stone-600 font-serif italic py-1">
                &quot;{clientSchedule.project_description}&quot;
              </p>

              <div className="space-y-2.5">
                <div className="border border-stone-200 rounded-2xl px-5 py-3.5 flex items-center space-x-3 bg-stone-50/70">
                  <Calendar className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-stone-400">Scheduled Date</p>
                    <p className="text-xs font-serif font-black text-stone-800 tracking-wider">
                      {monthNames[currentMonth].substring(0, 3)} {selectedDate}, {currentYear}
                    </p>
                  </div>
                </div>

                <div className="border border-stone-200 rounded-2xl px-5 py-3.5 flex items-center space-x-3 bg-stone-50/70">
                  <Clock className="w-5 h-5 text-brand-600 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase font-black tracking-widest text-stone-400">Time Slot</p>
                    <p className="text-xs font-serif font-black text-stone-800 tracking-wider">
                      {clientSchedule.time_start ? `${clientSchedule.time_start}${clientSchedule.time_end ? ` - ${clientSchedule.time_end}` : ''}` : 'Start time to be confirmed'}
                    </p>
                  </div>
                </div>
              </div>
              {scheduleMessage && <p className="rounded-xl bg-brand-50 p-3 text-[11px] leading-relaxed text-brand-700">{scheduleMessage}</p>}
              {canReschedule && !isRescheduling && (
                <button type="button" onClick={() => { setIsRescheduling(true); setScheduleMessage(''); }} className="w-full rounded-xl border border-brand-200 bg-brand-50 py-3 text-[10px] font-black uppercase tracking-widest text-brand-700 transition hover:bg-brand-100">
                  Reschedule date — one time only
                </button>
              )}
              {isRescheduling && !showCalendarView && <p role="status" className="text-xs text-brand-700">Click Calendar View to choose your new date.</p>}
              {!bookingIsAccepted && Number(clientSchedule.reschedule_count) >= 1 && (
                <p className="text-center text-[10px] font-bold text-stone-400">Your one-time reschedule allowance has been used.</p>
              )}
              {bookingIsAccepted && (
                <p className="text-center text-[10px] font-bold text-stone-400">The admin accepted this project. Its scheduled date is now locked.</p>
              )}
            </div> : <div className="bg-white border border-stone-200/80 rounded-3xl p-8 text-center text-xs text-stone-400">No project schedule is available yet.</div>}
          </div>

          {showCalendarView && (
            <div id="client-schedule-calendar" className="lg:col-span-7 bg-white rounded-3xl p-4 sm:p-8 shadow-sm border border-stone-200 space-y-4 sm:space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-serif font-black text-stone-900 tracking-wide uppercase">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <div className="flex items-center space-x-1 bg-stone-50 p-1 rounded-xl border border-stone-100">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-white rounded-lg text-stone-600 transition cursor-pointer border-none bg-transparent flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-white rounded-lg text-stone-600 transition cursor-pointer border-none bg-transparent flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="w-full">
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => (
                    <span key={index} className="text-[10px] font-black uppercase tracking-widest text-stone-400 py-1">
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
                            ? 'bg-marc-charcoal text-white shadow-md shadow-brand-500/30'
                            : isToday
                              ? 'bg-brand-50 text-brand-700 border border-brand-200'
                              : `bg-stone-50 text-stone-700 ${canSelectDate ? 'hover:bg-stone-100' : 'opacity-70'}`
                        }`}
                      >
                        <span>{dayNum}</span>
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 bg-brand-600 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-stone-50 border border-stone-100 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
                <span className="text-stone-500 font-medium">{isRescheduling ? 'New requested date:' : 'Scheduled date:'}</span>
                <span className="font-bold text-stone-800">
                  {monthNames[currentMonth]} {selectedDate}, {currentYear}
                </span>
              </div>
              {isRescheduling && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setIsRescheduling(false); setScheduleMessage(''); }} className="flex-1 rounded-xl border border-stone-200 py-3 text-[10px] font-black uppercase tracking-widest text-stone-600">Cancel</button>
                  <button type="button" disabled={isRescheduleSubmitting} onClick={() => void handleReschedule()} className="flex-1 rounded-xl bg-marc-charcoal py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60">{isRescheduleSubmitting ? 'Saving...' : 'Confirm new date'}</button>
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
      <div className="marc-welcome text-white flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-serif font-black tracking-wide">{clientDisplayName}</h2>
          <p className="text-xs text-brand-100 font-light mt-0.5">Your interior journey starts here.</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab?.('profile')}
          aria-label="Account profile"
          title="Account profile"
          className="flex shrink-0 min-h-11 min-w-11 items-center justify-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/25 p-2 md:px-4 md:py-2.5 rounded-xl text-xs font-bold tracking-wider transition shadow-sm cursor-pointer"
        >
          <ClientProfileIcon />
          <span className="hidden md:inline">Account Profile</span>
        </button>
      </div>
      {homeError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{homeError}</p>}

      {isCustomizing ? <DesignCustomizer initialDesignId={selectedDesignId} onBack={()=>setActiveTab('home')} onComplete={(id, requirements, preferences)=>{ chooseDesign(id); setCustomization(preferences); setProjectDescription(requirements); setActiveTab('home'); handleOpenBooking(); }}/> : <div className="marc-dashboard-columns">
        <section className="marc-dashboard-designs"><h2>BROWSE DESIGNS</h2><p>Find the perfect design for your dream space.</p><DesignGallery compact onCustomize={design=>{chooseDesign(design.id);setActiveTab('customize');}} onChoose={design => {
          chooseDesign(design.id); handleOpenBooking();
        }} /></section>
        <div className="space-y-4 flex flex-col justify-between">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 text-center shadow-sm flex flex-col justify-center items-center space-y-3 flex-1">
            <p className="text-xs font-serif font-medium text-stone-700 leading-relaxed">
              {clientSchedule ? clientSchedule.service_type + ' - ' + clientSchedule.booking_status + '. View your project schedule below.' : <>No active projects yet. Let&apos;s start something beautiful.</>}
            </p>
            <button
              onClick={handleOpenBooking}
              className="bg-stone-900 hover:bg-stone-800 text-white font-black text-[10px] tracking-widest px-6 py-2.5 rounded-xl transition shadow flex items-center space-x-2 cursor-pointer border-none"
            >
              <span>BOOK NOW!</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="marc-custom-launch" onClick={()=>setActiveTab('customize')}>Customize your design <ArrowRight size={15}/></button>
          </div>

          <div className="marc-dashboard-shortcuts grid grid-cols-2 gap-4">
            <button type="button"
              onClick={() => setActiveTab?.('payments')}
              className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm hover:bg-stone-50 transition cursor-pointer flex flex-col items-center justify-center space-y-2 group"
            >
              <div className="p-2.5 bg-stone-50 rounded-xl group-hover:bg-brand-50 transition">
                <Wallet className="w-5 h-5 text-stone-700 group-hover:text-brand-600 transition" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wider text-stone-800 uppercase">Payments</h4>
                <p className="text-[9px] text-stone-400 font-bold mt-0.5">View Billing Page</p>
              </div>
            </button>

            <button type="button"
              onClick={() => setCurrentView('schedules')}
              className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm hover:bg-stone-50 transition cursor-pointer flex flex-col items-center justify-center space-y-2 group"
            >
              <div className="p-2.5 bg-stone-50 rounded-xl group-hover:bg-brand-50 transition">
                <CalendarRange className="w-5 h-5 text-stone-700 group-hover:text-brand-600 transition" />
              </div>
              <div>
                <h4 className="text-xs font-black tracking-wider text-stone-800 uppercase">Schedules</h4>
                <p className="text-[9px] text-stone-400 font-bold mt-0.5">View Calendar</p>
              </div>
            </button>
          </div>
          <section className="marc-dashboard-promo" aria-labelledby="marc-promo-title">
            <Image src="/designs/interior photo.jpg" alt="Interior design inspiration" fill sizes="(max-width: 850px) 90vw, 35vw" />
            <div className="marc-dashboard-promo-copy">
              <p>INSPIRED LIVING. TIMELESS DESIGN.</p>
              <h3 id="marc-promo-title">A space that feels like you.</h3>
              <span>Thoughtful interiors, tailored to the way you live.</span>
            </div>
          </section>
        </div>
      </div>}

      {isBookingOpen && (
        <div role="dialog" aria-modal="true" aria-label="Book a design consultation" className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-marc-charcoal text-white rounded-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col max-w-2xl w-full shadow-2xl border border-stone-800 relative animate-fadeIn">
            {bookingStep === 'form' && (
              <button
                aria-label="Close booking form"
                onClick={() => setIsBookingOpen(false)}
                className="absolute top-2 right-3 z-40 p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition cursor-pointer border-none flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {bookingStep === 'form' ? (
              <div className="flex min-h-0 flex-col">
                  <h3 className="shrink-0 border-b border-stone-800 px-4 py-4 pr-14 sm:px-6 text-xs font-black tracking-widest text-stone-400 uppercase font-sans">
                    Book an Interior Consultation
                  </h3>

                  <form id="booking-form" onSubmit={handleBookingSubmit} className="min-h-0 overflow-y-auto overscroll-contain grid grid-cols-2 gap-x-3 gap-y-2.5 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-4 marc-booking-form">
                    {catalogError && <p role="alert" className="col-span-2 text-red-300">{catalogError}</p>}
                    {bookingError && <p className="col-span-2 rounded-xl bg-red-500/10 p-2 text-xs text-red-300">{bookingError}</p>}
                    <div className="col-span-2 marc-booking-intro"><p>INTERIOR DESIGN CONSULTATION</p><h4>Tell us about your space</h4><span>Choose a design, share your requirements, and request a schedule. Final scope and pricing are confirmed after consultation.</span></div>
                    <label className="col-span-2 sm:col-span-1 marc-booking-field">Interior category
                      <select required value={serviceType} onChange={e => { setServiceType(e.target.value); setSelectedDesignId(''); setCustomization(null); setBookingError(''); }}>
                        <option value="" disabled>Select a category</option>{Array.from(new Set(marcDesigns.map(d => d.category))).map(category => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="col-span-2 sm:col-span-1 marc-booking-field">Design selection
                      <select required value={selectedDesignId} onChange={e => chooseDesign(e.target.value)} disabled={!serviceType}>
                        <option value="" disabled>Select a design</option>{marcDesigns.filter(d => d.category === serviceType).map(design => <option key={design.id} value={design.id}>{design.name}</option>)}
                      </select>
                    </label>
                    {selectedDesign && <section className="col-span-2 marc-booking-selection" aria-label="Selected interior design"><div className="marc-booking-thumbnail"><Image src={selectedDesign.image} alt={selectedDesign.name} unoptimized fill sizes="110px" /></div><div><span>{selectedDesign.category}</span><h4>{selectedDesign.name}</h4><p>{designPrice(selectedDesign.price)}</p><p>{selectedDesign.description}</p></div></section>}
                    {selectedDesign && (
                      <div className="col-span-2 rounded-2xl border border-brand-500/30 bg-stone-900/90 p-4 text-xs leading-relaxed shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-800 pb-2.5">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">Preliminary Estimation</span>
                            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 tracking-tight mt-0.5">
                              {designPrice(bookingEstimate).replace('From ', '₱')}
                            </p>
                          </div>
                          <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-900/60 text-brand-300 border border-brand-700/50">
                            Subject to Site Assessment
                          </span>
                        </div>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-stone-300 text-[11px]">
                          <span>Sample base: <strong className="text-stone-100">{designPrice(selectedDesign.price)}</strong></span>
                          {customization && <span>• Customization adjustment: <strong className="text-brand-300">+{customizationAdjustment}%</strong></span>}
                        </div>
                        <p className="mt-2 text-[10px] text-stone-400">
                          Illustrative pricing based on current design preferences. Final scope and costs confirmed after detailed consultation.
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-300 block">
                        Project Address
                      </label>
                      <input
                        type="text"
                        value={projectAddress}
                        onChange={(e) => setProjectAddress(e.target.value)}
                        placeholder="Street, barangay, city, province"
                        autoComplete="street-address"
                        required
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-200 font-medium focus:outline-none focus:border-brand-500 shadow-inner"
                      />
                      <p className="text-[9px] text-stone-500">This exact location will be shown to the admin and used on the Fleet Map.</p>
                    </div>

                    <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-300 block">
                        Nearest Landmark
                      </label>
                      <input
                        type="text"
                        value={projectLandmark}
                        onChange={(e) => setProjectLandmark(e.target.value)}
                        placeholder="e.g. Across the public market"
                        required
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-200 font-medium focus:outline-none focus:border-brand-500 shadow-inner"
                      />
                    </div>

                    <div className="col-span-2 min-w-0 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-300 block">
                        Project Requirements
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Tell us about your space, preferred finishes, storage needs, and any changes to the selected design."
                        maxLength={5000}
                        aria-label="Project requirements"
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        required
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-200 font-medium focus:outline-none focus:border-brand-500 shadow-inner resize-none"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-stone-300 min-h-8 flex items-end">
                        Preferred Project Start Date
                      </label>
                      <input
                        type="date"
                        value={preferredStartDate}
                        min={new Date().toLocaleDateString('en-CA')}
                        onChange={(e) => setPreferredStartDate(e.target.value)}
                        required
                        className="booking-start-date block h-11 min-w-0 w-full max-w-full appearance-none bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-200 font-medium focus:outline-none focus:border-brand-500 shadow-inner [color-scheme:dark]"
                      />
                      {(hasDuplicateBooking || hasScheduleConflict) && <p className="text-[10px] text-red-300">{hasDuplicateBooking ? 'You already have a booking for this day. Only one booking per day is allowed.' : 'This day is unavailable. Choose another date.'}</p>}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <label className="min-h-8 flex items-end text-[10px] font-black uppercase tracking-wider text-stone-300">Preferred Start Time</label>
                      {desktopTimePicker ? <input
                        type="time"
                        aria-label="Preferred start time"
                        value={preferredStartTime}
                        onChange={(e) => setPreferredStartTime(e.target.value)}
                        required
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2.5 text-xs text-stone-200 font-medium focus:outline-none focus:border-brand-500 shadow-inner [color-scheme:dark]"
                      /> : <MobileTimePicker value={preferredStartTime} onChange={setPreferredStartTime} />}
                    </div>

                  </form>

                  <div className="shrink-0 border-t border-stone-800 bg-marc-charcoal px-4 py-3 sm:px-6">
                    <button
                      type="submit"
                      form="booking-form"
                      disabled={isBookingSubmitting || hasDuplicateBooking || hasScheduleConflict || servicesLoading || catalogLoading || !selectedDesign}
                      className="w-full py-3.5 bg-stone-900 hover:bg-stone-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md border border-stone-700 cursor-pointer"
                    >
                      {isBookingSubmitting ? 'Submitting...' : 'Submit Booking Form'}
                    </button>
                  </div>
              </div>
            ) : (
              <div className="py-12 px-6 text-center space-y-6">
                <h3 className="text-xs font-black tracking-widest text-stone-400 uppercase font-sans">
                  Submit Booking Done!
                </h3>
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-serif font-bold text-white">Booking Request Received</h4>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    We have successfully logged your request for <span className="text-white font-bold">{selectedDesign?.name || serviceType}</span>. Our team will contact you shortly.
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
