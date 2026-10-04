import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";
import { LegalDocument } from "@/modules/legal/ui/legal-document";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How Framerate collects, uses and protects personal data when you use the AI 3D website builder, and the privacy rights you can exercise.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalDocument active="privacy">
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
              <li>- Usage and technical data: IP address, device type, approximate location from IP, pages or screens you visit, actions you take in the product, and log data for security and performance.</li>
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
          </section>
        </div>
      </div>
    </LegalDocument>
  );
}
