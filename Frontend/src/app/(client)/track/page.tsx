// src/components/Track.tsx
"use client";
import React from 'react';
import { Compass, CheckCircle2, Circle } from 'lucide-react';

export default function Track() {
  const milestones = [
    { name: 'Initial Consultation', status: 'completed', desc: 'Design requirements finalized' },
    { name: 'Design Proposal Rendering', status: 'completed', desc: '3D modeling approved by client' },
    { name: 'Material & Canvas Selection', status: 'active', desc: 'Sourcing upholstery and framing fabrics' },
    { name: 'Site Execution & Build', status: 'upcoming', desc: 'Physical assembly and styling installations' },
    { name: 'Final Turnover Inspection', status: 'upcoming', desc: 'Quality audit and client walkthrough' },
  ];

  return (
    <div className="p-4 space-y-4 animate-fadeIn">
      <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-slate-400">
        <Compass className="w-4 h-4 text-blue-500" />
        <span>LIVE PROJECT TIMELINE</span>
      </div>

      {/* Hero Percentage Block */}
      <div className="bg-[#1a2138] text-white rounded-2xl p-5 shadow-xl">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Active Status</span>
        <h3 className="text-sm font-semibold tracking-wide text-white mb-4">Residential Living Suite</h3>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-4xl font-black text-blue-400">40%</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed</span>
        </div>

        <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
          <div className="bg-[#0070c0] h-full w-[40%] rounded-full transition-all duration-500" />
        </div>
      </div>

      {/* Build Roadmap Stepper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h4 className="text-xs font-black tracking-widest uppercase text-slate-800 mb-6">Build Roadmap</h4>
        
        <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
          {milestones.map((step, idx) => (
            <div key={idx} className="flex items-start space-x-4 relative z-10">
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-6 h-6 text-blue-500 bg-white rounded-full" />
              ) : step.status === 'active' ? (
                <Circle className="w-6 h-6 text-[#0070c0] stroke-[3] bg-white rounded-full animate-pulse" />
              ) : (
                <Circle className="w-6 h-6 text-slate-200 bg-white rounded-full" />
              )}
              
              <div className="space-y-0.5">
                <p className={`text-xs font-bold ${step.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {step.name}
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">{step.desc}</p>
                {step.status === 'active' && (
                  <span className="inline-block mt-1 bg-blue-50 text-blue-600 text-[8px] font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase">
                    In Progress
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}