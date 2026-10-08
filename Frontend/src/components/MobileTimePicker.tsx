"use client";

import { useId, useState } from 'react';

export default function MobileTimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const cardId = useId();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState(() => {
    if (!value) return '';
    const [hour, minute] = value.split(':');
    return `${String(Number(hour) % 12 || 12).padStart(2, '0')}:${minute}`;
  });
  const [period, setPeriod] = useState(() => value && Number(value.split(':')[0]) >= 12 ? 'PM' : 'AM');

  function updateTime(text: string, selectedPeriod: string) {
    if (!/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(text)) {
      onChange('');
      return;
    }
    const [hour, minute] = text.split(':');
    const hours = Number(hour) % 12 + (selectedPeriod === 'PM' ? 12 : 0);
    onChange(`${String(hours).padStart(2, '0')}:${minute}`);
  }

  return <div className="space-y-2">
    <div className="relative">
      <input type="text" required maxLength={5} pattern="(0?[1-9]|1[0-2]):[0-5][0-9]" placeholder="hh:mm" aria-label="Preferred start time, hours and minutes" title="Enter a time such as 09:30 and choose AM or PM" value={time} onChange={event => {
        setTime(event.target.value);
        updateTime(event.target.value, period);
      }} onBlur={() => {
        if (/^(0?[1-9]|1[0-2]):[0-5][0-9]$/.test(time)) setTime(time.padStart(5, '0'));
      }} className="min-h-11 w-full rounded-xl border border-slate-700 bg-[#121620] py-2.5 pl-3 pr-14 text-xs font-medium text-slate-200 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="button" aria-label={`Choose AM or PM, currently ${period}`} aria-expanded={open} aria-controls={cardId} onClick={() => setOpen(!open)} className="absolute inset-y-0 right-1 flex min-w-11 items-center justify-center rounded-lg text-xs font-bold text-blue-300 hover:bg-slate-800">{period}</button>
    </div>
    {open && <div id={cardId} role="group" aria-label="Choose AM or PM" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-600 bg-slate-800 p-1 shadow-lg">
      {['AM', 'PM'].map(item => <button type="button" key={item} aria-pressed={period === item} onClick={() => {
        setPeriod(item);
        updateTime(time, item);
        setOpen(false);
      }} className={`min-h-11 rounded-lg text-xs font-bold ${period === item ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{item}</button>)}
    </div>}
  </div>;
}
