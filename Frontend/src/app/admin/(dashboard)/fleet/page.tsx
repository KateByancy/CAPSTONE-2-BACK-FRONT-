"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Compass, Info, User, Home, Sparkles, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

interface ProjectMarker {
  id: string;
  projectRef: string;
  clientName: string;
  locationName: string;
  region: string;
  progress: number;
  coordinates: { top: string; left: string };
  status: 'Pending' | 'Ongoing' | 'Completed';
  projectDetails?: string;
  fullAddress?: string;
}

export default function FleetMapManagement() {
  // --- DYNAMIC STATE SYSTEM CONNECTED TO BUILDS & PROJECT ROADMAP ---
  const [liveProject, setLiveProject] = useState<ProjectMarker | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectMarker | null>(null);
  const [hoveredProject, setHoveredProject] = useState<ProjectMarker | null>(null);

  useEffect(() => {
    const loadFleetProject = () => Promise.all([
      fetch(`${getApiUrl()}/booking`).then(r => r.json()),
      fetch(`${getApiUrl()}/tracking`).then(r => r.json())
    ]).then(([bookingData, trackingData]) => {
      const booking = bookingData.bookings?.find((item: { accepted_at?:string|null }) => Boolean(item.accepted_at));
      if (!booking) return;
      const tracking = (trackingData.tracking ?? []).find((item: { booking_id: number }) => item.booking_id === booking.id);
      const progress = tracking?.progress ?? 0;
      const address = booking.client_address || 'Address not provided';
      setLiveProject({
        id: String(booking.id),
        projectRef: `#${booking.id}`,
        clientName: booking.client_name || 'Client',
        locationName: address,
        fullAddress: address,
        region: 'Client project location',
        progress,
        coordinates: { top: '50%', left: '50%' },
        status: getStatus(progress),
        projectDetails: booking.service_type
      });
    });
    void loadFleetProject();
    const refreshTimer = window.setInterval(() => void loadFleetProject(), 10000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  // Compute status based on progress from Builds Page / Project Roadmap
  const getStatus = (progress: number): 'Pending' | 'Ongoing' | 'Completed' => {
    if (progress === 0) return 'Pending';
    if (progress >= 100) return 'Completed';
    return 'Ongoing';
  };

  // SINGLE TARGET PROJECT: JOHN DOE
  const johnDoeProject: ProjectMarker = liveProject || { id:'',projectRef:'',clientName:'No tracked project',locationName:'No location',fullAddress:'No client address available',region:'',progress:0,coordinates:{top:'50%',left:'50%'},status:'Pending',projectDetails:'No project data' };

  const isActive = hoveredProject?.id === johnDoeProject.id || selectedProject?.id === johnDoeProject.id;

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER BANNER MATCHING THE PROVIDED BANNER DESIGN */}
      <div className="bg-[#0070c0] text-white rounded-2xl px-6 py-5 shadow-md flex items-center justify-between gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight leading-none">
          Fleet & Project Tracker Map
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-sky-100 mt-2">
          REAL-TIME GEO-LOCATION MONITORING OF ACTIVE CLIENT PROJECTS
        </p>
        </div>
        <Link href="/admin/dashboard" className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"><ChevronLeft className="w-4 h-4"/>Overview</Link>
      </div>

      {/* MAIN HARDWARE VISUALIZATION PORT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* PERSISTENT MAP WINDOW CONTAINER */}
        <div className="lg:col-span-3 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative min-h-[550px] flex flex-col justify-between">
          
          {/* SIMULATED DEVICE HEADER BAR */}
          <div className="bg-slate-950 text-white px-6 py-3 flex justify-between items-center text-xs font-bold border-b border-slate-800/60 z-10">
            <span className="font-mono">Client Project Location</span>
            <div className="flex items-center space-x-2 text-slate-400">
              <Compass className="w-3.5 h-3.5 animate-pulse text-sky-400" />
              <span className="text-[10px] tracking-wider uppercase font-sans">{johnDoeProject.locationName}</span>
            </div>
          </div>

          {/* GOOGLE MAPS INTERACTIVE BASE LAYER ENGINE (CEBU FOCUS) */}
          <div className="flex-1 relative overflow-hidden bg-slate-100 flex items-center justify-center select-none">
            
            {/* Embedded map uses the selected client's saved address. */}
            <iframe
              title="Client project Google Map"
              className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
              src={`https://www.google.com/maps?q=${encodeURIComponent(johnDoeProject.fullAddress || '')}&output=embed`}
              loading="lazy"
            />

            {/* Stylized HUD grid overlay lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#0000000a_1px,transparent_1px),linear-gradient(to_bottom,#0000000a_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />

            {/* JOHN DOE INTERACTIVE PINPOINT MARKER ONLY */}
            <div
              className="absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
              style={{ top: johnDoeProject.coordinates.top, left: johnDoeProject.coordinates.left }}
              onMouseEnter={() => setHoveredProject(johnDoeProject)}
              onMouseLeave={() => setHoveredProject(null)}
              onClick={() => setSelectedProject(johnDoeProject)}
            >
              {/* Radar Pulse Ring */}
              <span className="absolute inline-flex h-10 w-10 rounded-full animate-ping -top-2.5 -left-2.5 bg-amber-500/40" />
              
              {/* Custom Pin Icon */}
              <div className={`relative p-2 rounded-full border-2 shadow-xl transition-all transform bg-amber-500 border-white text-white ${
                isActive ? 'scale-125 ring-4 ring-amber-500/30' : 'hover:scale-110'
              }`}>
                <MapPin className="w-5 h-5 fill-current" />
              </div>

              {/* Pin Label Tag */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-700 shadow-md pointer-events-none">
                {johnDoeProject.clientName}
              </div>

              {/* HOVER / CLICK POPUP FORM CARD (PROGRESS BAR & PERCENTAGE REMOVED) */}
              {isActive && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white/98 backdrop-blur-md rounded-2xl p-4 border border-slate-200 shadow-2xl z-30 text-slate-800 space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-auto">
                  
                  {/* Form Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-[#0070c0]" />
                      <span className="text-xs font-black uppercase text-slate-900 font-serif">Client Telemetry</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                      johnDoeProject.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                      johnDoeProject.status === 'Ongoing' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {johnDoeProject.status}
                    </span>
                  </div>

                  {/* Client Info Form Fields */}
                  <div className="space-y-2 text-[11px]">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Client Name</span>
                      <p className="font-bold text-slate-900">{johnDoeProject.clientName}</p>
                    </div>

                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                        <Home className="w-3 h-3 text-[#0070c0]" /> Address Location
                      </span>
                      <p className="font-medium text-slate-700 leading-snug">
                        {johnDoeProject.fullAddress}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Desired Project
                      </span>
                      <p className="font-bold text-[#0070c0] mt-0.5">
                        {johnDoeProject.projectDetails}
                      </p>
                    </div>
                  </div>

                  {/* Pointer Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white" />
                </div>
              )}

            </div>

          </div>

          {/* SIMULATED STATUS BAR BASEFOOT */}
          <div className="bg-slate-950 text-[10px] tracking-widest font-mono text-slate-400 px-6 py-2.5 flex items-center justify-between border-t border-slate-800/60 z-10">
            <span className="uppercase text-slate-300">Live project location data</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50 animate-pulse" />
          </div>

        </div>

        {/* SIDE BAR EXPEDITED QUEUE MANIFEST LIST - JOHN DOE ONLY */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black tracking-widest uppercase text-slate-800 font-serif">Job Sites Manifest</h3>
            <p className="text-[10px] font-medium text-slate-400">Hover or click below to inspect location details.</p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            <button
              onMouseEnter={() => setHoveredProject(johnDoeProject)}
              onMouseLeave={() => setHoveredProject(null)}
              onClick={() => setSelectedProject(johnDoeProject)}
              className={`w-full p-3 text-left rounded-xl border transition flex flex-col space-y-1 text-xs cursor-pointer ${
                isActive 
                  ? 'bg-blue-50/60 border-blue-200 ring-2 ring-blue-500/10' 
                  : 'bg-slate-50 border-transparent hover:bg-slate-100/70 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-mono font-black text-slate-800">{johnDoeProject.projectRef}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                  johnDoeProject.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                  johnDoeProject.status === 'Ongoing' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>{johnDoeProject.status}</span>
              </div>
              <p className="font-bold text-slate-700 truncate">{johnDoeProject.clientName}</p>
              <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium pt-0.5">
                <MapPin className="w-3 h-3 text-[#0070c0]" />
                <span>{johnDoeProject.locationName}</span>
              </div>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-slate-500 font-medium mt-2">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <p>Progress updates saved on the Builds page or Project Roadmap automatically sync to this map in real-time.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
