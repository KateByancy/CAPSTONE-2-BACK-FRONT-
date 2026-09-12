"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Compass, Info, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getApiUrl } from '@/lib/api';

const FleetProjectMap = dynamic(() => import('./FleetProjectMap'), { ssr: false });

interface ProjectMarker {
  id: string;
  projectRef: string;
  clientName: string;
  locationName: string;
  region: string;
  progress: number;
  status: 'Pending' | 'Ongoing' | 'Completed';
  projectDetails?: string;
  fullAddress?: string;
  landmark?: string;
}

const getStatus = (progress: number): 'Pending' | 'Ongoing' | 'Completed' => {
  if (progress === 0) return 'Pending';
  if (progress >= 100) return 'Completed';
  return 'Ongoing';
};

export default function FleetMapManagement() {
  // --- DYNAMIC STATE SYSTEM CONNECTED TO BUILDS & PROJECT ROADMAP ---
  const [liveProjects, setLiveProjects] = useState<ProjectMarker[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectMarker | null>(null);
  const [hoveredProject, setHoveredProject] = useState<ProjectMarker | null>(null);

  useEffect(() => {
    const loadFleetProjects = () => Promise.all([
      fetch(`${getApiUrl()}/booking`).then(r => r.json()),
      fetch(`${getApiUrl()}/tracking`).then(r => r.json())
    ]).then(([bookingData, trackingData]) => {
      const acceptedProjects = (bookingData.bookings ?? [])
        .filter((booking: { accepted_at?: string | null; client_address?: string | null }) =>
          Boolean(booking.accepted_at && booking.client_address?.trim())
        )
        .map((booking: { id: number; client_name?: string; client_address: string; client_landmark?: string; service_type?: string }) => {
          const tracking = (trackingData.tracking ?? []).find((item: { booking_id: number }) => item.booking_id === booking.id);
          const progress = Number(tracking?.progress ?? 0);
          return {
            id: String(booking.id),
            projectRef: `#${booking.id}`,
            clientName: booking.client_name || 'Client',
            locationName: booking.client_address,
            fullAddress: booking.client_address,
            landmark: booking.client_landmark || '',
            region: 'Client project location',
            progress,
            status: getStatus(progress),
            projectDetails: booking.service_type || 'Project'
          } satisfies ProjectMarker;
        })
        .filter((project: ProjectMarker) => project.status !== 'Completed');

      setLiveProjects(acceptedProjects);
      setSelectedProject((current) => acceptedProjects.find((project: ProjectMarker) => project.id === current?.id) ?? acceptedProjects[0] ?? null);
    });
    void loadFleetProjects();
    const refreshTimer = window.setInterval(() => void loadFleetProjects(), 10000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  const activeProject = selectedProject || liveProjects[0] || null;

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER BANNER MATCHING THE PROVIDED BANNER DESIGN */}
      <div className="bg-[#0070c0] text-white rounded-2xl px-6 py-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight leading-none">
          Fleet & Project Tracker Map
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-sky-100 mt-2">
          REAL-TIME GEO-LOCATION MONITORING OF ACTIVE CLIENT PROJECTS
        </p>
        </div>
        <Link href="/admin/dashboard" className="min-h-11 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"><ChevronLeft className="w-4 h-4"/>Overview</Link>
      </div>

      {/* MAIN HARDWARE VISUALIZATION PORT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* PERSISTENT MAP WINDOW CONTAINER */}
        <div className="lg:col-span-3 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden relative min-h-[550px] flex flex-col justify-between">
          
          {/* SIMULATED DEVICE HEADER BAR */}
          <div className="bg-slate-950 text-white px-6 py-3 flex justify-between items-center text-xs font-bold border-b border-slate-800/60 z-10">
            <span className="font-mono">Accepted Client Project Locations ({liveProjects.length})</span>
            <div className="flex items-center space-x-2 text-slate-400">
              <Compass className="w-3.5 h-3.5 animate-pulse text-sky-400" />
              <span className="text-[10px] tracking-wider uppercase font-sans">{activeProject?.locationName || 'Waiting for an accepted booking'}</span>
            </div>
          </div>

          {/* One shared map with geographically anchored pins for every accepted project. */}
          <div className="flex-1 relative overflow-hidden bg-slate-100">
            {liveProjects.length ? (
              <FleetProjectMap
                projects={liveProjects}
                selectedProjectId={activeProject?.id}
                onSelectProject={(projectId) => {
                  const project = liveProjects.find((item) => item.id === projectId);
                  if (project) setSelectedProject(project);
                }}
              />
            ) : (
              <div className="flex h-full min-h-[430px] flex-col items-center justify-center gap-3 text-center text-slate-500">
                <MapPin className="h-10 w-10 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-slate-700">No accepted project locations yet</p>
                  <p className="mt-1 text-xs">A client pin will appear after the booking is confirmed and the client has an address.</p>
                </div>
              </div>
            )}
          </div>

          {/* SIMULATED STATUS BAR BASEFOOT */}
          <div className="bg-slate-950 text-[10px] tracking-widest font-mono text-slate-400 px-6 py-2.5 flex items-center justify-between border-t border-slate-800/60 z-10">
            <span className="uppercase text-slate-300">Live project location data</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50 animate-pulse" />
          </div>

        </div>

        {/* Accepted project manifest */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black tracking-widest uppercase text-slate-800 font-serif">Job Sites Manifest</h3>
            <p className="text-[10px] font-medium text-slate-400">Hover or click below to inspect location details.</p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {liveProjects.map((project) => {
              const isActive = hoveredProject?.id === project.id || selectedProject?.id === project.id;
              return (
                <button
                  key={project.id}
                  onMouseEnter={() => setHoveredProject(project)}
                  onMouseLeave={() => setHoveredProject(null)}
                  onClick={() => {
                    setSelectedProject(project);
                  }}
                  className={`w-full p-3 text-left rounded-xl border transition flex flex-col space-y-1 text-xs cursor-pointer ${
                    isActive
                      ? 'bg-red-50/70 border-red-200 ring-2 ring-red-500/10'
                      : 'bg-slate-50 border-transparent hover:bg-slate-100/70 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-black text-slate-800">{project.projectRef}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                      project.status === 'Ongoing' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>{project.status}</span>
                  </div>
                  <p className="font-bold text-slate-700 truncate">{project.clientName} · {project.projectDetails}</p>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-medium pt-0.5">
                    <MapPin className="w-3 h-3 fill-red-600 text-red-700" />
                    <span className="truncate">{project.locationName}</span>
                  </div>
                  {project.landmark && <p className="truncate pl-4 text-[9px] font-semibold text-red-600">Landmark: {project.landmark}</p>}
                </button>
              );
            })}
            {!liveProjects.length && <p className="py-8 text-center text-xs text-slate-400">No accepted projects with an address.</p>}
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
