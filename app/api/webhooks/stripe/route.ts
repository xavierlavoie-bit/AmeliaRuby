import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// --- INITIALISATION SÉCURISÉE ---
let db: Firestore;

const initAdmin = () => {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("❌ Variables Firebase Admin manquantes dans le .env.");
    }

    // Nettoyage robuste de la clé privée pour éviter l'erreur DECODER
    let formattedKey = privateKey.trim();
    
    // Retrait des guillemets simples ou doubles au début et à la fin
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    } else if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
      formattedKey = formattedKey.slice(1, -1);
    }

    // Remplacement des sauts de ligne échappés (\n textuel) par de vrais sauts de ligne
    formattedKey = formattedKey.replace(/\\n/g, '\n');

    // Sécurité supplémentaire au cas où les retours à la ligne autour du header/footer manqueraient
    if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----\n')) {
      formattedKey = formattedKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    }
    if (!formattedKey.includes('\n-----END PRIVATE KEY-----')) {
      formattedKey = formattedKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
  }
  db = getFirestore();
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
});

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(req: Request) {
  console.log("🚀 [Webhook] Requête reçue.");
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Config error" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email || session.customer_email;
    const customerName = session.customer_details?.name || "Client";
    const amount = (session.amount_total || 0) / 100;
    
    // Récupération des produits depuis les metadata (envoyés lors de la création de session)
    const produits = session.metadata?.produits || "";

    if (customerEmail) {
      try {
        initAdmin();
        
        // --- SAUVEGARDE FIREBASE ---
        // NOUVEAU: Utilisation de session.id pour créer une nouvelle entrée à chaque commande
        // au lieu d'utiliser l'adresse courriel qui écraserait les anciennes commandes.
        await db.collection('clients').doc(session.id).set({
          nom: customerName,
          email: customerEmail,
          totalDepense: amount,
          produits: produits,
          statut: 'À préparer',
          derniereCommande: new Date().toISOString(),
          accepteNewsletter: true,
          mode: session.livemode ? "production" : "test",
          commandeId: session.id
        }, { merge: true });
        
        console.log(`📂 Nouvelle commande ${session.id} enregistrée dans Firebase pour ${customerEmail}.`);

        // --- ENVOI EMAIL ---
        const emailHtml = `
          <div style="font-family: 'Times New Roman', serif; max-width: 600px; margin: auto; padding: 50px 20px; color: #1C1C1C; background-color: #ffffff; border: 1px solid #f0f0f0;">
            <div style="text-align: center;">
              <h1 style="text-transform: uppercase; letter-spacing: 6px; font-weight: 300; font-size: 24px; margin-bottom: 10px;">Amélie Purtell</h1>
              <p style="text-transform: uppercase; letter-spacing: 3px; font-size: 10px; color: #999; margin-bottom: 30px;">Haute Maroquinerie Artisanale</p>
              <div style="height: 1px; background: #C5A059; width: 50px; margin: 0 auto 30px auto;"></div>
            </div>
            <p style="font-style: italic;">Bonjour ${customerName},</p>
            <p style="line-height: 1.8;">C’est un privilège pour nous de savoir qu'une de nos créations vous accompagnera bientôt. Votre commande est actuellement en cours de préparation dans notre atelier.</p>
            <p style="line-height: 1.8;"><strong>Un numéro de suivi vous sera transmis personnellement</strong> par courriel dès que votre colis aura été confié à notre transporteur.</p>
            <p style="text-align: center; margin-top: 40px; font-size: 10px; color: #bbb; letter-spacing: 2px;">Montréal — Québec</p>
          </div>
        `;

        await sgMail.send({
          to: customerEmail,
          from: 'Maison Amélie Purtell <xavier.lavoie@optimiplex.com>',
          replyTo: 'atelier@ameliepurtell.com',
          subject: 'Merci de votre confiance — Maison Amélie Purtell',
          text: `Bonjour ${customerName}, votre commande est en cours de préparation.`,
          html: emailHtml,
        });
        console.log(`✅ Email envoyé avec succès !`);

      } catch (error: any) {
        console.error("❌ ERREUR CRITIQUE FIREBASE OU SENDGRID:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}