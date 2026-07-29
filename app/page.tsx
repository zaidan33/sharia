import { Hero } from "@/components/landing/hero";
import { ProblemSection } from "@/components/landing/problem-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TransparencySection } from "@/components/landing/transparency-section";
import { CtaSection } from "@/components/landing/cta-section";

export default function Home() {
  return (
    <main className="bg-background">
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <TransparencySection />
      <CtaSection />
    </main>
  );
}
