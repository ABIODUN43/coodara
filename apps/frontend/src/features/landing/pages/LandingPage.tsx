import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { TrustedBy } from "../components/TrustedBy";
import { Features } from "../components/Features";
import { ArchitectureDemo } from "../components/ArchitectureDemo";
import { HowItWorks } from "../components/HowItWorks";
import { Testimonials } from "../components/Testimonials";
import { FAQ } from "../components/FAQ";
import { CTA } from "../components/CTA";
import { Footer } from "../components/Footer";

export function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustedBy />
      <Features />
      <ArchitectureDemo />
      <HowItWorks />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}