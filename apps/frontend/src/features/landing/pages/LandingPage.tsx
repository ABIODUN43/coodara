import { FadeIn } from "@/components/common/FadeIn";

import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { ArchitectureDemo } from "../components/ArchitectureDemo";
import { HowItWorks } from "../components/HowItWorks";
import { TrustedBy } from "../components/TrustedBy";
import { Testimonials } from "../components/Testimonials";
import { FAQ } from "../components/FAQ";
import { CTA } from "../components/CTA";
import { Footer } from "../components/Footer";

export function LandingPage() {
    return (
        <>
            <Navbar />

            <Hero />

            <FadeIn>
                <Features />
            </FadeIn>

            <FadeIn>
                <ArchitectureDemo />
            </FadeIn>

            <FadeIn>
                <HowItWorks />
            </FadeIn>

            <FadeIn>
                <TrustedBy />
            </FadeIn>

            <FadeIn>
                <Testimonials />
            </FadeIn>

            <FadeIn>
                <FAQ />
            </FadeIn>

            <FadeIn>
                <CTA />
            </FadeIn>

            <Footer />
        </>
    );
}