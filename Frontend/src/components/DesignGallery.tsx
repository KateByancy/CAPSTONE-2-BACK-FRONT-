"use client";
import { useRef, useState } from 'react';
import Image from 'next/image';
import { X, Check, Mail, ArrowRight, Ruler, Layers, Palette, SlidersHorizontal, BriefcaseBusiness } from 'lucide-react';
import { useDesignCatalog, designPrice, type CatalogDesign } from '@/lib/use-design-catalog';
export type MarcDesign = CatalogDesign;
// Shared design images for the landing page, dashboard, and details dialog.

const interiorHighlights: Record<string, string[]> = {
  'Living Room': ['A coordinated seating and furniture arrangement', 'A neutral palette with layered textures', 'A layout shaped around comfort and everyday use'],
  Kitchen: ['Integrated cabinetry and practical storage', 'Coordinated work surfaces and finishes', 'A functional cooking and preparation layout'],
  'Bed Room': ['Layered textiles for a restful interior', 'Bedside lighting and coordinated storage', 'A comfortable layout for sleeping and relaxing'],
  Office: ['An organized workstation and storage layout', 'A calm palette for a focused environment', 'A balance of natural light and interior finishes'],
};

export default function DesignGallery({ compact = false, onChoose, onCustomize }: { compact?: boolean; onChoose: (design: MarcDesign) => void; onCustomize?: (design: MarcDesign) => void }) {
  const {designs: marcDesigns, error, loading} = useDesignCatalog();
  const [category, setCategory] = useState('All Designs');
  const [selected, setSelected] = useState<MarcDesign | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const openDetails = (design: MarcDesign) => {
    setSelected(design);
    dialog.current?.showModal();
  };
  const previewDialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<MarcDesign | null>(null);
  const openPreview = (design: MarcDesign) => {
    setPreview(design);
    previewDialog.current?.showModal();
  };
  const available = marcDesigns;
  const filtered = available.filter(item => category === 'All Designs' || item.category === category);
  return <div className={`marc-gallery ${compact ? 'marc-gallery-compact' : ''}`}>
    {error && <p role="alert">{error}</p>}{loading && <p role="status">Loading designs...</p>}
    {compact && <div className="marc-filters" aria-label="Filter designs">{['All Designs', 'Kitchen', 'Office', 'Living Room', 'Bed Room'].map(value => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>}
    <div className="marc-design-grid">{filtered.map(item => <article className="marc-design-card" key={item.id}>
      <button type="button" className="marc-design-image marc-image-trigger" aria-label={`Expand image: ${item.name}`} aria-haspopup="dialog" onClick={() => openPreview(item)}><Image src={item.image} alt={item.name} unoptimized fill sizes="(max-width: 600px) 90vw, 33vw" /><span className="marc-image-hint" aria-hidden="true">View image</span></button><h3>{item.name}</h3><p className="marc-design-price">{designPrice(item.price)}</p><p className="marc-card-description">{item.description.length > 110 ? item.description.slice(0,107).replace(/\s+\S*$/, '') + '...' : item.description}</p>
      <div className="marc-card-actions"><button type="button" className="marc-detail-button" onClick={() => openDetails(item)}>View Details<span className="sr-only">: {item.name}</span></button>{onCustomize && <button type="button" className="marc-card-customize" onClick={()=>onCustomize(item)}>Customize<span className="sr-only">: {item.name}</span></button>}</div>
    </article>)}</div>
    {filtered.length === 0 && <p className="marc-empty" role="status">No designs are available in this category yet. <button type="button" onClick={() => setCategory('All Designs')}>Browse all designs</button></p>}
    <dialog ref={dialog} className="marc-design-dialog marc-interior-details" aria-label="Design details" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {selected && <>
        <form method="dialog" className="marc-details-close-form"><button className="marc-dialog-close" aria-label="Close design details"><X size={22} /></button></form>
        <div className="marc-interior-top">
          <div className="marc-interior-visual"><button type="button" className="marc-dialog-image marc-image-trigger" aria-label={`Expand image: ${selected.name}`} aria-haspopup="dialog" onClick={() => openPreview(selected)}><Image src={selected.image} alt={selected.name} unoptimized fill sizes="(max-width: 760px) 95vw, 480px" /><span className="marc-image-hint" aria-hidden="true">View full image</span></button><p>Design inspiration. Final layouts and finishes are tailored to your space.</p></div>
          <div className="marc-interior-summary">
            <p className="marc-interior-eyebrow">INTERIOR DESIGN</p>
            <h2>{selected.name}</h2>
            <p className="marc-interior-subtitle">{selected.description}</p>
            <p className="marc-interior-overview">Explore this {selected.category.toLowerCase()} concept with our team. We will discuss your existing space, preferred finishes, storage needs, and budget before preparing a project proposal.</p>
            <div className="marc-interior-enquiry">
              <div><span>Project quotation</span><h3>{designPrice(selected.price)}</h3><p>Sample starting price. Final quotation follows consultation and site assessment.</p></div>
              <div className="marc-interior-actions"><button type="button" className="marc-interior-enquire" onClick={() => { dialog.current?.close(); onChoose(selected); }}><Mail size={19} />Enquire Now<ArrowRight size={18} /></button></div>
            </div>
          </div>
        </div>
        <div className="marc-interior-information">
          <section className="marc-interior-features" aria-labelledby="marc-features-title"><h3 id="marc-features-title">Key Features</h3><ul>{(selected.features?.length ? selected.features : interiorHighlights[selected.category] || []).map(feature => <li key={feature}><Check size={17} aria-hidden="true" /><span>{feature}</span></li>)}</ul><p>Design highlights shown for inspiration. Final inclusions are agreed during consultation.</p></section>
          <section className="marc-interior-specs" aria-labelledby="marc-specifications-title"><h3 id="marc-specifications-title">Specifications</h3><dl>
            <div><Layers aria-hidden="true" /><dt>Interior space</dt><dd>{selected.category}</dd></div>
            <div><Ruler aria-hidden="true" /><dt>Floor area</dt><dd>Confirmed after site measurement</dd></div>
            <div><Palette aria-hidden="true" /><dt>Materials &amp; finishes</dt><dd>Selected during consultation</dd></div>
            <div><SlidersHorizontal aria-hidden="true" /><dt>Project scope</dt><dd>Customized to your requirements</dd></div>
            <div><BriefcaseBusiness aria-hidden="true" /><dt>Service</dt><dd>Interior design consultation</dd></div>
          </dl></section>
        </div>
      </>}
    </dialog>
    <dialog ref={previewDialog} className="marc-image-preview" aria-label={preview ? preview.name + ' image preview' : 'Design image preview'} onClose={() => { if (!previewDialog.current?.open) setPreview(null); }} onClick={event => { if (event.target === event.currentTarget) previewDialog.current?.close(); }}>
      {preview && <div className="marc-image-preview-content">
        <form method="dialog"><button className="marc-preview-close" aria-label="Close image preview" autoFocus><X size={24} /></button></form>
        <div className="marc-image-preview-photo"><Image src={preview.image} alt={preview.name} unoptimized fill sizes="(max-width: 1200px) 95vw, 1200px" className="marc-preview-photo" /></div>
        <p className="marc-preview-caption">{preview.name}</p>
      </div>}
    </dialog>
  </div>;
}
