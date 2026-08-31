// @ts-nocheck
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export function FullWidthNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 bg-transparent ${scrolled ? "py-4" : "py-8"
          }`}
      >
        <div className="max-w-[1400px] mx-auto px-8 md:px-16 flex items-center justify-between">
          {/* Logo */}
          <div
            className="text-lg font-sans font-black text-white tracking-tight cursor-pointer lowercase"
            onClick={() => { setIsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          >
            Brand
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-8">
            <button className="hidden sm:block text-[10px] uppercase tracking-[0.2em] font-medium text-white/50 hover:text-white transition-colors">
              Login
            </button>
            <button className="px-6 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-[9px] uppercase tracking-[0.15em] rounded-full hover:bg-white hover:text-black transition-all duration-300">
              Join the Waitlist
            </button>

            <button
              className="md:hidden flex items-center justify-center text-white/80 hover:text-white transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[49] bg-black/95 backdrop-blur-2xl md:hidden flex flex-col items-center justify-center gap-10"
          >
            <a href="#about" onClick={(e) => handleNavClick(e, 'about')} className="text-2xl font-serif italic text-white hover:text-white/70 transition-colors">About</a>
            <a href="#features" onClick={(e) => handleNavClick(e, 'features')} className="text-2xl font-serif italic text-white hover:text-white/70 transition-colors">Features</a>
            <a href="#pricing" onClick={(e) => handleNavClick(e, 'pricing')} className="text-2xl font-serif italic text-white hover:text-white/70 transition-colors">Pricing</a>

            <div className="flex flex-col items-center gap-4 mt-8">
              <button className="text-[12px] uppercase tracking-[0.2em] text-white/60">Login</button>
              <button className="px-10 py-3 bg-white text-black text-[12px] uppercase tracking-[0.2em] rounded-full">Join the Waitlist</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
