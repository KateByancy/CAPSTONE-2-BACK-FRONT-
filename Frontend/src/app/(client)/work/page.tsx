"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Layers, Eye, X } from 'lucide-react';

interface PortfolioItem {
  id: number;
  title: string;
  category: string;
  image: string;
  description: string;
}

export default function Work() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  // Track the active image item for the fullscreen preview modal
  const [activePreviewItem, setActivePreviewItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const response = await fetch('/data/inspirations.json');
        if (!response.ok) throw new Error('Unable to load the inspiration portfolio.');
        setPortfolioItems(await response.json() as PortfolioItem[]);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load the inspiration portfolio.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadPortfolio();
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(portfolioItems.map((item) => item.category)))],
    [portfolioItems],
  );

  const filteredItems = selectedCategory === 'All' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === selectedCategory);

  return (
    <div className="p-4 space-y-4 animate-fadeIn">
      <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-slate-400">
        <Layers className="w-4 h-4 text-blue-500" />
        <span>OUR INSPIRATIONS</span>
      </div>
      
      {/* Category Horizontal Filter Tags */}
      <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat 
                ? 'bg-[#0070c0] text-white' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Portfolio Feed */}
      <div className="space-y-4">
        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Loading inspirations...
          </div>
        )}
        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-xs text-red-600">
            {loadError}
          </div>
        )}
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm group">
            <div className="relative block w-full h-48 bg-slate-100 overflow-hidden text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white font-bold text-[9px] tracking-widest px-2 py-0.5 rounded">
                {item.category.toUpperCase()}
              </span>
            </div>
            <div className="p-4 flex justify-between items-start gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                <p className="text-[11px] leading-relaxed text-slate-500">{item.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePreviewItem(item)}
                className="text-blue-500 hover:text-blue-600 transition p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer"
                aria-label={`Open preview for ${item.title}`}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Cinematic Lightbox Modal Sheet Container */}
      {activePreviewItem && (
        <div
          role="presentation"
          onClick={() => setActivePreviewItem(null)}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex flex-col justify-center items-center p-4 animate-in fade-in duration-200"
        >
          {/* Top Menu Actions Panel */}
          <div className="w-full max-w-4xl flex justify-between items-center mb-3 text-white">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                {activePreviewItem.category}
              </span>
              <h3 className="text-sm font-bold tracking-tight">{activePreviewItem.title}</h3>
              <p className="max-w-2xl text-xs leading-relaxed text-slate-300">{activePreviewItem.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setActivePreviewItem(null)}
              className="p-2.5 bg-white/15 hover:bg-white/25 active:scale-95 rounded-full transition text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* High-Fidelity Preview Box Wrapper */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={activePreviewItem.title}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl max-h-[75vh] rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-white/10 flex items-center justify-center animate-in zoom-in-95 duration-200"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={activePreviewItem.image} 
              alt={activePreviewItem.title} 
              className="w-full h-auto max-h-[75vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
