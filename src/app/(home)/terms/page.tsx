import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Terms of service – Framerate",
  description: "Terms governing your use of Framerate.",
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#1C1C1C] font-inconsolata">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-2 mb-11">
          <Image src="/logo.png" alt="Framerate" width={24} height={24} />
          <span className="text-white text-lg">Framerate</span>
        </Link>

        <h1 className="text-[40px] font-[500] text-white mb-11">Terms of service</h1>
        <p className="text-sm text-[#CCCCCC] mb-12">Last updated: April 16, 2026</p>

        <div className="space-y-10 text-sm text-[#CCCCCC] leading-relaxed">
          <section>
            <h2 className="text-white text-xl mb-3">1. Agreement</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of Framerate&rsquo;s websites, apps, and services (the &ldquo;Service&rdquo;). By using the Service, you agree to these Terms. If you use the Service on behalf of an organization, you confirm you have authority to accept these Terms for it. Our Privacy Policy explains how we handle personal data and is part of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">2. Eligibility</h2>
            <p>You may use the Service only if you are legally allowed to do so in your country and are not under 16 years old.</p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">3. Accounts</h2>
            <p>You are responsible for your account, all activity under it, and keeping your credentials secure. Tell us promptly if you suspect unauthorized access.</p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">4. Plans and payments</h2>
            <p className="mb-2">Some features require a paid plan or usage-xld fees, as shown at checkout or on our pricing pages.</p>
            <ul className="space-y-1 list-none">
              <li>- Subscriptions renew automatically unless you cancel before the renewal date.</li>
              <li>- Fees paid are generally non-refundable except where required by law or stated otherwise.</li>
              <li>- You authorize us and our payment providers to charge your selected payment method for fees and applicable taxes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">5. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="space-y-1 list-none">
              <li>- Break the law or violate third-party rights.</li>
              <li>- Share or generate illegal, infringing, or harmful content.</li>
              <li>- Attack or attempt to bypass the Service&rsquo;s security or technical limits.</li>
              <li>- Reverse engineer, scrape, or misuse the Service to build competing models or services.</li>
              <li>- Resell or give others unauthorized access to your account.</li>
              <li>- Interfere with the normal operation of the Service.</li>
            </ul>
            <p className="mt-3">We may suspend or terminate access if we reasonably believe these Terms are violated.</p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">6. Your content</h2>
            <p>
              You keep ownership of content you submit or create with the Service (&ldquo;Your Content&rdquo;). You give Framerate a limited license to host, process, and display that content as needed to provide and improve the Service. You promise you have the rights to Your Content and that using it in the Service does not break any laws or rights.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">7. AI outputs</h2>
            <p>
              Framerate uses AI to generate and transform content. Outputs may be inaccurate or unsuitable, and you are responsible for reviewing and using them, especially in sensitive or high-impact contexts.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">8. Our IP</h2>
            <p>
              Framerate owns the Service and all related technology, designs, and branding, except Your Content and third-party materials. You receive only a limited right to use the Service under these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">9. Third-party services</h2>
            <p>
              We rely on third-party providers (for example, hosting, payments, analytics, AI models), and the Service may link to other sites. Their terms and privacy policies govern your use of those services, and we are not responsible for them.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">10. Disclaimers</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent allowed by law, Framerate disclaims all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not guarantee uninterrupted or error-free operation.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">11. Limitation of liability</h2>
            <p>
              To the extent allowed by law, Framerate will not be liable for any indirect or consequential damages, or lost profits, data, or business, arising from or related to the Service or these Terms. Our total liability for all claims will not exceed the greater of: (a) the amount you paid Framerate for the Service in the 12 months before the claim, or (b) US $100 (or local equivalent), unless a higher limit is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">12. Termination</h2>
            <p>
              You can stop using the Service at any time. We may suspend or end your access if you breach these Terms. If we end or discontinue the Service, Sections that by nature should survive termination (for example, IP, disclaimers, and limits of liability) will continue to apply.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">13. Governing law</h2>
            <p>
              Unless another law is mandatory, these Terms are governed by the laws of India, excluding conflicts of law rules. Courts located in India will generally handle disputes, without limiting any non-waivable consumer rights you may have in your home country.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">14. Changes</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will update the &ldquo;Last updated&rdquo; date and, where reasonable, give notice. If you continue using the Service after changes take effect, you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">15. Contact</h2>
            <p className="mb-2">For questions about these Terms, contact us at:</p>
            <p>Email: teamframerate@gmail.com</p>
          </section>
        </div>

        <LegalFooter />
      </div>
    </div>
  );
}
