"use client";
import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import rates from '@/lib/customizationRates.json';
import { useDesignCatalog, designPrice } from '@/lib/use-design-catalog';
const stages = ['Styles', 'Materials', 'Furnishing', 'Layout', 'Decor', 'Final review'];
const choices = [
 ['Modern', 'Contemporary', 'Minimalist', 'Classic'],
 ['Warm wood and stone', 'Marble-inspired finishes', 'Natural textures', 'Discuss with designer'],
 ['Retain existing furniture', 'Mix existing and new furniture', 'New furniture throughout'],
 ['Keep the current layout', 'Improve storage and circulation', 'Explore a new layout'],
 ['Warm neutral accents', 'Soft natural accents', 'Bold statement accents', 'Designer recommendations']
];
export default function DesignCustomizer({ initialDesignId, onBack, onComplete }: { initialDesignId: string; onBack: () => void; onComplete: (id: string, requirements: string, customization: Record<string,string>) => void }) {
 const {designs, loading, error} = useDesignCatalog();
 const [step, setStep] = useState(0);
 const [designId, setDesignId] = useState(initialDesignId || '');
 const [selections, setSelections] = useState<string[]>(Array(5).fill(''));
 const [notes, setNotes] = useState('');
 const design = designs.find(item => item.id === designId) || designs[0];
 const complete = selections.every(Boolean);
 const customization = Object.fromEntries(stages.slice(0,5).map((label,index)=>[label,selections[index]]));
 const adjustment = Object.entries(rates).reduce((sum,[category,options])=>sum+(options[customization[category] as keyof typeof options] || 0),0);
 const total = design?.price == null ? null : Math.round(design.price*(1+adjustment/100)*100)/100;
 if (!design) return <section><button type="button" onClick={onBack}>Back to designs</button><p role="status">{loading?'Loading designs...':error || 'No designs are currently available.'}</p></section>;
 return <section className="marc-customizer">
  <button type="button" className="marc-custom-back" onClick={onBack}><ArrowLeft size={16}/> Back to designs</button>
  <h2>Customize your design</h2><p className="marc-custom-subtitle">Make your interior inspiration your own.</p>
  <div className="marc-custom-layout"><div>
   <nav className="marc-custom-steps" aria-label="Customization steps">{stages.map((label,index)=><button type="button" key={label} aria-current={step===index?'step':undefined} disabled={index>step && selections.slice(0,index).some(value=>!value)} onClick={()=>setStep(index)}><span>{index<step?<Check size={15}/>:index+1}</span>{label}</button>)}</nav>
   <section className="marc-custom-options"><p className="marc-custom-eyebrow">STEP {step+1} OF 6</p><h3>{step===5?'Review your interior preferences': 'Choose your '+stages[step].toLowerCase()}</h3>
   {step===0 && <label className="marc-custom-design">Design inspiration<select value={design.id} onChange={event=>setDesignId(event.target.value)}>{designs.map(item=><option key={item.id} value={item.id}>{item.name} ? {item.category}</option>)}</select></label>}
   {step<5 ? <div className="marc-custom-choice-grid">{choices[step].map(value=><button type="button" key={value} aria-pressed={selections[step]===value} onClick={()=>setSelections(previous=>previous.map((item,index)=>index===step?value:item))}><span>{value}<small className="block mt-2 text-xs text-brand-700">+{(rates[stages[step] as keyof typeof rates] as Record<string,number>)[value]}% of base price</small></span>{selections[step]===value && <Check size={18}/>}</button>)}</div> : <><dl className="marc-custom-review">{stages.slice(0,5).map((label,index)=><div key={label}><dt>{label}</dt><dd>{selections[index]} <button type="button" onClick={()=>setStep(index)}>Edit</button></dd></div>)}</dl><label className="marc-custom-design">Additional requirements (optional)<textarea maxLength={3000} rows={3} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Tell us about your space, budget preferences, or specific needs."/></label><p className="marc-custom-disclaimer">These are consultation preferences. Materials, furnishings, feasibility, and pricing will be confirmed with the designer.</p></>}
   <div className="marc-custom-controls"><button type="button" onClick={()=>step===0?onBack():setStep(step-1)}><ArrowLeft size={16}/> {step===0?'Cancel':'Previous'}</button><button type="button" disabled={step===5?!complete:!selections[step]} onClick={()=>step<5?setStep(step+1):onComplete(design.id, 'Customization preferences:\n'+stages.slice(0,5).map((label,index)=>label+': '+selections[index]).join('\n')+(notes.trim()?'\nAdditional requirements: '+notes.trim():''),customization)}>{step===5?'Continue to booking':'Next'}<ArrowRight size={16}/></button></div>
   </section>
  </div><aside className="marc-custom-summary"><div className="marc-custom-summary-heading">YOUR INTERIOR INSPIRATION</div><div className="marc-custom-photo"><Image src={design.image} alt={design.name} unoptimized fill sizes="(max-width:850px) 90vw, 320px"/></div><div className="marc-custom-summary-copy"><span>{design.category}</span><h3>{design.name}</h3><p>{designPrice(design.price)}</p><p>{design.description}</p><hr/><h4>Preliminary estimate</h4><p>Base: {designPrice(design.price)}</p><p>Customization: +{adjustment}%</p><p className="font-bold text-brand-800">{designPrice(total).replace("From ","")}</p><p className="marc-custom-disclaimer">Sample pricing. Adjustments are added as percentages of the base price. Final quotation follows site assessment.</p><h4>Your selections</h4>{selections.some(Boolean)?<ul>{selections.map((value,index)=>value && <li key={stages[index]}><span>{stages[index]}</span>{value}</li>)}</ul>:<p>Choose your preferences to start shaping your space.</p>}<p className="marc-custom-disclaimer">Reference image. Your selections guide the consultation; this preview does not render changes.</p></div></aside></div>
 </section>;
}
