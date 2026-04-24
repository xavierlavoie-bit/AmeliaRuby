import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Désactive la mise en cache pour toujours avoir le bon stock affiché
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return NextResponse.json({ error: "Clé manquante" }, { status: 500 });
    
    // Assure-toi d'utiliser la même version d'API que pour ton checkout
    const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' as any });

    // Récupère uniquement les produits actifs avec leurs prix par défaut
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });

    // Formate les données pour le frontend
    const formattedProducts = products.data.map(product => {
      const price = product.default_price as Stripe.Price;
      return {
        id: product.id,
        priceId: price?.id, 
        name: product.name,
        // C'EST ICI QU'ON RÉCUPÈRE LA DESCRIPTION DE STRIPE :
        description: product.description, 
        price: price?.unit_amount ? price.unit_amount / 100 : 0,
        displayPrice: price?.unit_amount ? `${price.unit_amount / 100} $` : "Prix sur demande",
        // Au lieu de prendre seulement product.images[0], on renvoie tout le tableau d'images
        // Et on garde 'image' pour la miniature principale (la première de la liste)
        image: product.images[0] || "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
        images: product.images.length > 0 ? product.images : ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop"],
        // On récupère les tags depuis les métadonnées de Stripe (définies par ta cliente)
        category: product.metadata.category || "Collection Privée",
        tag: product.metadata.tag || ""
      };
    });

    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error("Erreur récupération produits:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}