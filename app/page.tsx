"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, X, Loader2, Lock, 
  Plus, Minus, Trash2, ChevronLeft, ChevronRight, Settings, 
  LayoutGrid, Package, PlusCircle, Upload, Eye, EyeOff, Mail, Truck, Users, Search, CheckCircle2, Clock,
  Sparkles, Send, Download, RefreshCw
} from 'lucide-react';

// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, doc, 
  updateDoc, deleteDoc, query, orderBy
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';

// Déclaration pour éviter les erreurs TypeScript
declare const __initial_auth_token: any;
declare const __firebase_config: any;
declare const __app_id: any;

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
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
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.appId || 'default-app-id';

// --- API KEY GEMINI ---
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

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

// --- FONCTION UTILITAIRE POUR APPELS API AVEC RETRY ---
const fetchWithBackoff = async (url: string, options: any, retries = 5, delay = 1000): Promise<any> => {
  try {
    const res = await fetch(url, options);
    if (!res.ok && res.status === 429 && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    return res;
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return fetchWithBackoff(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
};

export default function App() {
  // États Globaux
  const [view, setView] = useState<'shop' | 'admin'>('shop');
  const [adminTab, setAdminTab] = useState<'inventory' | 'clients'>('inventory');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [trackings, setTrackings] = useState<any[]>([]); 
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

  // États Admin - Produit
  const [isEditing, setIsEditing] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', price: '' as number | string, description: '', category: 'Sac à main', colors: '', images: [] as string[]
  });

  // États Admin - Suivi
  const [trackingForm, setTrackingForm] = useState({ 
    email: '', name: '', carrier: 'Poste Canada', trackingNumber: '', commandeId: '', produits: '' 
  });
  const [isSendingTracking, setIsSendingTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // IA Chatbot États
  const initialChatMessage = { role: 'bot', type: 'text', content: 'Bienvenue dans l\'Atelier Sur Mesure. Décrivez-moi l\'allure, les matières et les détails de la création que vous imaginez (sac, banane, pochette ordinateur...). Je me chargerai d\'en esquisser la vision.' };
  const [chatMessages, setChatMessages] = useState<Array<{role: string, type: string, content: string}>>([initialChatMessage]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  // Scroll automatique du chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isGeneratingImage]);

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

  // 3. FETCH DATA (INVENTAIRE & CLIENTS)
  useEffect(() => {
    if (!user) return;
    
    // Inventaire
    const qInv = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    const unsubInv = onSnapshot(qInv, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setIsLoading(false);
    }, (err) => {
      console.error(err);
      setIsLoading(false);
    });

    // Clients
    const qClients = collection(db, 'artifacts', appId, 'users', user.uid, 'clients');
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(data);
    }, (err) => console.warn("Note: Collection 'clients' non encore créée."));

    // Historique des suivis expédiés
    const qTrackings = collection(db, 'artifacts', appId, 'public', 'data', 'trackings');
    const unsubTrackings = onSnapshot(qTrackings, (snapshot) => {
      setTrackings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    return () => { unsubInv(); unsubClients(); unsubTrackings(); };
  }, [user]);

  // 4. MONTAGE DU CHECKOUT
  useEffect(() => {
    let checkoutInstance: any = null;

    const mountCheckout = async () => {
      if (clientSecret && stripe && checkoutRef.current) {
        try {
          checkoutInstance = await stripe.initEmbeddedCheckout({ clientSecret });
          checkoutInstance.mount(checkoutRef.current);
        } catch (error) {
          console.error("Erreur lors du montage de Stripe:", error);
        }
      }
    };

    mountCheckout();
    return () => {
      if (checkoutInstance) {
        checkoutInstance.destroy();
      }
    };
  }, [clientSecret, stripe]);

  // --- LOGIQUE PANIER ---
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

  // --- PAIEMENT ---
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

      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error("Erreur serveur :", textResponse);
        alert("Erreur serveur temporaire.");
        return;
      }

      if (!res.ok) {
        alert(`Erreur de paiement: ${data.error || "Inconnue"}`);
        return;
      }

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setIsCartOpen(false);
      }
    } catch (e) { 
      alert("Erreur de réseau lors de la création du paiement.");
    } finally { 
      setIsCheckingOut(false); 
    }
  };

  // --- LOGIQUE ADMIN ---
  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setAdminPassword('');
    setView('shop');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = (e as React.DragEvent).dataTransfer.files;
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

  const sendTrackingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingForm.commandeId || !user) return;

    setIsSendingTracking(true);
    setTrackingStatus('idle');
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'trackings'), {
        ...trackingForm,
        date: new Date().toISOString()
      });

      const clientToUpdate = clients.find(c => c.id === trackingForm.commandeId);
      if (clientToUpdate) {
        await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'clients', clientToUpdate.id), {
          statut: 'Expédié',
          trackingNumber: trackingForm.trackingNumber,
          dateExpedition: new Date().toISOString()
        });
      }

      setTrackingStatus('success');
      setTrackingForm({ ...trackingForm, trackingNumber: '', commandeId: '', produits: '' });
      setTimeout(() => setTrackingStatus('idle'), 3000);
    } catch (e) { 
      setTrackingStatus('error'); 
    } finally { 
      setIsSendingTracking(false); 
    }
  };

  const openProductModal = (product: any) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
    const productColors = product.colors ? product.colors.split(',').map((c:string) => c.trim()).filter(Boolean) : [];
    if(productColors.length > 0) setSelectedColor(productColors[0]);
    else setSelectedColor('');
  };

  // --- LOGIQUE CHATBOT IA (RÉINITIALISATION DE L'ATELIER) ---
  const resetChat = () => {
    if (confirm("Voulez-vous effacer la toile et recommencer une nouvelle création ?")) {
      setChatMessages([initialChatMessage]);
      setLatestImage(null);
      setChatInput('');
    }
  };

  // --- LOGIQUE CHATBOT IA (GÉNÉRATION D'INSPIRATION) ---
  const handleChatSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if(!chatInput.trim() || isGeneratingImage) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', type: 'text', content: userMessage }]);
    setIsGeneratingImage(true);

    // UX PRODUCTION : On compile l'historique non pas comme une contrainte stricte ("copie l'image"), 
    // mais comme un "Cahier des charges" global pour inspirer la prochaine esquisse.
    const allUserRequests = chatMessages
      .filter(m => m.role === 'user')
      .map(m => m.content);
    allUserRequests.push(userMessage); // On ajoute la dernière requête

    const designBrief = allUserRequests.join(" | ");

    // PROMPT D'INSPIRATION HAUT DE GAMME ET FLEXIBLE : 
    // Ajusté pour générer N'IMPORTE QUEL accessoire de maroquinerie (sac, banane, étui, pochette, lunchbox...)
    const safePrompt = `High-end luxury editorial photography of a bespoke artisan leather creation. The item can be a handbag, bumbag, fanny pack, laptop sleeve, lunch bag, pouch, wallet, or any custom leather accessory requested. Masterpiece, ultra-chic, sophisticated, haute couture. Highly detailed textures. Soft dramatic studio lighting, ultra-high definition, photorealistic macro details.
    STRICT RULES: Original avant-garde design. ZERO logos. ZERO monograms. ZERO text. ZERO watermarks. ZERO resolution badges. Do not mimic Chanel, Hermes, LV, or Gucci. 
    CLIENT DESIGN BRIEF: "${designBrief}". 
    Carefully read the client brief to determine the exact TYPE of item requested. Combine their ideas into a single, cohesive, beautiful luxury piece. The aesthetic must be minimalist, elegant, flawless craftsmanship. Placed on a chic, muted neutral museum plinth background.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      
      const response = await fetchWithBackoff(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: safePrompt }], 
          parameters: { sampleCount: 1 }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Détails de l'erreur de l'API :", errorText);
        throw new Error(`Erreur API (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        const imageUrl = `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
        setLatestImage(imageUrl); 
        setChatMessages(prev => [
          ...prev, 
          { role: 'bot', type: 'image', content: imageUrl },
          { role: 'bot', type: 'text', content: 'Voici une nouvelle interprétation intégrant vos dernières envies. Si cette direction vous plaît, nous pouvons l\'affiner avec notre artisan.' }
        ]);
      } else {
         throw new Error("Format de réponse invalide provenant de l'API.");
      }

    } catch (error: any) {
      console.error("Erreur complète :", error);
      
      if (!apiKey || apiKey === "") {
        setChatMessages(prev => [...prev, { role: 'bot', type: 'text', content: `⚠️ Erreur système : Clé d'API Gemini manquante pour l'atelier virtuel.` }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'bot', type: 'text', content: `Notre artisan rencontre une difficulté à visualiser ces nouveaux détails. N'hésitez pas à reformuler ou à démarrer une nouvelle toile.` }]);
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // --- GESTION DU TÉLÉCHARGEMENT DE L'IMAGE ---
  const handleDownloadImage = () => {
    if (!latestImage) return;
    const a = document.createElement('a');
    a.href = latestImage;
    a.download = `esquisse-amelie-purtell-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  // --- RENDU ADMIN ---
  if (view === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6 font-sans">
          <button onClick={() => setView('shop')} className="absolute top-10 left-10 text-[10px] uppercase tracking-[0.3em] text-stone-400 hover:text-black transition-colors flex items-center gap-2">
            <ChevronLeft size={14} /> Boutique
          </button>
          <div className="w-full max-w-sm space-y-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="space-y-4">
              <h1 className="text-2xl font-serif uppercase tracking-[0.5em] font-light">Amélie Purtell</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#C5A059] font-medium">Espace Privé Artisan</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if(adminPassword === 'atelier2024') setIsAdminAuthenticated(true); else alert("Code incorrect"); }} className="space-y-8">
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Code d'accès atelier"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-stone-200 py-4 text-center text-sm tracking-[0.2em] outline-none transition-all placeholder:text-[10px]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <button type="submit" className="w-full bg-stone-900 text-white py-5 text-[10px] uppercase tracking-[0.3em] font-medium hover:bg-[#C5A059] transition-all shadow-xl">
                Connexion
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 font-sans p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 border-b pb-8">
            <div>
              <h1 className="text-3xl font-serif">Maison Amélie Purtell</h1>
              <div className="flex gap-8 mt-6">
                <button 
                  onClick={() => setAdminTab('inventory')}
                  className={`text-[10px] uppercase tracking-widest pb-2 border-b-2 transition-all ${adminTab === 'inventory' ? 'border-[#C5A059] text-black' : 'border-transparent text-stone-400'}`}
                >
                  Collections
                </button>
                <button 
                  onClick={() => setAdminTab('clients')}
                  className={`text-[10px] uppercase tracking-widest pb-2 border-b-2 transition-all ${adminTab === 'clients' ? 'border-[#C5A059] text-black' : 'border-transparent text-stone-400'}`}
                >
                  Commandes & Suivi
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setView('shop')} className="bg-white border border-stone-200 px-6 py-3 text-[10px] uppercase tracking-widest hover:bg-stone-50 transition-all flex items-center gap-2">
                <Eye size={14}/> Boutique
              </button>
              <button onClick={logoutAdmin} className="bg-stone-900 text-white px-8 py-3 text-[10px] uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg flex items-center gap-2">
                <Lock size={14} /> Déconnexion
              </button>
            </div>
          </header>

          {adminTab === 'inventory' ? (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
             {/* FORMULAIRE PRODUIT */}
             <div className="lg:col-span-5">
               <form onSubmit={saveProduct} className="bg-white p-8 shadow-sm border border-stone-100 space-y-6 sticky top-12 rounded-sm">
                 <h3 className="font-serif text-xl border-b pb-4 flex items-center gap-2">
                   {isEditing ? <Settings size={18}/> : <PlusCircle size={18}/>}
                   {isEditing ? 'Modifier la pièce' : 'Nouvelle création'}
                 </h3>
                 <div className="space-y-4">
                   <input 
                     type="text" placeholder="Nom de la pièce" required
                     value={isEditing ? isEditing.name : newProduct.name}
                     onChange={e => isEditing ? setIsEditing({...isEditing, name: e.target.value}) : setNewProduct({...newProduct, name: e.target.value})}
                     className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                   />
                   <div className="grid grid-cols-2 gap-4">
                     <input 
                       type="number" placeholder="Prix ($ CAD)" required
                       value={isEditing ? isEditing.price : newProduct.price}
                       onChange={e => {
                         const val = e.target.value === '' ? '' : Number(e.target.value);
                         isEditing ? setIsEditing({...isEditing, price: val}) : setNewProduct({...newProduct, price: val});
                       }}
                       className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                     />
                     <input 
                       type="text" placeholder="Catégorie"
                       value={isEditing ? isEditing.category : newProduct.category}
                       onChange={e => isEditing ? setIsEditing({...isEditing, category: e.target.value}) : setNewProduct({...newProduct, category: e.target.value})}
                       className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                     />
                   </div>
                   <input 
                     type="text" placeholder="Couleurs (ex: Noir, Camel, Nude)"
                     value={isEditing ? isEditing.colors : newProduct.colors}
                     onChange={e => isEditing ? setIsEditing({...isEditing, colors: e.target.value}) : setNewProduct({...newProduct, colors: e.target.value})}
                     className="w-full border-b py-2 focus:border-[#C5A059] outline-none font-light"
                   />
                   <textarea 
                     placeholder="Histoire et détails de la pièce..." rows={4}
                     value={isEditing ? isEditing.description : newProduct.description}
                     onChange={e => isEditing ? setIsEditing({...isEditing, description: e.target.value}) : setNewProduct({...newProduct, description: e.target.value})}
                     className="w-full border border-stone-50 bg-stone-50 p-3 text-sm outline-none focus:border-[#C5A059] transition-all font-light"
                   />
                   <div className="space-y-2">
                     <label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">Photos</label>
                     <input type="file" multiple onChange={handleFileChange} className="text-[10px]" accept="image/*" />
                     <div className="grid grid-cols-4 gap-2 mt-2">
                       {(isEditing ? (isEditing.images || []) : newProduct.images).map((img: string, idx: number) => (
                         <div key={idx} className="relative aspect-square bg-stone-100 group overflow-hidden border">
                           <img src={img} className="w-full h-full object-cover" alt="" />
                           <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                             <Trash2 size={16} />
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
                 <div className="flex gap-2 pt-4">
                   <button type="submit" className="flex-1 bg-stone-900 text-white py-4 text-[10px] uppercase tracking-widest hover:bg-[#C5A059] transition-all">
                     {isEditing ? 'Mettre à jour' : 'Enregistrer'}
                   </button>
                   {isEditing && (
                     <button type="button" onClick={() => setIsEditing(null)} className="px-4 border border-stone-200 text-stone-400 hover:text-black">
                       <X size={18} />
                     </button>
                   )}
                 </div>
               </form>
             </div>

             {/* LISTE PRODUITS ADMIN */}
             <div className="lg:col-span-7">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {products.length === 0 ? (
                   <div className="col-span-2 py-20 text-center border-2 border-dashed border-stone-200 text-stone-300 uppercase tracking-widest text-[10px]">Aucune pièce en ligne</div>
                 ) : products.map(p => (
                   <div key={p.id} className="bg-white p-5 shadow-sm border border-stone-100 flex gap-5 group hover:border-[#C5A059]/30 transition-all">
                     <div className="w-20 h-28 bg-stone-50 overflow-hidden flex-shrink-0">
                       <img src={p.images?.[0]} className="w-full h-full object-cover" alt="" />
                     </div>
                     <div className="flex-1 flex flex-col justify-between">
                       <div>
                         <h4 className="font-serif text-lg leading-tight">{p.name}</h4>
                         <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-2">{p.category}</p>
                         <p className="text-xs font-bold text-[#C5A059] mt-1">{p.price} $</p>
                       </div>
                       <div className="flex gap-4 border-t border-stone-50 pt-3">
                         <button onClick={() => setIsEditing(p)} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900 flex items-center gap-1"><Settings size={10}/> Modifier</button>
                         <button onClick={() => deleteProduct(p.id)} className="text-[10px] uppercase tracking-widest text-stone-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={10}/> Supprimer</button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
          ) : (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in duration-500">
              {/* ... (Admin Commandes - Inchangé pour la concision de l'affichage) ... */}
              <div className="lg:col-span-12 py-20 text-center text-stone-400 text-sm">
                 Gestion des commandes : Sélectionnez un client pour expédier ses pièces.
              </div>
            </div>
          )}
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
          <div className="relative w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 overflow-hidden rounded-sm">
            <div className="p-4 border-b flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#C5A059] font-medium">
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
                <div className="w-24 h-32 bg-stone-50 overflow-hidden rounded-sm border">
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

      {/* HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <video 
          autoPlay loop muted playsInline 
          className="absolute inset-0 w-full h-full object-cover scale-105"
          poster="https://images.unsplash.com/photo-1590874103328-eac38a683ce7?q=80&w=2000&auto=format&fit=crop"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-fashion-model-showing-a-leather-handbag-34407-large.mp4" type="video/mp4" />
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
      <section id="store" className="py-32 px-6 md:px-20 max-w-7xl mx-auto border-b border-stone-200/50">
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
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-50 mb-8 shadow-sm rounded-sm">
                    <img src={p.images?.[0]} className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110" alt={p.name} />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                      <button className="w-full bg-white text-black py-4 text-[10px] uppercase tracking-widest font-medium transition-all hover:bg-[#C5A059] hover:text-white shadow-xl translate-y-4 group-hover:translate-y-0 duration-500">
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

      {/* SECTION IA - ATELIER SUR MESURE (REFONTE HAUT DE GAMME) */}
      <section id="bespoke-ai" className="py-24 bg-[#141414] text-white border-t border-stone-800">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12">
          
          <div className="mb-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-8 text-center md:text-left">
            <Reveal>
              <div className="flex items-center justify-center md:justify-start gap-3 text-[#C5A059] mb-4">
                <Sparkles size={16} strokeWidth={1.5} />
                <span className="text-[9px] uppercase tracking-[0.5em] font-medium">Service de Haute Conciergerie</span>
              </div>
              <h3 className="text-4xl md:text-6xl font-serif font-light leading-tight">
                L'Atelier <span className="italic text-[#C5A059] font-serif">Virtuel</span>
              </h3>
              <p className="mt-6 text-stone-400 font-light max-w-xl text-sm leading-relaxed tracking-wide">
                Exprimez votre vision. Notre intelligence artificielle, entraînée aux standards de la haute maroquinerie, esquissera un design exclusif. Une première étape d'inspiration avant de confier sa réalisation à nos artisans.
              </p>
            </Reveal>
            <Reveal delay={200}>
               <button 
                  onClick={resetChat} 
                  className="flex items-center gap-2 text-[9px] uppercase tracking-[0.3em] font-light text-stone-400 hover:text-white transition-colors border border-stone-800 px-6 py-3 rounded-full hover:bg-white/5"
                >
                  <RefreshCw size={12} /> Recommencer une création
               </button>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 h-auto lg:h-[700px]">
            
            {/* COLONNE GAUCHE : DIALOGUE (CONCIERGERIE) */}
            <div className="lg:col-span-5 flex flex-col border border-white/10 bg-white/5 backdrop-blur-md rounded-sm overflow-hidden h-[600px] lg:h-full relative">
              <div className="p-8 border-b border-white/10 flex items-center gap-4 bg-black/20">
                <div className="w-10 h-10 rounded-full border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
                  <span className="font-serif italic text-lg">P</span>
                </div>
                <div>
                  <h4 className="font-serif text-lg tracking-wide">Artisan IA</h4>
                  <p className="text-[8px] uppercase tracking-[0.3em] text-[#C5A059] mt-1">Maison Amélie Purtell</p>
                </div>
              </div>
              
              <div ref={chatScrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 scroll-smooth">
                {chatMessages.map((msg, idx) => {
                  // On cache les images dans le flux chat, car on les affiche en GÉANT à droite.
                  if (msg.type === 'image') return null; 
                  
                  return (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] ${
                        msg.role === 'user' 
                          ? 'text-right' 
                          : 'text-left'
                      }`}>
                        {msg.role === 'bot' && idx !== 0 && (
                          <span className="text-[8px] uppercase tracking-widest text-[#C5A059] mb-2 block">L'Artisan</span>
                        )}
                        <p className={`text-sm leading-relaxed font-light ${
                          msg.role === 'user' ? 'text-white italic' : 'text-stone-300'
                        }`}>
                          {msg.role === 'user' ? `« ${msg.content} »` : msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {isGeneratingImage && (
                  <div className="flex justify-start">
                    <div className="text-[#C5A059] flex items-center gap-3">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[9px] uppercase tracking-widest font-medium">Création de l'esquisse en cours...</span>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleChatSubmit} className="p-6 bg-black/40 border-t border-white/5">
                <div className="relative flex items-end gap-4">
                  <textarea 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder="Exprimez votre vision (ex: Un sac banane en cuir grainé noir, une pochette d'ordinateur...)"
                    disabled={isGeneratingImage}
                    rows={2}
                    className="w-full bg-transparent border-b border-stone-600 focus:border-[#C5A059] py-2 text-sm font-light outline-none transition-colors disabled:opacity-50 resize-none text-white placeholder:text-stone-600"
                  />
                  <button 
                    type="submit" 
                    disabled={!chatInput.trim() || isGeneratingImage}
                    className="pb-2 text-[#C5A059] hover:text-white transition-colors disabled:opacity-30 disabled:hover:text-[#C5A059]"
                  >
                    <Send size={20} strokeWidth={1.5} />
                  </button>
                </div>
              </form>
            </div>

            {/* COLONNE DROITE : LA TOILE / L'ESQUISSE (GRAND FORMAT) */}
            <div className="lg:col-span-7 bg-black flex flex-col justify-center items-center relative overflow-hidden border border-white/5 min-h-[400px]">
              {latestImage ? (
                <div className="w-full h-full p-8 md:p-16 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-1000">
                  <div className="relative max-w-full max-h-full flex items-center justify-center">
                    {/* Cadre luxueux autour de l'image */}
                    <div className="absolute -inset-4 border border-[#C5A059]/20"></div>
                    <img 
                      src={latestImage} 
                      alt="Esquisse sur mesure générée par IA" 
                      className="w-auto h-auto max-w-full max-h-[500px] object-contain shadow-2xl shadow-black"
                    />
                  </div>
                  <div className="mt-12 flex flex-col sm:flex-row items-center gap-6 opacity-90 hover:opacity-100 transition-opacity">
                    <button onClick={handleDownloadImage} className="text-[9px] uppercase tracking-[0.3em] font-light border border-white/20 hover:border-[#C5A059] px-6 py-3 rounded-full transition-all flex items-center gap-2 text-stone-300 hover:text-white">
                      <Download size={12} /> Télécharger
                    </button>
                    <button onClick={() => window.location.href = "mailto:contact@ameliepurtell.com"} className="text-[9px] uppercase tracking-[0.3em] font-medium bg-[#C5A059] text-black hover:bg-white px-8 py-3 rounded-full transition-all flex items-center gap-2">
                      <Mail size={12} /> Demander un devis
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 space-y-6 opacity-40">
                  <div className="w-24 h-32 border border-stone-700 mx-auto flex items-center justify-center mb-6 relative">
                     <div className="w-16 h-20 border border-stone-800 absolute"></div>
                     <Sparkles size={24} className="text-stone-600" strokeWidth={1} />
                  </div>
                  <h4 className="font-serif text-2xl">La Toile est Vierge</h4>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 max-w-xs mx-auto">
                    Partagez votre inspiration à notre artisan virtuel pour dévoiler votre création.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* MODALE PRODUIT */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedProduct(null)} />
          <div className="relative w-full max-w-6xl bg-white flex flex-col md:flex-row overflow-hidden rounded-sm animate-in fade-in zoom-in-95 duration-500 max-h-[95vh]">
            <button className="absolute top-6 right-6 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full" onClick={() => setSelectedProduct(null)}><X size={20} /></button>
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
                <p className="whitespace-pre-wrap italic text-stone-500 font-light leading-relaxed">{selectedProduct.description}</p>
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
            <p className="text-[10px] uppercase tracking-[0.4em] font-light">Atelier Purtell — Montréal</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 md:gap-16 text-[10px] uppercase tracking-[0.4em] font-light">
            <a href="#" className="hover:text-[#C5A059] transition-colors">Instagram</a>
            <button onClick={() => scrollToSection('bespoke-ai')} className="hover:text-[#C5A059] transition-colors uppercase tracking-[0.4em]">Sur Mesure IA</button>
            <button 
              onClick={() => setView('admin')} 
              className="hover:text-[#C5A059] transition-colors uppercase tracking-[0.4em]"
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