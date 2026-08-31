// @ts-nocheck
import ScrollFrames from "./components/ScrollFrames";
import { Navbar } from "./components/Navbar";

import { Hero } from "./components/sections/Hero";
import { Features } from "./components/sections/Features";
import { Details } from "./components/sections/Details";
import { Footer } from "./components/sections/Footer";

export default function App() {
  return (
    <>
      <ScrollFrames />
      <Navbar />

      <main className="w-full relative z-10 text-white flex flex-col">
        <Hero />
        <Features />
        <Details />
        <Footer />
      </main>
    </>
  );
}
