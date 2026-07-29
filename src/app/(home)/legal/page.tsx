"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const LegalFooter = () => (
  <footer className="mt-40 pt-6 flex items-center justify-start text-sm text-[#CCCCCC] font-sans gap-4">
    <span>2026 © Framerate</span>

    {/* <nav className="flex gap-4">
      <Link href="/legal" className="hover:text-white transition-colors">Legal</Link>
      <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
      <Link href="/compliance" className="hover:text-white transition-colors">Compliance</Link>
    </nav> */}
  </footer>
);

function LegalContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");

  useEffect(() => {
    if (tabParam === "privacy") {
      setActiveTab("privacy");
    } else if (tabParam === "terms") {
      setActiveTab("terms");
    }
  }, [tabParam]);

  return (
    <main className="min-h-screen bg-background font-sans">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-11">
          <Link href="/" className="flex items-center gap-2 mb-11">
            <Image src="/logo.png" alt="Framerate" width={24} height={24} />
            <span className="text-white text-lg">Framerate</span>
          </Link>

          <div className="flex gap-6 border-b-[0.5px] border-white-8">
            <button
              onClick={() => setActiveTab("terms")}
              className={`text-[16px] leading-[24px] pb-4 relative transition-colors ${activeTab === "terms" ? "text-white" : "text-white-50 hover:text-white-85"
                }`}
            >
              Terms of Service
              {activeTab === "terms" && (
                <div className="absolute bottom-[-0.5px] left-0 right-0 h-[2px] bg-white rounded-t-sm" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`text-[16px] leading-[24px] pb-4 relative transition-colors ${activeTab === "privacy" ? "text-white" : "text-white-50 hover:text-white-85"
                }`}
            >
              Privacy Policy
              {activeTab === "privacy" && (
                <div className="absolute bottom-[-0.5px] left-0 right-0 h-[2px] bg-white rounded-t-sm" />
              )}
            </button>
          </div>
        </header>

        {activeTab === "terms" && (
          <div>
            <h1 className="text-[40px] font-[500] text-white mb-11 mt-11">Terms of Service</h1>
            <p className="text-sm text-[#CCCCCC] mb-11">Last updated: April 16, 2026</p>
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
          </div>
        )}

        {activeTab === "privacy" && (
          <div>
            <h1 className="text-[40px] font-[500] text-white mb-11 mt-11">Privacy Policy</h1>
            <p className="text-sm text-[#CCCCCC] mb-11">Last updated: April 16, 2026</p>
            <div className="space-y-10 text-sm text-[#CCCCCC] leading-relaxed">
              <p>
                Framerate (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) provides websites, applications, and related services (the &ldquo;Service&rdquo;).
                This Privacy Policy explains what personal data we collect, how we use it, and the choices you have when you use the Service.
              </p>
              <p>If you do not agree with this Policy, please do not use the Service.</p>

              <section>
                <h2 className="text-white text-xl mb-3">1. Information we collect</h2>
                <p className="mb-2">We collect the following types of information when you use Framerate:</p>
                <ul className="space-y-1 list-none">
                  <li>- Account information: name, email address, login identifiers, and basic profile details you choose to provide.</li>
                  <li>- Payment and subscription information: plan details, transaction records, and billing-related data. Payment card details are processed by our payment provider, not stored by us.</li>
                  <li>- Image and technical data: IP address, device type, approximate location from IP, pages or screens you visit, actions you take in the product, and log data for security and performance.</li>
                  <li>- Content you provide: scenes, prompts, uploads, and other materials you submit or generate with the Service.</li>
                  <li>- Communications: messages and support requests you send to us.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">2. How we use information</h2>
                <p className="mb-2">We use your information to:</p>
                <ul className="space-y-1 list-none">
                  <li>- Provide, maintain, and improve the Service.</li>
                  <li>- Create and manage your account and subscription.</li>
                  <li>- Process payments and prevent fraud or abuse.</li>
                  <li>- Communicate with you about your account, updates, and support.</li>
                  <li>- Analyze usage to improve features and performance.</li>
                  <li>- Comply with legal obligations and protect our rights and users.</li>
                </ul>
                <p className="mt-3">Where required by law (for example in the EEA/UK), we rely on contractual necessity, legitimate interests, consent, or legal obligations as appropriate legal bases.</p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">3. Cookies and analytics</h2>
                <p>
                  We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the Service is used. Some third-party providers (for example, analytics or payment services) may also set cookies when integrated with the Service. Where required, we will ask for your consent to non-essential cookies and provide ways to manage your choices.
                </p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">4. How we share information</h2>
                <p className="mb-2">We do not sell your personal data for money. We share information only with:</p>
                <ul className="space-y-1 list-none">
                  <li>- Service providers that help us run the Service (hosting, storage, analytics, payments, customer support, infrastructure, and AI models).</li>
                  <li>- Professional advisors and authorities where required by law or to protect our rights, users, or the public.</li>
                  <li>- Parties involved in a corporate transaction (such as a merger or acquisition), where permitted by law.</li>
                </ul>
                <p className="mt-3">These parties are bound by appropriate contractual and security obligations.</p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">5. International transfers</h2>
                <p>
                  Your information may be processed and stored in countries other than where you live. When we transfer personal data from the EEA, UK, or Switzerland, we use appropriate safeguards such as Standard Contractual Clauses or similar mechanisms where required by law.
                </p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">6. Data retention and security</h2>
                <p>
                  We keep personal data only for as long as needed to provide the Service and meet legal or business requirements. We use reasonable technical and organizational measures to protect personal data, but no system is completely secure.
                </p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">7. Your rights</h2>
                <p className="mb-2">Depending on your location, you may have rights such as:</p>
                <ul className="space-y-1 list-none">
                  <li>- Accessing the personal data we hold about you.</li>
                  <li>- Correcting or deleting certain data.</li>
                  <li>- Objecting to or restricting certain processing.</li>
                  <li>- Requesting a portable copy of certain data.</li>
                  <li>- Withdrawing consent where processing is based on consent.</li>
                </ul>
                <p className="mt-3">
                  Residents of some U.S. states may also have additional rights, including the right to know, delete, correct, and opt out of certain uses defined as &ldquo;sale&rdquo;, &ldquo;sharing&rdquo;, or targeted advertising. You can exercise your rights by contacting us, and we may need to verify your identity before responding.
                </p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">8. Third-party services</h2>
                <p>
                  The Service may link to or integrate with third-party sites and tools. Their use of your data is governed by their own terms and privacy policies, and we are not responsible for their practices.
                </p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">9. Changes to this Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. If we make material changes, we will update the &ldquo;Last updated&rdquo; date and, where required, notify you through the Service or by email.
                </p>
              </section>

              <section>
                <h2 className="text-white text-xl mb-3">10. Contact us</h2>
                <p className="mb-2">If you have questions about this Privacy Policy or want to exercise your privacy rights, you can contact us at:</p>
                <p>Email: teamframerate@gmail.com</p>
                <p className="mt-3">Please also provide your final legal entity name and address in this section.</p>
              </section>
            </div>
          </div>
        )}

        <LegalFooter />
      </div>
    </main>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LegalContent />
    </Suspense>
  );
}
