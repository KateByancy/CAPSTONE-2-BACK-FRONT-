"use client";
import { Home, Ruler, PanelsTopLeft, Search, Phone, MapPin, Clock, UserRound, ArrowUpRight } from 'lucide-react';
import MarcBrand from '@/components/MarcBrand';
import DesignGallery from '@/components/DesignGallery';
interface LandingProps { onNavigateToLogin?: () => void; onNavigateToRegister?: () => void }
export default function Landing({ onNavigateToLogin, onNavigateToRegister }: LandingProps) {
  const login = () => onNavigateToLogin ? onNavigateToLogin() : window.location.assign('/?screen=login');
  const register = () => onNavigateToRegister ? onNavigateToRegister() : window.location.assign('/?screen=register');
  return <div className="marc-landing" id="home">
    <header className="marc-header"><a href="#home" aria-label="Marc Interior Design home"><MarcBrand /></a><nav aria-label="Main navigation"><a href="#home">Home</a><a href="#featured">Featured</a><a href="#about">About</a><a href="#contact">Contact Us</a></nav></header>
    <section className="marc-hero" aria-label="MARC Interiors"><div className="marc-hero-copy"><p>INSPIRED INTERIORS. ELEVATED HOMES.</p><h1><strong>MARC</strong><span>Interiors</span></h1><p className="marc-hero-description">Step into a world of refined elegance,<br />where every detail is meticulously curated to elevate your lifestyle.</p><a href="#featured" className="marc-browse"><Search size={20} /> Browse Designs</a></div><p className="marc-hero-caption">TRANSFORMING VOIDS INTO INSPIRED SPACES.</p></section>
    <section className="marc-benefits" aria-label="Our specialties">{[
      { title: 'Best Designer', text: 'Custom interiors shaped around you', Icon: Home },
      { title: 'Best Space Planner', text: 'Reimagine the room you love', Icon: Ruler },
      { title: 'Quality Furnishings', text: 'Care in every detail, from start to finish', Icon: PanelsTopLeft },
    ].map(({ title, text, Icon }) => <div key={title}><Icon aria-hidden="true" /><div><h2>{title}</h2><p>{text}</p></div></div>)}</section>
    <section id="featured" className="marc-featured"><p>Featured Designs</p><h2>Interiors for Every Lifestyle</h2><p className="marc-section-description">From private homes to corporate headquarters and commercial retail spaces, explore how we transform interiors into functional works of art.</p><DesignGallery onChoose={design => { sessionStorage.setItem('marcSelectedDesign', design.id); login(); }} /></section>
    <section id="about" className="marc-about"><h2>Inspired Living. Timeless Design.</h2><p>At Marc Interior Design, we shape spaces around the people who use them. Explore our designs and work with our team to bring your vision to life.</p></section>
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
    <footer className="marc-site-footer"><MarcBrand /><div><p>Your project, in one place.</p><button type="button" className="marc-primary" onClick={login}>Log in</button><button type="button" className="marc-secondary" onClick={register}>Create an account</button></div></footer>
  </div>;
}
