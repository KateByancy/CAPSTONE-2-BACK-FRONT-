"use client";

import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, MapPin, User, Trash2 } from 'lucide-react';

interface Timeblock {
  id: string;
  date: string; // Format: YYYY-MM-DD
  timeStart: string;
  timeEnd: string;
  title: string;
  clientName: string;
  location: string;
}

export default function ScheduleManagement() {
  // --- STATE SYSTEM ---
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 20)); // July 2026
  const [selectedDateStr, setSelectedDateStr] = useState("2026-07-24");

  // Client-submitted booking schedule data
  const [timeblocks, setTimeblocks] = useState<Timeblock[]>([
    {
      id: '1',
      date: '2026-07-24',
      timeStart: '02:00 PM',
      timeEnd: '04:00 PM',
      title: 'Living Room Makeover Review',
      clientName: 'John Doe',
      location: 'Showroom Hall A'
    }
  ]);

  // --- CALENDAR GRID COMPUTATION ---
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Navigation Handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(year, parseInt(e.target.value, 10), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(parseInt(e.target.value, 10), month, 1));
  };

  const handleDeleteBlock = (id: string) => {
    setTimeblocks(timeblocks.filter(block => block.id !== id));
  };

  // Selected date events
  const activeTimelineBlocks = timeblocks.filter(block => block.date === selectedDateStr);

  // Generate Year options
  const yearsList = Array.from({ length: 16 }, (_, i) => 2020 + i);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 pb-12 px-2 sm:px-4">
      
      {/* 1. TOP BLUE HEADER BANNER */}
      <div className="bg-[#0070c0] text-white rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between gap-3">
        <div className="space-y-1">
          {/* Dynamic Month & Year Selection Header */}
          <div className="flex items-center space-x-2">
            <select 
              value={month} 
              onChange={handleMonthChange}
              className="bg-transparent text-xl sm:text-2xl font-bold font-serif text-white outline-none cursor-pointer border-b border-blue-300/40 hover:border-white transition"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx} className="text-slate-900 bg-white">{name}</option>
              ))}
            </select>

            <select 
              value={year} 
              onChange={handleYearChange}
              className="bg-transparent text-xl sm:text-2xl font-bold font-serif text-white outline-none cursor-pointer border-b border-blue-300/40 hover:border-white transition"
            >
              {yearsList.map((y) => (
                <option key={y} value={y} className="text-slate-900 bg-white">{y}</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-blue-100 opacity-90">
            Client Booking Schedule
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center space-x-1 bg-white/10 p-1 rounded-xl border border-white/20">
          <button 
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition bg-transparent border-none cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-white/20 rounded-lg text-white transition bg-transparent border-none cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MAIN CALENDAR GRID AND SIDE TIMELINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* CALENDAR CONTAINER */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          
          {/* DAY NAMES ROW */}
          <div className="grid grid-cols-7 text-center bg-slate-50 border-b border-slate-200/80 py-2.5">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <span key={day} className="text-[10px] sm:text-xs font-bold uppercase text-slate-500 font-serif tracking-wider">
                {day}
              </span>
            ))}
          </div>

          {/* CALENDAR CELLS GRID */}
          <div className="grid grid-cols-7 auto-rows-fr flex-1 divide-x divide-y divide-slate-100 bg-slate-100">
            
            {/* 1. Previous Month Overflow Days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => {
              const prevDayNum = prevMonthDays - firstDayIndex + idx + 1;
              return (
                <div key={`prev-${idx}`} className="bg-slate-50/60 p-1.5 sm:p-2 min-h-[65px] sm:min-h-[85px] flex flex-col justify-between">
                  <span className="text-[11px] font-medium text-slate-400 font-mono">{prevDayNum}</span>
                </div>
              );
            })}

            {/* 2. Current Month Active Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const loopDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
              const isSelected = loopDateStr === selectedDateStr;
              const dayEvents = timeblocks.filter(block => block.date === loopDateStr);

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => setSelectedDateStr(loopDateStr)}
                  className={`p-1.5 sm:p-2 min-h-[65px] sm:min-h-[85px] flex flex-col justify-between transition relative cursor-pointer group ${
                    isSelected ? 'bg-blue-50/60 ring-2 ring-inset ring-[#0070c0]' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold font-mono ${isSelected ? 'text-[#0070c0]' : 'text-slate-800'}`}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0070c0] sm:hidden" />
                    )}
                  </div>

                  {/* Desktop Client Event Pills */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((evt) => (
                      <div 
                        key={evt.id} 
                        className="hidden sm:block text-[9px] font-bold bg-[#f0f6fc] text-[#0070c0] px-1.5 py-0.5 rounded border border-blue-100 truncate"
                        title={`${evt.clientName} - ${evt.title}`}
                      >
                        <span className="font-extrabold text-slate-800">{evt.clientName}:</span> {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="hidden sm:block text-[8px] font-bold text-slate-400 pl-0.5">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 3. Next Month Overflow Days */}
            {Array.from({ length: (7 - ((firstDayIndex + daysInMonth) % 7)) % 7 }).map((_, idx) => (
              <div key={`next-${idx}`} className="bg-slate-50/60 p-1.5 sm:p-2 min-h-[65px] sm:min-h-[85px] flex flex-col justify-between">
                <span className="text-[11px] font-medium text-slate-400 font-mono">{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* TIMELINE SIDE PANEL */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col h-full space-y-4">
          <div>
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-900 font-serif">Scheduled Makeovers</h3>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
              Selected Date: <span className="text-[#0070c0] font-bold">{selectedDateStr}</span>
            </p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {activeTimelineBlocks.length > 0 ? (
              activeTimelineBlocks.map((block) => (
                <div key={block.id} className="p-3.5 bg-[#f0f6fc]/80 border border-blue-100 rounded-2xl text-xs space-y-2 relative group transition hover:bg-[#f0f6fc]">
                  <button 
                    onClick={() => handleDeleteBlock(block.id)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition border-none bg-transparent cursor-pointer p-1"
                    title="Remove Schedule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-1.5 font-bold text-[#0070c0]">
                    <Clock className="w-3.5 h-3.5" /> 
                    <span>{block.timeStart} - {block.timeEnd}</span>
                  </div>

                  {/* Client Name Display */}
                  <div className="flex items-center space-x-1.5 text-slate-900 font-bold bg-white/80 p-1.5 rounded-lg border border-blue-100/60">
                    <User className="w-3.5 h-3.5 text-[#0070c0]" />
                    <span className="text-xs">{block.clientName}</span>
                  </div>

                  <p className="font-semibold text-slate-700 pr-5 leading-snug">{block.title}</p>
                  
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-medium pt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{block.location}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-4 space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-300" />
                <div>
                  <p className="text-xs text-slate-500 font-bold">No Makeover Bookings</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Client bookings for this date will automatically appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}