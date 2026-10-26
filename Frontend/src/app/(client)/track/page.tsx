"use client";
import React,{useEffect,useState} from 'react';
import Image from 'next/image';
import {imageSource} from '@/components/AdminImageUpload';
import {Compass,CheckCircle2,Circle} from 'lucide-react';
import { apiFetch,getApiUrl,getClientSession} from '@/lib/api';

type Project={id:number;title:string;progress:number;stage:string;remarks:string};
type DesignConcept={id:number;user_id:number;project_id:number;title:string;image?:string|null;description?:string|null};
const milestoneNames=['Initial Consultation','Design Proposal','Material Selection','Execution','Final Handover'];

export default function Track(){
 const [projects,setProjects]=useState<Project[]>([]);const [error,setError]=useState('');
 const [concepts,setConcepts]=useState<DesignConcept[]>([]);const [conceptError,setConceptError]=useState('');
 useEffect(()=>{
  const load=async()=>{
   const client=getClientSession();if(!client)return;
   try{
    const bookingResponse=await apiFetch(`${getApiUrl()}/booking?user_id=${client.id}`,{cache:'no-store'});
    const bookings=await bookingResponse.json();
    if(!bookingResponse.ok||!bookings.success)throw new Error('Unable to load projects.');
    const groups=await Promise.all((bookings.bookings??[]).filter((booking:{accepted_at?:string|null})=>Boolean(booking.accepted_at)).map(async(booking:{id:number})=>{
     const response=await apiFetch(`${getApiUrl()}/designs?project_id=${booking.id}`,{cache:'no-store'});
     const rows=await response.json();
     if(!response.ok||!Array.isArray(rows))throw new Error('Unable to load design concepts.');
     return rows;
    }));
    const data=groups.flat();
    setConcepts(data.filter((design:DesignConcept)=>design.user_id===client.id&&Boolean(design.image)));
    setConceptError('');
   }catch{setConceptError('Unable to refresh design concepts. Please try again shortly.')}
  };
  void load();const timer=window.setInterval(()=>void load(),10000);
  return()=>window.clearInterval(timer);
 },[]);
 useEffect(()=>{const load=async()=>{const client=getClientSession();if(!client){setError('Please sign in again to view project tracking.');return}const response=await apiFetch(`${getApiUrl()}/booking?user_id=${client.id}`);const data=await response.json();if(!response.ok||!data.success)throw new Error(data.message||'Unable to load your projects.');const accepted=(data.bookings??[]).filter((item:{accepted_at?:string|null})=>Boolean(item.accepted_at)).sort((first:{id:number},second:{id:number})=>first.id-second.id);const rows=await Promise.all(accepted.map(async(booking:{id:number;service_type:string;status:string})=>{const trackingResponse=await apiFetch(`${getApiUrl()}/tracking/${booking.id}`);const trackingData=await trackingResponse.json();const latest=trackingData.tracking?.[0];return{id:booking.id,title:booking.service_type,progress:Math.max(0,Math.min(100,Number(latest?.progress)||0)),stage:latest?.current_stage||booking.status||'Pending',remarks:latest?.remarks||''}}));setProjects(rows.filter(project=>project.progress<100))};void load().catch(e=>setError(e instanceof Error?e.message:'Unable to load progress tracking.'));const timer=window.setInterval(()=>void load().catch(()=>undefined),10000);return()=>window.clearInterval(timer)},[]);
 return <div className="p-4 space-y-4 animate-fadeIn"><div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-stone-400"><Compass className="w-4 h-4 text-brand-500"/><span>LIVE PROJECT TIMELINE</span></div>{error&&<p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}{!projects.length&&!error&&<div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-xs text-stone-400">No accepted projects are available for progress tracking yet.</div>}
 {projects.map(project=>{const milestones=milestoneNames.map((name,index)=>{const threshold=(index+1)*20;const status=project.progress>=threshold?'completed':project.progress>=index*20?'active':'upcoming';return{name,status,desc:status==='active'?(project.remarks||project.stage):status==='completed'?'Completed by the project team':'Waiting for the previous stage'}});const projectConcepts=concepts.filter(concept=>concept.project_id===project.id);return <section key={project.id} className="space-y-4">
  <div className="bg-marc-charcoal text-white rounded-2xl p-5 shadow-xl"><span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">{project.stage} · Project #{project.id}</span><h3 className="text-sm font-semibold tracking-wide text-white mb-4">{project.title}</h3><div className="flex items-baseline space-x-2"><span className="text-4xl font-black text-brand-400">{project.progress}%</span><span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Completed</span></div><div className="w-full bg-stone-700 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-marc-charcoal h-full rounded-full transition-all duration-500" style={{width:`${project.progress}%`}}/></div></div>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
    <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm"><h4 className="text-xs font-black tracking-widest uppercase text-stone-800 mb-6">Build Roadmap</h4><div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-100">{milestones.map((step)=><div key={step.name} className="flex items-start space-x-4 relative z-10">{step.status==='completed'?<CheckCircle2 className="w-6 h-6 text-brand-500 bg-white rounded-full"/>:<Circle className={`w-6 h-6 bg-white rounded-full ${step.status==='active'?'text-brand-600 stroke-[3] animate-pulse':'text-stone-200'}`}/>}<div className="min-w-0 space-y-0.5 break-words"><p className={`text-xs font-bold ${step.status==='completed'?'text-stone-500 line-through':'text-stone-800'}`}>{step.name}</p><p className="text-[10px] text-stone-400 leading-relaxed">{step.desc}</p>{step.status==='active'&&<span className="inline-block mt-1 bg-brand-50 text-brand-600 text-[8px] font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase">In Progress</span>}</div></div>)}</div></div>
    <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
      <h4 className="text-xs font-black tracking-widest uppercase text-stone-800 mb-6">Project Update Photos</h4>
      {conceptError&&<p role="status" className="mb-4 text-xs text-red-700">{conceptError}</p>}
      {projectConcepts.length?<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{projectConcepts.map(concept=><figure key={concept.id} className="min-w-0 space-y-2">
        <Image src={imageSource(concept.image!)} alt={concept.title} width={640} height={360} unoptimized className="w-full h-auto rounded-xl object-contain"/>
        <figcaption className="space-y-1 break-words"><p className="text-xs font-bold text-stone-800">{concept.title}</p>{concept.description&&<p className="text-xs text-stone-500 leading-relaxed">{concept.description}</p>}</figcaption>
      </figure>)}</div>:!conceptError&&<p className="text-xs text-stone-400">No project updates available yet.</p>}
    </div>
  </div>
 </section>})}</div>
}
