import { FadeIn } from "@/components/common/FadeIn";
import { Navbar } from "../../../components/common/Navbar";
import { Hero } from "../components/LandingPageComponents/Hero";
import { MarqueeSection } from "../components/LandingPageComponents/MarqueeSection";
import { ToolchainSection } from "../components/LandingPageComponents/ToolchainSection";
import { HowItWorks } from "../components/LandingPageComponents/HowItWorks";
import { FeaturesSection } from "../components/LandingPageComponents/FeaturesSection";
import { ArchitectChat } from "../components/LandingPageComponents/ArchitectChat";
import { EnterpriseSection } from "../components/LandingPageComponents/EnterpriseSection";
import { FinalCTA } from "../components/LandingPageComponents/FinalCTA";
import { Footer } from "../../../components/common/Footer";
import { GithubAnalysis } from "../components/LandingPageComponents/GithubAnalysis";

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