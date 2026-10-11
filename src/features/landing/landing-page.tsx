"use client";

import { Features } from "./features";
import { LandingFooter } from "./footer";
import { Hero } from "./hero";
import { McpSection } from "./mcp-section";
import { LandingNav } from "./nav";
import { PainGrid, Workflow, WorksWith } from "./sections-a";
import { CommunitySection, ExportStrip, Faq, FinalCta } from "./sections-b";
import { ContributorsSlides } from "./contributors-slides";
import { SupportSection } from "./support-section";
import { useSignedIn } from "./use-signed-in";
import { VideoDemo } from "./video-demo";

/** The public landing page at `/` (the editor lives at `/app`). */
export function LandingPage() {
  const signedIn = useSignedIn();
  return (
    <div className="min-h-dvh bg-[#060608] text-zinc-50">
      <LandingNav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <WorksWith />
        <VideoDemo />
        <PainGrid />
        <Workflow />
        <Features />
        <McpSection />
        <ExportStrip />
        <CommunitySection />
        <ContributorsSlides />
        <SupportSection />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
