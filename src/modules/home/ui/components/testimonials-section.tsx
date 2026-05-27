const testimonials = [
  {
    name: "Livia Vaccaro",
    country: "Germany",
    flag: "🇩🇪",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Rayna Lubin",
    country: "Oman",
    flag: "🇴🇲",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Craig Aminoff",
    country: "Singapore",
    flag: "🇸🇬",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Ruben Vaccaro",
    country: "Netherlands",
    flag: "🇳🇱",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Jocelyn Gouse",
    country: "Greece",
    flag: "🇬🇷",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Adison Herwitz",
    country: "Singapore",
    flag: "🇸🇬",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Madelyn Herwitz",
    country: "South Korea",
    flag: "🇰🇷",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
  {
    name: "Jaxson Septimus",
    country: "United States",
    flag: "🇺🇸",
    text: "My clients think I hired a 3D design agency. I used a Framerate preset and swapped the copy. Done in an afternoon.",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col items-center mb-10">
        <h2 className="text-3xl md:text-[40px] font-mono text-center text-white leading-[40px] font-[500] mb-4">
          Builders who shipped with presets
        </h2>
        <p className="text-center font-mono text-[#8A8A88] text-sm">
          Real people, real launches - shared with their consent.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((testimonial, idx) => (
          <div 
            key={idx} 
            className="flex flex-col bg-[#282828] rounded-[16px] p-6 font-inconsolata border border-transparent hover:border-white/5 transition-colors"
          >
            <div className="text-[#8A8A88] text-4xl mb-2 font-serif leading-none opacity-50 font-bold">
              “
            </div>
            <p className="text-[#CCCCCC] text-[14px] flex-1 mb-8 leading-relaxed">
              {testimonial.text}
            </p>
            <div className="flex items-center justify-between text-xs mt-auto text-[#8A8A88]">
              <span className="text-white">{testimonial.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{testimonial.flag}</span>
                <span>{testimonial.country}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
