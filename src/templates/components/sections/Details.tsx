// @ts-nocheck
export function Details() {
  return (
    <section className="relative min-h-[100svh] w-full px-8 md:px-16 py-20 flex flex-col justify-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-16">
        
        <div className="w-full md:w-1/2 flex flex-col items-start">
          <h2 className="text-5xl md:text-7xl font-sans font-bold text-white tracking-tighter uppercase mb-6">
            Performance.
          </h2>
          <p className="text-white/60 font-light text-sm leading-relaxed max-w-md mb-8">
            Our commitment to speed goes beyond the surface. We engineer components that redefine what is physically possible on the tarmac.
          </p>
          
          <div className="flex flex-col gap-4 w-full border-t border-white/10 pt-8">
            <div className="flex justify-between items-center w-full">
              <span className="text-white text-sm uppercase tracking-wider">Top Speed</span>
              <span className="text-white font-bold text-xl">350 KM/H</span>
            </div>
            <div className="flex justify-between items-center w-full">
              <span className="text-white text-sm uppercase tracking-wider">0-100 Acceleration</span>
              <span className="text-white font-bold text-xl">2.4s</span>
            </div>
            <div className="flex justify-between items-center w-full">
              <span className="text-white text-sm uppercase tracking-wider">Downforce</span>
              <span className="text-white font-bold text-xl">1200 KG</span>
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-1/2 bg-black/40 backdrop-blur-md p-8 border border-white/10 rounded-2xl">
          <h3 className="text-xl text-white font-bold uppercase mb-4">Configuration</h3>
          <p className="text-white/50 text-xs mb-6">Customize your aerodynamic package for your specific circuit requirements.</p>
          
          <button className="w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors">
            Build Your Own
          </button>
        </div>
        
      </div>
    </section>
  );
}
