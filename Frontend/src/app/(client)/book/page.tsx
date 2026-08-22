"use client";
import React, { useState, useEffect } from 'react';
import { Calendar, Plus, CheckCircle, X, ChevronLeft, ChevronRight, ChevronDown, Clock } from 'lucide-react';

export default function Book() {
  const [modalMode, setModalMode] = useState<'none' | 'book_form' | 'book_done' | 'schedule_form' | 'schedule_done'>('none');
  const [serviceType, setServiceType] = useState('Living Room Makeover');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  
  // Track submission/confirmation workflow state ('none' | 'pending' | 'confirmed')
  const [scheduleStatus, setScheduleStatus] = useState<'none' | 'pending' | 'confirmed'>('none');
  
  // Track the calendar view using active year and month indices
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(3); // Defaults to April (0-indexed: 3 = April)
  
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

  return (
    <div className="p-4 space-y-4 animate-fadeIn relative w-full">
      
      {/* Top Action Header Panel */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-slate-400">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>PROJECT SCHEDULING</span>
        </div>
        <button onClick={() => setModalMode('book_form')} className="bg-[#0070c0] hover:bg-blue-600 text-white font-bold text-[10px] tracking-wider px-3 py-1.5 rounded-lg flex items-center space-x-1 transition shadow-md cursor-pointer">
          <Plus className="w-3 h-3" />
          <span>BOOK NOW</span>
        </button>
      </div>

      {/* Baseline Overview Card - Visible only while not yet fully confirmed by admin */}
      {scheduleStatus !== 'confirmed' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1.5">
            {scheduleStatus === 'pending' && (
              <span className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Clock className="w-3 h-3" />
                <span>Pending</span>
              </span>
            )}
            <h3 className="text-xs font-bold text-slate-800">Living Room Design</h3>
            <p className="text-[11px] text-slate-500 italic">
              {selectedDate ? `Scheduled for: ${selectedDate}` : '"I want modern design"'}
            </p>
          </div>
          <button 
            onClick={() => { setModalMode('schedule_form'); setShowQuickSelect(false); }} 
            className="bg-[#1a2138] text-white text-[9px] font-bold tracking-widest px-3 py-2 rounded-lg hover:bg-slate-800 transition w-full sm:w-auto text-center cursor-pointer"
          >
            {scheduleStatus === 'pending' ? 'RESCHEDULE DATE' : '+ SCHEDULE DATE'}
          </button>
        </div>
      )}

      {/* Confirmed Schedules View Panel (Appears after admin confirmation) */}
      {scheduleStatus === 'confirmed' && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-slate-700 pt-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>CONFIRMED SCHEDULES</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Confirmed</span>
              <h3 className="text-xs font-bold text-slate-800 mt-2">Living Room Design</h3>
              <p className="text-[11px] text-slate-600 font-medium mt-1">
                Locked Schedule Date: <span className="font-bold text-slate-900">{selectedDate}</span>
              </p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">"I want modern design"</p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-[10px] text-emerald-600 font-bold bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm w-full sm:w-auto text-center">
                Ready for Execution
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LAYER OVERLAYS: MODAL CONFIGURATIONS */}
      {modalMode !== 'none' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 md:p-6 shadow-2xl space-y-4 border border-slate-100 my-auto animate-scaleIn relative">
            
            {/* Show X Close button for all modes except book_done and schedule_done */}
            {modalMode !== 'book_done' && modalMode !== 'schedule_done' && (
              <button onClick={() => setModalMode('none')} className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* VIEW 1: BOOK NOW FORM */}
            {modalMode === 'book_form' && (
              <div className="space-y-4 pt-2">
                <h3 className="text-xs font-black tracking-widest uppercase text-slate-800">Book Now Form</h3>
                <div>
                  <label className="text-[9px] tracking-widest font-bold text-slate-400 block mb-1 uppercase">Service Type</label>
                  <input type="text" value={serviceType} onChange={(e) => setServiceType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-[#0070c0]" />
                </div>
                <div>
                  <label className="text-[9px] tracking-widest font-bold text-slate-400 block mb-1 uppercase">Project Description</label>
                  <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="I want modern design" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none focus:border-[#0070c0]" />
                </div>
                <button onClick={() => setModalMode('book_done')} className="w-full bg-[#111c3a] text-white text-[10px] font-bold tracking-widest py-3 rounded-xl shadow-md cursor-pointer hover:bg-slate-800 transition">
                  SUBMIT BOOKING
                </button>
              </div>
            )}

            {/* VIEW 2: SUBMIT BOOKING DONE (Auto-hides after 3 seconds, no X button or text) */}
            {modalMode === 'book_done' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-bold text-slate-800">Done Book!</h3>
              </div>
            )}

            {/* VIEW 3: SCHEDULE FORM + INTERACTIVE SYSTEM CALENDAR ENGINE */}
            {modalMode === 'schedule_form' && (
              <div className="space-y-4 text-center pt-2">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black tracking-widest uppercase text-slate-800">Schedule Project</h3>
                  <p className="text-[10px] text-slate-400 font-medium">SELECT YOUR TARGET START DATE</p>
                </div>

                {/* Inline Architectural Responsive Custom Grid Engine Calendar */}
                <div className="border border-slate-100 rounded-2xl p-3 md:p-4 bg-slate-50/50 space-y-3 w-full relative">
                  
                  {/* Calendar Header Controls */}
                  <div className="flex justify-between items-center px-1">
                    <button 
                      type="button"
                      onClick={() => setShowQuickSelect(!showQuickSelect)}
                      className="text-xs font-bold text-slate-700 hover:text-[#0070c0] flex items-center space-x-1 p-1 rounded-lg hover:bg-slate-200/50 transition cursor-pointer"
                    >
                      <span>{monthNames[currentMonthIndex]} {currentYear}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showQuickSelect ? 'rotate-180 text-[#0070c0]' : 'text-slate-400'}`} />
                    </button>

                    <div className="flex space-x-1 text-slate-400">
                      <button 
                        type="button" 
                        disabled={isPrevDisabled}
                        onClick={handlePrevMonth}
                        className="p-1 hover:bg-slate-200/60 disabled:opacity-20 rounded transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        type="button" 
                        disabled={isNextDisabled}
                        onClick={handleNextMonth}
                        className="p-1 hover:bg-slate-200/60 disabled:opacity-20 rounded transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* QUICK SELECT CONDITIONAL INLINE FORM OVERLAY */}
                  {showQuickSelect && (
                    <div className="absolute top-11 left-3 right-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl z-20 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Month</label>
                          <select 
                            value={currentMonthIndex} 
                            onChange={(e) => setCurrentMonthIndex(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
                          >
                            {monthNames.map((name, index) => (
                              <option key={name} value={index}>{name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Year</label>
                          <select 
                            value={currentYear} 
                            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
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
                        className="w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-lg tracking-wider"
                      >
                        APPLY SELECTION
                      </button>
                    </div>
                  )}
                  
                  {/* Calendar Matrix Headers */}
                  <div className="grid grid-cols-7 gap-1 text-[9px] font-bold text-slate-400 uppercase text-center">
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
                              ? 'bg-[#0070c0] text-white font-bold shadow-md'
                              : 'text-slate-700 hover:bg-slate-200/80'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-left">
                  <label className="text-[9px] tracking-widest font-bold text-slate-400 block mb-1 uppercase">Work Date</label>
                  <input type="text" readOnly value={selectedDate} placeholder="Select date from calendar" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-center text-slate-800 focus:outline-none font-bold placeholder:font-normal placeholder:text-slate-400" />
                </div>

                <div className="space-y-2">
                  <button 
                    disabled={!selectedDate} 
                    onClick={() => {
                      setScheduleStatus('pending');
                      setModalMode('schedule_done'); // Switches to Schedule Done state which auto-hides after 3 seconds
                    }} 
                    className="w-full bg-[#0070c0] text-white text-[10px] font-bold tracking-widest py-3 rounded-xl disabled:opacity-40 shadow-md cursor-pointer hover:bg-blue-600 transition disabled:cursor-not-allowed"
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
                <h3 className="text-base font-serif font-bold text-slate-800">Schedule Submitted!</h3>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}