"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { SignedIn, SignedOut, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { motion } from "framer-motion";
import { ProjectForm } from "@/modules/home/ui/components/project-form";
import { PillNavbar } from "@/modules/home/ui/components/pill-navbar";
import { Footer } from "@/modules/home/ui/components/footer";
import { FAQSection } from "@/modules/home/ui/components/faq-section";
import { FinalCTASection } from "@/modules/home/ui/components/final-cta-section";
import { TestimonialsSection } from "@/modules/home/ui/components/testimonials-section";
import { PricingSection } from "@/modules/home/ui/components/pricing-section";
import { ComparisonSection } from "@/modules/home/ui/components/comparison-section";

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
    video.className = "w-full h-full object-cover ";

    const source = document.createElement("source");
    source.src = "https://assets.framerate.space/hero_bg_480p.mp4";
    source.type = "video/mp4";
    video.appendChild(source);
    container.appendChild(video);
    video.play().catch(() => { });

    return () => { container.innerHTML = ""; };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-[#0e0e0e] scale-105" />;

  // return (
  //   <motion.div
  //     className="absolute inset-0 z-0 bg-[#0e0e0e]"
  //     initial={{ opacity: 0, scale: 1.05 }}
  //     animate={{ opacity: 1, scale: 1 }}
  //     transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
  //   >
  //     {/* eslint-disable-next-line @next/next/no-img-element */}
  //     <img
  //       src="https://assets.framerate.space/Hero%20BG%20IMG.png"
  //       alt="Hero Background"
  //       className="w-full h-full object-cover opacity-80"
  //     />
  //   </motion.div>
  // );
};



interface SitePreviewCardProps {
  title: string;
  href: string;
  imgSrc: string;
}

const SitePreviewCard = ({ title, href, imgSrc }: SitePreviewCardProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="group block rounded-[24px] font-onest overflow-hidden relative"
  >
    <div className="relative aspect-[1280/720] w-full bg-transparent">
      <Image src={imgSrc} alt={`${title} - 3D scroll library template`} fill className="object-cover  transition-transform duration-500 group-hover:scale-105" />

      {/* Top Gradient for text readability */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

      {/* Top Left Title */}
      <div className="absolute top-6 left-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <span className="text-white font-[500] text-sm md:text-[15px]">{title}</span>
      </div>

      {/* Top Right Preview Pill */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 text-white text-[15px] px-6 py-2.5 rounded-[16px] flex items-center justify-center font-[500] hover:bg-black/60 transition-colors">
          Preview
        </div>
      </div>
    </div>
  </a>
);

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
);

const BrowseTemplatesButton = () => {
  const { signIn, isLoaded } = useSignIn();
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const createProject = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.projects.getMany.queryOptions());
        queryClient.invalidateQueries(trpc.usage.status.queryOptions());
        router.push(`/projects/${data.id}`);
      },
    })
  );

  const handleGoogleSignIn = async () => {
    if (!isLoaded || isPending) return;
    setIsPending(true);
    try {
      window.google?.accounts.id.cancel();
    } catch { }
    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: "/sso-callback",
      redirectUrlComplete: "/",
    });
  };

  const handleStartBuilding = async () => {
    await createProject.mutateAsync({ value: "" });
  };

  const isActionPending = isPending || createProject.isPending;

  const btnClass = "px-6 py-3.5 rounded-[12px] border border-[#2c2c2c] hover:bg-white/4 transition-colors text-white text-sm font-[500] font-onest flex items-center justify-center disabled:opacity-50";

  if (!mounted) {
    return (
      <button disabled className={btnClass}>
        Browse all templates
      </button>
    );
  }

  return (
    <>
      <SignedOut>
        <button onClick={handleGoogleSignIn} disabled={isActionPending} className={btnClass}>
          {isActionPending ? "Loading..." : "Browse all templates"}
        </button>
      </SignedOut>
      <SignedIn>
        <button onClick={handleStartBuilding} disabled={isActionPending} className={btnClass}>
          {isActionPending ? "Loading..." : "Browse all templates"}
        </button>
      </SignedIn>
    </>
  );
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(2px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  }
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
    }
  }
};

