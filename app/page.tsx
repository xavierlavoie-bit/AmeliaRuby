"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Sparkles, Menu, X, ArrowDown, Loader2, Lock } from 'lucide-react';

// --- IMPORTATIONS STRIPE RÉELLES ---
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

// Initialisation de Stripe (Assure-toi que ton serveur est bien redémarré si tu viens d'ajouter la clé)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// --- Base de données simulée ---
const products = [
  {
    id: 'prod_1',
    name: "L'Héritage N.1",
    price: 1850,
    displayPrice: "1 850 $",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    category: "Sac sur mesure",
    tag: "Signature"
  },
  {
    id: 'prod_2',
    name: "La Pochette Étoile",
    price: 920,
    displayPrice: "920 $",
    image: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1200&auto=format&fit=crop",
    category: "Accessoires",
    tag: "Série Limitée"
  },
  {
    id: 'prod_3',
    name: "Le Cabas Horizon",
    price: 2100,
    displayPrice: "2 100 $",
    image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1200&auto=format&fit=crop",
    category: "Saison",
    tag: "Pièce Unique"
  }
];

// --- Composant d'animation élégante au scroll ---
interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const Reveal = ({ children, delay = 0, className = "" }: RevealProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-[1500ms] ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default function App() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  
  // États pour le paiement
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // --- APPEL DE LA VRAIE API STRIPE ---
  const handleCheckout = async (product: typeof products[0]) => {
    try {
      setLoadingProduct(product.id);
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          price: product.price, // Format nombre envoyé à l'API
          name: product.name,
          image: product.image,
        }),
      });
      
      const data = await response.json();
      
      if (data.clientSecret) {
        setClientSecret(data.clientSecret); // Ouvre la modale avec le VRAI formulaire
      } else {
        console.error("Erreur API:", data.error);
        alert("Erreur de paiement. Vérifiez la console.");
      }

    } catch (error) {
      console.error("Erreur réseau:", error);
      alert("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoadingProduct(null);
    }
  };

  // Gestion du scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-luxury-cream text-luxury-charcoal selection:bg-luxury-gold selection:text-white font-sans">
      
      {/* VRAIE MODALE DE PAIEMENT STRIPE */}
      {clientSecret && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Fond flouté élégant pour fermer la modale */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity cursor-pointer"
            onClick={() => setClientSecret(null)}
          />
          
          {/* Conteneur du formulaire */}
          <div className="relative w-full max-w-2xl bg-white rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-300">
            {/* Header de la modale */}
            <div className="flex justify-between items-center p-6 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-luxury-gold" />
                <h3 className="font-serif text-lg md:text-xl tracking-widest uppercase">Paiement Sécurisé</h3>
              </div>
              <button 
                onClick={() => setClientSecret(null)}
                className="text-stone-400 hover:text-luxury-charcoal transition-colors p-2"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            
            {/* Formulaire Stripe Intégré Réel */}
            <div className="p-6 overflow-y-auto bg-stone-50 flex-grow min-h-[400px]">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </div>
      )}

      {/* HEADER NAVIGATION */}
      <nav className={`fixed w-full z-50 transition-all duration-700 px-6 md:px-24 flex justify-between items-center ${
        scrolled ? 'bg-white/95 backdrop-blur-md py-5 shadow-sm text-luxury-charcoal' : 'bg-transparent py-8 text-white'
      }`}>
        <div className="flex gap-12 text-[10px] uppercase tracking-[0.2em] hidden lg:flex font-light">
          <button onClick={() => scrollTo('store')} className="hover:text-luxury-gold transition-colors underline-offset-8 hover:underline">Collections</button>
          <button onClick={() => scrollTo('ia')} className="hover:text-luxury-gold transition-colors flex items-center gap-2">
            <span className="flex items-center gap-2 italic font-serif lowercase tracking-normal text-[13px]">
              <Sparkles size={12} className="text-luxury-gold" /> l'atelier ia
            </span>
          </button>
        </div>

        <div className="text-xl md:text-2xl tracking-[0.3em] font-serif uppercase text-center font-light cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          Amélie Purtell
        </div>

        <div className="flex items-center gap-8">
          <button className="relative group flex items-center gap-3">
            <span className="hidden md:block text-[10px] uppercase tracking-[0.2em] font-light group-hover:text-luxury-gold transition-colors">Panier</span>
            <div className="relative">
              <ShoppingBag size={20} strokeWidth={1} className="group-hover:text-luxury-gold transition-colors" />
              <span className={`absolute -top-1.5 -right-1.5 text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-sans transition-colors ${
                scrolled ? 'bg-luxury-charcoal text-white' : 'bg-white text-luxury-charcoal'
              }`}>
                0
              </span>
            </div>
          </button>
          <button className="lg:hidden"><Menu size={20} strokeWidth={1} /></button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/30 z-10" />
        
        <div 
          className="absolute inset-0 w-full h-full"
          style={{ transform: `translateY(${scrollY * 0.4}px)` }}
        >
          <img 
            src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=2000&auto=format&fit=crop" 
            className="w-full h-full object-cover scale-110"
            alt="Sacoche luxe artisanale"
          />
        </div>

        <div className="relative z-20 text-center text-white px-6 w-full max-w-4xl mx-auto mt-20">
          <Reveal delay={0}>
            <p className="uppercase tracking-[0.4em] text-[9px] mb-8 font-sans opacity-90">Atelier de Haute Maroquinerie</p>
          </Reveal>
          
          <Reveal delay={200}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-light mb-12 leading-tight drop-shadow-sm">
              L'Art de <span className="italic text-white/95">l'Unique</span>
            </h1>
          </Reveal>
          
          <Reveal delay={400}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => scrollTo('store')}
                className="bg-black/20 backdrop-blur-sm border border-white/50 text-white px-10 py-4 text-[9px] uppercase tracking-[0.2em] hover:bg-white hover:text-luxury-charcoal transition-all duration-500 w-64 sm:w-auto flex items-center justify-center gap-3 group"
              >
                Découvrir les pièces
                <ArrowDown size={12} className="group-hover:translate-y-1 transition-transform" />
              </button>
              <button 
                onClick={() => scrollTo('ia')}
                className="bg-black/20 backdrop-blur-sm border border-white/50 text-white px-10 py-4 text-[9px] uppercase tracking-[0.2em] hover:bg-white hover:text-luxury-charcoal transition-all duration-500 w-64 sm:w-auto"
              >
                Créer sur mesure
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* STORE SECTION */}
      <section id="store" className="py-24 md:py-32 px-6 md:px-24 max-w-7xl mx-auto bg-luxury-cream">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <Reveal className="max-w-lg">
            <h2 className="text-3xl md:text-5xl font-serif mb-6 leading-tight font-light">
              Collection <br /> <span className="text-luxury-gold italic">Intemporelle</span>
            </h2>
            <p className="text-stone-500 text-sm font-light leading-loose">
              Façonnées à la main. Chaque cuir est sélectionné pour sa texture singulière et la promesse de sa patine future.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <button className="text-[9px] uppercase tracking-[0.2em] border-b border-stone-300 pb-2 hover:text-luxury-charcoal hover:border-luxury-charcoal transition-all font-light text-stone-500">
              Explorer le catalogue
            </button>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 md:gap-16">
          {products.map((p, index) => (
            <Reveal key={p.id} delay={index * 200}>
              <div className="group">
                <div className="relative aspect-[4/5] bg-stone-100 mb-6 overflow-hidden">
                  <img 
                    src={p.image} 
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                  />
                  <div className="absolute top-5 right-5">
                    <span className="bg-white/95 px-3 py-1.5 text-[8px] uppercase tracking-[0.2em] font-light text-luxury-charcoal shadow-sm">
                      {p.tag}
                    </span>
                  </div>
                  
                  {/* BOUTON D'ACHAT STRIPE */}
                  <div className="absolute inset-0 bg-luxury-charcoal/20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-center p-8">
                     <button 
                      onClick={() => handleCheckout(p)}
                      disabled={loadingProduct === p.id}
                      className="w-full bg-white text-luxury-charcoal py-3.5 text-[9px] uppercase tracking-[0.2em] font-medium hover:bg-luxury-charcoal hover:text-white transition-colors duration-300 translate-y-2 group-hover:translate-y-0 disabled:opacity-50 disabled:cursor-wait flex justify-center items-center gap-2"
                     >
                      {loadingProduct === p.id ? (
                        <><Loader2 size={12} className="animate-spin text-luxury-gold" /> Sécurisation...</>
                      ) : (
                        "Acquérir l'œuvre"
                      )}
                     </button>
                  </div>
                </div>
                <div className="flex justify-between items-start px-1">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.2em] text-stone-400 mb-1.5">{p.category}</p>
                    <h3 className="text-lg font-serif font-light">{p.name}</h3>
                  </div>
                  <p className="text-sm font-light text-stone-600 mt-1">{p.displayPrice}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* IA ATELIER - TEASER */}
      <section id="ia" className="bg-luxury-charcoal text-white py-24 md:py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-luxury-gold/5 to-transparent"></div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <Reveal delay={0}>
            <div className="inline-flex p-3 rounded-full border border-white/10 mb-8 hover:border-luxury-gold/50 transition-colors cursor-default">
              <Sparkles className="text-luxury-gold animate-pulse" size={24} strokeWidth={1.5} />
            </div>
          </Reveal>
          
          <Reveal delay={100}>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif mb-8 leading-tight font-light">
              L'Intelligence au service <br /> de <span className="italic text-luxury-gold">votre Imaginaire</span>
            </h2>
          </Reveal>
          
          <Reveal delay={200}>
            <p className="text-stone-400 text-sm md:text-base font-light mb-12 max-w-xl mx-auto leading-loose">
              Bientôt, notre algorithme génératif transformera vos mots en croquis de haute maroquinerie, prêts à être façonnés par nos artisans.
            </p>
          </Reveal>
          
          <Reveal delay={300}>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className="bg-luxury-gold text-white px-8 py-4 text-[9px] uppercase tracking-[0.2em] font-medium hover:bg-white hover:text-luxury-charcoal transition-all duration-300 w-64 sm:w-auto">
                Liste d'attente privilégiée
              </button>
              <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-light">
                Déjà 450 inscrits
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 px-6 md:px-24 border-t border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <h4 className="text-xl font-serif tracking-[0.3em] uppercase mb-2">Amélie Purtell</h4>
            <p className="text-stone-400 text-[9px] uppercase tracking-[0.2em] font-light">Atelier • Paris — Bordeaux</p>
          </div>
          <div className="flex gap-8 text-[9px] uppercase tracking-[0.2em] font-light">
            <a href="#" className="hover:text-luxury-gold transition-colors text-stone-600">Instagram</a>
            <a href="#" className="hover:text-luxury-gold transition-colors text-stone-600">Contact</a>
            <a href="#" className="hover:text-luxury-gold transition-colors text-stone-600">Mentions Légales</a>
          </div>
          <p className="text-[8px] text-stone-400 uppercase tracking-[0.2em]">© 2024 — Maison Amélie Purtell</p>
        </div>
      </footer>
    </div>
  );
}