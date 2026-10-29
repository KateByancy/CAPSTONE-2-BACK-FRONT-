"use client";
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Check, Mail, ArrowRight, Ruler, Layers, Palette, SlidersHorizontal, BriefcaseBusiness, Star, ShieldCheck } from 'lucide-react';
import { useDesignCatalog, designPrice, type CatalogDesign } from '@/lib/use-design-catalog';
import { apiFetch, getApiUrl } from '@/lib/api';
export type MarcDesign = CatalogDesign;

interface ReviewItem {
  id: number;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
  service_type?: string;
}

const interiorHighlights: Record<string, string[]> = {
  'Living Room': ['A coordinated seating and furniture arrangement', 'A neutral palette with layered textures', 'A layout shaped around comfort and everyday use'],
  Kitchen: ['Integrated cabinetry and practical storage', 'Coordinated work surfaces and finishes', 'A functional cooking and preparation layout'],
  'Bed Room': ['Layered textiles for a restful interior', 'Bedside lighting and coordinated storage', 'A comfortable layout for sleeping and relaxing'],
  Bedroom: ['Layered textiles for a restful interior', 'Bedside lighting and coordinated storage', 'A comfortable layout for sleeping and relaxing'],
  Office: ['An organized workstation and storage layout', 'A calm palette for a focused environment', 'A balance of natural light and interior finishes'],
};

