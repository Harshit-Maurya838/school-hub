import React from "react";
import { getAuthenticatedUser } from "@/lib/auth";
import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { InteractiveProductDemo } from "@/components/landing/InteractiveProductDemo";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { RoleSolutions } from "@/components/landing/RoleSolutions";
import { RoiCalculator } from "@/components/landing/RoiCalculator";
import { ArchitectureSecurity } from "@/components/landing/ArchitectureSecurity";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  const destination = user?.role === "SUPER_ADMIN" ? "/platform" : user ? "/school" : "/login";

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar user={user} dashboardHref={destination} />

      {/* Main Content Flow */}
      <main>
        {/* 1. Hero Section */}
        <HeroSection isLoggedIn={Boolean(user)} userDestination={destination} />

        {/* 2. Live Interactive Product Demo & Module Switcher */}
        <InteractiveProductDemo />

        {/* 3. Deep-Dive Feature Grid */}
        <FeatureGrid />

        {/* 4. Audience-Tailored Solutions (Principals, Teachers, Finance, Parents, Admins) */}
        <RoleSolutions />

        {/* 5. Interactive ROI & Cost Savings Calculator */}
        <RoiCalculator />

        {/* 6. Architecture, Compliance & Multi-Tenant Security */}
        <ArchitectureSecurity />

        {/* 7. Verified Educator Testimonials */}
        <TestimonialsSection />

        {/* 8. Predictable Institutional Pricing */}
        <PricingSection />

        {/* 9. Frequently Asked Questions */}
        <FaqSection />

        {/* 10. High-Impact Call to Action Banner */}
        <CtaBanner isLoggedIn={Boolean(user)} userDestination={destination} />
      </main>

      {/* Enterprise Institutional Footer */}
      <Footer />
    </div>
  );
}
