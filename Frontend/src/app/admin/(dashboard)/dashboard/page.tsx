"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Users, CreditCard, Clock, Trash2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface ClientProject {
  id: string;
  projectRef: string;
  clientName: string;
  service: string;
  location: string;
  status: 'pending' | 'ongoing' | 'completed';
  progress: number;
}


export default function DashboardOverview() {
  const router = useRouter();

  // --- CLIENT PROJECTS PIPELINE STATE ENGINE ---
  const [activeFilter, setActiveFilter] = useState<'pending' | 'ongoing' | 'completed'>('pending');
  
  const [projects, setProjects] = useState<ClientProject[]>([]);


  const loadDashboard = useCallback(async () => {
    const [bookingResponse, trackingResponse] = await Promise.all([
      fetch(`${getApiUrl()}/booking`), fetch(`${getApiUrl()}/tracking`)
    ]);
    const bookingData = await bookingResponse.json();
    const trackingData = await trackingResponse.json();
    const tracks: Array<{booking_id:number;progress:number}> = trackingData.tracking ?? [];
    setProjects((bookingData.bookings ?? [])
      .filter((b: {status?:string}) => !['rejected', 'cancelled'].includes((b.status || '').toLowerCase()))
      .map((b: {id:number;client_name?:string;service_type:string;status:string;client_address?:string}) => {
      const progress = Number(tracks.find(t => t.booking_id === b.id)?.progress ?? 0);
      const bookingStatus = (b.status || '').toLowerCase();
      const status: ClientProject['status'] = progress >= 100 || bookingStatus === 'completed'
        ? 'completed'
        : progress >= 20 || bookingStatus === 'ongoing'
          ? 'ongoing'
          : 'pending';
      return { id:String(b.id), projectRef:`#${b.id}`, clientName:b.client_name || 'Client', service:b.service_type, location:b.client_address || 'Address not provided', status, progress };
    }));
  }, []);
  useEffect(() => {
    const initialTimer = window.setTimeout(() => void loadDashboard(), 0);
    const refreshTimer = window.setInterval(() => void loadDashboard(), 10000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(refreshTimer);
    };
  }, [loadDashboard]);

  // --- CALCULATE COUNTS DYNAMICALLY ---
  const pendingCount = projects.filter(p => p.status === 'pending').length;
  const ongoingCount = projects.filter(p => p.status === 'ongoing').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  const filteredProjects = projects.filter(p => p.status === activeFilter);

  // --- PIPELINE ACTIONS ---
  const handleDeleteProject = async (id: string) => {
    await fetch(`${getApiUrl()}/booking/${id}`, {method:'DELETE'}); await loadDashboard();
  };


  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER BANNER BLOCK WITH CORNER RADIUS MATCHING BUILD PAGE */}
      <div className="bg-[#0070c0] text-white rounded-2xl p-6 shadow-sm mb-6 space-y-1">
        <div className="inline-block px-3 py-0.5 bg-white text-[#7c2d2d] rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm font-serif">
          Administrator
        </div>
        <h1 className="text-2xl font-bold font-serif tracking-tight">Dashboard</h1>
      </div>

      {/* 1. INTERACTIVE BUILD PIPELINE HEADER */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black tracking-widest uppercase text-slate-800 font-serif">
            Build Pipeline
          </h3>
        </div>
        
        {/* Interactive Responsive Filter Cards */}
        <div className="grid grid-cols-3 gap-3">
          
          {/* Pending Card */}
          <button 
            onClick={() => setActiveFilter('pending')}
            className={`rounded-2xl p-4 text-center transition cursor-pointer border-none flex flex-col justify-center items-center min-h-[95px] relative ${
              activeFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 ring-4 ring-amber-500/20 scale-[1.02]'
                : 'bg-amber-500/15 text-amber-800 hover:bg-amber-500/25'
            }`}
          >
            <span className="text-2xl font-black font-mono">{pendingCount}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold mt-1">Pending</span>
            {activeFilter === 'pending' && (
              <span className="absolute -bottom-1 w-2 h-2 bg-white rounded-full" />
            )}
          </button>

          {/* Ongoing Card */}
          <button 
            onClick={() => setActiveFilter('ongoing')}
            className={`rounded-2xl p-4 text-center transition cursor-pointer border-none flex flex-col justify-center items-center min-h-[95px] relative ${
              activeFilter === 'ongoing'
                ? 'bg-[#4ca0d4] text-white shadow-lg shadow-blue-400/20 ring-4 ring-blue-400/20 scale-[1.02]'
                : 'bg-[#4ca0d4]/15 text-[#1b5379] hover:bg-[#4ca0d4]/25'
            }`}
          >
            <span className="text-2xl font-black font-mono">{ongoingCount}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold mt-1">Ongoing</span>
            {activeFilter === 'ongoing' && (
              <span className="absolute -bottom-1 w-2 h-2 bg-white rounded-full" />
            )}
          </button>

          {/* Completed Card */}
          <button 
            onClick={() => setActiveFilter('completed')}
            className={`rounded-2xl p-4 text-center transition cursor-pointer border-none flex flex-col justify-center items-center min-h-[95px] relative ${
              activeFilter === 'completed'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/20 scale-[1.02]'
                : 'bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25'
            }`}
          >
            <span className="text-2xl font-black font-mono">{completedCount}</span>
            <span className="text-[9px] uppercase tracking-wider font-bold mt-1">Completed</span>
            {activeFilter === 'completed' && (
              <span className="absolute -bottom-1 w-2 h-2 bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* ACTIVE PIPELINE PROJECT MANIFEST */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-serif">
              {activeFilter} Projects List ({filteredProjects.length})
            </h4>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
              activeFilter === 'pending' ? 'bg-amber-100 text-amber-700' :
              activeFilter === 'ongoing' ? 'bg-blue-100 text-blue-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {activeFilter}
            </span>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div key={project.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 relative group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black font-mono text-slate-900">{project.projectRef}</span>
                        <span className="text-xs font-bold text-slate-800">• {project.clientName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{project.service}</p>
                      <p className="text-[10px] text-slate-400 font-medium flex items-center space-x-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#0070c0]" />
                        <span>{project.location}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-center">
                      {project.status === 'completed' && (
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          title="Delete Completed Project"
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer border border-rose-200/60 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Clock className="w-6 h-6 mx-auto opacity-40 mb-1" />
              <p className="text-xs font-serif italic">No client projects currently registered under {activeFilter}.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. CORE NAVIGATION GRID BLOCK (WITH FLEET MAP BUTTON) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Fleet Map Button Link */}
        <button 
          onClick={() => router.push('/admin/fleet')}
          className="bg-[#161b3d] hover:bg-[#202754] text-white rounded-2xl p-5 text-left shadow-sm flex flex-col justify-between items-start min-h-[120px] transition cursor-pointer border-none group relative"
        >
          <h4 className="text-xl font-bold font-serif tracking-tight pr-8">Fleet Map</h4>
          <MapPin className="w-5 h-5 absolute bottom-5 right-5 text-slate-400 group-hover:text-white transition" />
        </button>

        {/* Schedule Button Link */}
        <button 
          onClick={() => router.push('/admin/schedule')}
          className="bg-[#f0f6fc] hover:bg-[#e2eef9] text-slate-800 rounded-2xl p-5 text-left border border-slate-200/60 shadow-sm flex flex-col justify-between items-start min-h-[120px] transition cursor-pointer group relative"
        >
          <h4 className="text-xl font-bold font-serif tracking-tight text-[#161b3d]">Schedule</h4>
          <Calendar className="w-5 h-5 absolute bottom-5 right-5 text-slate-400 group-hover:text-[#0070c0] transition" />
        </button>

        {/* Clients Button Link */}
        <button 
          onClick={() => router.push('/admin/clients')}
          className="bg-[#f0f6fc] hover:bg-[#e2eef9] text-slate-800 rounded-2xl p-5 text-left border border-slate-200/60 shadow-sm flex flex-col justify-between items-start min-h-[120px] transition cursor-pointer group relative"
        >
          <h4 className="text-xl font-bold font-serif tracking-tight text-[#161b3d]">Clients</h4>
          <Users className="w-5 h-5 absolute bottom-5 right-5 text-slate-400 group-hover:text-[#0070c0] transition" />
        </button>

        {/* Payment Transactions Button Link */}
        <button 
          onClick={() => router.push('/admin/payments')}
          className="bg-[#161b3d] hover:bg-[#202754] text-white rounded-2xl p-5 text-left shadow-sm flex flex-col justify-between items-start min-h-[120px] transition cursor-pointer border-none group relative"
        >
          <h4 className="text-xl font-bold font-serif tracking-tight pr-12 leading-tight">Payment Transactions</h4>
          <CreditCard className="w-5 h-5 absolute bottom-5 right-5 text-slate-400 group-hover:text-white transition" />
        </button>

      </div>
    </div>
  );
}
