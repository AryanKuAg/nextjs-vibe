// @ts-nocheck
export function Features() {
  return (
    <section className="relative min-h-[100svh] w-full px-8 md:px-16 py-20 flex flex-col justify-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start gap-12">
        <h2 className="text-4xl md:text-6xl font-sans font-bold text-white tracking-tighter uppercase mb-8">
          The Engineering Loop.
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          {/* Feature 1 */}
          <div className="flex flex-col items-start border-l border-white/20 pl-6">
            <div className="text-white/40 text-[10px] font-sans mb-3 tracking-widest">01</div>
            <h3 className="text-lg font-sans font-bold uppercase mb-3 text-white">Precision Design</h3>
            <p className="text-white/60 font-light text-xs leading-relaxed uppercase tracking-wide font-sans">
              Every micro-millimeter is modeled to eliminate drag and increase downforce.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="flex flex-col items-start border-l border-white/20 pl-6">
            <div className="text-white/40 text-[10px] font-sans mb-3 tracking-widest">02</div>
            <h3 className="text-lg font-sans font-bold uppercase mb-3 text-white">Wind Tunnel Testing</h3>
            <p className="text-white/60 font-light text-xs leading-relaxed uppercase tracking-wide font-sans">
              Thousands of hours in computational fluid dynamics to guarantee stability.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="flex flex-col items-start border-l border-white/20 pl-6">
            <div className="text-white/40 text-[10px] font-sans mb-3 tracking-widest">03</div>
            <h3 className="text-lg font-sans font-bold uppercase mb-3 text-white">Track Deployment</h3>
            <p className="text-white/60 font-light text-xs leading-relaxed uppercase tracking-wide font-sans">
              Real-world validation under the most extreme conditions possible.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
