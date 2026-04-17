import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Compliance – Spatial",
  description: "Spatial's compliance commitments and certifications.",
};

const LegalFooter = () => (
  <div className="mt-40 pt-6 flex items-center justify-start text-sm text-[#CCCCCC] font-inconsolata gap-4">
    <span>2026 © Spatial</span>

    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
    <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
    <Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link>

  </div>
);

export default function CompliancePage() {
  return (
    <div className="min-h-screen bg-[#1C1C1C] font-inconsolata">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="flex items-center gap-2 mb-11">
          <Image src="/logo.svg" alt="Spatial" width={24} height={24} />
          <span className="text-white text-lg">Spatial</span>
        </Link>

        <h1 className="text-[40px] font-[500] text-white mb-11">Compliance</h1>
        <p className="text-sm text-[#CCCCCC] mb-12">Last updated: April 16, 2026</p>

        <div className="space-y-10 text-sm text-[#CCCCCC] leading-relaxed">
          <section>
            <h2 className="text-white text-xl mb-3">1. Our commitment</h2>
            <p>
              Spatial is committed to operating in accordance with applicable laws and regulations. We take compliance seriously across data protection, security, and workplace standards.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">2. Data protection</h2>
            <p className="mb-2">We comply with applicable data protection laws, including:</p>
            <ul className="space-y-1 list-none">
              <li>- The EU General Data Protection Regulation (GDPR) and UK GDPR for users in the EEA and UK.</li>
              <li>- The California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) for California residents.</li>
              <li>- Other applicable privacy laws in jurisdictions where we operate.</li>
            </ul>
            <p className="mt-3">
              Our Privacy Policy describes in detail how we collect, use, and protect personal data. Users may exercise their data rights by contacting us at contact@spatial.app.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">3. Security practices</h2>
            <p className="mb-2">We implement technical and organizational measures to protect data, including:</p>
            <ul className="space-y-1 list-none">
              <li>- Encryption of data in transit using TLS.</li>
              <li>- Access controls and role-based permissions for internal systems.</li>
              <li>- Regular security reviews and vulnerability assessments.</li>
              <li>- Incident response procedures to address breaches promptly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">4. Sub-processors and third parties</h2>
            <p>
              We use reputable third-party providers for hosting, payments, analytics, and AI infrastructure. Each sub-processor is bound by data processing agreements consistent with applicable law. We evaluate providers for security and compliance before engaging them.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">5. AI and responsible use</h2>
            <p>
              We are committed to responsible AI development and deployment. Our acceptable use policy prohibits using Spatial to generate harmful, illegal, or deceptive content. We actively work to detect and prevent misuse of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">6. Accessibility</h2>
            <p>
              We aim to make the Service accessible to as many users as possible and are working toward conformance with recognized accessibility standards. If you experience accessibility barriers, please contact us so we can help.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">7. Reporting concerns</h2>
            <p className="mb-2">If you have concerns about our compliance practices, you can reach us at:</p>
            <p>Email: contact@spatial.app</p>
            <p className="mt-3">
              We take all compliance concerns seriously and aim to respond promptly. Where required by law, you may also have the right to lodge a complaint with a relevant supervisory authority.
            </p>
          </section>

          <section>
            <h2 className="text-white text-xl mb-3">8. Updates</h2>
            <p>
              We may update this page as our compliance practices evolve or as new requirements apply. Please check the &ldquo;Last updated&rdquo; date at the top for the latest version.
            </p>
          </section>
        </div>

        <LegalFooter />
      </div>
    </div>
  );
}
