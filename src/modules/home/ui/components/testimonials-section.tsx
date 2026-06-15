const testimonials = [
  {
    name: "Livia Vaccaro",
    country: "Germany",
    flag: "🇩🇪",
    text: "I had zero design skills and a weekend. Framerate gave me a site that looks like I spent thousands. My investors were impressed before I even pitched.",
  },
  {
    name: "Rayna Lubin",
    country: "Oman",
    flag: "🇴🇲",
    text: "I've tried every website builder out there. Nothing comes close to the depth here. The 3D animations made my portfolio feel alive — clients book calls now without me chasing them.",
  },
  {
    name: "Craig Aminoff",
    country: "Singapore",
    flag: "🇸🇬",
    text: "Launched my SaaS landing page in under 3 hours. The preset nailed the vibe I was going for. Conversion rate in the first week was better than my old custom-coded site.",
  },
  {
    name: "Ruben Vaccaro",
    country: "Netherlands",
    flag: "🇳🇱",
    text: "My co-founder thought I hired a creative studio. I just picked a preset, dropped in our copy, and hit publish. The look is genuinely cinematic.",
  },
  {
    name: "Jocelyn Gouse",
    country: "Greece",
    flag: "🇬🇷",
    text: "Every freelancer I know is switching to this. I rebuilt my entire agency site in an afternoon. The 3D sections alone justify the price — clients comment on it every single call.",
  },
  {
    name: "Adison Herwitz",
    country: "Singapore",
    flag: "🇸🇬",
    text: "I used to dread website updates. Now I actually enjoy tweaking things. The presets are so well-designed that even my small changes look intentional and polished.",
  },
  {
    name: "Madelyn Herwitz",
    country: "South Korea",
    flag: "🇰🇷",
    text: "Shipped my product launch page in one sitting. The animated background stopped people mid-scroll — our waitlist grew 4x faster than our last launch. Wild.",
  },
  {
    name: "Jaxson Septimus",
    country: "United States",
    flag: "🇺🇸",
    text: "I've built sites on Webflow, Framer, and Squarespace. This is the first tool where the default output looks better than what I'd build from scratch. Genuinely shocked.",
  },
];

export const TestimonialsSection = () => {
  return (
    <section className="py-[60px] md:py-20 px-4 sm:px-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col items-center mb-10">
        <h2 className="mb-4 text-3xl md:text-[40px] font-stack-sans-notch text-center text-white leading-[40px] font-[700]">
          Trusted by builders shipping real work
        </h2>
        <p className="text-center font-onest text-[#737373] text-sm font-[500]">
          See what founders, creators, and teams are saying after shipping with us.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="flex flex-col bg-gradient-to-b from-[#282828] to-[#282828]/40 rounded-[24px] p-6 font-onest"
          >
            <div className="text-[#737373] text-3xl mb-4 font-space-grotesk leading-none font-bold">
              “
            </div>
            <p className="text-white text-[14px] font-[500] flex-1 mb-10 leading-[1.6]">
              {testimonial.text}
            </p>
            <div className="flex items-center justify-between mt-10">
              <span className="text-white text-[14px] font-[500]">{testimonial.name}</span>
              <div className="flex items-center gap-1.5 text-[#737373] text-[14px] font-[500]">
                <span>{testimonial.flag}</span>
                <span>{testimonial.country}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
