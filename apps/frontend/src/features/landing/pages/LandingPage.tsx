import { FadeIn } from "@/components/common/FadeIn";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { MarqueeSection } from "../components/MarqueeSection";
import { ToolchainSection } from "../components/ToolchainSection";
import { HowItWorks } from "../components/HowItWorks";
import { FeaturesSection } from "../components/FeaturesSection";
import { ArchitectChat } from "../components/ArchitectChat";
import { EnterpriseSection } from "../components/EnterpriseSection";
import { FinalCTA } from "../components/FinalCTA";
import { Footer } from "../components/Footer";
import { GithubAnalysis } from "../components/GithubAnalysis";

export function LandingPage() {
    return (
        <div className="bg-[#fcf8fa]">
            <Navbar />
            <Hero />
            <FadeIn>
                <MarqueeSection />
            </FadeIn>
            <GithubAnalysis />
            <FadeIn>
                <ToolchainSection />
            </FadeIn>
            <FadeIn>
                <HowItWorks />
            </FadeIn>
            <FadeIn>
                <FeaturesSection />
            </FadeIn>
            <FadeIn>
                <ArchitectChat />
            </FadeIn>
            <FadeIn>
                <EnterpriseSection />
            </FadeIn>
            <FadeIn>
                <FinalCTA />
            </FadeIn>  
            <FadeIn>
                <Footer />
            </FadeIn>
        </div>
    );
}