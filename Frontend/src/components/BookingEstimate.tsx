export interface EstimateSnapshot { area: number; unit: string; service: string; style: string; complexity: string; min: number; max: number }

export default function BookingEstimate({ estimate }: { estimate?: EstimateSnapshot | string | null }) {
  if (!estimate) return null;
  let value: EstimateSnapshot;
  try { value = typeof estimate === 'string' ? JSON.parse(estimate) : estimate; } catch { return null; }
  if (!value || !Number.isFinite(value.min) || !Number.isFinite(value.max)) return null;
  return <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
    <p className="font-bold">Estimated range: PHP {value.min.toLocaleString()} - {value.max.toLocaleString()}</p>
    <p>{value.area} {value.unit} | {value.service} | {value.style} | {value.complexity}</p>
    <p className="text-xs mt-1">Preliminary estimate, subject to site assessment.</p>
  </div>;
}