const FadeInSection = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <motion.section
    id={id}
    className={className}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.3 }}
    variants={{
      visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
      hidden: {}
    }}
  >
    {children}
  </motion.section>
);

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


        <motion.div
          className="relative z-10 w-full max-w-4xl mx-auto md:px-12 flex flex-col items-center"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
            hidden: {}
          }}
        >
          <motion.h1 variants={heroItemVariants} className="text-4xl md:text-6xl text-white font-stack-sans-notch text-center leading-[1] drop-shadow-2xl font-[700] mb-4">
            Ship 3D websites in minutes<br />with our 3D Scroll Library & AI
          </motion.h1>
          <motion.p variants={heroItemVariants} className="font-[500] font-onest text-white mb-8 md:mb-[40px] text-sm text-center">
            Just describe your vision and watch it turn into a live, interactive experience in few minutes.
          </motion.p>
          <motion.div variants={heroItemVariants} className="w-full flex justify-center">
            <ProjectForm />
          </motion.div>
        </motion.div>
      </section>


      {/* Features Section */}
      <FadeInSection className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <motion.h2 variants={itemVariants} className="mb-4 text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700]">How it works?</motion.h2>
          <motion.p variants={itemVariants} className="text-center font-onest text-[#737373] text-sm font-[500]">From prompt to cinematic website in just three simple steps.</motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
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
          </motion.div>

          <motion.div variants={itemVariants}>
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
          </motion.div>

          <motion.div variants={itemVariants}>
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
          </motion.div>
        </div>
      </FadeInSection>

      {/* Benefits Section */}
      <FadeInSection id="features" className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <motion.h2 variants={itemVariants} className="mb-4 text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700]">Built for shipping, not configuring</motion.h2>
          <motion.p variants={itemVariants} className="text-center font-onest text-[#737373] text-sm font-[500]">Fastest way to go from a text prompt to a live, production-ready 3D website.</motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
            <BenefitCard
              iconClass="ri-mouse-line"
              title="Cinematic Scroll"
              description="Every frame, every layer — locked at 60fps. Smooth by default."
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BenefitCard
              iconClass="ri-play-fill"
              title="Seamless Video Flow"
              description="Chain multiple videos into one unbroken visual story across your entire page."
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BenefitCard
              iconClass="ri-cpu-line"
              title="Built by the Best Models"
              description="Claude, Gemini, GPT — the most powerful AI available, all in one builder."
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BenefitCard
              iconClass="ri-chat-2-line"
              title="Iterative chat editing"
              description="Describe any change in chat. Framerate updates your site in real time."
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BenefitCard
              iconClass="ri-layout-grid-line"
              title="Industry presets gallery"
              description="Start from a template built for your world — not a blank, generic canvas."
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <BenefitCard
              iconClass="ri-file-code-line"
              title="Full site export"
              description="Download clean, production-ready code. Host anywhere. No lock-in, ever."
            />
          </motion.div>
        </div>
      </FadeInSection>

      {/* Real Sites Section */}
      <FadeInSection id="sites" className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="flex flex-col items-center mb-10">
          <motion.h2 variants={itemVariants} className="text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700] mb-4">Sites you&apos;ll wish were yours</motion.h2>
          <motion.p variants={itemVariants} className="text-center font-onest text-[#737373] text-sm">Not sure where to start? Pick a scene built with our 3d scroll library.</motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={itemVariants}>
            <SitePreviewCard
              title="Vaultone"
              href="https://vaultoneframerate.netlify.app"
              imgSrc="https://assets.framerate.space/templates/stake/template.png"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SitePreviewCard
              title="Orbis"
              href="https://orbisframerate.netlify.app"
              imgSrc="https://assets.framerate.space/templates/planet%20robot/template.jpg"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SitePreviewCard
              title="Theo"
              href="https://theoframerate.netlify.app/"
              imgSrc="https://assets.framerate.space/templates/Theo/Template.png"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SitePreviewCard
              title="Strata"
              href="https://strataframerate.netlify.app/"
              imgSrc="https://assets.framerate.space/templates/stone/template.png"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SitePreviewCard
              title="Aether"
              href="https://spacexmarsmission.netlify.app"
              imgSrc="https://assets.framerate.space/mars_template.jpg"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <SitePreviewCard
              title="Obisidian"
              href="https://obisidianframerate.netlify.app"
              imgSrc="https://assets.framerate.space/templates/turtle/template.png"
            />
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className="mt-10 flex justify-center font-onest">
          <BrowseTemplatesButton />
        </motion.div>
      </FadeInSection>

      <TestimonialsSection />

      <FadeInSection id="pricing" className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full text-center">
        <PricingSection title="Simple, transparent pricing" desc="Flexible plans built for hobbyists, creators, and teams." />
      </FadeInSection>

      <FadeInSection>
        <motion.div variants={itemVariants}>
          <ComparisonSection />
        </motion.div>
      </FadeInSection>

      {/* Pricing Section */}
      {/* <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <PricingSection title="Pricing" />
      </section> */}

      <FadeInSection className="py-[60px] md:py-20 px-4 sm:px-6 max-w-2xl mx-auto w-full">
        <motion.div variants={itemVariants}>
          <FAQSection />
        </motion.div>
      </FadeInSection>

      {/* Final CTA Section */}
      <FadeInSection className="px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <motion.div variants={itemVariants}>
          <FinalCTASection />
        </motion.div>
      </FadeInSection>

      <Footer />
    </div>
  );
};

export default Page;
