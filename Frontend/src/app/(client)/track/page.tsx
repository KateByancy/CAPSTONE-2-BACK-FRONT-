"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { imageSource } from '@/components/AdminImageUpload';
import { Compass, CheckCircle2, Circle, Star, Award, Check } from 'lucide-react';
import { apiFetch, getApiUrl, getClientSession } from '@/lib/api';

type Project = { id: number; title: string; progress: number; stage: string; remarks: string };
type DesignConcept = { id: number; user_id: number; project_id: number; title: string; image?: string | null; description?: string | null };
type ProjectRating = { stars: number; comment: string; submittedAt: string };

const milestoneNames = ['Initial Consultation', 'Design Proposal', 'Material Selection', 'Execution', 'Final Handover'];

export default function Track() {
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [concepts, setConcepts] = useState<DesignConcept[]>([]);
  const [conceptError, setConceptError] = useState('');

  // Client Ratings state per project
  const [ratings, setRatings] = useState<Record<number, ProjectRating>>({});
  const [draftRatings, setDraftRatings] = useState<Record<number, number>>({});
  const [draftComments, setDraftComments] = useState<Record<number, string>>({});
  const [submittedBanner, setSubmittedBanner] = useState<number | null>(null);

  // Load ratings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('marc_client_project_ratings');
      if (saved) {
        setRatings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveRating = (projectId: number) => {
    const starCount = draftRatings[projectId] || 5;
    const comment = draftComments[projectId] || '';
    const newRating: ProjectRating = {
      stars: starCount,
      comment,
      submittedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    const updated = { ...ratings, [projectId]: newRating };
    setRatings(updated);
    try {
      localStorage.setItem('marc_client_project_ratings', JSON.stringify(updated));
    } catch {
      // ignore
    }

    setSubmittedBanner(projectId);
    setTimeout(() => setSubmittedBanner(null), 5000);
  };

  useEffect(() => {
    const load = async () => {
      const client = getClientSession();
      if (!client) return;
      try {
        const bookingResponse = await apiFetch(`${getApiUrl()}/booking?user_id=${client.id}`, { cache: 'no-store' });
        const bookings = await bookingResponse.json();
        if (!bookingResponse.ok || !bookings.success) throw new Error('Unable to load projects.');
        const groups = await Promise.all(
          (bookings.bookings ?? [])
            .filter((booking: { accepted_at?: string | null }) => Boolean(booking.accepted_at))
            .map(async (booking: { id: number }) => {
              const response = await apiFetch(`${getApiUrl()}/designs?project_id=${booking.id}`, { cache: 'no-store' });
              const rows = await response.json();
              if (!response.ok || !Array.isArray(rows)) throw new Error('Unable to load design concepts.');
              return rows;
            })
        );
        const data = groups.flat();
        setConcepts(data.filter((design: DesignConcept) => design.user_id === client.id && Boolean(design.image)));
        setConceptError('');
      } catch {
        setConceptError('Unable to refresh design concepts. Please try again shortly.');
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      const client = getClientSession();
      if (!client) {
        setError('Please sign in again to view project tracking.');
        return;
      }
      const response = await apiFetch(`${getApiUrl()}/booking?user_id=${client.id}`);
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load your projects.');
      const accepted = (data.bookings ?? [])
        .filter((item: { accepted_at?: string | null }) => Boolean(item.accepted_at))
        .sort((first: { id: number }, second: { id: number }) => first.id - second.id);

      const rows: Project[] = await Promise.all(
        accepted.map(async (booking: { id: number; service_type: string; status: string }) => {
          const trackingResponse = await apiFetch(`${getApiUrl()}/tracking/${booking.id}`);
          const trackingData = await trackingResponse.json();
          const latest = trackingData.tracking?.[0];
          return {
            id: booking.id,
            title: booking.service_type,
            progress: Math.max(0, Math.min(100, Number(latest?.progress) || 0)),
            stage: latest?.current_stage || booking.status || 'Pending',
            remarks: latest?.remarks || '',
          };
        })
      );

      setActiveProjects(rows.filter((project) => project.progress < 100));
      setCompletedProjects(rows.filter((project) => project.progress >= 100 || project.stage === 'Final Handover' || project.stage === 'Completed'));
    };

    void load().catch((e) => setError(e instanceof Error ? e.message : 'Unable to load progress tracking.'));
    const timer = window.setInterval(() => void load().catch(() => undefined), 10000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="p-4 space-y-6 animate-fadeIn">
      <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-stone-400">
        <Compass className="w-4 h-4 text-brand-500" />
        <span>PROGRESS TRACKING TIMELINE</span>
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}

      {!activeProjects.length && !completedProjects.length && !error && (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-xs text-stone-400">
          No accepted projects are available for progress tracking yet.
        </div>
      )}

      {/* COMPLETED PROJECTS & RATING SECTION: Clients rate when work is done */}
      {completedProjects.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider text-emerald-700">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>COMPLETED PROJECTS &amp; CLIENT RATINGS</span>
          </div>

          {completedProjects.map((project) => {
            const hasRated = Boolean(ratings[project.id]);
            const selectedStars = draftRatings[project.id] ?? 5;
            const currentComment = draftComments[project.id] ?? '';

            return (
              <div key={project.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold tracking-widest px-2.5 py-1 rounded-full uppercase">
                      <Check className="w-3 h-3" /> Work Complete &amp; Handed Over
                    </span>
                    <span className="text-xs font-semibold text-stone-400">Project #{project.id}</span>
                  </div>
                  <span className="text-xs font-bold text-stone-700">{project.title}</span>
                </div>

                {submittedBanner === project.id && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 font-semibold flex items-center space-x-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Thank you! Your rating has been successfully submitted and recorded.</span>
                  </div>
                )}

                {hasRated ? (
                  /* Display already submitted rating */
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={18}
                            className={star <= ratings[project.id].stars ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
                          />
                        ))}
                        <span className="text-xs font-bold text-stone-700 ml-2">
                          {ratings[project.id].stars}.0 / 5.0 Star Rating
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-400">{ratings[project.id].submittedAt}</span>
                    </div>
                    {ratings[project.id].comment && (
                      <p className="text-xs text-stone-600 italic pt-1">&ldquo;{ratings[project.id].comment}&rdquo;</p>
                    )}
                    <p className="text-[10px] text-emerald-600 font-medium pt-1">
                      &#10003; Your rating was received. Thank you for choosing Marc Interior Design!
                    </p>
                  </div>
                ) : (
                  /* Prompt client to rate after work is completed */
                  <div className="bg-brand-50/50 border border-brand-200/60 rounded-xl p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Rate Your Finished Project
                      </h4>
                      <p className="text-xs text-stone-500 mt-1">
                        Now that your project execution and final handover are complete, please share your rating and review:
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 pt-1">
                      <span className="text-xs font-semibold text-stone-700">Stars:</span>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setDraftRatings((prev) => ({ ...prev, [project.id]: star }))}
                            className="p-1 hover:scale-110 transition-transform focus:outline-none"
                            aria-label={`Rate ${star} stars`}
                          >
                            <Star
                              size={22}
                              className={star <= selectedStars ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-700">
                        {selectedStars === 5 ? '5.0 (Exceptional)' : `${selectedStars}.0 / 5.0`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-stone-700 block">
                        Client Feedback / Testimonial:
                      </label>
                      <textarea
                        value={currentComment}
                        onChange={(e) => setDraftComments((prev) => ({ ...prev, [project.id]: e.target.value }))}
                        rows={3}
                        placeholder="Tell us what you liked most about your transformed space, craftsmanship, and communication..."
                        className="w-full text-xs p-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveRating(project.id)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-marc-charcoal text-white text-xs font-bold rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
                    >
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      Submit Project Rating
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ACTIVE IN-PROGRESS PROJECTS */}
      {activeProjects.map((project) => {
        const milestones = milestoneNames.map((name, index) => {
          const threshold = (index + 1) * 20;
          const status = project.progress >= threshold ? 'completed' : project.progress >= index * 20 ? 'active' : 'upcoming';
          return {
            name,
            status,
            desc: status === 'active' ? project.remarks || project.stage : status === 'completed' ? 'Completed by the project team' : 'Waiting for the previous stage',
          };
        });
        const projectConcepts = concepts.filter((concept) => concept.project_id === project.id);

        return (
          <section key={project.id} className="space-y-4">
            <div className="bg-marc-charcoal text-white rounded-2xl p-5 shadow-xl">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                {project.stage} · Project #{project.id}
              </span>
              <h3 className="text-sm font-semibold tracking-wide text-white mb-4">{project.title}</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-black text-brand-400">{project.progress}%</span>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Completed</span>
              </div>
              <div className="w-full bg-stone-700 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-brand-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                <h4 className="text-xs font-black tracking-widest uppercase text-stone-800 mb-6">Build Roadmap</h4>
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-100">
                  {milestones.map((step) => (
                    <div key={step.name} className="flex items-start space-x-4 relative z-10">
                      {step.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6 text-brand-500 bg-white rounded-full" />
                      ) : (
                        <Circle
                          className={`w-6 h-6 bg-white rounded-full ${
                            step.status === 'active' ? 'text-brand-600 stroke-[3] animate-pulse' : 'text-stone-200'
                          }`}
                        />
                      )}
                      <div className="min-w-0 space-y-0.5 break-words">
                        <p className={`text-xs font-bold ${step.status === 'completed' ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
                          {step.name}
                        </p>
                        <p className="text-[10px] text-stone-400 leading-relaxed">{step.desc}</p>
                        {step.status === 'active' && (
                          <span className="inline-block mt-1 bg-brand-50 text-brand-600 text-[8px] font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                <h4 className="text-xs font-black tracking-widest uppercase text-stone-800 mb-6">Project Update Photos</h4>
                {conceptError && <p role="status" className="mb-4 text-xs text-red-700">{conceptError}</p>}
                {projectConcepts.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {projectConcepts.map((concept) => (
                      <figure key={concept.id} className="min-w-0 space-y-2">
                        <Image
                          src={imageSource(concept.image!)}
                          alt={concept.title}
                          width={640}
                          height={360}
                          unoptimized
                          className="w-full h-auto rounded-xl object-contain"
                        />
                        <figcaption className="space-y-1 break-words">
                          <p className="text-xs font-bold text-stone-800">{concept.title}</p>
                          {concept.description && (
                            <p className="text-xs text-stone-500 leading-relaxed">{concept.description}</p>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  !conceptError && <p className="text-xs text-stone-400">No project updates available yet.</p>
                )}
              </div>
            </div>

            {/* Note that Client Rating unlocks when progress hits 100% */}
            <div className="bg-stone-50 border border-dashed border-stone-200 rounded-xl p-3.5 text-center text-xs text-stone-400 flex items-center justify-center space-x-2">
              <Star size={14} className="text-stone-300" />
              <span>Client Star Rating &amp; Review unlocks automatically upon 100% Handover completion.</span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
