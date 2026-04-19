import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Cookie Policy – Framerate",
  description: "Find out how Framerate uses cookies and similar technologies to improve your experience.",
  openGraph: {
    title: "Cookie Policy – Framerate",
    description: "Find out how Framerate uses cookies and similar technologies to improve your experience.",
    url: "https://www.framerate.space/cookies",
    siteName: "Framerate",
  },
  twitter: {
    card: "summary",
    title: "Cookie Policy – Framerate",
    description: "Find out how Framerate uses cookies and similar technologies to improve your experience.",
  },
};

const LegalFooter = () => (
  <div className="mt-40 pt-6 flex items-center justify-start text-sm text-[#CCCCCC] font-inconsolata gap-4">
    <span>2026 © Framerate</span>

    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
    <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
    <Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link>

  </div>
);

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-[#1C1C1C] font-inconsolata">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-2 mb-11">
          <Image src="/logo.png" alt="Framerate" width={24} height={24} />
          <span className="text-white text-lg">Framerate</span>
        </Link>

        <h1 className="text-[40px] font-[500] text-white mb-11">Cookie policy</h1>
        <p className="text-sm text-[#CCCCCC] mb-12">Last updated: April 16, 2026</p>

        <div className="space-y-10 text-sm text-[#CCCCCC] leading-relaxed">
          <section>
            <h2 className="text-white text-xl mb-3">1. What this policy covers</h2>
            <p>
              This Cookie Policy explains how Framerate&rsquo;s websites and web applications (&ldquo;Service&rdquo;) use cookies, pixels, local storage, and similar technologies (&ldquo;cookies&rdquo;). Please read it together with our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">2. What cookies are</h2>
            <p>
              Cookies are small text files stored on your device by your browser. They help the Service remember you, keep you signed in, and understand how the Service is used; similar technologies include pixels, scripts, and browser storage APIs.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">3. How long cookies last</h2>
            <ul className="space-y-1 list-none">
              <li>- Session cookies: removed when you close your browser.</li>
              <li>- Persistent cookies: stay on your device for a set time or until you delete them.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">4. Types of cookies we use</h2>

            <p className="text-white mb-2">4.1 Strictly necessary</p>
            <p className="mb-6">
              These cookies are needed for core features like login, security, and essential preferences (for example, cookie banner choices). You generally cannot disable them without affecting how the Service works.
            </p>

            <p className="text-white mb-2">4.2 Functional</p>
            <p className="mb-6">
              These remember choices such as language, UI state, and layout to improve your experience.
            </p>

            <p className="text-white mb-2">4.3 Analytics and performance</p>
            <p className="mb-6">
              These help us measure traffic, feature usage, and errors. We may use our own or third-party analytics tools (similar to Firebase / Google Analytics-class tools) that collect pseudonymous IDs, device data, and events; where required, we rely on consent or legitimate interests.
            </p>

            <p className="text-white mb-2">4.4 Marketing and advertising</p>
            <p>
              We may use pixels or tags from advertising partners (for example, Meta/Facebook-type tools) to measure conversions and show more relevant ads on other platforms. Where law requires, we will ask for your consent before setting non-essential marketing cookies.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">5. Third-party technologies</h2>
            <p className="mb-2">Depending on how the Service is set up, third parties may set or read cookies, including:</p>
            <ul className="space-y-1 list-none">
              <li>- Authentication and infrastructure providers used to run accounts and hosting.</li>
              <li>- Analytics services that aggregate usage statistics.</li>
              <li>- Advertising and measurement tools (for attribution and ad reporting).</li>
              <li>- Payment processors that handle checkout and billing.</li>
            </ul>
            <p className="mt-3">Each provider processes data under its own privacy policy, which we recommend you review.</p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">6. Your choices</h2>
            <p className="mb-2">You can manage cookies in several ways:</p>
            <ul className="space-y-1 list-none">
              <li>- Browser settings: Most browsers let you block or delete cookies; blocking all cookies may break sign-in or other features.</li>
              <li>- Industry tools: In some regions, you can use opt-out tools for interest-based ads (for example, ad preference tools or Mobile advertising ID settings).</li>
              <li>- Global Privacy Control (GPC): Where required by applicable US state law, we honor recognized opt-out signals such as GPC for relevant processing.</li>
              <li>- Consent tools: In the EEA, UK, and Switzerland, we place non-essential cookies (such as some analytics or marketing cookies) only after you accept them, where required.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">7. Do Not Track</h2>
            <p>
              There is currently no common standard for &ldquo;Do Not Track&rdquo; signals. We handle legally recognized opt-out mechanisms (such as GPC, where applicable) as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">8. Updates</h2>
            <p>
              We may update this Cookie Policy when we change our tools or practices. Please check the &ldquo;Last updated&rdquo; date at the top for the latest version.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">9. Contact</h2>
            <p className="mb-2">If you have questions or want help with cookie preferences, contact:</p>
            <p>Email: teamframerate@gmail.com</p>
          </section>
        </div>

        <LegalFooter />
      </div>
    </div>
  );
}
