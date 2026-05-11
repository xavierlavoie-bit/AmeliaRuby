import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ============================================================
// RATE LIMITING — anti-bot protection
// ============================================================
const PER_IP_LIMIT = 5;          // requêtes par IP par fenêtre
const PER_IP_WINDOW_MS = 60_000 * 30; // fenêtre 30 minutes
const GLOBAL_DAILY_LIMIT = 200;   // plafond global par jour (sécurité portefeuille)
const MAX_BRIEF_LENGTH = 1000;    // longueur max du prompt utilisateur

const ipRequests = new Map<string, { count: number; resetAt: number }>();
let globalCounter = { count: 0, resetAt: Date.now() + 86_400_000 };

const getClientIp = (req: NextRequest): string => {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
};

const checkRateLimit = (ip: string): { ok: boolean; reason?: string } => {
  const now = Date.now();

  if (now > globalCounter.resetAt) {
    globalCounter = { count: 0, resetAt: now + 86_400_000 };
  }
  if (globalCounter.count >= GLOBAL_DAILY_LIMIT) {
    return { ok: false, reason: 'global_daily_limit' };
  }

  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + PER_IP_WINDOW_MS });
  } else {
    if (entry.count >= PER_IP_LIMIT) {
      return { ok: false, reason: 'ip_rate_limit' };
    }
    entry.count += 1;
  }

  globalCounter.count += 1;

  if (ipRequests.size > 5000) {
    for (const [key, val] of ipRequests.entries()) {
      if (now > val.resetAt) ipRequests.delete(key);
    }
  }

  return { ok: true };
};

// ============================================================
// HANDLER
// ============================================================
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY manquante dans .env serveur');
    return NextResponse.json({ error: 'Service non configuré' }, { status: 500 });
  }

  const ip = getClientIp(req);

  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    console.warn(`Rate limit hit: ip=${ip} reason=${rl.reason}`);
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429 }
    );
  }

  let body: { designBrief?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const designBrief = (body.designBrief || '').toString().trim();
  if (!designBrief || designBrief.length === 0) {
    return NextResponse.json({ error: 'Brief vide' }, { status: 400 });
  }
  if (designBrief.length > MAX_BRIEF_LENGTH) {
    return NextResponse.json({ error: 'Brief trop long' }, { status: 400 });
  }

  const safePrompt = `Luxury fashion editorial product photography. A single bespoke artisan leather creation, custom-designed for a client of the Amelia Ruby atelier. This is a dream bag visualization — the design, colors, materials, and details are entirely defined by the client brief below.

PHOTOGRAPHY STYLE: High-end studio shot, Chanel / Bottega Veneta editorial level. Rembrandt lighting from upper-left, soft fill light from right. Pure white seamless background. Camera angle: 3/4 elevated view showing front and one side. Macro-sharp focus on leather grain, stitching, and hardware. Shallow depth of field on background. Photorealistic, medium format camera quality.

BRANDING — MANDATORY: The bag must display the "AR" monogram in TWO ways: (1) A small debossed "AR" lettermark pressed directly into the leather on the front center panel — elegant blind embossing, same color as the leather, subtle but visible. (2) A small polished gold metal charm or plate engraved with "AR" attached to a zipper pull, D-ring, or strap hardware. Both brand marks must be clearly legible and look like a real luxury house signature.

CRAFTSMANSHIP DNA: Artisan atelier quality. Fine hand-stitching. Premium hardware (gold, silver, aged brass, or as requested). Structured or supple silhouette depending on the brief.

STRICT RULES: No watermarks, no resolution badges, no other brand names. Do not replicate exact silhouettes of Chanel, Hermès, Louis Vuitton, or Gucci — original design only.

CLIENT DESIGN BRIEF: "${designBrief}".
This brief defines EVERYTHING: the item type, colors, materials, textures, hardware finish, style, mood. Read it carefully and translate it into one single, cohesive, breathtaking luxury piece. Make it look real, handcrafted, and utterly desirable.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: safePrompt }],
        parameters: { sampleCount: 1 },
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error(`Erreur Gemini (${upstream.status}):`, err);
      return NextResponse.json(
        { error: 'Erreur lors de la génération' },
        { status: 502 }
      );
    }

    const data = await upstream.json();
    const base64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) {
      return NextResponse.json({ error: 'Format de réponse invalide' }, { status: 502 });
    }

    return NextResponse.json({ imageUrl: `data:image/png;base64,${base64}` });
  } catch (error: any) {
    console.error('Erreur génération image:', error?.message || error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