export default function DesignGallery({ compact = false, onChoose, onCustomize }: { compact?: boolean; onChoose: (design: MarcDesign) => void; onCustomize?: (design: MarcDesign) => void }) {
  const { designs: marcDesigns, error, loading } = useDesignCatalog();
  const [category, setCategory] = useState('All Designs');
  const [selected, setSelected] = useState<MarcDesign | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsAverage, setReviewsAverage] = useState(5.0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);

  const fetchReviews = async (design: MarcDesign) => {
    setReviewsLoading(true);
    try {
      const response = await apiFetch(`${getApiUrl()}/reviews?design_id=${encodeURIComponent(design.id)}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setReviews(data.reviews || []);
        setReviewsAverage(Number(data.average) || 5.0);
        setReviewsCount(Number(data.count) || 0);
      }
    } catch {
      // ignore
    } finally {
      setReviewsLoading(false);
    }
  };

  const openDetails = (design: MarcDesign) => {
    setSelected(design);
    void fetchReviews(design);
    dialog.current?.showModal();
  };

  // Real-time updates while dialog is open or when new rating is submitted
  useEffect(() => {
    if (!selected) return;
    const handleRatingUpdate = () => void fetchReviews(selected);
    window.addEventListener('ratings-updated', handleRatingUpdate);
    const interval = setInterval(() => {
      if (dialog.current?.open) void fetchReviews(selected);
    }, 8000);
    return () => {
      window.removeEventListener('ratings-updated', handleRatingUpdate);
      clearInterval(interval);
    };
  }, [selected]);

  const previewDialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<MarcDesign | null>(null);
  const openPreview = (design: MarcDesign) => {
    setPreview(design);
    previewDialog.current?.showModal();
  };

  const available = marcDesigns;
  const isCategoryMatch = (itemCategory: string, cat: string) => {
    if (cat === 'All Designs') return true;
    if (itemCategory === cat) return true;
    if (cat === 'Bedroom' && (itemCategory === 'Bed Room' || itemCategory === 'Bedroom')) return true;
    if (cat === 'Bed Room' && (itemCategory === 'Bedroom' || itemCategory === 'Bed Room')) return true;
    return false;
  };
  const filtered = available.filter(item => isCategoryMatch(item.category, category));

  return (
    <div className={`marc-gallery ${compact ? 'marc-gallery-compact' : ''}`}>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading designs...</p>}
      {compact && (
        <div className="marc-filters" aria-label="Filter designs">
          {['All Designs', 'Kitchen', 'Office', 'Living Room', 'Bedroom'].map(value => (
            <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>
              {value}
            </button>
          ))}
        </div>
      )}
      <div className="marc-design-grid">
        {filtered.map(item => (
          <article className="marc-design-card" key={item.id}>
            <button
              type="button"
              className="marc-design-image marc-image-trigger"
              aria-label={`Expand image: ${item.name}`}
              aria-haspopup="dialog"
              onClick={() => openPreview(item)}
            >
              <Image src={item.image} alt={item.name} unoptimized fill sizes="(max-width: 600px) 90vw, 33vw" />
              <span className="marc-image-hint" aria-hidden="true">View image</span>
            </button>
            <h3>{item.name}</h3>
            <p className="marc-design-price">{designPrice(item.price)}</p>
            <p className="marc-card-description">
              {item.description.length > 110 ? item.description.slice(0, 107).replace(/\s+\S*$/, '') + '...' : item.description}
            </p>
            <div className="marc-card-actions">
              <button type="button" className="marc-detail-button" onClick={() => openDetails(item)}>
                View Details<span className="sr-only">: {item.name}</span>
              </button>
              {onCustomize && (
                <button type="button" className="marc-card-customize" onClick={() => onCustomize(item)}>
                  Customize<span className="sr-only">: {item.name}</span>
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="marc-empty" role="status">
          No designs are available in this category yet.{' '}
          <button type="button" onClick={() => setCategory('All Designs')}>
            Browse all designs
          </button>
        </p>
      )}

      {/* VIEW DETAILS DIALOG */}
      <dialog
        ref={dialog}
        className="marc-design-dialog marc-interior-details"
        aria-label="Design details"
        onClick={event => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        {selected && (
          <>
            <form method="dialog" className="marc-details-close-form">
              <button className="marc-dialog-close" aria-label="Close design details">
                <X size={22} />
              </button>
            </form>
            <div className="marc-interior-top">
              <div className="marc-interior-visual">
                <button
                  type="button"
                  className="marc-dialog-image marc-image-trigger"
                  aria-label={`Expand image: ${selected.name}`}
                  aria-haspopup="dialog"
                  onClick={() => openPreview(selected)}
                >
                  <Image src={selected.image} alt={selected.name} unoptimized fill sizes="(max-width: 760px) 95vw, 480px" />
                  <span className="marc-image-hint" aria-hidden="true">View full image</span>
                </button>
                <p>Design inspiration. Final layouts and finishes are tailored to your space.</p>
              </div>
              <div className="marc-interior-summary">
                <p className="marc-interior-eyebrow">INTERIOR DESIGN</p>
                <h2>{selected.name}</h2>
                <p className="marc-interior-subtitle">{selected.description}</p>
                <p className="marc-interior-overview">
                  Explore this {selected.category.toLowerCase()} concept with our team. We will discuss your existing space, preferred finishes, storage needs, and budget before preparing a project proposal.
                </p>
                <div className="marc-interior-enquiry">
                  <div>
                    <span>Project quotation</span>
                    <h3>{designPrice(selected.price)}</h3>
                    <p>Sample starting price. Final quotation follows consultation and site assessment.</p>
                  </div>
                  <div className="marc-interior-actions">
                    <button
                      type="button"
                      className="marc-interior-enquire"
                      onClick={() => {
                        dialog.current?.close();
                        onChoose(selected);
                      }}
                    >
                      <Mail size={19} />Enquire Now<ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="marc-interior-information">
              <section className="marc-interior-features" aria-labelledby="marc-features-title">
                <h3 id="marc-features-title">Key Features</h3>
                <ul>
                  {(selected.features?.length ? selected.features : interiorHighlights[selected.category] || []).map(feature => (
                    <li key={feature}>
                      <Check size={17} aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <p>Design highlights shown for inspiration. Final inclusions are agreed during consultation.</p>
              </section>

              <section className="marc-interior-specs" aria-labelledby="marc-specifications-title">
                <h3 id="marc-specifications-title">Specifications</h3>
                <dl>
                  <div><Layers aria-hidden="true" /><dt>Interior space</dt><dd>{selected.category}</dd></div>
                  <div><Ruler aria-hidden="true" /><dt>Floor area</dt><dd>Confirmed after site measurement</dd></div>
                  <div><Palette aria-hidden="true" /><dt>Materials &amp; finishes</dt><dd>Selected during consultation</dd></div>
                  <div><SlidersHorizontal aria-hidden="true" /><dt>Project scope</dt><dd>Customized to your requirements</dd></div>
                  <div><BriefcaseBusiness aria-hidden="true" /><dt>Service</dt><dd>Interior design consultation</dd></div>
                </dl>
              </section>

              {/* ACTUAL CLIENT RATINGS & COMMENTS SECTION */}
              <section
                className="col-span-full rounded-2xl border border-stone-200 bg-stone-50/80 p-5 sm:p-6"
                aria-labelledby="marc-reviews-title"
                style={{ gridColumn: '1 / -1' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-4 mb-5">
                  <div>
                    <h3 id="marc-reviews-title" className="text-base sm:text-lg font-bold font-serif text-stone-900">
                      Actual Client Ratings &amp; Reviews
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Genuine feedback from verified clients who completed interior projects in this design collection.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-white px-3.5 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex items-center text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={15}
                          className={star <= Math.round(reviewsAverage) ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-black font-mono text-stone-900">{reviewsAverage.toFixed(1)}</span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      ({reviewsCount} {reviewsCount === 1 ? 'verified review' : 'verified reviews'})
                    </span>
                  </div>
                </div>

                {reviewsLoading && !reviews.length && (
                  <p className="text-xs text-stone-400 text-center py-4">Loading verified client feedback...</p>
                )}

                {!reviews.length && !reviewsLoading && (
                  <div className="text-center py-6 px-4 bg-white rounded-xl border border-dashed border-stone-200 space-y-2">
                    <Star size={24} className="mx-auto text-amber-300 stroke-1" />
                    <p className="text-xs font-semibold text-stone-700">No client reviews for this space yet</p>
                    <p className="text-[11px] text-stone-500 max-w-md mx-auto">
                      Completed clients submit verified ratings upon final project handover. Their genuine feedback will appear here in real time.
                    </p>
                  </div>
                )}

                {reviews.length > 0 && (
                  <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                    {reviews.map((rev) => (
                      <article key={rev.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-2xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-stone-900">{rev.client_name}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <ShieldCheck size={12} className="text-emerald-600" />
                              Verified Client
                            </span>
                            {rev.service_type && (
                              <span className="text-[10px] font-medium text-stone-400">
                                • {rev.service_type}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-amber-400">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  size={13}
                                  className={s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
                                />
                              ))}
                            </div>
                            <time className="text-[10px] text-stone-400">
                              {new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </time>
                          </div>
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed font-sans">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </dialog>

      {/* FULL IMAGE PREVIEW */}
      <dialog
        ref={previewDialog}
        className="marc-image-preview"
        aria-label={preview ? preview.name + ' image preview' : 'Design image preview'}
        onClose={() => {
          if (!previewDialog.current?.open) setPreview(null);
        }}
        onClick={event => {
          if (event.target === event.currentTarget) previewDialog.current?.close();
        }}
      >
        {preview && (
          <div className="marc-image-preview-content">
            <form method="dialog">
              <button className="marc-preview-close" aria-label="Close image preview" autoFocus>
                <X size={24} />
              </button>
            </form>
            <div className="marc-image-preview-photo">
              <Image src={preview.image} alt={preview.name} unoptimized fill sizes="(max-width: 1200px) 95vw, 1200px" className="marc-preview-photo" />
            </div>
            <p className="marc-preview-caption">{preview.name}</p>
          </div>
        )}
      </dialog>
    </div>
  );
}
