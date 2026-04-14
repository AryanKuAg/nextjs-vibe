"use client";

import Image from "next/image";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/nextjs";

import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";



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

interface PricingCardProps {
  title: string;
  desc: string;
  price: string;
  features: string[];
}

const PricingCard = ({ title, desc, price, features }: PricingCardProps) => (
  <div className="flex flex-col bg-[#272725] rounded-[8px] p-4  font-inconsolata ">
    <h3 className="text-2xl text-white mb-2">{title}</h3>
    <p className="text-sm  text-[#666666] mb-8">{desc}</p>
    <div className="flex items-end gap-2 mb-6">
      <span className="text-[40px] font-[500] text-white leading-[1]">${price}</span>
      <span className="text-sm text-[#666666] mb-1.5 leading-[1]">Billed monthly</span>
    </div>
    <button className="w-full py-[13px] bg-white text-black rounded-lg text-sm font-[500]  mb-8 ">
      Get {title.toLowerCase()}
    </button>
    <div className="flex flex-col gap-2">
      {features.map((f: string, i: number) => (
        <div key={i} className="flex items-start gap-2 text-sm text-white">
          <i className="ri-check-line text-white text-sm leading-none mt-1" />
          <span className="leading-relaxed">{f}</span>
        </div>
      ))}
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
            // autoPlay
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
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl md:text-5xl font-mono text-center text-white mb-10">Pricing</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PricingCard
            title="Basic"
            desc="For first-time AI content creators"
            price="19"
            features={[
              "1,500 credits / mo",
              "30 images",
              "15 videos",
              "2 websites",
              "20 design edits",
              "Veo 3.1 & Mono Banono Pro",
              "Credits refresh on billing date",
              "Commercial use"
            ]}
          />
          <PricingCard
            title="Plus"
            desc="For consistent and easy AI content creation"
            price="39"
            features={[
              "2,500 credits / mo",
              "50 images",
              "25 videos",
              "4 websites",
              "35 design edits",
              "Veo 3.1 & Mono Banono Pro",
              "Credits refresh on billing date",
              "Commercial use"
            ]}
          />
          <PricingCard
            title="Pro"
            desc="For creators building AI projects"
            price="59"
            features={[
              "3,500 credits / mo",
              "120 images",
              "60 videos",
              "6 websites",
              "40 design edits",
              "Veo 3.1 & Mono Banono Pro",
              "Credits refresh on billing date",
              "Commercial use"
            ]}
          />
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 flex flex-col items-center text-center font-inconsolata">
        <h2 className="text-3xl md:text-5xl text-white mb-4 font-[500]">Build 3D websites 10x faster with AI</h2>
        <p className="text-sm text-[#666666] mb-[40px]">Take a single prompt into cinematic motion, frame sequences, and a scroll-driven 3D website. Built in minutes, ready to ship.</p>
        <div className="flex gap-2">
          <SignedOut>
            <SignUpButton>
              <button className="px-3 py-2 bg-white text-black text-sm font-[500] rounded-[8px] hover:bg-white">Sign up</button>
            </SignUpButton>
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
