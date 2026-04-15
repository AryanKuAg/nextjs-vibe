"use client";

import Image from "next/image";
import { SignedIn, SignedOut, useSignIn } from "@clerk/nextjs";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";
import { PricingSection } from "@/modules/home/ui/components/pricing-section";

const GoogleCTAButton = () => {
  const { signIn, isLoaded } = useSignIn();

  const handleClick = () => {
    if (!isLoaded) return;
    signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  return (
    <button
      onClick={handleClick}
      className="px-3 py-2 bg-white text-black text-sm font-[500] rounded-[8px] hover:bg-white/90 transition-colors"
    >
      Sign up with Google
    </button>
  );
};


interface FeatureCardProps {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const FeatureCard = ({ step, title, description, children }: FeatureCardProps) => (
  <div className="flex flex-col gap-2 group p-2 bg-[#272725] rounded-[8px] font-inconsolata">
    <div className="relative aspect-[5/2] bg-[#272725]  overflow-hidden p-3">
      {children}
    </div>
    <div className="flex flex-col">
      <div className="text-sm text-[#CCCCCC] pl-2 pb-2">{step}</div>
      <h3 className="text-[16px] text-white font-[500] pl-2">{title}</h3>
      <p className="text-[14px] text-[#CCCCCC] pl-2">{description}</p>
    </div>
  </div>
)


const Page = () => {
  return (
    <div className="min-h-screen bg-[#1C1C1C] selection:bg-white/20 pb-0 flex flex-col">
      <PillNavbar />

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex flex-col items-center justify-center pt-24 pb-12 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[#0e0e0e]">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-80"
          >
            <source src="/hero_video.mp4" type="video/mp4" />
          </video>
          {/* <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-[#0e0e0e]/20 to-transparent pointer-events-none" /> */}
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl text-white font-inconsolata text-center leading-[1] mb-[40px] drop-shadow-2xl font-[500]">
            Build 3D websites<br />10x faster with AI
          </h1>
          <div className="w-full max-w-3xl mx-auto px-4 md:px-12">
            <ProjectForm />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl md:text-5xl font-mono text-center text-white mb-10">From prompt to production</h2>

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
              className="object-cover rounded-lg"
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
              className="object-cover rounded-lg"
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
              className="object-cover rounded-lg"
            />
          </FeatureCard>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

      {/* Final CTA Section */}
      <section className="py-20 px-6 flex flex-col items-center text-center font-inconsolata">
        <h2 className="text-3xl md:text-5xl text-white mb-4 font-[500]">Build 3D websites 10x faster with AI</h2>
        <p className="text-sm text-[#666666] mb-[40px]">Take a single prompt into cinematic motion, frame sequences, and a scroll-driven 3D website. Built in minutes, ready to ship.</p>
        <div className="flex gap-2">
          <SignedOut>
            <GoogleCTAButton />
            <button className="px-3 py-2 bg-transparent text-white/50 border border-[#41413F] text-sm font-[500] rounded-[8px]">View pricing</button>
          </SignedOut>
          <SignedIn>
            <button className="px-3 py-2 bg-transparent text-white/50 border border-[#41413F] text-sm font-[500] rounded-[8px] ">View pricing</button>
          </SignedIn>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Page;
