"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Compass, Info, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { apiFetch, getApiUrl } from '@/lib/api';

const FleetProjectMap = dynamic(() => import('./FleetProjectMap'), { ssr: false });

interface ProjectMarker {
  id: string;
  projectRef: string;
  clientName: string;
  locationName: string;
  region: string;
  progress: number;
  status: 'Accepted' | 'Ongoing' | 'Completed';
  projectDetails?: string;
  projectDescription?: string;
  fullAddress?: string;
  landmark?: string;
}

const getStatus = (progress: number): 'Accepted' | 'Ongoing' | 'Completed' => {
  if (progress === 0) return 'Accepted';
  if (progress >= 100) return 'Completed';
  return 'Ongoing';
};

export default function FleetMapManagement() {
  // --- DYNAMIC STATE SYSTEM CONNECTED TO BUILDS & PROJECT ROADMAP ---
  const [liveProjects, setLiveProjects] = useState<ProjectMarker[]>([]);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [refreshRevision,setRefreshRevision]=useState(0);
  const [loadError, setLoadError] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectMarker | null>(null);
  const [hoveredProject, setHoveredProject] = useState<ProjectMarker | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const loadFleetProjects = async () => {
      if (loading || controller.signal.aborted || document.visibilityState !== 'visible') return;
      loading = true;
      try {
      const [bookingData, trackingData] = await Promise.all([
      apiFetch(`${getApiUrl()}/booking`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('Unable to load fleet projects.'); return r.json(); }),
      apiFetch(`${getApiUrl()}/tracking`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error('Unable to load project progress.'); return r.json(); })
    ]);
      if (controller.signal.aborted) return;
      setLoadError('');
      const acceptedProjects = (bookingData.bookings ?? [])
        .filter((booking: { accepted_at?: string | null; client_address?: string | null; status?: string }) =>
          Boolean(booking.accepted_at && booking.client_address?.trim()) && !['rejected', 'cancelled'].includes((booking.status || '').toLowerCase())
        )
        .map((booking: { id: number; client_name?: string; client_address: string; client_landmark?: string; service_type?: string; project_description?: string }) => {
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
            projectDetails: booking.service_type || 'Project',
            projectDescription: booking.project_description || ''
          } satisfies ProjectMarker;
        })
        .filter((project: ProjectMarker) => project.status !== 'Completed');

      setLiveProjects(current => JSON.stringify(current) === JSON.stringify(acceptedProjects) ? current : acceptedProjects);
      setSelectedProject((current) => acceptedProjects.find((project: ProjectMarker) => project.id === current?.id) ?? acceptedProjects[0] ?? null);
      } catch (error) { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : 'Unable to load fleet projects.'); }
      finally { loading = false; }
    };
    void loadFleetProjects();
    const refreshTimer = window.setInterval(() => void loadFleetProjects(), 10000);
    return () => { controller.abort(); window.clearInterval(refreshTimer); };
  }, [refreshRevision]);

  const activeProject = selectedProject || liveProjects[0] || null;
  const selectProject = useCallback((projectId: string) => {
    const project = liveProjects.find(item => item.id === projectId);
    if (project) {
      setSelectedProject(project); setSelectionRevision(current => current + 1);
      if (window.matchMedia('(max-width: 1023px)').matches) mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [liveProjects]);

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER BANNER MATCHING THE PROVIDED BANNER DESIGN */}
      <div className="bg-marc-charcoal text-white rounded-2xl px-6 py-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight leading-none">
          Fleet & Project Tracker Map
        </h1>
        <p className="text-[11px] font-black uppercase tracking-widest text-brand-100 mt-2">
          REAL-TIME GEO-LOCATION MONITORING OF ACTIVE CLIENT PROJECTS
        </p>
        </div>
        <Link href="/admin/dashboard" className="min-h-11 shrink-0 hidden md:inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 transition"><ChevronLeft className="w-4 h-4"/>Overview</Link>
      </div>

      {loadError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setRefreshRevision(value=>value+1)} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs">Refresh projects</button><button type="button" disabled={!activeProject} onClick={()=>{setSelectionRevision(value=>value+1);mapSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}} className="rounded-lg bg-marc-charcoal px-4 py-2 text-xs text-white disabled:opacity-40">Center selected project</button><button type="button" disabled={!activeProject} onClick={()=>document.getElementById('fleet-selected-project-details')?.scrollIntoView({behavior:'smooth',block:'start'})} className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-xs text-brand-800 disabled:opacity-40">View selected details</button></div>
      {/* MAIN HARDWARE VISUALIZATION PORT */}
      <div className="grid grid-cols-1 lg:grid-cols-4 items-start gap-6">
        
        {/* PERSISTENT MAP WINDOW CONTAINER */}
        <div ref={mapSectionRef} className="scroll-mt-4 min-w-0 lg:col-span-3 bg-stone-900 rounded-3xl border border-stone-800 shadow-xl overflow-hidden relative flex flex-col justify-between">
          
          {/* SIMULATED DEVICE HEADER BAR */}
          <div className="bg-stone-950 text-white px-4 py-3 flex flex-wrap gap-2 justify-between items-center text-xs font-bold border-b border-stone-800/60 z-10">
            <span className="font-mono">Accepted Client Project Locations ({liveProjects.length})</span>
            <div className="flex items-center space-x-2 text-stone-400">
              <Compass className="w-3.5 h-3.5 animate-pulse text-brand-400" />
              <span className="text-[10px] tracking-wider uppercase font-sans">{activeProject?.locationName || 'Waiting for an accepted booking'}</span>
            </div>
          </div>

          {/* One shared map with geographically anchored pins for every accepted project. */}
          <div className="flex-1 relative overflow-hidden bg-stone-100">
            {liveProjects.length ? (
              <FleetProjectMap
                projects={liveProjects}
                selectedProjectId={activeProject?.id}
                selectionRevision={selectionRevision}
                onSelectProject={selectProject}
              />
            ) : (
              <div className="flex h-full min-h-[430px] flex-col items-center justify-center gap-3 text-center text-stone-500">
                <MapPin className="h-10 w-10 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-stone-700">No accepted project locations yet</p>
                  <p className="mt-1 text-xs">A client pin will appear after the booking is confirmed and the client has an address.</p>
                </div>
              </div>
            )}
          </div>

          {/* SIMULATED STATUS BAR BASEFOOT */}
          <div className="bg-stone-950 text-[10px] tracking-widest font-mono text-stone-400 px-6 py-2.5 flex items-center justify-between border-t border-stone-800/60 z-10">
            <span className="uppercase text-stone-300">Live project location data</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400/50 animate-pulse" />
          </div>

        </div>

        {/* Accepted project manifest */}
        <div className="bg-white rounded-3xl border border-stone-200/80 p-4 sm:p-5 shadow-sm space-y-4 h-full flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black tracking-widest uppercase text-stone-800 font-serif">Job Sites Manifest</h3>
            <p className="text-[10px] font-medium text-stone-400">Select a project to center its pin and open its details.</p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {liveProjects.map((project) => {
              const isActive = hoveredProject?.id === project.id || selectedProject?.id === project.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  aria-pressed={selectedProject?.id === project.id}
                  aria-label={`Show project ${project.projectRef}: ${project.clientName} on map`}
                  onMouseEnter={() => setHoveredProject(project)}
                  onMouseLeave={() => setHoveredProject(null)}
                  onClick={() => {
                    selectProject(project.id);
                  }}
                  className={`w-full p-3 text-left rounded-xl border transition flex flex-col space-y-1 text-sm cursor-pointer ${
                    isActive
                      ? 'bg-red-50/70 border-red-200 ring-2 ring-red-500/10'
                      : 'bg-stone-50 border-transparent hover:bg-stone-100/70 hover:border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono font-black text-stone-800">{project.projectRef}</span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                      project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                      project.status === 'Ongoing' ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-600'
                    }`}>{project.status}</span>
                  </div>
                  <p className="font-medium text-stone-800 break-words">{project.clientName} · {project.projectDetails}</p>
                  <div className="flex items-center space-x-1 text-sm text-stone-600 font-normal pt-0.5">
                    <MapPin className="w-3 h-3 fill-red-600 text-red-700" />
                    <span className="break-words">{project.locationName}</span>
                  </div>
                  {project.landmark && <p className="break-words pl-4 text-xs font-normal text-stone-600">Landmark: {project.landmark}</p>}
                </button>
              );
            })}
            {!liveProjects.length && <p className="py-8 text-center text-xs text-stone-400">No accepted projects with an address.</p>}
          </div>

          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex items-start space-x-2 text-[11px] text-stone-500 font-medium mt-2">
            <Info className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
            <p>Progress updates saved on the Builds page or Project Roadmap automatically sync to this map in real-time.</p>
          </div>
        </div>

      </div>
      <section id="fleet-selected-project-details" aria-labelledby="fleet-details-heading" className="fleet-selected-details scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-7 shadow-sm">
        <h2 id="fleet-details-heading" className="text-xl text-stone-900">Selected project details</h2>
        {activeProject ? <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-brand-700">Project {activeProject.projectRef}</p><h3 className="mt-1 text-lg text-stone-900">{activeProject.clientName}</h3><p className="mt-1 text-sm text-stone-600">{activeProject.projectDetails}</p></div><span className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">{activeProject.status} - {activeProject.progress}% complete</span></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2"><div><dt className="text-xs text-stone-500">Project address</dt><dd className="mt-1 text-sm text-stone-900">{activeProject.fullAddress || activeProject.locationName}</dd></div><div><dt className="text-xs text-stone-500">Nearest landmark</dt><dd className="mt-1 text-sm text-stone-900">{activeProject.landmark || 'No landmark provided'}</dd></div></dl>
          <div className="mt-6 border-t border-stone-200 pt-5"><h4 className="text-sm text-brand-800">Full project information</h4><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">{activeProject.projectDescription || 'No additional project description was provided.'}</p></div>
          <div className="mt-6 flex flex-wrap gap-3"><Link href={'/admin/quotes?booking='+activeProject.id} className="rounded-lg bg-marc-charcoal px-4 py-3 text-xs text-white">Quotation &amp; client chat</Link><Link href={'/admin/build#project-'+activeProject.id} className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-800">Manage progress &amp; concepts</Link><Link href="/admin/payments" className="rounded-lg border border-stone-300 px-4 py-3 text-xs text-stone-800">Payment transactions</Link><button type="button" onClick={()=>{setSelectionRevision(value=>value+1);mapSectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'});}} className="rounded-lg border border-stone-300 px-4 py-3 text-xs text-stone-800">Back to project pin</button></div>
        </> : <p className="mt-3 text-sm text-stone-500">Select a project from the map or manifest to see its complete information here.</p>}
      </section>

    </div>
  );
}
