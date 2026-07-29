import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesSection } from "@/components/landing/features-section";
import { TransparencySection } from "@/components/landing/transparency-section";
import { StatsSection } from "@/components/landing/stats-section";
import { CtaSection } from "@/components/landing/cta-section";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <main className="bg-background">
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <FeaturesSection />
      <TransparencySection />
      <StatsSection />
      <CtaSection />
      <SiteFooter />
    </main>
  );
}
