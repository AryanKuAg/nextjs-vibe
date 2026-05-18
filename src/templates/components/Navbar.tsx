// @ts-nocheck
export function Navbar() {
  return (
    <nav style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 50 }} className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 min-w-[600px] w-fit text-white">
      <div className="font-serif text-lg tracking-wide font-medium">Brand</div>
      <div className="flex items-center gap-8 text-sm font-light text-white/80">
        <a href="#about" className="hover:text-white transition-colors">About</a>
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
      </div>
      <button className="bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-white/90 transition-colors">
        Sign up
      </button>
    </nav>
  );
}
