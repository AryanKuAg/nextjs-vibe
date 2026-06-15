"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";
import { FAQSection } from "@/modules/home/ui/components/faq-section";
import { FinalCTASection } from "@/modules/home/ui/components/final-cta-section";
import { TestimonialsSection } from "@/modules/home/ui/components/testimonials-section";

// Isolated component — bypasses React hydration entirely via useEffect
const HeroVideo = () => {
  // const containerRef = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //   const container = containerRef.current;
  //   if (!container) return;

  //   const video = document.createElement("video");
  //   video.autoplay = true;
  //   video.loop = true;
  //   video.muted = true;
  //   video.playsInline = true;
  //   video.setAttribute("preload", "auto");
  //   video.className = "w-full h-full object-cover opacity-80";

  //   const source = document.createElement("source");
  //   source.src = "/hero_video.mp4";
  //   source.type = "video/mp4";
  //   video.appendChild(source);
  //   container.appendChild(video);
  //   video.play().catch(() => { });

  //   return () => { container.innerHTML = ""; };
  // }, []);

  // return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#0e0e0e] scale-105" />;

  return (
    <div className="absolute inset-0 z-0 bg-[#0e0e0e] scale-105">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://pub-2c7b2ddd2cef4117b3dcb1c04704d106.r2.dev/Hero%20BG%20IMG.png"
        alt="Hero Background"
        className="w-full h-full object-cover opacity-80"
      />
    </div>
  );
};



interface FeatureCardProps {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const BenefitCard = ({ iconClass, title, description }: { iconClass: string; title: string; description: string }) => (
  <div className="flex flex-col p-6 bg-gradient-to-b from-[#282828] to-[#282828]/40 rounded-[24px] font-onest">
    <i className={`${iconClass} text-white mb-6 text-xl`} />
    <div className="flex flex-col">
      <h3 className="text-[16px] text-white font-[500]">{title}</h3>
      <p className="text-[14px] text-[#737373] pt-1.5 font-[500] leading-[1.4]">{description}</p>
    </div>
  </div>
);

const FeatureCard = ({ step, title, description, children }: FeatureCardProps) => (
  <div className="flex flex-col gap-2 group p-2 bg-gradient-to-b from-[#282828] to-[#282828]/40 rounded-[24px] font-onest">
    <div className="relative aspect-[5/2]   overflow-hidden p-3">
      {children}
    </div>
    <div className="flex flex-col">
      <div className="text-sm text-[#737373] pl-4 pt-2 font-[500]">{step}</div>
      <h3 className="text-[16px] text-white font-[500] pl-4 pt-2">{title}</h3>
      <p className="text-[14px] text-[#737373] pl-4 pt-0.5 pb-4 font-[500]">{description}</p>
    </div>
  </div>
)


const Page = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-white/20 pb-0 flex flex-col">
      <PillNavbar />

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-end pb-6 md:pb-[40px] px-4 overflow-hidden">
        <HeroVideo />

        {/* Uniform dark tint overlay */}
        {/* <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.16)' }}
        /> */}


        <div className="relative z-10 w-full max-w-4xl mx-auto md:px-12 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl text-white font-stack-sans-notch text-center leading-[1] drop-shadow-2xl font-[700] mb-4">
            Ship 3D websites<br />in minutes with AI
          </h1>
          <p className="font-[500] font-onest text-white mb-8 md:mb-[40px] text-sm text-center">Just describe your vision and watch it turn into a live, interactive experience in few minutes.</p>
          <ProjectForm />
        </div>
      </section>


      {/* Features Section */}
      <section className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <h2 className="mb-4 text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700]">How it works?</h2>
          <p className="text-center font-onest text-[#737373] text-sm font-[500]">From prompt to cinematic website in just three simple steps.</p>
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
              className="object-cover rounded-[16px]"
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
              className="object-cover rounded-[16px]"
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
              className="object-cover rounded-[16px]"
            />
          </FeatureCard>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <h2 className="mb-4 text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700]">Built for shipping, not configuring</h2>
          <p className="text-center font-onest text-[#737373] text-sm font-[500]">Fastest way to go from a text prompt to a live, production-ready 3D website.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BenefitCard
            iconClass="ri-mouse-line"
            title="Cinematic Scroll"
            description="Every frame, every layer — locked at 60fps. Smooth by default."
          />
          <BenefitCard
            iconClass="ri-play-fill"
            title="Seamless Video Flow"
            description="Chain multiple videos into one unbroken visual story across your entire page."
          />
          <BenefitCard
            iconClass="ri-cpu-line"
            title="Built by the Best Models"
            description="Claude, Gemini, GPT — the most powerful AI available, all in one builder."
          />
          <BenefitCard
            iconClass="ri-chat-2-line"
            title="Iterative chat editing"
            description="Describe any change in chat. Framerate updates your site in real time."
          />
          <BenefitCard
            iconClass="ri-layout-grid-line"
            title="Industry presets gallery"
            description="Start from a template built for your world — not a blank, generic canvas."
          />
          <BenefitCard
            iconClass="ri-file-code-line"
            title="Full site export"
            description="Download clean, production-ready code. Host anywhere. No lock-in, ever."
          />
        </div>
      </section>

      <TestimonialsSection />


      {/* Real Sites Section */}
      <section id="sites" className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <h2 className="text-3xl md:text-[40px] font-mono text-center text-white leading-[40px] font-[500] mb-4">Real sites. Generated.</h2>
          <p className="text-center font-mono text-[#8A8A88] text-sm">Turn ideas into polished, interactive websites in minutes, not weeks.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="https://storage.googleapis.com/sites.framerate.space/sites/cb0b14d4-2546-49aa-9999-90dbbc0c83cc/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-[16px] font-onest overflow-hidden relative"
          >
            <div className="relative aspect-[2880/1800] w-full bg-transparent">
              <Image src="/giftmas.png" alt="Giftmas" fill className="object-cover scale-[1.01]" />
              <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity py-2 rounded-[10px] border text-white border-white text-[15px] flex items-center justify-center bg-white/8 backdrop-blur-sm z-10 h-[32px] hover:bg-white/16">
                Preview
              </div>
            </div>
          </a>

          <a
            href="https://f1-master-framerate.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-[16px] font-onest overflow-hidden relative"
          >
            <div className="relative aspect-[2880/1800] w-full bg-transparent">
              <Image src="/f1-master.png" alt="F1 Master" fill className="object-cover scale-[1.01]" />
              <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity py-2 rounded-[10px] border text-white border-white text-[15px] flex items-center justify-center bg-white/8 backdrop-blur-sm z-10 h-[32px] hover:bg-white/16">
                Preview
              </div>
            </div>
          </a>

          <a
            href="https://aviator-fr.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-[16px] font-onest overflow-hidden relative"
          >
            <div className="relative aspect-[2880/1800] w-full bg-transparent">
              <Image src="/aviator.png" alt="Aviator" fill className="object-cover scale-[1.01]" />
              <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity py-2 rounded-[10px] border text-white border-white text-[15px] flex items-center justify-center bg-white/8 backdrop-blur-sm z-10 h-[32px] hover:bg-white/16">
                Preview
              </div>
            </div>
          </a>
        </div>
      </section>



      {/* Pricing Section */}
      {/* <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <PricingSection title="Pricing" />
      </section> */}

      <section className="py-[60px] md:py-20 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <FAQSection />
      </section>

      {/* Final CTA Section */}
      <FinalCTASection />

      <Footer />
    </div>
  );
};

export default Page;
