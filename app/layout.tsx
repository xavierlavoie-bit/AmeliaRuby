import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://ameliaruby.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Amélia Ruby — Maison de haute maroquinerie artisanale | Montréal",
    template: "%s — Amélia Ruby",
  },
  description:
    "Amélia Ruby est une maison de haute maroquinerie artisanale basée à Montréal. Sacs à main, pochettes et créations sur mesure en cuir, conçus à la main. Chaque pièce est inspirée par l'histoire d'une femme.",
  applicationName: "Amélia Ruby",
  authors: [{ name: "Amélia Ruby", url: SITE_URL }],
  creator: "Amélia Ruby",
  publisher: "Maison Amélia Ruby",
  generator: "Next.js",
  keywords: [
    "Amélia Ruby",
    "Amelia Ruby",
    "maroquinerie Montréal",
    "sac à main artisanal",
    "sac en cuir Québec",
    "haute maroquinerie",
    "sac sur mesure",
    "créatrice maroquinerie",
    "atelier cuir Montréal",
    "sac de luxe canadien",
    "créateur sac main Canada",
    "pochette cuir Montréal",
    "sac AR",
    "maison artisanale",
    "luxe abordable",
  ],
  category: "fashion",
  classification: "Luxury leather goods, handcrafted handbags",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "fr-CA": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_CA",
    url: SITE_URL,
    siteName: "Amélia Ruby",
    title: "Amélia Ruby — Maison de haute maroquinerie artisanale",
    description:
      "Sacs à main et pochettes en cuir, faits à la main à Montréal. Chaque création raconte l'histoire d'une femme qui a inspiré la créatrice.",
    images: [
      {
        url: "/hero.jpeg",
        width: 1200,
        height: 630,
        alt: "Amélia Ruby — Haute maroquinerie artisanale",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Amélia Ruby — Maison de haute maroquinerie",
    description:
      "Sacs en cuir artisanaux faits à Montréal. Chaque pièce a son histoire.",
    images: ["/hero.jpeg"],
    creator: "@ameliarubyofficial",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F0F0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": `${SITE_URL}/#organization`,
  name: "Amélia Ruby",
  alternateName: ["Maison Amélia Ruby", "Amelia Ruby"],
  url: SITE_URL,
  logo: `${SITE_URL}/hero.jpeg`,
  image: `${SITE_URL}/hero.jpeg`,
  description:
    "Maison de haute maroquinerie artisanale fondée à Montréal par la créatrice Amélia Ruby. Sacs à main, pochettes et créations en cuir, faits à la main. Chaque pièce est inspirée par l'histoire d'une femme qui a marqué la créatrice.",
  founder: {
    "@type": "Person",
    name: "Amélia Ruby",
  },
  foundingLocation: {
    "@type": "Place",
    name: "Montréal, Québec, Canada",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Montréal",
    addressRegion: "QC",
    addressCountry: "CA",
  },
  areaServed: [
    { "@type": "Country", name: "Canada" },
    { "@type": "Country", name: "United States" },
    { "@type": "Country", name: "France" },
    { "@type": "Country", name: "Belgium" },
    { "@type": "Country", name: "Switzerland" },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@ameliaruby.com",
    contactType: "customer service",
    availableLanguage: ["French", "English"],
  },
  sameAs: [
    "https://www.instagram.com/ameliarubyofficial/",
    "https://www.facebook.com/LaRubiaCara",
  ],
  knowsAbout: [
    "Haute maroquinerie",
    "Travail du cuir",
    "Sacs à main artisanaux",
    "Création sur mesure",
    "Mode de luxe",
  ],
  slogan: "Chaque sac a son histoire",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: "Amélia Ruby",
  description:
    "Site officiel de la maison Amélia Ruby — haute maroquinerie artisanale, Montréal.",
  inLanguage: "fr-CA",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr-CA"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
