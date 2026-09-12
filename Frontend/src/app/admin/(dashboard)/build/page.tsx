"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Plus, Check, X, Trash2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

interface BuildProject {
  id: string;
  userId: number;
  clientName: string;
  trackingId?: number;
  title: string;
  status: 'Pending' | 'Ongoing' | 'Completed';
  progress: number;
  concepts: { title: string; url: string; description?: string }[];
  milestones: { id: string; label: string; completed: boolean }[];
}

export default function BuildManagement() {
  const [mounted, setMounted] = useState(false);

  // Load initial state from localStorage if available
  const [builds, setBuilds] = useState<BuildProject[]>([]);

  useEffect(() => {
    Promise.all([fetch(`${getApiUrl()}/booking`).then(r=>r.json()),fetch(`${getApiUrl()}/tracking`).then(r=>r.json()),fetch(`${getApiUrl()}/designs`).then(r=>r.json())]).then(([bookingData,trackingData,designData]) => {
      const tracks: Array<{id:number;booking_id:number;progress:number;current_stage:string}> = trackingData.tracking ?? [];
      setBuilds((bookingData.bookings ?? []).filter((b:{accepted_at?:string|null})=>Boolean(b.accepted_at)).map((b:{id:number;user_id:number;client_name?:string;service_type:string;status:string})=>{
        const track=tracks.find(t=>t.booking_id===b.id); const progress=track?.progress??0;
        const status:BuildProject['status']=progress>=100?'Completed':progress>=20?'Ongoing':'Pending';
        return {id:String(b.id),userId:b.user_id,clientName:b.client_name||'Client',trackingId:track?.id,title:b.service_type,status,progress,concepts:(Array.isArray(designData)?designData:[]).filter((d:{user_id:number})=>d.user_id===b.user_id).map((d:{title:string;image?:string;description?:string})=>({title:d.title,url:d.image||'',description:d.description})),milestones:[20,40,60,80,100].map((point,index)=>({id:`${b.id}-${point}`,label:['Initial Consultation','Design Proposal','Material Selection','Execution','Final Handover'][index],completed:progress>=point}))};
      })); setMounted(true);
    }).catch(()=>setMounted(true));
  }, []);

  // Active Modals & Selection States
  const [activeRoadmapBuild, setActiveRoadmapBuild] = useState<BuildProject | null>(null);
  const [activeConceptModalBuild, setActiveConceptModalBuild] = useState<BuildProject | null>(null);
  const [activePhotosBuild, setActivePhotosBuild] = useState<BuildProject | null>(null);
  const [showSavedSuccess, setShowSavedSuccess] = useState<boolean>(false);

  // New Concept Form State
  const [conceptTitle, setConceptTitle] = useState("");
  const [conceptUrl, setConceptUrl] = useState("");
  const [conceptDesc, setConceptDesc] = useState("");

  // --- HANDLERS ---
  
  // Delete build manually
  const handleDeleteBuild = async (buildId: string) => {
    await fetch(`${getApiUrl()}/booking/${buildId}`,{method:'DELETE'}); setBuilds(prev => prev.filter(b => b.id !== buildId));
  };

  // Toggle Milestones in Roadmap Modal (Primary driver of percentage)
  const handleToggleMilestone = (milestoneId: string) => {
    if (!activeRoadmapBuild) return;

    const selectedIndex = activeRoadmapBuild.milestones.findIndex(m => m.id === milestoneId);
    if (selectedIndex < 0) return;
    const selectedMilestone = activeRoadmapBuild.milestones[selectedIndex];
    if (!selectedMilestone.completed) {
      const previousStepsComplete = activeRoadmapBuild.milestones
        .slice(0, selectedIndex)
        .every(milestone => milestone.completed);
      if (!previousStepsComplete) return;
    }

    const updatedMilestones = activeRoadmapBuild.milestones.map((milestone, index) => {
      if (selectedMilestone.completed && index >= selectedIndex) return { ...milestone, completed: false };
      if (index === selectedIndex) return { ...milestone, completed: true };
      return milestone;
    });

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const calculatedProgress = Math.round((completedCount / updatedMilestones.length) * 100);

    const updatedBuild: BuildProject = {
      ...activeRoadmapBuild,
      milestones: updatedMilestones,
      progress: calculatedProgress,
      status: calculatedProgress === 100 ? 'Completed' : calculatedProgress >= 20 ? 'Ongoing' : 'Pending'
    };

    setActiveRoadmapBuild(updatedBuild);
  };

  // Save Roadmap Changes
  const handleSaveRoadmap = async () => {
    if (!activeRoadmapBuild) return;

    const url=`${getApiUrl()}/tracking${activeRoadmapBuild.trackingId?`/${activeRoadmapBuild.trackingId}`:''}`;
    const bookingResponse=await fetch(`${getApiUrl()}/booking/${activeRoadmapBuild.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:activeRoadmapBuild.status})});
    if(!bookingResponse.ok){window.alert('Unable to save the project status.');return;}
    const response=await fetch(url,{method:activeRoadmapBuild.trackingId?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:Number(activeRoadmapBuild.id),progress:activeRoadmapBuild.progress,current_stage:activeRoadmapBuild.status})});
    const result=await response.json();
    if(!response.ok){window.alert(result.message||'Unable to save project progress.');return;}
    const savedBuild={...activeRoadmapBuild,trackingId:activeRoadmapBuild.trackingId||result.trackingId};
    setBuilds(prev => prev.map(b => b.id === savedBuild.id ? savedBuild : b));

    setActiveRoadmapBuild(null);
    setShowSavedSuccess(true);
    setTimeout(() => setShowSavedSuccess(false), 2000);
  };

  // Add Design Concept
  const handleAddConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConceptModalBuild || !conceptTitle) return;

    const newConcept = { title: conceptTitle, url: conceptUrl, description: conceptDesc };
    await fetch(`${getApiUrl()}/designs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:activeConceptModalBuild.userId,title:conceptTitle,description:conceptDesc,image:conceptUrl})});
    setBuilds(prev => prev.map(b => {
      if (b.id === activeConceptModalBuild.id) {
        return { ...b, concepts: [...b.concepts, newConcept] };
      }
      return b;
    }));

    setConceptTitle("");
    setConceptUrl("");
    setConceptDesc("");
    setActiveConceptModalBuild(null);
  };

  if (!mounted) return null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-[#0070c0] text-white rounded-2xl p-4 sm:p-5 shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif tracking-tight">Active Builds</h2>
          <p className="text-[10px] sm:text-xs uppercase font-bold tracking-widest text-blue-100 opacity-90 mt-0.5">
            Project Logistics
          </p>
        </div>
      </div>

      {/* 2. ACTIVE BUILDS GRID */}
      {builds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {builds.map((build) => (
            <div key={build.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-5 relative">
              
              {/* Header: Status Dropdown, Delete Icon & Dynamic Progress Percentage */}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white uppercase tracking-wide ${
                    build.status === 'Ongoing' ? 'bg-[#51c440]' :
                    build.status === 'Completed' ? 'bg-[#0070c0]' : 'bg-amber-500'
                  }`}>
                    {build.status}
                  </span>

                  {/* Delete Button Icon */}
                  <button
                    onClick={() => handleDeleteBuild(build.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition border-none bg-transparent cursor-pointer"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* LIVE DYNAMIC PERCENTAGE COUNTER */}
                <div className="text-right">
                  <span className="text-2xl font-bold text-[#0070c0] leading-none block transition-all duration-150">
                    {build.progress}%
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Completed</span>
                </div>
              </div>

              {/* Client and project details */}
              <div className="space-y-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Client Name</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-800">{build.clientName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Project Type</p>
                  <h3 className="mt-0.5 text-base font-bold text-slate-900 font-serif">{build.title}</h3>
                </div>
              </div>

              {/* AUTOMATIC PROGRESS BAR WITH CIRCLE INSIDE THE BLUE BAR */}
              <div className="space-y-2">
                {/* Main Progress Bar Outer Frame */}
                <div className="relative w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
                  
                  {/* Active Blue Progress Fill */}
                  <div 
                    className="bg-[#0070c0] h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${build.progress}%` }} 
                  />

                  {/* Inner White Circle Node (Fits inside the bar height) */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all duration-300 pointer-events-none select-none"
                    style={{ 
                      left: `calc(${build.progress}% - ${(build.progress / 100) * 10}px)`,
                      opacity: build.progress > 0 ? 1 : 0
                    }}
                  />
                </div>

                {/* Dynamic Floating Percentage Label Below the Bar */}
                <div className="relative w-full h-4 pointer-events-none select-none">
                  <span 
                    className="absolute text-[11px] font-bold text-[#0070c0] transition-all duration-300 ease-out"
                    style={{ 
                      left: `${build.progress}%`, 
                      transform: `translateX(-${build.progress}%)` 
                    }}
                  >
                    {build.progress}%
                  </span>
                </div>
              </div>

              {/* Design Concepts Header with (+) Button */}
              <div className="flex justify-between items-center pt-1">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Design Concepts</span>
                <button 
                  onClick={() => setActiveConceptModalBuild(build)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition border border-slate-200/80 cursor-pointer"
                  title="Add Design Concept"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Uploaded Concepts Area */}
              <div className="border border-slate-200/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[110px]">
                {build.concepts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {build.concepts.map((c, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs flex items-center space-x-1">
                        <Camera className="w-3.5 h-3.5 text-[#0070c0]" />
                        <span className="truncate max-w-[120px]">{c.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 text-slate-400">
                    <Camera className="w-6 h-6 mx-auto opacity-40" />
                    <p className="text-xs font-serif italic text-slate-400">NO CONCEPTS UPLOADED</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setActiveRoadmapBuild(build)}
                  className="py-2.5 px-3 bg-[#101828] hover:bg-black text-white text-[11px] font-bold rounded-xl tracking-wider uppercase transition border-none cursor-pointer shadow-sm text-center"
                >
                  Project Roadmap
                </button>
                <button 
                  onClick={() => setActivePhotosBuild(build)}
                  className="py-2.5 px-3 bg-[#f0f6fc] hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl tracking-wider uppercase transition border border-slate-200/80 cursor-pointer text-center"
                >
                  View Photos
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* EMPTY STATE WHEN ALL PROJECTS ARE DELETED */
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-2">
          <p className="text-sm font-serif italic">No active builds remaining.</p>
        </div>
      )}

      {/* 3. ROADMAP MILESTONE MODAL */}
      {activeRoadmapBuild && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-bold font-serif text-slate-900">Project Roadmap</h3>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Manage Milestone</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="uppercase text-slate-600 tracking-wider">Total Progress</span>
                <span className="text-[#0070c0] font-bold text-base">{activeRoadmapBuild.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#0070c0] h-full transition-all duration-300" style={{ width: `${activeRoadmapBuild.progress}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 uppercase font-medium pt-1">
                Progress is automatically calculated based on milestone completion
              </p>
            </div>

            {/* Checkbox Items */}
            <div className="space-y-2.5 pt-1">
              {activeRoadmapBuild.milestones.map((ms, milestoneIndex) => (
                <div 
                  key={ms.id}
                  onClick={() => handleToggleMilestone(ms.id)}
                  title={!ms.completed && !activeRoadmapBuild.milestones.slice(0, milestoneIndex).every(item => item.completed) ? 'Complete the previous milestone first.' : undefined}
                  className={`bg-[#f0f6fc]/80 border border-slate-200/80 rounded-xl p-3 flex items-center space-x-3 transition ${!ms.completed && !activeRoadmapBuild.milestones.slice(0, milestoneIndex).every(item => item.completed) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#f0f6fc]'}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                    ms.completed ? 'bg-[#51c440] border-[#51c440] text-white' : 'bg-white border-slate-300'
                  }`}>
                    {ms.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-bold text-slate-800 font-serif">{ms.label}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                onClick={handleSaveRoadmap}
                className="py-2.5 bg-[#0070c0] hover:bg-[#005ba1] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition border-none cursor-pointer shadow-sm"
              >
                Save Changes
              </button>
              <button 
                onClick={() => setActiveRoadmapBuild(null)}
                className="py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DESIGN CONCEPTS UPLOAD MODAL */}
      {activeConceptModalBuild && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#f0f6fc] border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold font-serif uppercase tracking-wide text-slate-700">Design Concepts</h3>
              <button onClick={() => setActiveConceptModalBuild(null)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddConcept} className="space-y-3">
              <input 
                type="text" 
                required
                value={conceptTitle}
                onChange={(e) => setConceptTitle(e.target.value)}
                placeholder="Concept Title (e.g. Living Room)" 
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0070c0] text-slate-800"
              />
              <input 
                type="text" 
                value={conceptUrl}
                onChange={(e) => setConceptUrl(e.target.value)}
                placeholder="Image URL" 
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0070c0] text-slate-800"
              />
              <textarea 
                rows={3}
                value={conceptDesc}
                onChange={(e) => setConceptDesc(e.target.value)}
                placeholder="Description and Inspiration" 
                className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#0070c0] text-slate-800 resize-none"
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  type="submit"
                  className="py-2.5 bg-[#101828] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition border-none cursor-pointer shadow-sm"
                >
                  Upload Concept
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveConceptModalBuild(null)}
                  className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. VIEW PHOTOS MODAL */}
      {activePhotosBuild && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold font-serif text-slate-900">Concept Photos - {activePhotosBuild.title}</h3>
              <button onClick={() => setActivePhotosBuild(null)} className="text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {activePhotosBuild.concepts.length > 0 ? (
                activePhotosBuild.concepts.map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-slate-800">{c.title}</p>
                    {c.description && <p className="text-slate-500 text-[11px]">{c.description}</p>}
                    <p className="text-[#0070c0] font-mono text-[10px] truncate">{c.url}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-center text-slate-400 font-serif italic py-6">No photos or concepts uploaded yet.</p>
              )}
            </div>

            <button 
              onClick={() => setActivePhotosBuild(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition border-none cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 6. SAVED SUCCESS MODAL */}
      {showSavedSuccess && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#f0f6fc] border border-slate-200 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center space-y-3 animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-[#51c440] flex items-center justify-center text-white shadow-lg">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
            <span className="text-sm font-bold font-serif text-slate-800 tracking-wider">SAVED!</span>
          </div>
        </div>
      )}

    </div>
  );
}
