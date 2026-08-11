// @ts-nocheck
export function Story() {
  return (
    <section className="relative w-full px-8 md:px-16 py-28 flex flex-col justify-center">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-14 items-start">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
          Built the long way round.
        </h2>

        <div className="flex flex-col gap-6">
          <p className="text-base leading-relaxed max-w-[65ch] opacity-80">
            Replace this with the real story: who does the work, how it is made, and what the
            customer actually gets. Two short paragraphs, concrete detail, no filler verbs.
          </p>
          <div className="border-t pt-6 flex flex-col gap-4 opacity-90">
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-sm font-medium">First claim</span>
              <span className="text-sm opacity-70">A specific, verifiable detail.</span>
            </div>
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-sm font-medium">Second claim</span>
              <span className="text-sm opacity-70">Another one, equally concrete.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
