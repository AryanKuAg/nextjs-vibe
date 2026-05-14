"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";
import { FAQSection } from "@/modules/home/ui/components/faq-section";
import { FinalCTASection } from "@/modules/home/ui/components/final-cta-section";

// Isolated component — bypasses React hydration entirely via useEffect
const HeroVideo = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const video = document.createElement("video");
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("preload", "auto");
    video.className = "w-full h-full object-cover opacity-80";

    const source = document.createElement("source");
    source.src = "/hero_video.mp4";
    source.type = "video/mp4";
    video.appendChild(source);
    container.appendChild(video);
    video.play().catch(() => { });

    return () => { container.innerHTML = ""; };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#0e0e0e] scale-105" />;
};



interface FeatureCardProps {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const FeatureCard = ({ step, title, description, children }: FeatureCardProps) => (
  <div className="flex flex-col gap-2 group p-2 bg-[#282828] rounded-[16px] font-inconsolata">
    <div className="relative aspect-[5/2] bg-[#282828]  overflow-hidden p-3">
      {children}
    </div>
    <div className="flex flex-col">
      <div className="text-sm text-[#CCCCCC] pl-2 pb-1">{step}</div>
      <h3 className="text-[16px] text-white font-[500] pl-2">{title}</h3>
      <p className="text-[14px] text-[#CCCCCC] pl-2">{description}</p>
    </div>
  </div>
)


const Page = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col">
      <PillNavbar />

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-end pb-[40px] px-4 overflow-hidden">
        <HeroVideo />

        <div className="relative z-10 w-full max-w-4xl mx-auto md:px-12 flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl text-white font-inconsolata text-center leading-[1] drop-shadow-2xl font-[500] mb-[40px]">
            Ship 3D websites<br />in minutes with AI
          </h1>
          <ProjectForm />
        </div>
      </section>

      {/* Real Sites Section */}
      <section id="sites" className="py-[60px] md:py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <h2 className="text-3xl md:text-[40px] font-mono text-center text-white leading-[40px] font-[500] mb-4">Real sites. Generated.</h2>
          <p className="text-center font-mono text-[#8A8A88] text-sm">Turn ideas into polished, interactive websites in minutes, not weeks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="group p-2 bg-[#282828] rounded-[16px] font-inconsolata">
            <div className="relative aspect-[4/3] md:aspect-video  rounded-[8px] overflow-hidden flex items-end ">
              <a
                href="https://bit.ly/4f7EoPq"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full opacity-0 group-hover:opacity-100 transition-opacity py-2 rounded-[10px] border text-white border-white text-[15px] flex items-center justify-center bg-white/8 backdrop-blur-sm z-10 h-[32px] hover:bg-white/16"
              >
                Preview
              </a>
            </div>
          </div>

          <div className="p-2 bg-[#282828] rounded-[16px] font-inconsolata">
            <div className="relative aspect-[4/3] md:aspect-video  rounded-[8px] overflow-hidden" />
          </div>

          <div className="p-2 bg-[#282828] rounded-[16px] font-inconsolata">
            <div className="relative aspect-[4/3] md:aspect-video  rounded-[8px] overflow-hidden" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-[60px] md:py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <h2 className="mb-4 text-3xl md:text-[40px] font-mono text-center text-white leading-[40px] font-[500]">How it works?</h2>
          <p className="text-center font-mono text-[#8A8A88] text-sm">From prompt to cinematic website in just three simple steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            step="01"
            title="Generate background"
            description="Prompt and create a custom scene with AI."
          >
            <Image
              src="/generate_background.png"
              alt="Generate background"
              fill
              className="object-cover rounded-[8px]"
            />
          </FeatureCard>

          <FeatureCard
            step="02"
            title="Animate the scene"
            description="Turn your image into a smooth cinematic video."
          >
            <Image
              src="/animate_the_scene.png"
              alt="Animate the scene"
              fill
              className="object-cover rounded-[8px]"
            />
          </FeatureCard>

          <FeatureCard
            step="03"
            title="Build your website"
            description="Convert video into a scroll driven 3D experience."
          >
            <Image
              src="/build_your_website.png"
              alt="Build your website"
              fill
              className="object-cover rounded-[8px]"
            />
          </FeatureCard>
        </div>
      </section>

      {/* Pricing Section */}
      {/* <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <PricingSection title="Pricing" />
      </section> */}

      <section className="py-[60px] md:py-20 px-6 max-w-2xl mx-auto w-full">
        <FAQSection />
      </section>

      {/* Final CTA Section */}
      <FinalCTASection />

      <Footer />
    </div>
  );
};

export default Page;
