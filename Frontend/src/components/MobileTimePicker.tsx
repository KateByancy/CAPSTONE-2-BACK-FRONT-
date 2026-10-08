"use client";

import { useId, useState } from 'react';
import { Clock, X } from 'lucide-react';

export default function MobileTimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const cardId = useId();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');
  const [hours, minutes] = value.split(':');
  const display = value ? `${Number(hours) % 12 || 12}:${minutes} ${Number(hours) >= 12 ? 'PM' : 'AM'}` : 'Select time';

  function toggle() {
    if (!open) {
      setHour(value ? String(Number(hours) % 12 || 12) : '9');
      setMinute(value ? minutes : '00');
      setPeriod(value && Number(hours) >= 12 ? 'PM' : 'AM');
    }
    setOpen(!open);
  }

  return <div className="space-y-2">
    <button type="button" aria-label={`Preferred start time: ${display}`} aria-expanded={open} aria-controls={cardId} onClick={toggle} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-700 bg-[#121620] px-3 py-2.5 text-left text-xs font-medium text-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500">
      <span>{display}</span><Clock size={16} className="shrink-0" />
    </button>
    {open && <div id={cardId} role="group" aria-label="Choose preferred start time" className="space-y-3 rounded-xl border border-slate-600 bg-slate-800 p-3 shadow-lg">
      <div className="flex items-center justify-between gap-1"><span className="text-[11px] font-bold text-slate-200">Choose time</span><button type="button" aria-label="Close time picker" onClick={() => setOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-700"><X size={14} /></button></div>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-[10px] text-slate-300">Hour<select value={hour} onChange={event => setHour(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-1 text-xs text-white">{Array.from({ length: 12 }, (_, index) => String(index + 1)).map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="min-w-0 text-[10px] text-slate-300">Minute<select value={minute} onChange={event => setMinute(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 px-1 text-xs text-white">{Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0')).map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="grid grid-cols-2 gap-2">{['AM', 'PM'].map(item => <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)} className={`min-h-11 rounded-lg border text-xs font-bold ${period === item ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-600 text-slate-300'}`}>{item}</button>)}</div>
      <button type="button" onClick={() => {
        const selectedHour = Number(hour) % 12 + (period === 'PM' ? 12 : 0);
        onChange(`${String(selectedHour).padStart(2, '0')}:${minute}`);
        setOpen(false);
      }} className="min-h-11 w-full rounded-lg bg-blue-600 px-2 text-xs font-bold text-white hover:bg-blue-500">Set time</button>
    </div>}
  </div>;
}
