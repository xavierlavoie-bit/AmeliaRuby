"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, X, Loader2, Lock, 
  Plus, Minus, Trash2, ChevronLeft, ChevronRight, Settings, 
  LayoutGrid, Package, PlusCircle, Upload, Eye, EyeOff
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, 
  updateDoc, deleteDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// Déclaration pour éviter les erreurs TypeScript
declare const __initial_auth_token: any;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = firebaseConfig.appId;

// --- COMPOSANT DE RÉVÉLATION ---
const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={ref} className={`transition-all duration-[1200ms] ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

export default function App() {
  // États Globaux
  const [view, setView] = useState<'shop' | 'admin'>('shop');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stripe, setStripe] = useState<any>(null);
  const [scrolled, setScrolled] = useState(false);
  
  // États Boutique
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  // États Admin
  const [isEditing, setIsEditing] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', price: '' as number | string, description: '', category: 'Sac à main', colors: '', images: [] as string[]
  });

  // Gestion du scroll pour la nav
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. CHARGEMENT DYNAMIQUE DE STRIPE
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => {
      const stripePubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
      if ((window as any).Stripe) setStripe((window as any).Stripe(stripePubKey));
    };
    document.body.appendChild(script);
  }, []);

  // 2. AUTHENTIFICATION FIREBASE
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth Error", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 3. FETCH DATA
  useEffect(() => {
    if (!user) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setIsLoading(false);
    }, (err) => {
      console.error("Erreur Firestore:", err);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 4. MONTAGE DU CHECKOUT
  useEffect(() => {
    if (clientSecret && stripe && checkoutRef.current) {
      stripe.initEmbeddedCheckout({ clientSecret }).then((checkout: any) => {
        checkout.mount(checkoutRef.current);
      });
    }
  }, [clientSecret, stripe]);

  // LOGIQUE PANIER
  const addToCart = (product: any) => {
    const productColors = product.colors ? product.colors.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
    if (productColors.length > 0 && !selectedColor) {
      alert("Veuillez sélectionner une couleur.");
      return;
    }

    setCart(prev => {
      const exists = prev.find(i => i.id === product.id && i.selectedColor === selectedColor);
      if (exists) {
        return prev.map(i => (i.id === product.id && i.selectedColor === selectedColor) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const cartItemId = selectedColor ? `${product.id}-${selectedColor}` : product.id;
      return [...prev, { ...product, cartItemId, selectedColor, quantity: 1 }];
    });
    
    setSelectedProduct(null);
    setSelectedColor('');
    setIsCartOpen(true);
  };

  const updateQty = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (cartItemId: string) => setCart(prev => prev.filter(i => i.cartItemId !== cartItemId));

  // PAIEMENT
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      setIsCheckingOut(true);
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart.map(i => ({ 
            name: i.selectedColor ? `${i.name} (${i.selectedColor})` : i.name, 
            price: i.price, 
            quantity: i.quantity 
          })) 
        })
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setIsCartOpen(false);
      }
    } catch (e) { console.error("Checkout error", e); }
    finally { setIsCheckingOut(false); }
  };

  // LOGIQUE ADMIN
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'atelier2024') {
      setIsAdminAuthenticated(true);
    } else {
      alert("Accès refusé. Mot de passe incorrect.");
    }
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setAdminPassword('');
    setView('shop');
  };

  // LOGIQUE DE DRAG & DROP
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = e.dataTransfer.files;
    } else {
      files = (e.target as HTMLInputElement).files;
    }

    if (!files) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    const readers = fileArray.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(base64Images => {
      if (isEditing) {
        setIsEditing({ ...isEditing, images: [...(isEditing.images || []), ...base64Images] });
      } else {
        setNewProduct({ ...newProduct, images: [...newProduct.images, ...base64Images] });
      }
      setIsUploading(false);
    });
  };

  const removeImage = (index: number) => {
    if (isEditing) {
      const newImages = isEditing.images.filter((_: any, i: number) => i !== index);
      setIsEditing({ ...isEditing, images: newImages });
    } else {
      const newImages = newProduct.images.filter((_, i) => i !== index);
      setNewProduct({ ...newProduct, images: newImages });
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    
    try {
      if (isEditing) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', isEditing.id);
        await updateDoc(docRef, isEditing);
        setIsEditing(null);
      } else {
        await addDoc(colRef, { ...newProduct, createdAt: Date.now() });
        setNewProduct({ name: '', price: '', description: '', category: 'Sac à main', colors: '', images: [] as string[] });
      }
    } catch (err) { console.error("Save error", err); }
  };

  const deleteProduct = async (id: string) => {
    if(!confirm("Supprimer définitivement cette pièce ?")) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id);
    await deleteDoc(docRef);
  };

  const openProductModal = (product: any) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    const productColors = product.colors ? product.colors.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
    if(productColors.length > 0) setSelectedColor(productColors[0]);
    else setSelectedColor('');
  };

  // --- RENDU ADMIN ---
  if (view === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 font-sans">
          <button onClick={() => setView('shop')} className="absolute top-10 left-10 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-black transition-colors flex items-center gap-2">
            <ChevronLeft size={14} /> Retour à la boutique
          </button>
          
          <div className="w-full max-w-sm space-y-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-4">
              <h1 className="text-2xl font-serif uppercase tracking-[0.5em] font-light">Amélie Purtell</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#C5A059] font-medium">Espace Privé Artisan</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-8">
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Code d'accès atelier"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-stone-200 py-4 text-center text-sm tracking-[0.2em] focus:border-[#C5A059] outline-none transition-all placeholder:text-stone-300 placeholder:uppercase placeholder:text-[10px]"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-900 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" className="w-full bg-stone-900 text-white py-5 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-xl">
                Se connecter
              </button>
            </form>
            <p className="text-[9px] text-stone-300 uppercase tracking-widest leading-relaxed">
              Cet espace est réservé à la gestion des collections.<br/>Maison Amélie Purtell — Bordeaux.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl font-serif tracking-tight">Atelier Gestion</h1>
              <p className="text-sm text-[#C5A059] uppercase tracking-widest mt-2 font-medium">Contrôle des collections</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setView('shop')}
                className="flex items-center gap-2 bg-white border border-stone-200 px-6 py-3 text-[10px] uppercase tracking-widest hover:bg-stone-50 transition-all shadow-sm"
              >
                <Eye size={14} /> Voir le site
              </button>
              <button 
                onClick={logoutAdmin}
                className="flex items-center gap-2 bg-stone-900 text-white px-6 py-3 text-[10px] uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg"
              >
                <Lock size={14} /> Déconnexion
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* FORMULAIRE ADMIN */}
            <div className="lg:col-span-5">
              <form onSubmit={saveProduct} className="bg-white p-8 shadow-xl border border-stone-100 space-y-6 sticky top-12 rounded-sm">
                <h3 className="font-serif text-xl border-b pb-4 flex items-center gap-2">
                  {isEditing ? <Settings size={20} className="text-[#C5A059]"/> : <PlusCircle size={20} className="text-[#C5A059]"/>}
                  {isEditing ? 'Modifier la pièce' : 'Nouvelle création'}
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 block">Nom de la pièce</label>
                      <input 
                        type="text" required
                        value={isEditing ? isEditing.name : newProduct.name}
                        onChange={e => isEditing ? setIsEditing({...isEditing, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})}
                        className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 block">Prix ($ CAD)</label>
                      <input 
                        type="number" required
                        value={isEditing ? isEditing.price : newProduct.price}
                        onChange={e => {
                          const val = e.target.value === '' ? '' : Number(e.target.value);
                          isEditing ? setIsEditing({...isEditing, price: val}) : setNewProduct({...newProduct, price: val});
                        }}
                        className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 block">Catégorie</label>
                      <input 
                        type="text"
                        value={isEditing ? isEditing.category : newProduct.category}
                        onChange={e => isEditing ? setIsEditing({...isEditing, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#C5A059] mb-1 block font-medium">Couleurs (Sépare par des virgules)</label>
                    <input 
                      type="text" placeholder="Noir, Camel, Nude"
                      value={isEditing ? isEditing.colors : newProduct.colors}
                      onChange={e => isEditing ? setIsEditing({...isEditing, colors: e.target.value}) : setNewProduct({...newProduct, colors: e.target.value})}
                      className="w-full border-b border-stone-200 py-2 focus:border-[#C5A059] outline-none font-light text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 mb-1 block">Histoire de la pièce</label>
                    <textarea 
                      rows={3}
                      value={isEditing ? isEditing.description : newProduct.description}
                      onChange={e => isEditing ? setIsEditing({...isEditing, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full border border-stone-100 bg-stone-50 p-3 mt-1 text-sm outline-none focus:border-[#C5A059] transition-all font-light"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-[#C5A059] mb-3 block font-bold">Galerie Photo</label>
                    <div 
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleFileChange}
                      className="border-2 border-dashed border-stone-200 hover:border-[#C5A059] transition-all bg-stone-50 p-8 text-center cursor-pointer relative"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <input type="file" multiple id="file-upload" className="hidden" accept="image/*" onChange={handleFileChange} />
                      <Upload className="mx-auto mb-2 text-stone-300" size={24} />
                      <p className="text-[10px] uppercase tracking-widest text-stone-400">Glisser les photos ou cliquer</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {(isEditing ? (isEditing.images || []) : newProduct.images).map((img: string, idx: number) => (
                        <div key={idx} className="relative aspect-square bg-stone-100 group overflow-hidden rounded-sm border border-stone-200">
                          <img src={img} className="w-full h-full object-cover" alt="" />
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-6">
                  <button type="submit" className="flex-1 bg-stone-900 text-white py-4 text-[10px] uppercase tracking-[0.2em] hover:bg-[#C5A059] transition-all shadow-md font-medium">
                    {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                  {isEditing && (
                    <button type="button" onClick={() => setIsEditing(null)} className="px-4 border border-stone-200 text-stone-400 hover:text-stone-900">
                      <X size={18} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* LISTE ADMIN */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products.length === 0 ? (
                   <div className="col-span-2 py-20 text-center border-2 border-dashed border-stone-200 text-stone-300 uppercase tracking-widest text-[10px]">Aucun produit en ligne</div>
                ) : products.map(p => (
                  <div key={p.id} className="bg-white p-5 shadow-lg border border-stone-100 flex gap-5 group hover:border-[#C5A059]/30 transition-all">
                    <div className="w-24 h-32 bg-stone-50 flex-shrink-0 overflow-hidden relative">
                      <img src={p.images?.[0]} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h4 className="font-serif text-lg leading-tight">{p.name}</h4>
                          <span className="text-xs font-semibold text-[#C5A059]">{p.price} $</span>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest text-stone-400 mt-2">{p.category}</p>
                      </div>
                      <div className="flex gap-4 border-t border-stone-50 pt-3">
                        <button onClick={() => setIsEditing(p)} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900">Modifier</button>
                        <button onClick={() => deleteProduct(p.id)} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-600">Supprimer</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDU BOUTIQUE ---
  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1C1C1C] font-sans selection:bg-[#C5A059] selection:text-white">

      {/* MODALE PAIEMENT STRIPE */}
      {clientSecret && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setClientSecret(null)} />
          <div className="relative w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">
                <Lock size={12} /> Transaction sécurisée
              </div>
              <button onClick={() => setClientSecret(null)}><X size={20}/></button>
            </div>
            <div className="p-4 md:p-8 overflow-y-auto max-h-[80vh] bg-stone-50" ref={checkoutRef} />
          </div>
        </div>
      )}

      {/* PANIER SLIDE-OVER */}
      <div className={`fixed inset-0 z-[150] transition-opacity duration-500 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
        <div className={`absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-500 flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-8 border-b flex justify-between items-center">
            <h3 className="font-serif text-2xl uppercase tracking-widest italic">Votre Panier</h3>
            <button onClick={() => setIsCartOpen(false)}><X size={24} strokeWidth={1} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-4 opacity-50">
                <ShoppingBag size={48} strokeWidth={1} />
                <p className="uppercase tracking-[0.3em] text-[10px]">Le panier est vide</p>
              </div>
            ) : cart.map(item => (
              <div key={item.cartItemId} className="flex gap-6 border-b border-stone-100 pb-6 group">
                <div className="w-24 h-32 bg-stone-50 overflow-hidden">
                  <img src={item.images?.[0]} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-serif text-lg leading-tight">{item.name}</h4>
                    {item.selectedColor && (
                      <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">{item.selectedColor}</p>
                    )}
                    <p className="text-sm font-light text-[#C5A059] mt-2">{item.price} $</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center border border-stone-200">
                      <button onClick={() => updateQty(item.cartItemId, -1)} className="p-2 px-3 text-stone-400 hover:text-black transition-colors"><Minus size={12}/></button>
                      <span className="w-8 text-center text-xs font-light">{item.quantity}</span>
                      <button onClick={() => updateQty(item.cartItemId, 1)} className="p-2 px-3 text-stone-400 hover:text-black transition-colors"><Plus size={12}/></button>
                    </div>
                    <button onClick={() => removeItem(item.cartItemId)} className="text-stone-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {cart.length > 0 && (
            <div className="p-8 bg-stone-50 border-t space-y-6">
              <div className="flex justify-between items-end">
                <span className="uppercase tracking-widest text-[10px] text-stone-400">Total</span>
                <span className="font-serif text-3xl">{cart.reduce((a, b) => a + (b.price * b.quantity), 0)} $</span>
              </div>
              <button onClick={handleCheckout} disabled={isCheckingOut} className="w-full bg-[#1C1C1C] text-white py-5 text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[#C5A059] transition-all shadow-lg flex items-center justify-center gap-2">
                {isCheckingOut ? <Loader2 size={16} className="animate-spin" /> : "Procéder au paiement"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={`fixed w-full z-[100] transition-all duration-700 px-6 md:px-20 py-8 flex justify-between items-center ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent text-white'}`}>
        <h1 className="text-lg md:text-2xl font-serif uppercase tracking-[0.5em] font-light cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          Amélie Purtell
        </h1>
        <div className="flex items-center gap-10">
          <button onClick={() => setIsCartOpen(true)} className="relative group flex items-center gap-3">
             <span className="hidden md:block text-[9px] uppercase tracking-[0.3em] font-light">Mon Panier</span>
             <div className="relative">
               <ShoppingBag size={20} strokeWidth={1} className="group-hover:text-[#C5A059] transition-colors" />
               {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#C5A059] text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
             </div>
          </button>
        </div>
      </nav>

      {/* HERO SECTION AVEC VIDÉO */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        
        {/* VIDÉO EN ARRIÈRE-PLAN */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover scale-105"
          poster="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=2000&auto=format&fit=crop"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-a-leather-handbag-34407-large.mp4" type="video/mp4" />
          [Image de fond de sac de luxe]
        </video>

        <div className="relative z-20 text-center text-white space-y-8 max-w-4xl px-6">
          <Reveal delay={200}><p className="uppercase tracking-[0.6em] text-[10px] font-light opacity-70">Maison de Haute Maroquinerie</p></Reveal>
          <Reveal delay={400}><h2 className="text-5xl md:text-8xl font-serif font-light leading-tight italic drop-shadow-lg">L'Héritage Artisanal</h2></Reveal>
          <Reveal delay={600}>
            <button onClick={() => scrollToSection('store')} className="border border-white/30 backdrop-blur-sm px-14 py-5 text-[10px] uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all duration-700 font-light">
              Explorer la collection
            </button>
          </Reveal>
        </div>
      </section>

      {/* GRILLE DE PRODUITS */}
      <section id="store" className="py-32 px-6 md:px-20 max-w-7xl mx-auto">
        <div className="mb-32 text-center space-y-4">
          <Reveal><h3 className="text-3xl md:text-5xl font-serif font-light leading-tight">Pièces <span className="italic text-[#C5A059]">Intemporelles</span></h3></Reveal>
          <Reveal delay={200}><div className="w-12 h-px bg-[#C5A059] mx-auto opacity-50"></div></Reveal>
        </div>

        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-[#C5A059]" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-28">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={i * 100}>
                <div className="group cursor-pointer" onClick={() => openProductModal(p)}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-50 mb-8 shadow-sm">
                    <img src={p.images?.[0]} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" alt={p.name} />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                      <button onClick={(e) => { e.stopPropagation(); openProductModal(p); }} className="w-full bg-white text-black py-4 text-[10px] uppercase tracking-widest font-medium transition-all hover:bg-[#C5A059] hover:text-white shadow-xl translate-y-4 group-hover:translate-y-0 duration-500">
                        Voir les détails
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-end px-2">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-[#C5A059] font-medium">{p.category || 'Collection'}</p>
                      <h4 className="font-serif text-xl tracking-wide">{p.name}</h4>
                    </div>
                    <span className="text-md font-light text-stone-500">{p.price} $</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* MODALE PRODUIT */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-6xl bg-white flex flex-col md:flex-row overflow-hidden rounded-sm animate-in fade-in zoom-in-95 duration-500 max-h-[95vh]">
            <button className="absolute top-6 right-6 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full md:bg-stone-50" onClick={() => setSelectedProduct(null)}><X size={20} /></button>
            <div className="w-full md:w-3/5 bg-stone-50 relative h-[400px] md:h-auto overflow-hidden group/gal">
              <img src={selectedProduct.images?.[currentImageIndex]} className="w-full h-full object-cover transition-all duration-700" alt="" />
              {selectedProduct.images?.length > 1 && (
                <>
                  <button onClick={() => setCurrentImageIndex(prev => (prev === 0 ? selectedProduct.images.length - 1 : prev - 1))} className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/50 backdrop-blur-md rounded-full opacity-0 group-hover/gal:opacity-100 transition-opacity"><ChevronLeft size={20}/></button>
                  <button onClick={() => setCurrentImageIndex(prev => (prev === selectedProduct.images.length - 1 ? 0 : prev + 1))} className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/50 backdrop-blur-md rounded-full opacity-0 group-hover/gal:opacity-100 transition-opacity"><ChevronRight size={20}/></button>
                </>
              )}
            </div>
            <div className="w-full md:w-2/5 p-10 md:p-16 flex flex-col justify-between bg-[#FDFCFB] overflow-y-auto">
              <div className="space-y-8">
                <div className="space-y-2">
                  <p className="uppercase tracking-[0.4em] text-[10px] text-[#C5A059] font-semibold">{selectedProduct.category}</p>
                  <h2 className="text-4xl md:text-5xl font-serif leading-tight">{selectedProduct.name}</h2>
                  <p className="text-2xl font-light text-stone-600">{selectedProduct.price} $</p>
                </div>
                {selectedProduct.colors && (
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-widest text-stone-500 font-medium">Couleur : <span className="text-stone-900">{selectedColor}</span></p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.split(',').map((c: string) => c.trim()).filter(Boolean).map((color: string, idx: number) => (
                        <button key={idx} onClick={() => setSelectedColor(color)} className={`px-4 py-2 text-[10px] uppercase tracking-widest border transition-all ${selectedColor === color ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]' : 'border-stone-200 text-stone-400'}`}>
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="whitespace-pre-wrap italic text-stone-500 font-light">{selectedProduct.description}</p>
              </div>
              <div className="pt-16">
                <button onClick={() => addToCart(selectedProduct)} className="w-full bg-[#1C1C1C] text-white py-6 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-xl group flex items-center justify-center gap-4">
                  Ajouter au panier <ShoppingBag size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#1C1C1C] text-white/30 py-32 px-6 md:px-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16 text-center md:text-left">
          <div className="space-y-4">
            <h5 className="text-white font-serif text-3xl uppercase tracking-widest leading-none">Amélie Purtell</h5>
            <p className="text-[10px] uppercase tracking-[0.4em] font-light">Atelier Bordeaux — France</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 md:gap-16 text-[10px] uppercase tracking-[0.4em] font-light">
            <a href="#" className="hover:text-[#C5A059] transition-colors">Instagram</a>
            <a href="#" className="hover:text-[#C5A059] transition-colors">Sur Mesure</a>
            <button 
              onClick={() => setView('admin')} 
              className="hover:text-[#C5A059] transition-colors uppercase tracking-[0.4em] text-left md:text-center"
            >
              Accès Atelier
            </button>
          </div>
          <p className="text-[9px] uppercase tracking-[0.3em] font-light text-stone-600">
            © 2024 — Maison Amélie Purtell
          </p>
        </div>
      </footer>
    </div>
  );
}