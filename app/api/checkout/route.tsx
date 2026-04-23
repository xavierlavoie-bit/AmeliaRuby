import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      console.error("ERREUR: STRIPE_SECRET_KEY manquante sur le serveur.");
      return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2026-03-25.dahlia' as any,
    });

    const body = await request.json();
    const { productId, price, name, image } = body;

    if (!productId || !price || !name) {
      return NextResponse.json({ error: "Informations manquantes." }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      // LA CORRECTION EST ICI : on utilise 'embedded_page'
      ui_mode: 'embedded_page' as any,
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

    return NextResponse.json({ clientSecret: session.client_secret });

  } catch (error: any) {
    console.error("Erreur Stripe:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'initialisation du paiement." },
      { status: 500 }
    );
  }
}