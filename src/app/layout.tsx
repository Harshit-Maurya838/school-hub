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

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Classic Giga | School Management for K-12 Schools",
    template: "%s | Classic Giga",
  },
  description:
    "Classic Giga is an enterprise-grade multi-tenant school management platform featuring academic years, attendance tracking, examinations, student profiles, and fee collections.",
  applicationName: "Classic Giga",
  authors: [{ name: "Classic Giga Team" }],
  generator: "Next.js",
  keywords: [
    "Classic Giga",
    "School Management System",
    "Education SaaS",
    "School ERP",
    "Student Information System",
    "Attendance Tracking",
    "Academic Management",
    "Fee Collections",
    "Exam Marks Entry",
    "Multi-tenant Education",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Classic Giga",
  publisher: "Classic Giga",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Classic Giga",
    title: "Classic Giga | School Management for K-12 Schools",
    description:
      "Enterprise-grade multi-tenant school management platform for academic administration, attendance registers, examinations, and fee collections.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Classic Giga | School Management for K-12 Schools",
    description:
      "Enterprise-grade multi-tenant school management platform for academic administration, attendance registers, examinations, and fee collections.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
