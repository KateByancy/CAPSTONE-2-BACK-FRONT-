"use client";
import React, { useState } from 'react';
import Image from 'next/image';
import { Home, LayoutGrid, Calendar, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';

interface LandingProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
  onNavigateToDashboard: (tab?: string) => void;
}

export default function Landing({ onNavigateToLogin, onNavigateToRegister, onNavigateToDashboard }: LandingProps) {
  // Gallery Slider State Data
  const galleryImages = [
    { src: '/1.jpg', alt: 'MARC interior showcase project 1' },
    { src: '/3.jpg', alt: 'MARC interior showcase project 2' },
    { src: '/4.jpg', alt: 'MARC interior showcase project 3' },
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % galleryImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-[#005c9e] via-[#004b84] to-[#0a192f] text-white font-sans flex justify-center">
      
      {/* MASTER RESPONSIVE CONTAINER */}
      <div className="w-full max-w-md md:max-w-4xl bg-gradient-to-b from-[#0070c0] to-[#051329] min-h-screen flex flex-col justify-between shadow-2xl relative overflow-x-hidden">
        
        <div>
          {/* 1. TOP HERO AREA WITH BACKGROUND IMAGE CONTAINER */}
          <div 
            className="w-full h-56 bg-cover bg-center relative flex flex-col items-center justify-end p-4"
            style={{ 
              backgroundImage: 'linear-gradient(135deg, #0b4f86 0%, #0070c0 52%, #051329 100%)'
            }}
          >
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs pb-2">
              <button 
                onClick={onNavigateToLogin}
                className="bg-[#0056b3] hover:bg-[#004494] text-white text-[10px] font-bold tracking-widest py-2 rounded-lg border border-blue-400/20 shadow transition uppercase cursor-pointer"
              >
                Consult
              </button>
              <button 
                onClick={onNavigateToLogin}
                className="bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold tracking-widest py-2 rounded-lg shadow transition uppercase cursor-pointer"
              >
                Gallery
              </button>
            </div>
          </div>

          {/* 2. THE MARC SIGNATURE INTRO */}
          <div className="px-6 py-8 text-center space-y-4 flex flex-col items-center">
            <div className="w-12 h-12 bg-white text-[#0070c0] rounded-full flex items-center justify-center shadow-lg">
              <Home className="w-5 h-5 stroke-[2]" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-base font-serif italic font-bold tracking-wide text-white">
                The Marc Signature
              </h2>
              <p className="text-[11px] text-blue-100/80 leading-relaxed font-light max-w-xs mx-auto">
                Where binary precision meets artistic intuition. We believe every corner should tell a story of intentionality, balance, and quiet luxury.
              </p>
            </div>
          </div>

          {/* 3. CURATED WORKS / VISUAL GALLERY SLIDER */}
          <div className="px-6 py-2 space-y-3">
            <div className="space-y-0.5">
              <p className="text-[9px] tracking-widest font-black text-blue-300 uppercase">Curated Works</p>
              <h3 className="text-lg font-serif font-bold text-white tracking-wide">Visual</h3>
            </div>

            <div className="relative w-full h-44 bg-slate-800 rounded-2xl overflow-hidden shadow-xl border border-white/10 group">
              <Image
                key={galleryImages[currentSlide].src}
                src={galleryImages[currentSlide].src}
                alt={galleryImages[currentSlide].alt}
                fill
                priority={currentSlide === 0}
                sizes="(min-width: 768px) 848px, calc(100vw - 48px)"
                className="object-cover transition-opacity duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />

              <div className="absolute bottom-3 left-3 z-20 rounded-md bg-slate-950/55 px-2 py-1 text-[9px] font-bold tracking-widest text-white backdrop-blur-sm">
                {currentSlide + 1} / {galleryImages.length}
              </div>
              
              <div className="absolute bottom-3 right-3 flex space-x-1.5 z-20">
                <button 
                  type="button"
                  onClick={prevSlide}
                  aria-label="Show previous interior image"
                  className="p-1 bg-white hover:bg-slate-100 active:bg-blue-600 text-slate-800 active:text-white rounded-md transition shadow-md flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button 
                  type="button"
                  onClick={nextSlide}
                  aria-label="Show next interior image"
                  className="p-1 bg-white hover:bg-slate-100 active:bg-blue-600 text-slate-800 active:text-white rounded-md transition shadow-md flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>

            <p className="text-center text-[9px] tracking-widest font-black text-blue-200/70 uppercase pt-1">
              Service Excellence
            </p>
          </div>

          {/* 4. SERVICE MATRIX GRID */}
          <div className="px-6 py-4 grid grid-cols-2 gap-4">
            <div 
              onClick={onNavigateToLogin}
              className="bg-white/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-md group hover:bg-white transition cursor-pointer"
            >
              <div className="p-2 bg-blue-50 text-[#0070c0] rounded-xl border border-blue-100">
                <Home className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-slate-700 uppercase">Residential</span>
            </div>

            <div 
              onClick={onNavigateToLogin}
              className="bg-white/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-md group hover:bg-white transition cursor-pointer"
            >
              <div className="p-2 bg-blue-50 text-[#0070c0] rounded-xl border border-blue-100">
                <LayoutGrid className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-slate-700 uppercase">Commercial</span>
            </div>

            <div 
              onClick={onNavigateToLogin} 
              className="bg-white/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-md group hover:bg-white transition cursor-pointer"
            >
              <div className="p-2 bg-blue-50 text-[#0070c0] rounded-xl border border-blue-100">
                <Calendar className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-slate-700 uppercase">Book</span>
            </div>

            <div 
              onClick={onNavigateToLogin} 
              className="bg-white/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 shadow-md group hover:bg-white transition cursor-pointer"
            >
              <div className="p-2 bg-blue-50 text-[#0070c0] rounded-xl border border-blue-100">
                <MessageSquare className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="text-[9px] font-black tracking-widest text-slate-700 uppercase">Contact</span>
            </div>
          </div>

          {/* 5. FOOTER WORKSPACE TRIGGER BUTTON */}
          <div className="px-6 py-4">
            <button 
              onClick={onNavigateToLogin}
              className="w-full bg-[#101935] hover:bg-[#162249] text-blue-300 font-serif font-black tracking-widest text-xs py-4 rounded-2xl border border-blue-900/40 transition shadow-xl uppercase flex flex-col items-center space-y-0.5 justify-center cursor-pointer"
            >
              <span className="text-white tracking-widest text-[11px]">READY TO BEGIN?</span>
              <span className="text-[9px] text-blue-400 font-sans font-bold uppercase">Launch Client Workspace</span>
            </button>
          </div>
        </div>

        {/* 6. SOCIAL MEDIAS AND SYSTEM COPYRIGHTS */}
        <div className="w-full p-6 text-center space-y-4 border-t border-blue-900/20 bg-[#051021]/30">
          <div className="flex justify-center items-center space-x-6 text-blue-200/70">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center justify-center" aria-label="Instagram">
              <svg className="w-4 h-4 stroke-current fill-none stroke-[2]" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center justify-center" aria-label="Twitter / X">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition flex items-center justify-center" aria-label="Facebook">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
          </div>

          <p className="text-[8px] tracking-[0.15em] text-blue-200/40 uppercase font-semibold">
            © 2026 MARC CUSTOM DESIGNS - EST 2013
          </p>
        </div>

      </div>
    </div>
  );
}
