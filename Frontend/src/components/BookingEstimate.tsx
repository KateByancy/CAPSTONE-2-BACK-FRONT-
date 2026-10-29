export interface EstimateSnapshot { area: number; unit: string; service: string; style: string; complexity: string; min: number; max: number }

export default function BookingEstimate({ estimate }: { estimate?: EstimateSnapshot | string | null }) {
  if (!estimate) return null;
  let value: EstimateSnapshot;
  try { value = typeof estimate === 'string' ? JSON.parse(estimate) : estimate; } catch { return null; }
  if (!value || !Number.isFinite(value.min) || !Number.isFinite(value.max)) return null;
  return (
    <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50/90 to-amber-50/70 p-4 text-stone-900 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-100 pb-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-700">Estimated Project Range</span>
          <p className="text-xl sm:text-2xl font-black font-mono text-brand-900 tracking-tight mt-0.5">
            <span className="sr-only">Estimated range: PHP {value.min.toLocaleString()} - {value.max.toLocaleString()}</span>
            ₱{value.min.toLocaleString()} – ₱{value.max.toLocaleString()}
          </p>
        </div>
        <span className="self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-stone-700 border border-stone-200 shadow-2xs">
          Preliminary
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-700">
        <span className="font-semibold px-2 py-0.5 rounded-md bg-white border border-stone-200">{value.area} {value.unit}</span>
        {value.service && <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200">{value.service}</span>}
        {value.style && <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200">{value.style}</span>}
        {value.complexity && <span className="px-2 py-0.5 rounded-md bg-white border border-stone-200">{value.complexity}</span>}
      </div>
      <p className="mt-2.5 text-[11px] text-stone-500 leading-relaxed">
        Preliminary estimate based on initial parameters. Final quotation is confirmed after on-site measurement and materials consultation.
      </p>
    </div>
  );
}
