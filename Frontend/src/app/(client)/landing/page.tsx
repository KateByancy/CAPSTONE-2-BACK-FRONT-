"use client";
import React, { useState, useEffect } from 'react';
import { Home, Ruler, PanelsTopLeft, Search, Phone, MapPin, Clock, UserRound, ArrowUpRight, Star } from 'lucide-react';
import MarcBrand from '@/components/MarcBrand';
import DesignGallery from '@/components/DesignGallery';

interface LandingProps { onNavigateToLogin?: () => void; onNavigateToRegister?: () => void }

export default function Landing({ onNavigateToLogin, onNavigateToRegister }: LandingProps) {
  const [activeNav, setActiveNav] = useState('home');

  const navItems = [
    { id: 'home', label: 'Home', href: '#home' },
    { id: 'featured', label: 'Featured', href: '#featured' },
    { id: 'about', label: 'About', href: '#about' },
    { id: 'contact', label: 'Contact Us', href: '#contact' },
  ];

  // Dynamic Scroll-Spy: moves the underline automatically to whatever section appears on screen
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;

      // Bottom threshold (reached bottom of page -> Contact Us)
      if (scrollY + windowHeight >= fullHeight - 60) {
        setActiveNav('contact');
        return;
      }

      // Check section bounding rects from bottom to top
      const sections = [
        { id: 'contact', el: document.getElementById('contact') },
        { id: 'about', el: document.getElementById('about') },
        { id: 'featured', el: document.getElementById('featured') },
        { id: 'home', el: document.getElementById('home') },
      ];

      const headerOffset = 180;
      for (const section of sections) {
        if (section.el) {
          const rect = section.el.getBoundingClientRect();
          if (rect.top <= headerOffset) {
            setActiveNav(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    setActiveNav(id);
    const target = document.getElementById(id);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  const clientReviews = [
    {
      name: "Engr. David Tan",
      role: "Commercial Office Client",
      rating: 5,
      comment: "Marc and his team transformed our dull corporate office into an inspiring, modern workspace. Outstanding build quality, transparency in material costing, and daily photo tracking on the client portal made the entire process worry-free.",
    },
    {
      name: "Maria Theresa Ramos",
      role: "Luxury Condo Homeowner",
      rating: 5,
      comment: "The Bronze Kitchen and master bedroom execution exceeded our expectations. The attention to millwork detail, lighting placement, and custom cabinetry finishes is world-class. Truly timeless design!",
    },
    {
      name: "Atty. Rafael & Carla Gomez",
      role: "Residential Villa Client",
      rating: 5,
      comment: "We loved having the milestone tracking and direct AI chat support. Every change request was handled with precision and Marc's aesthetic sense brought our vision to reality. Highly recommended interior team in Cebu!",
    },
  ];

  const login = () => onNavigateToLogin ? onNavigateToLogin() : window.location.assign('/?screen=login');
  const register = () => onNavigateToRegister ? onNavigateToRegister() : window.location.assign('/?screen=register');

  return (
    <div className="marc-landing" id="home">
      <header className="marc-header">
        <a href="#home" aria-label="Marc Interior Design home" onClick={(e) => handleNavClick(e, 'home')}>
          <MarcBrand />
        </a>
        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={activeNav === item.id ? 'page' : undefined}
              className={activeNav === item.id ? 'marc-nav-active' : ''}
              onClick={(e) => handleNavClick(e, item.id)}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="marc-hero" aria-label="MARC Interiors">
        <div className="marc-hero-copy">
          <p>INSPIRED INTERIORS. ELEVATED HOMES.</p>
          <h1><strong>MARC</strong><span>Interiors</span></h1>
          <p className="marc-hero-description">Step into a world of refined elegance,<br />where every detail is meticulously curated to elevate your lifestyle.</p>
          
          <div className="marc-hero-actions">
            <a href="#featured" className="marc-browse" onClick={(e) => handleNavClick(e, 'featured')}>
              <Search size={20} /> Browse Designs
            </a>

            {/* Client Star Ratings Badge on Hero for Instant Social Proof */}
            <div className="marc-hero-ratings-badge" role="status" aria-label="Client rating: 4.9 out of 5 stars from 120+ verified clients">
              <div className="marc-stars-row">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} className="marc-star-icon" fill="currentColor" />
                ))}
              </div>
              <span className="marc-hero-rating-score">4.9 / 5.0</span>
              <span className="marc-hero-rating-sep">&bull;</span>
              <span className="marc-hero-rating-count">120+ Verified Client Reviews</span>
            </div>
          </div>
        </div>

        {/* Home Side Caption: Positioned cleanly inside initial viewport fold without scrolling */}
        <p className="marc-hero-caption">TRANSFORMING VOIDS INTO INSPIRED SPACES.</p>
      </section>

      <section className="marc-benefits" aria-label="Our specialties">
        {[
          { title: 'Best Designer', text: 'Custom interiors shaped around you', Icon: Home },
          { title: 'Best Space Planner', text: 'Reimagine the room you love', Icon: Ruler },
          { title: 'Quality Furnishings', text: 'Care in every detail, from start to finish', Icon: PanelsTopLeft },
        ].map(({ title, text, Icon }) => (
          <div key={title}><Icon aria-hidden="true" /><div><h2>{title}</h2><p>{text}</p></div></div>
        ))}
      </section>

      <section id="featured" className="marc-featured">
        <p>Featured Designs</p>
        <h2>Interiors for Every Lifestyle</h2>
        <p className="marc-section-description">From private homes to corporate headquarters and commercial retail spaces, explore how we transform interiors into functional works of art.</p>
        <DesignGallery onChoose={design => { sessionStorage.setItem('marcSelectedDesign', design.id); login(); }} />
      </section>

      {/* Prominent Client Ratings and Reviews Section */}
      <section className="marc-ratings-section" aria-labelledby="marc-ratings-title">
        <div className="marc-ratings-intro">
          <p className="marc-ratings-eyebrow">CLIENT RATINGS &amp; REVIEWS</p>
          <h2 id="marc-ratings-title">Rated 4.9 / 5.0 by Discerning Clients</h2>
          <p className="marc-ratings-subtitle">See why homeowners and commercial businesses trust Marc Interior Design for bespoke luxury and timeless construction.</p>
        </div>

        <div className="marc-ratings-summary-card">
          <div className="marc-rating-score-block">
            <span className="marc-large-score">4.9</span>
            <div className="marc-stars-row marc-stars-hero">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={22} className="marc-star-icon" fill="currentColor" />
              ))}
            </div>
            <p className="marc-score-note">Based on 120+ Completed Client Builds</p>
          </div>
          <div className="marc-ratings-stats-row">
            <div className="marc-rating-kpi">
              <strong className="marc-kpi-val">99%</strong>
              <span className="marc-kpi-lbl">On-Time Handover</span>
            </div>
            <div className="marc-rating-kpi">
              <strong className="marc-kpi-val">100%</strong>
              <span className="marc-kpi-lbl">Premium Materials</span>
            </div>
            <div className="marc-rating-kpi">
              <strong className="marc-kpi-val">150+</strong>
              <span className="marc-kpi-lbl">Spaces Transformed</span>
            </div>
          </div>
        </div>

        <div className="marc-reviews-grid">
          {clientReviews.map((rev, index) => (
            <article key={index} className="marc-review-card">
              <div className="marc-review-card-top">
                <div className="marc-stars-row">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={15} className="marc-star-icon" fill="currentColor" />
                  ))}
                </div>
                <span className="marc-verified-badge">&#10003; Verified Client</span>
              </div>
              <p className="marc-review-comment">&ldquo;{rev.comment}&rdquo;</p>
              <div className="marc-review-author-info">
                <div className="marc-author-initial" aria-hidden="true">{rev.name.charAt(0)}</div>
                <div className="marc-author-meta">
                  <span className="marc-author-name">{rev.name}</span>
                  <span className="marc-author-role">{rev.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="marc-about">
        <h2>Inspired Living. Timeless Design.</h2>
        <p>At Marc Interior Design, we shape spaces around the people who use them. Explore our designs and work with our team to bring your vision to life.</p>
      </section>

      <section id="contact" className="marc-contact-section" aria-labelledby="marc-contact-title">
        <div className="marc-contact-intro">
          <p className="marc-contact-eyebrow">CONTACT US</p>
          <h2 id="marc-contact-title">Let&apos;s talk about<br />your space.</h2>
          <p>Have a project in mind? Get in touch to discuss your ideas, ask a question, or plan your next interior project.</p>
          <p className="marc-contact-hours-note">Available 8:00 AM &ndash; 5:00 PM, Philippine time.</p>
        </div>
        <div className="marc-contact-information">
          <div className="marc-contact-info-header"><span>GET IN TOUCH</span><p>We&apos;d love to hear from you.</p></div>
          <dl className="marc-contact-grid">
            <div className="marc-contact-item"><UserRound aria-hidden="true" /><dt>Contact person</dt><dd>Marc Rossel P. Lecciones</dd></div>
            <div className="marc-contact-item"><Phone aria-hidden="true" /><dt>Contact number</dt><dd><a href="tel:+639925280374">0992 528 0374</a><a className="marc-contact-small-link" href="sms:+639925280374">Send a text message<ArrowUpRight size={14} aria-hidden="true" /></a></dd></div>
            <div className="marc-contact-item"><MapPin aria-hidden="true" /><dt>Location</dt><dd>Ibabao Basak,<br />Lapu-Lapu City<a className="marc-contact-small-link" href="https://www.google.com/maps/search/?api=1&query=Ibabao%20Basak%2C%20Lapu-Lapu%20City%2C%20Philippines" target="_blank" rel="noopener noreferrer">View area on map<ArrowUpRight size={14} aria-hidden="true" /></a></dd></div>
            <div className="marc-contact-item"><Clock aria-hidden="true" /><dt>Working hours</dt><dd>8:00 AM &ndash; 5:00 PM<span className="marc-contact-secondary-text">Philippine time</span></dd></div>
          </dl>
        </div>
      </section>

      <footer className="marc-site-footer">
        <MarcBrand />
        <div>
          <p>Your project, in one place.</p>
          <div className="marc-site-footer-actions">
            <button type="button" className="marc-primary" onClick={login}>Log in</button>
            <button type="button" className="marc-secondary" onClick={register}>Create an account</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
