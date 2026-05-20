// @ts-nocheck
import { useStore } from "./store/useStore";
import { Preloader } from "./components/Preloader";
import { CanvasScroll } from "./components/CanvasScroll";
import { Navbar } from "./components/Navbar";

import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Details } from "./components/sections/Details";
import { Footer } from "./components/sections/Footer";

export default function App() {
  const isReady = useStore((state: any) => state.isReady);

  return (
    <>
      <Preloader />
      
      <div className={`relative w-full transition-opacity duration-1000 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <CanvasScroll />
        <Navbar />
        
        <main className="w-full relative z-10 text-white flex flex-col">
          <Hero />
          <Features />
          <Details />
          <Footer />
        </main>
      </div>
    </>
  );
}
