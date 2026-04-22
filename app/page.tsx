"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, ArrowRight, Menu, X } from 'lucide-react';

// --- Simulation des données Stripe (Amélie gère ça sur son dashboard) ---
const products = [
  {
    id: 'prod_1',
    name: "L'Héritage N.1",
    price: "1 850 €",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
    category: "Sac sur mesure",
    tag: "Best-seller"
  },
  {
    id: 'prod_2',
    name: "La Pochette Étoile",
    price: "920 €",
    image: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?q=80&w=1200&auto=format&fit=crop",
    category: "Accessoires",
    tag: "Édition Limitée"
  },
  {
    id: 'prod_3',
    name: "Le Cabas Horizon",
    price: "2 100 €",
    image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1200&auto=format&fit=crop",
    category: "Saison",
    tag: "Unique"
  }
];

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-luxury-cream text-luxury-charcoal">
      
      {/* HEADER NAVIGATION */}
      <nav className={`fixed w-full z-50 transition-all duration-700 px-6 md:px-16 py-6 flex justify-between items-center ${
        scrolled ? 'bg-white/90 backdrop-blur-md py-4 shadow-sm' : 'bg-transparent'
      }`}>
        <div className="flex gap-10 text-[11px] uppercase tracking-widest hidden lg:flex font-medium">
          <a href="#store" className="hover:text-luxury-gold transition-colors underline-offset-8 hover:underline">La Boutique</a>
          <a href="#ia" className="hover:text-luxury-gold transition-colors flex items-center gap-2">
            <span className="flex items-center gap-2 italic font-serif lowercase tracking-normal text-xs">
              <Sparkles size={14} className="text-luxury-gold" /> atelier ia
            </span>
          </a>
        </div>

        <div className="text-2xl md:text-3xl tracking-[0.4em] font-serif uppercase text-center">
          Amélie Purtell
        </div>

        <div className="flex items-center gap-8">
          <button className="relative group">
            <ShoppingBag size={22} strokeWidth={1.2} className="group-hover:text-luxury-gold transition-colors" />
            <span className="absolute -top-1 -right-1 bg-luxury-charcoal text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-sans">
              0
            </span>
          </button>
          <button className="lg:hidden"><Menu size={24} /></button>
        </div>
      </nav>

      {/* HERO SECTION - CINEMATOGRAPHIC */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/20 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=2000&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover scale-100 hover:scale-105 transition-transform duration-[10s]"
          alt="Sacoche luxe artisanale"
        />
        <div className="relative z-20 text-center text-white px-6">
          <p className="uppercase tracking-[0.5em] text-[10px] mb-8 animate-pulse font-sans">Maroquinerie d'exception</p>
          <h1 className="text-5xl md:text-8xl font-serif font-light mb-12 leading-tight">
            Redéfinir <br /> <span className="italic text-white/90">l'Unique</span>
          </h1>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="bg-white text-luxury-charcoal px-12 py-5 text-[10px] uppercase tracking-widest hover:bg-luxury-charcoal hover:text-white transition-all duration-500">
              Explorer le Store
            </button>
            <button className="backdrop-blur-sm bg-white/10 border border-white/30 text-white px-12 py-5 text-[10px] uppercase tracking-widest hover:bg-white hover:text-luxury-charcoal transition-all duration-500">
              Concevoir mon sac
            </button>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center text-white/50 gap-2">
          <span className="text-[9px] uppercase tracking-[0.3em]">Défiler</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent"></div>
        </div>
      </section>

      {/* STORE SECTION - DYNAMIQUE */}
      <section id="store" className="py-32 px-6 md:px-16 max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">La Collection <br /> <span className="text-luxury-gold italic">Signature</span></h2>
            <p className="text-stone-500 font-light leading-relaxed">
              Des pièces pensées pour durer, conçues avec Amélie dans notre atelier. 
              Chaque cuir est sélectionné pour sa texture et sa patine future.
            </p>
          </div>
          <button className="text-[10px] uppercase tracking-widest border-b border-luxury-charcoal pb-2 hover:text-luxury-gold hover:border-luxury-gold transition-all font-medium">
            Voir toute la sélection
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {products.map((p) => (
            <div key={p.id} className="group">
              <div className="relative aspect-[3/4] bg-stone-100 mb-8 overflow-hidden">
                <img 
                  src={p.image} 
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                />
                <div className="absolute top-6 right-6">
                  <span className="bg-white/90 backdrop-blur-sm px-4 py-2 text-[9px] uppercase tracking-widest font-medium">
                    {p.tag}
                  </span>
                </div>
                <div className="absolute inset-0 bg-luxury-charcoal/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center p-12">
                   <button className="w-full bg-white py-4 text-[10px] uppercase tracking-widest font-bold translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    Aperçu Rapide
                   </button>
                </div>
              </div>
              <div className="flex justify-between items-center px-2">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-stone-400 mb-1">{p.category}</p>
                  <h3 className="text-xl font-serif">{p.name}</h3>
                </div>
                <p className="text-lg font-light">{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IA ATELIER - TEASER */}
      <section id="ia" className="bg-luxury-charcoal text-white py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-luxury-gold/5 to-transparent"></div>
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-block p-4 rounded-full border border-white/10 mb-10">
            <Sparkles className="text-luxury-gold" size={32} />
          </div>
          <h2 className="text-4xl md:text-7xl font-serif mb-10 leading-tight">
            L'Intelligence de <br /> votre <span className="italic text-luxury-gold">Imaginaire</span>
          </h2>
          <p className="text-stone-400 text-lg md:text-xl font-light mb-16 max-w-2xl mx-auto leading-relaxed">
            Prochainement, notre algorithme de design génératif transformera vos mots en croquis de haute maroquinerie, prêts à être confectionnés par nos artisans.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
            <div className="flex -space-x-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-luxury-charcoal bg-stone-800 overflow-hidden">
                   <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="utilisateur" />
                </div>
              ))}
            </div>
            <p className="text-xs uppercase tracking-widest text-stone-500">
              +450 personnes sur liste d'attente
            </p>
            <button className="bg-luxury-gold text-white px-10 py-5 text-[10px] uppercase tracking-widest font-bold hover:bg-white hover:text-luxury-charcoal transition-all">
              Rejoindre l'expérience
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 px-6 border-t border-stone-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="text-center md:text-left">
            <h4 className="text-2xl font-serif tracking-widest uppercase mb-4">Amélie Purtell</h4>
            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-sans">Atelier de création • Paris — Bordeaux</p>
          </div>
          <div className="flex gap-12 text-[10px] uppercase tracking-widest font-medium">
            <a href="#" className="hover:text-luxury-gold transition">Instagram</a>
            <a href="#" className="hover:text-luxury-gold transition">Contact</a>
            <a href="#" className="hover:text-luxury-gold transition">Paiement Sécurisé</a>
          </div>
          <p className="text-[10px] text-stone-400 uppercase tracking-widest">© 2024 — Maison Amélie Purtell</p>
        </div>
      </footer>
    </div>
  );
}