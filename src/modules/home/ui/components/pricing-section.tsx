interface PricingCardProps {
  title: string;
  desc: string;
  price: string;
  features: string[];
}

const PricingCard = ({ title, desc, price, features }: PricingCardProps) => (
  <div className="flex flex-col bg-[#272725] rounded-[8px] p-4 font-inconsolata">
    <h3 className="text-2xl text-white mb-0">{title}</h3>
    <p className="text-sm text-[#666666] mb-8">{desc}</p>
    <div className="flex items-end gap-2 mb-6">
      <span className="text-[40px] font-[500] text-white leading-[1]">${price}</span>
      <span className="text-sm text-[#666666] mb-1.5 leading-[1]">Billed monthly</span>
    </div>
    <button className="w-full h-[36px] bg-white text-black rounded-lg text-sm font-[500] mb-8">
      Get {title.toLowerCase()}
    </button>
    <div className="flex flex-col gap-2">
      {features.map((f, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-white">
          <i className="ri-check-line text-white text-sm leading-none mt-1" />
          <span className="leading-relaxed">{f}</span>
        </div>
      ))}
    </div>
  </div>
);

const PLANS: PricingCardProps[] = [
  {
    title: "Basic",
    desc: "For first-time AI content creators",
    price: "19",
    features: [
      "1,500 credits / mo",
      "30 images",
      "15 videos",
      "2 websites",
      "20 design edits",
      "Veo 3.1 & Nano Banana Pro",
      "Credits refresh on billing date",
      "Commercial use",
    ],
  },
  {
    title: "Plus",
    desc: "For consistent and easy AI content creation",
    price: "39",
    features: [
      "2,500 credits / mo",
      "50 images",
      "25 videos",
      "4 websites",
      "35 design edits",
      "Veo 3.1 & Nano Banana Pro",
      "Credits refresh on billing date",
      "Commercial use",
    ],
  },
  {
    title: "Pro",
    desc: "For creators building AI projects",
    price: "59",
    features: [
      "3,500 credits / mo",
      "120 images",
      "60 videos",
      "6 websites",
      "40 design edits",
      "Veo 3.1 & Nano Banana Pro",
      "Credits refresh on billing date",
      "Commercial use",
    ],
  },
];

interface PricingSectionProps {
  title?: string;
}

export const PricingSection = ({ title }: PricingSectionProps) => (
  <div>
    {title && (
      <h2 className="text-3xl md:text-[40px] font-mono text-center text-white mb-10">
        {title}
      </h2>
    )}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PLANS.map((plan) => (
        <PricingCard key={plan.title} {...plan} />
      ))}
    </div>
  </div>
);
