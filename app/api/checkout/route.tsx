import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialisation de Stripe avec la clé secrète et la version spécifiée
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any, // "as any" évite l'erreur TS si la version est trop récente pour les types installés
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, price, name, image } = body;

    if (!productId || !price || !name) {
      return NextResponse.json({ error: "Informations manquantes." }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Création de la session en mode "Embedded" (Intégré)
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded' as any, // "as any" corrige l'erreur de typage strict 'UiMode'
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: name,
              images: image ? [image] : [],
              description: 'Haute Maroquinerie - Maison Amélie Purtell',
            },
            unit_amount: Math.round(price * 100), 
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    // On renvoie le secret client pour afficher le formulaire sur le frontend
    return NextResponse.json({ clientSecret: session.client_secret });

  } catch (error: any) {
    console.error("Erreur Stripe:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation du paiement." },
      { status: 500 }
    );
  }
}